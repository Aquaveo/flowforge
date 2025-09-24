import os
import json
import glob
from collections import defaultdict
from typing import List, Tuple
from urllib.parse import urlparse

import boto3
import geopandas as gpd
import pandas as pd
import xarray as xr
from botocore import UNSIGNED
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError





def _get_conf_file():
    home_path = os.environ.get("HOME", "/tmp")
    conf_base_path = os.environ.get("VISUALIZER_CONF", f"{home_path}/ngiab_visualizer/ngiab_visualizer.json")
    print(conf_base_path)
    return conf_base_path

def _get_list_model_runs():
    """
        {
            "model_runs": [
                {
                    "label": "run1",
                    "path": "/home/aquagio/tethysdev/ciroh/ngen/ngen-data/AWI_16_2863657_007",
                    "date": "2021-01-01:00:00:00",
                    "id": "AWI_16_2863657_007",
                    "subset": "cat-2863657_subset", #to_implement
                    "tags": ["tag1", "tag2"], #to_implement
                },
                ....
            ]
        }
    """
    print("get_list_model_runs")
    conf_file = _get_conf_file()
    
    with open(conf_file, "r") as f:
        data = json.load(f)
    return data

def get_model_runs_selectable():
    
    model_runs = _get_list_model_runs()
    return [
        {
            "value": model_run["id"], 
            "label": model_run["label"]
        }
        for model_run in model_runs["model_runs"]
    ]


def _resolve_virtual_bucket_prefix(entry: dict, model_run_id: str) -> Tuple[str, str]:
    """Normalize bucket/prefix information for a virtual model run."""

    raw_path = (entry.get("path") or "").strip()
    bucket = entry.get("bucket")
    prefix = (entry.get("prefix") or "").strip("/")

    if raw_path:
        parsed = urlparse(raw_path)
        if parsed.scheme == "s3":
            bucket = bucket or parsed.netloc
            default_prefix = parsed.path.lstrip("/")
            if default_prefix:
                prefix = prefix or default_prefix.rstrip("/")

    if not bucket:
        raise ValueError(
            f"Model run ID '{model_run_id}' does not specify an S3 bucket."
        )

    return bucket, prefix.rstrip("/")

def _find_local_gpkg_path(model_path):
    config_path = os.path.join(model_path, "config")
    gpkg_files = []

    for root, dirs, files in os.walk(config_path):
        for file in files:
            if file.endswith(".gpkg"):
                gpkg_files.append(os.path.join(root, file))

    return gpkg_files[0]


def _find_virtual_gpkg_path(model_run_id: str) -> str:
    """Return the first GeoPackage found under the model's virtual S3 config prefix."""

    model_runs = _get_list_model_runs().get("model_runs", [])
    entry = next((m for m in model_runs if m.get("id") == model_run_id), None)
    if entry is None:
        raise ValueError(f"Model run ID '{model_run_id}' not found.")

    bucket, base_prefix = _resolve_virtual_bucket_prefix(entry, model_run_id)
    if not base_prefix:
        raise ValueError(
            f"Model run ID '{model_run_id}' does not specify an S3 prefix."
        )

    config_prefix = f"{base_prefix}/" if base_prefix.endswith("/config") else f"{base_prefix}/config/"

    s3 = boto3.client("s3", config=Config(signature_version=UNSIGNED))
    gpkg_keys: List[str] = []

    paginator = s3.get_paginator("list_objects_v2")
    try:
        for page in paginator.paginate(Bucket=bucket, Prefix=config_prefix):
            for obj in page.get("Contents", []):
                key = obj.get("Key")
                if key and key.endswith(".gpkg"):
                    gpkg_keys.append(key)
    except (ClientError, BotoCoreError) as exc:
        raise RuntimeError(
            f"Failed to list GeoPackages under s3://{bucket}/{config_prefix}: {exc}"
        ) from exc

    if not gpkg_keys:
        raise FileNotFoundError(
            f"No .gpkg file found in s3://{bucket}/{config_prefix}"
        )

    gpkg_keys.sort()
    return f"s3://{bucket}/{gpkg_keys[0]}"


