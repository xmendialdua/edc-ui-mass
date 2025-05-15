import time
import mlflow
from mlflow.tracking.client import MlflowClient
from mlflow.entities.model_registry.model_version_status import ModelVersionStatus

import fastapi
from fastapi import FastAPI, Request, Body
from fastapi.responses import StreamingResponse, Response #, FileResponse
from starlette.responses import FileResponse
from pydantic import BaseModel

import gzip
from typing import Callable, List

import os
import zipfile
import io

import shutil

# BORRABLE from app import ids_connector_routes as ids

import json

from fastapi import Query

from datetime import datetime

# Initialize Libs
import subprocess
import os
import sys
from dotenv import load_dotenv

# Client Deployer Libs
from kubernetes import client, config
from kubernetes.client.rest import ApiException

# ------------------------| VARIABLES DE SCRIPT
CONFIG_FILE = "/code/app/flower/client/flower-config.env"
YAML_TEMPLATE = "/code/app/flower/client/flower-client.yaml"

# ------------------------| FUNCIONES SCRIPT

def zipfiles2(filenames, experiment):
    zip_filename = f"{experiment}.zip"
    shutil.make_archive(experiment, 'zip', "downloaded")
    return FileResponse(path=zip_filename, media_type="application/zip", filename=zip_filename)

async def print_request_details(request: Request):
    print("Incoming request")
    print("Method:", request.method)
    print("Path:", request.url.path)
    print("Body:")
    print(await request.body())
    print("=============")

def extract_auth_code(json_data: str):
    try:
        data_dict = json.loads(json_data)
        auth_code = data_dict.get("authCode", "")
        app.state.auth_code = auth_code
        print("Auth code extracted:", app.state.auth_code)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")

# ------------------------| API
# BORRABLE #ids.create_route()
app = FastAPI()

@app.get("/serve")
async def serve_model_IDS(experiment: str, run: str, request: Request):
    print(request.method)
    print(request.url)
    print(request.headers)
    print(request.query_params)
    print(request.path_params)

    # Configuración MLflow
    client = MlflowClient("http://mlflow-tracking.mlflow.svc.cluster.local:80")
    mlflow.set_tracking_uri("http://mlflow-tracking.mlflow.svc.cluster.local:80")
    mlflow.set_experiment(experiment)

    # Crear carpeta temporal
    local_dir = "downloaded"
    if not os.path.exists(local_dir):
        os.mkdir(local_dir)

    # Descargar artefactos
    local_path = client.download_artifacts(run, "", local_dir)

    # Obtener parámetros y métricas
    try:
        params = client.get_run(run).data.params
        metrics = client.get_run(run).data.metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo parámetros/métricas del run: {str(e)}")

    # Guardar JSON combinado
    metadata = {
        "params": params,
        "metrics": metrics
    }

    try:
        with open(os.path.join(local_dir, "params_metrics.json"), "w") as f:
            json.dump(metadata, f, indent=4)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo crear el archivo params_metrics.json: {str(e)}")

    # Crear y devolver ZIP
    return zipfiles2([local_dir], experiment)


@app.get("/flconfig")
async def flower_config_exposer():
    config_json = {
        "SUPERNODE_IMAGE": "flwr/supernode:1.18.0",
        "CLIENTAPP_IMAGE": "jalvaro8/clientapp:latest",
        "MAX_CLIENTS": 10,
        "SUPERLINK": "fl-server.dataspace-ikerlan.es:80",
        "CLIENT_API_ADDRESS": "0.0.0.0"
    }
    return config_json
    