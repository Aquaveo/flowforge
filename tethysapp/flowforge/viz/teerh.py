"""TEEHR utilities."""

from __future__ import annotations

import glob
import logging
import os
from typing import List, Optional, Tuple
from urllib.parse import urlparse

import boto3
import duckdb
import pandas as pd
from geopandas import GeoDataFrame
from botocore import UNSIGNED
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

log = logging.getLogger(__name__)


def _find_crosswalk_parquet(base_path: str, hint: Optional[str] = None) -> Optional[str]:
    """Locate the first crosswalk parquet either locally or on S3."""

    def _matches(filename: str) -> bool:
        lower_name = filename.lower()
        required = ["crosswalk", ".parquet"]
        if hint:
            required.append(hint.lower())
        return all(part in lower_name for part in required)

    if base_path.startswith("s3://"):
        parsed = urlparse(base_path)
        bucket = parsed.netloc
        prefix = parsed.path.lstrip("/")
        if prefix and not prefix.endswith("/"):
            prefix = f"{prefix}/"

        base_dir = prefix.rstrip("/")
        s3 = boto3.client("s3", config=Config(signature_version=UNSIGNED))
        paginator = s3.get_paginator("list_objects_v2")

        try:
            for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
                for obj in page.get("Contents", []):
                    key = obj.get("Key")
                    if not key:
                        continue
                    filename = os.path.basename(key)
                    if not _matches(filename):
                        continue
                    parent = os.path.dirname(key).rstrip("/")
                    if parent != base_dir:
                        continue
                    return f"s3://{bucket}/{key}"
        except (ClientError, BotoCoreError) as exc:
            log.debug("Failed to locate crosswalk parquet in %s: %s", base_path, exc)
            return None
        return None

    if not os.path.isdir(base_path):
        return None

    for entry in os.listdir(base_path):
        if _matches(entry):
            candidate = os.path.join(base_path, entry)
            if os.path.isfile(candidate):
                return candidate
    return None


def _load_crosswalk_parquet(path: str, columns: Tuple[str, str]) -> Optional[pd.DataFrame]:
    """Load selected columns from a crosswalk parquet using PyIceberg/PyArrow."""

    if not path:
        return None

    try:
        from pyiceberg.io.pyarrow import PyArrowFileIO
    except ImportError as exc:
        raise RuntimeError(
            "PyIceberg is required to read crosswalk parquet files. Install the 'pyiceberg' package."
        ) from exc

    try:
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise RuntimeError(
            "PyArrow is required alongside PyIceberg to read parquet files. Install the 'pyarrow' package."
        ) from exc

    file_io = PyArrowFileIO()
    try:
        input_file = file_io.new_input(path)
        with input_file.open() as source:
            table = pq.read_table(source, columns=list(columns))
    except FileNotFoundError:
        return None
    except Exception as exc:
        log.debug("Failed to read crosswalk parquet %s: %s", path, exc)
        return None

    return table.to_pandas()


def append_ngen_usgs_column(gdf: GeoDataFrame, model_id: str) -> GeoDataFrame:
    base_output_teehr_path = get_base_teehr_path(model_id)
    crosswalk_path = _find_crosswalk_parquet(base_output_teehr_path, hint="ngen")

    crosswalk_df = _load_crosswalk_parquet(
        crosswalk_path,
        ("secondary_location_id", "primary_location_id"),
    )

    if crosswalk_df is None or crosswalk_df.empty:
        gdf["ngen_usgs"] = "none"
        return gdf

    ngen_usgs_map = {
        sec_id.replace("ngen", "nex"): prim_id
        for sec_id, prim_id in zip(
            crosswalk_df["secondary_location_id"],
            crosswalk_df["primary_location_id"],
        )
    }

    gdf["ngen_usgs"] = gdf["id"].apply(lambda x: ngen_usgs_map.get(x, "none"))
    return gdf


def append_nwm_usgs_column(gdf: GeoDataFrame, model_id: str) -> GeoDataFrame:
    base_output_teehr_path = get_base_teehr_path(model_id)
    crosswalk_path = _find_crosswalk_parquet(base_output_teehr_path, hint="nwm")

    crosswalk_df = _load_crosswalk_parquet(
        crosswalk_path,
        ("primary_location_id", "secondary_location_id"),
    )

    if crosswalk_df is None or crosswalk_df.empty:
        gdf["nwm_usgs"] = "none"
        return gdf

    nwm_usgs_map = dict(
        zip(
            crosswalk_df["primary_location_id"],
            crosswalk_df["secondary_location_id"],
        )
    )

    gdf["nwm_usgs"] = gdf["ngen_usgs"].apply(lambda x: nwm_usgs_map.get(x, "none"))
    return gdf


def get_base_teehr_path(model_id: str) -> str:
    from tethysapp.flowforge import utils as base_utils

    if base_utils._get_model_run_type_by_id(model_id) == "virtual":
        return _get_virtual_teehr_path(model_id)

    model_path = base_utils._get_model_run_path_by_id(model_id)
    if model_path is None:
        raise ValueError(f"Model run ID '{model_id}' not found.")

    return os.path.join(model_path, "teehr")