def _get_pmtiles_url(model_run_id: str) -> str:
    """Return the first PMTiles object located beneath the model run's config folder."""

    model_runs = _get_list_model_runs().get("model_runs", [])
    entry = next((m for m in model_runs if m.get("id") == model_run_id), None)
    if entry is None:
        raise ValueError(f"Model run ID '{model_run_id}' not found.")

    raw_path = (entry.get("path") or "").strip()

    if raw_path.startswith("s3://") or entry.get("bucket") or entry.get("prefix"):
        bucket, base_prefix = _resolve_virtual_bucket_prefix(entry, model_run_id)
        config_prefix = f"{base_prefix}/config/" if base_prefix else "config/"

        s3 = boto3.client("s3", config=Config(signature_version=UNSIGNED))
        pmtiles_keys: List[str] = []

        paginator = s3.get_paginator("list_objects_v2")
        try:
            for page in paginator.paginate(Bucket=bucket, Prefix=config_prefix):
                for obj in page.get("Contents", []):
                    key = obj.get("Key")
                    if key and key.endswith(".pmtiles"):
                        pmtiles_keys.append(key)
        except (ClientError, BotoCoreError) as exc:
            raise RuntimeError(
                f"Failed to list PMTiles under s3://{bucket}/{config_prefix}: {exc}"
            ) from exc

        if not pmtiles_keys:
            raise FileNotFoundError(
                f"No .pmtiles file found in s3://{bucket}/{config_prefix}"
            )

        pmtiles_keys.sort()
        return f"s3://{bucket}/{pmtiles_keys[0]}"

    config_dir = os.path.join(raw_path, "config") if raw_path else None
    if not config_dir or not os.path.isdir(config_dir):
        raise FileNotFoundError(
            f"Config directory not found for model run ID '{model_run_id}'."
        )

    for root, _, files in os.walk(config_dir):
        for filename in sorted(files):
            if filename.endswith(".pmtiles"):
                return os.path.join(root, filename)

    raise FileNotFoundError(
        f"No .pmtiles file found in local config directory for model run ID '{model_run_id}'."
    )


def _get_model_run_path_by_id(id):
    model_runs = _get_list_model_runs()
    for model_run in model_runs["model_runs"]:

        if model_run["id"] == id:
            return model_run["path"]
    return None


def _get_model_run_type_by_id(id):
    model_runs = _get_list_model_runs()
    for model_run in model_runs["model_runs"]:
        if model_run["id"] == id:
            return model_run.get("type")
    return None

def find_gpkg_file_path(model_run_id):
    if _get_model_run_type_by_id(model_run_id) == "virtual":
        return _find_virtual_gpkg_path(model_run_id)

    model_path = _get_model_run_path_by_id(model_run_id)
    if model_path is None:
        raise ValueError(f"Model run ID '{model_run_id}' not found.")

    return _find_local_gpkg_path(model_path)


def append_ngen_usgs_column(gdf, model_id):
    from tethysapp.flowforge.viz import teerh

    return teerh.append_ngen_usgs_column(gdf, model_id)


def append_nwm_usgs_column(gdf, model_id):
    from tethysapp.flowforge.viz import teerh

    return teerh.append_nwm_usgs_column(gdf, model_id)


def _get_base_troute_output(model_id):
    base_path = _get_model_run_path_by_id(model_id)    
    base_output_path = os.path.join(
        base_path, "outputs", "troute"
    )
    return base_output_path


def get_troute_df(model_id):
    """
    Load the first T-Route data file from the workspace as a DataFrame.
    Supports both CSV and NetCDF (.nc) files, and replaces NaN values with -9999.
    """
    base_output_path = _get_base_troute_output(model_id)

    # Search for supported file types in priority order
    file_types = [("CSV", "*.csv"), ("NetCDF", "*.nc")]

    for file_type, pattern in file_types:
        files = glob.glob(os.path.join(base_output_path, pattern))

        if files:
            file_path = files[0]
            print(f"Found {file_type} file: {file_path}")

            try:
                if file_type == "CSV":
                    # Read the CSV file into a DataFrame
                    df = pd.read_csv(file_path)
                elif file_type == "NetCDF":
                    # Read the NetCDF file and convert to a DataFrame
                    ds = xr.open_dataset(file_path)
                    df = ds.to_dataframe()

                # Replace NaN values with -9999
                df.fillna(-9999, inplace=True)
                return df
            except Exception as e:
                print(f"Error reading {file_type} file '{file_path}': {e}")

    # If no files found, return None
    print(f"No supported T-Route output files found in {base_output_path}.")
    return None


