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
async def serve_model_IDS(experiment:str, run:str, request: Request):
    
    # data = await data.json()
    print(request.method)
    print(request.url)
    print(request.headers)
    print(request.query_params)
    print(request.path_params)
    
    # print(data)
    client = MlflowClient("http://mlflow-tracking.mlflow.svc.cluster.local:80")
    mlflow.set_tracking_uri("http://mlflow-tracking.mlflow.svc.cluster.local:80")


    mlflow.set_experiment(experiment)
    # run_id, artifact_path, local_dir
    try:
        os.mkdir("downloaded")
    except:
        print("Folder already exists")
    local_path = client.download_artifacts(run, "", "./downloaded")
    
    # Get filenames from the database
    file_list = ['./downloaded']
    return zipfiles2(file_list, experiment)

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
    