def _get_virtual_teehr_path(model_run_id: str) -> str:
    from tethysapp.flowforge import utils as base_utils

    model_runs = base_utils._get_list_model_runs().get("model_runs", [])
    entry = next((m for m in model_runs if m.get("id") == model_run_id), None)
    if entry is None:
        raise ValueError(f"Model run ID '{model_run_id}' not found.")

    bucket, base_prefix = base_utils._resolve_virtual_bucket_prefix(entry, model_run_id)
    teehr_prefix = f"{base_prefix}/teehr/" if base_prefix else "teehr/"

    s3 = boto3.client("s3", config=Config(signature_version=UNSIGNED))
    paginator = s3.get_paginator("list_objects_v2")

    try:
        for page in paginator.paginate(Bucket=bucket, Prefix=teehr_prefix, MaxKeys=1):
            if page.get("Contents"):
                return f"s3://{bucket}/{teehr_prefix}"
    except (ClientError, BotoCoreError) as exc:
        raise RuntimeError(
            f"Failed to locate teehr/ under s3://{bucket}/{teehr_prefix}: {exc}"
        ) from exc

    raise FileNotFoundError(
        f"No teehr/ folder found in s3://{bucket}/{teehr_prefix}"
    )


def get_usgs_from_ngen(model_id: str, ngen_id: str) -> Optional[str]:
    base_output_teehr_path = get_base_teehr_path(model_id)
    crosswalk_df = _load_crosswalk_parquet(
        _find_crosswalk_parquet(base_output_teehr_path, hint="ngen"),
        ("secondary_location_id", "primary_location_id"),
    )

    if crosswalk_df is None or crosswalk_df.empty:
        return None

    lookup = dict(
        zip(
            crosswalk_df["secondary_location_id"],
            crosswalk_df["primary_location_id"],
        )
    )

    return lookup.get(ngen_id)


def get_configuration_variable_pairs(model_run_id: str) -> List[dict]:
    base_output_teehr_path = get_base_teehr_path(model_run_id)
    joined_timeseries_base_path = os.path.join(
        base_output_teehr_path, "dataset", "joined_timeseries"
    )
    configurations_variables: List[dict] = []

    for root, dirs, _ in os.walk(joined_timeseries_base_path):
        if "configuration_name=" not in root:
            continue

        config_name = [
            d.split("=")[1]
            for d in root.split("/")
            if d.startswith("configuration_name=")
        ][0]

        for dir_name in dirs:
            if not dir_name.startswith("variable_name="):
                continue
            variable_name = dir_name.split("=")[1]
            configurations_variables.append(
                {
                    "value": f"{config_name}-{variable_name}",
                    "label": f"{config_name} {variable_name.replace('_', ' ')}",
                }
            )

    return configurations_variables


def get_teehr_joined_ts_path(model_run_id: str, configuration: str, variable: str) -> Optional[str]:
    base_output_teehr_path = get_base_teehr_path(model_run_id)
    joined_timeseries_path = os.path.join(
        base_output_teehr_path, "dataset", "joined_timeseries"
    )
    target_path = os.path.join(
        joined_timeseries_path,
        f"configuration_name={configuration}",
        f"variable_name={variable}",
    )

    parquet_files = glob.glob(os.path.join(target_path, "*.parquet"))
    if parquet_files:
        return parquet_files[0]
    return None


def get_usgs_from_ngen_id(model_run_id: str, nexgen_id: str) -> Optional[str]:
    base_output_teehr_path = get_base_teehr_path(model_run_id)
    crosswalk_df = _load_crosswalk_parquet(
        _find_crosswalk_parquet(base_output_teehr_path, hint="ngen"),
        ("secondary_location_id", "primary_location_id"),
    )

    if crosswalk_df is None or crosswalk_df.empty:
        return None

    corrected_next_id = nexgen_id.replace("nex", "ngen")
    match = crosswalk_df.loc[
        crosswalk_df["secondary_location_id"] == corrected_next_id,
        "primary_location_id",
    ]
    if match.empty:
        return None
    return match.iloc[0]


def get_teehr_ts(parquet_file_path: str, primary_location_id_value: str, teehr_configuration: str) -> List[dict]:
    conn = duckdb.connect(database=":memory:")
    try:
        query = f"""
            SELECT value_time, primary_value, secondary_value
            FROM parquet_scan('{parquet_file_path}')
            WHERE primary_location_id = '{primary_location_id_value}'
            ORDER BY value_time
        """
        filtered_df = conn.execute(query).fetchdf()
    finally:
        conn.close()

    filtered_df["value_time"] = filtered_df["value_time"].apply(
        lambda x: x.strftime("%Y-%m-%d %H:%M:%S")
    )

    primary_data = [
        {"x": row["value_time"], "y": row["primary_value"]}
        for _, row in filtered_df.iterrows()
    ]

    secondary_data = [
        {"x": row["value_time"], "y": row["secondary_value"]}
        for _, row in filtered_df.iterrows()
    ]

    series = [
        {"label": "USGS", "data": primary_data},
        {
            "label": f"{teehr_configuration.replace('_', ' ').title()}",
            "data": secondary_data,
        },
    ]

    return series


def get_teehr_metrics(model_run_id: str, primary_location_id: str) -> List[dict]:
    base_output_teehr_path = get_base_teehr_path(model_run_id)
    metrics_path = os.path.join(base_output_teehr_path, "metrics.csv")

    df = pd.read_csv(metrics_path)
    df = df.loc[df["primary_location_id"] == primary_location_id]
    if df.empty:
        return []

    pivot = df.pivot(index="primary_location_id", columns="configuration_name")
    metrics_out = []
    metrics = pivot.columns.levels[0]
    configs = pivot.columns.levels[1]

    for metric in metrics:
        row = {"metric": metric}
        for cfg in configs:
            try:
                row[cfg] = pivot[(metric, cfg)].iloc[0]
            except KeyError:
                row[cfg] = None
        metrics_out.append(row)

    return metrics_out