def get_base_output(model_id):
    base_path = _get_model_run_path_by_id(model_id)
    # print(base_path)
    output_relative_path = get_output_path(base_path).split("outputs")[-1]
    base_output_path = os.path.join(
        base_path, "outputs", output_relative_path.strip("/")
    )
    return base_output_path

def get_output_path(base_path):
    """
    Retrieve the value of the 'output_root' key from a JSON file.

    Args:
    json_filepath (str): The file path of the JSON file.

    Returns:
    str: The value of the 'output_root' key or None if the key doesn't exist.
    """
    
    realizations_output_path = os.path.join(
        base_path, "config", "realization.json"
    )

    try:
        with open(realizations_output_path, "r") as file:
            data = json.load(file)
        return data.get("output_root", None)
    except FileNotFoundError:
        print(f"Error: The file {realizations_output_path} does not exist.")
        return None
    except json.JSONDecodeError:
        print("Error: Failed to decode JSON.")
        return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None


def _list_prefixed_csv_files(directory, prefix):
    """
    List all CSV files in a specified directory that start with a given prefix.

    Args:
    directory (str): The directory to search for files.
    prefix (str): The prefix the file names should start with.

    Returns:
    list: A list of filenames (str) that match the criteria.
    """
    # Check if the directory exists
    if not os.path.exists(directory):
        print("The specified directory does not exist.")
        return []

    # List all files in the directory
    files = os.listdir(directory)

    # Filter files to find those that are CSVs and start with the given prefix
    csv_files = [
        file for file in files if file.startswith(prefix) and file.endswith(".csv")
    ]

    return csv_files


def getCatchmentsIds(model_run_id):
    """
    Get a list of catchment IDs.

    Parameters:
        app_workspace (str): The path to the application workspace.

    Returns:
        list: A list of dictionaries containing catchment IDs and labels.
              Each dictionary has the keys 'value' and 'label'.
    """
    output_base_file = get_base_output(model_run_id)
    catchment_prefix = "cat-"
    catchment_ids_list = _list_prefixed_csv_files(output_base_file, catchment_prefix)
    return [
        {"value": id.split(".csv")[0], "label": id.split(".csv")[0]}
        for id in catchment_ids_list
    ]


def getCatchmentsList(model_id):
    output_base_file = get_base_output(model_id)
    catchment_prefix = "cat-"
    catchment_ids_list = _list_prefixed_csv_files(output_base_file, catchment_prefix)
    return [id.split(".csv")[0] for id in catchment_ids_list]


def getNexusList(model_id):
    output_base_file = get_base_output(model_id)
    nexus_prefix = "nex-"
    nexus_ids_list = _list_prefixed_csv_files(output_base_file, nexus_prefix)
    return [id.split(".csv")[0].split("_output")[0] for id in nexus_ids_list]


def getNexusIDs(model_run_id):
    """
    Get a list of Nexus IDs.

    Parameters:
        app_workspace (str): The path to the application workspace.

    Returns:
        list: A list of dictionaries containing the Nexus IDs. Each dictionary has a 'value' and 'label' key.
    """
    output_base_file = get_base_output(model_run_id)
    nexus_prefix = "nex-"
    nexus_ids_list = _list_prefixed_csv_files(output_base_file, nexus_prefix)
    return [
        {"value": id.split("_output.csv")[0], "label": id.split("_output.csv")[0]}
        for id in nexus_ids_list
    ]


def get_base_teehr_path(model_id):
    from tethysapp.flowforge.viz import teerh

    return teerh.get_base_teehr_path(model_id)


