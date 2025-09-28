import logging

from sqlalchemy import event

from .__base import Base
from .workflow_template import WorkflowTemplate
from .workflow import Workflow
from .node import Node
from .virtual_output import VirtualOutput

__all__ = ["Base", "WorkflowTemplate", "Workflow", "Node", "VirtualOutput"]


log = logging.getLogger(__name__)


def _log_after_insert(mapper, connection, target):
    """Log whenever a model instance is inserted."""
    try:
        identity = getattr(target, "id", None)
    except Exception:  # pragma: no cover - extremely defensive
        identity = None
    log.info("Created %s (id=%s)", target.__class__.__name__, identity)


for _model in (WorkflowTemplate, Workflow, Node, VirtualOutput):
    event.listen(_model, "after_insert", _log_after_insert)
