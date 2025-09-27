# tethysapp/ngiab/consumers/handlers/home_import_handler.py
from __future__ import annotations
import asyncio
import logging
from typing import Any, Dict
from sqlalchemy import select, desc
from sqlalchemy.sql import nulls_last
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


from tethysapp.flowforge.some_utils import (
    check_if_s3_uri_exists,
    download_and_extract_tar_from_s3_uri,
    parse_s3_uri
)

from tethysapp.flowforge.utils import (
    _build_geospatial_payload,
    get_model_runs_selectable
)

from ...model import Workflow as WFModel, Node as NodeModel
from ...model.virtual_output import VirtualOutput as VOModel
from .model_run_handler import ModelBackendHandler as MBH
from ..backend_actions import BackendActions

log = logging.getLogger(__name__)


class HomeImportHandler(MBH):
    def __init__(self, consumer):
        super().__init__(consumer)
        self.consumer = consumer
        self.receiving_actions = {
            "IMPORT_FROM_S3": self.import_from_s3,
            "IMPORT_CHECK": self.import_check,
            "LIST_WORKFLOWS_VISUALIZATIONS": self.receive_list_workflows_visualizations,
        }

    @staticmethod
    def _serialize_virtual_output(vo: VOModel) -> Dict[str, Any]:
        return {
            "id": str(vo.id),
            "name": vo.name,
            "storage_scheme": vo.storage_scheme,
            "bucket": vo.bucket,
            "object_key": vo.object_key,
            "uri": vo.uri,
            "extra": vo.extra,
            "created_at": vo.created_at.isoformat() if vo.created_at else None,
            "updated_at": vo.updated_at.isoformat() if vo.updated_at else None,
        }
    
    @staticmethod
    def _serialize_node(node: NodeModel) -> Dict[str, Any]:
        return {
            "id": str(node.id),
            "name": node.name,
            "kind": node.kind,
            "status": node.status,
            "message": node.message,
            "order_index": node.order_index,
            "pos_x": node.pos_x,
            "pos_y": node.pos_y,
            "config": node.config,
            "created_at": node.created_at.isoformat() if node.created_at else None,
            "updated_at": node.updated_at.isoformat() if node.updated_at else None,
            "virtual_outputs": [HomeImportHandler._serialize_virtual_output(vo) for vo in node.virtual_outputs],
        }


    @MBH.action_handler
    async def receive_list_workflows_visualizations(self, event, action, data, session: AsyncSession):
        """Return workflows and associated model run data for visualization menus."""
        try:
            user = self.backend_consumer.scope.get("user")
            username = getattr(user, "username", None)
            log.info("[HomeImportHandler] Listing workflow visualizations for user=%s", username or "anonymous")
            
            q = (
                select(WFModel)
                .options(
                    selectinload(WFModel.nodes).selectinload(NodeModel.virtual_outputs)
                )
                .order_by(
                    nulls_last(desc(WFModel.last_run_at)),
                    desc(WFModel.created_at),
                )
                .limit(1000)
            )            
            if username:
                q = q.where(WFModel.user == username)
            rows = (await session.execute(q)).scalars().all()

            # model_run_select = await asyncio.to_thread(get_model_runs_selectable)

            items = [{
                "id": w.id,
                "name": w.name,
                "status": w.status,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "updated_at": w.updated_at.isoformat() if w.updated_at else None,
                "last_run_at": w.last_run_at.isoformat() if w.last_run_at else None,
                "nodes": [self._serialize_node(node) for node in w.nodes],
            } for w in rows]

            payload = {
                "items": items,
                "count": len(items),
                # "model_runs": model_run_select,
            }
            log.debug("[HomeImportHandler] Sending visualization payload with %s workflows and %s model runs", len(items))
            await self.send_action(BackendActions.WORKFLOWS_VISUALIZATION_LIST, payload)
        except Exception as e:
            log.exception("Failed to list workflows for visualization")
            await self.send_error(f"Failed to list workflows: {e}", action, data)



    async def import_check(self, event: Dict[str, Any], action: Dict[str, Any], data: Dict[str, Any]):
        # NEW: prefer s3_uri; fall back to legacy bucket/key if provided
        s3_uri = (data.get("s3_uri") or "").strip()
        if not s3_uri and data.get("bucket") and data.get("tar_key"):
            s3_uri = f"s3://{str(data['bucket']).strip()}/{str(data['tar_key']).lstrip('/')}"

        if not s3_uri:
            await self.consumer.send_error("Missing 's3_uri' in payload.", action, data)
            return

        try:
            exists = await asyncio.to_thread(check_if_s3_uri_exists, s3_uri)
            await self.consumer.send_action("IMPORT_CHECK_RESULT", {"s3_uri": s3_uri, "exists": bool(exists)})
        except Exception as e:
            await self.consumer.send_error(f"Import check failed: {e}", action, data)

    async def import_from_s3(self, event: Dict[str, Any], action: Dict[str, Any], data: Dict[str, Any]):
        # NEW: prefer s3_uri; maintain backward compatibility
        s3_uri = (data.get("s3_uri") or "").trim() if hasattr(str, "trim") else (data.get("s3_uri") or "").strip()
        if not s3_uri and data.get("bucket") and data.get("tar_key"):
            s3_uri = f"s3://{str(data['bucket']).strip()}/{str(data['tar_key']).lstrip('/')}"

        name_folder = (data.get("name_folder") or "").strip()
        if not s3_uri:
            await self.consumer.send_error("Missing 's3_uri' in payload.", action, data)
            return

        await self.consumer.send_acknowledge("Starting S3 import…", action, data)
        await self.consumer.send_action("IMPORT_PROGRESS", {"stage": "download", "s3_uri": s3_uri})

        try:
            datastream_id = await asyncio.to_thread(
                download_and_extract_tar_from_s3_uri,
                s3_uri=s3_uri,
                name_folder=name_folder,
            )
            # include parsed pieces for clients that still expect them
            try:
                bucket, tar_key = parse_s3_uri(s3_uri)
            except Exception:
                bucket, tar_key = None, None

        except Exception as e:
            log.exception("Import failed.")
            await self.consumer.send_error(f"Import failed: {e}", action, data)
            return
        
        try:
            model_run_id = datastream_id  # controller expects this name
            await asyncio.to_thread(_build_geospatial_payload, model_run_id)
        except Exception as e:
            # We don't hard-fail the whole import; just report a warning
            log.warning("Geo warm-up failed; frontend will attempt lazy load. %s", e, exc_info=True)        

        try:
            model_run_select =  get_model_runs_selectable()
        except Exception as e:
            log.warning("Failed to get model runs for select list update. %s", e, exc_info=True)
            model_run_select = []

        await self.consumer.send_action(
            "IMPORT_DONE",
            {
                "id": datastream_id,
                "mode_run_select": model_run_select,
                "s3_uri": s3_uri,
                "bucket": bucket,
                "tar_key": tar_key,
                "name_folder": name_folder or (tar_key.split("/")[-1] if tar_key else "ngen-run"),
            },
        )