def get_usgs_from_ngen(app_workspace, ngen_id):
    from tethysapp.flowforge.viz import teerh

    return teerh.get_usgs_from_ngen(app_workspace, ngen_id)


def get_configuration_variable_pairs(model_run_id):
    from tethysapp.flowforge.viz import teerh

    return teerh.get_configuration_variable_pairs(model_run_id)


def get_teehr_joined_ts_path(model_run_id, configuration, variable):
    from tethysapp.flowforge.viz import teerh

    return teerh.get_teehr_joined_ts_path(model_run_id, configuration, variable)


def get_usgs_from_ngen_id(model_run_id, nexgen_id):
    from tethysapp.flowforge.viz import teerh

    return teerh.get_usgs_from_ngen_id(model_run_id, nexgen_id)


def get_teehr_ts(parquet_file_path, primary_location_id_value, teehr_configuration):
    from tethysapp.flowforge.viz import teerh

    return teerh.get_teehr_ts(parquet_file_path, primary_location_id_value, teehr_configuration)


def get_teehr_metrics(model_run_id: str, primary_location_id: str):
    from tethysapp.flowforge.viz import teerh

    return teerh.get_teehr_metrics(model_run_id, primary_location_id)

def get_troute_vars(df):
    # Check if the DataFrame has a MultiIndex
    if isinstance(df.index, pd.MultiIndex):
        # For multi-indexed DataFrame
        list_variables = df.columns.tolist()  # All columns are variables
    else:
        # For flat-indexed DataFrame
        list_variables = df.columns.tolist()[
            3:
        ]  # Skip the first three columns (featureID, Type, time)

    # Format the variables for display
    variables = [
        {"value": variable, "label": variable.lower()} for variable in list_variables
    ]
    return variables


def check_troute_id(df, id):
    if isinstance(df.index, pd.MultiIndex):
        # Multi-indexed DataFrame: Check in the `feature_id` level
        return int(id) in df.index.get_level_values("feature_id")
    else:
        # Flat-indexed DataFrame: Check in the `featureID` column
        return int(id) in df["featureID"].values


def _build_geospatial_local_payload(model_run_id: str) -> dict:
    resp = {}
    gepackage_file_path = find_gpkg_file_path(model_run_id)
    gdf = gpd.read_file(gepackage_file_path, layer="nexus")
    gdf = append_ngen_usgs_column(gdf, model_run_id)
    gdf = append_nwm_usgs_column(gdf, model_run_id)
    gdf = gdf.to_crs("EPSG:4326")
    flow_paths_ids = gdf["toid"].tolist()
    bounds = gdf.total_bounds.tolist()
    data = json.loads(gdf.to_json())
    resp["nexus"] = data
    resp["nexus_ids"] = getNexusList(model_run_id)
    resp["bounds"] = bounds
    resp["catchments"] = getCatchmentsList(model_run_id)
    resp["flow_paths_ids"] = flow_paths_ids
    return resp


def _build_geospatial_virtual_payload(model_run_id: str) -> dict:
    resp = {}
    gepackage_path = find_gpkg_file_path(model_run_id)
    gdf = gpd.read_file(gepackage_path, layer="nexus", engine='pyogrio')
    gdf = append_ngen_usgs_column(gdf, model_run_id)
    gdf = append_nwm_usgs_column(gdf, model_run_id)
    gdf = gdf.to_crs("EPSG:4326")
    flow_paths_ids = gdf["toid"].tolist()
    bounds = gdf.total_bounds.tolist()
    data = json.loads(gdf.to_json())
    resp["nexus"] = data
    resp["nexus_ids"] = getNexusList(model_run_id)
    resp["bounds"] = bounds
    resp["catchments"] = getCatchmentsList(model_run_id)
    resp["flow_paths_ids"] = flow_paths_ids
    return resp


def _build_geospatial_payload(model_run_id: str) -> dict:
    model_run_type = _get_model_run_type_by_id(model_run_id)
    if model_run_type == "local":
        return _build_geospatial_local_payload(model_run_id)
    elif model_run_type == "virtual":
        return _build_geospatial_virtual_payload(model_run_id)
    else:
        raise ValueError(f"Unknown model run type: {model_run_type}")
