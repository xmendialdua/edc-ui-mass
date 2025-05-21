from fastapi import APIRouter, Request, Query, HTTPException, UploadFile, File
import os
import zipfile
import mlflow
from mlflow.tracking.client import MlflowClient
from datetime import datetime
import sys
import subprocess
import shutil

import time
import httpx

import io
import json

# Añadir el directorio raíz de la estructura al PYTHONPATH para importar deploy_mlflow
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../mlflow')))


router = APIRouter()

# Variable global para almacenar la URL de MLflow
mlflow_server_url = None

@router.post("/set-mlflow-url")
async def set_mlflow_url(request: Request, mlflow_url: str = Query(None)):
    """Recibe la URL del servidor MLflow y la persiste. Si la URL es nula, despliega MLflow."""
    global mlflow_server_url

    if mlflow_url:
        if not mlflow_url.startswith("http://") and not mlflow_url.startswith("https://"):
            raise HTTPException(status_code=400, detail="La URL debe empezar con http:// o https://")
        mlflow_server_url = mlflow_url
    else:
        if mlflow_server_url is None:
            try:
                print("Desplegando MLflow...")
                result = subprocess.run(["python3", "/code/app/mlflow/deploy_mlflow.py"], capture_output=True, text=True, check=True)
                if result.returncode != 0:
                    raise HTTPException(status_code=500, detail=f"Error al desplegar MLflow: {result.stderr}")
                print("Despliegue de MLflow completado exitosamente.")
                mlflow_server_url = "http://mlflow-tracking.mlflow.svc.cluster.local:80"
            except subprocess.CalledProcessError as e:
                raise HTTPException(status_code=500, detail=f"Error al ejecutar el script de despliegue: {e.stderr}")

    # Esperar a que el servidor MLflow esté disponible
    timeout_seconds = 120
    interval_seconds = 10
    attempts = timeout_seconds // interval_seconds

    print(f"Esperando a que MLflow esté accesible en {mlflow_server_url}...")

    for i in range(attempts):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{mlflow_server_url}/")
                if response.status_code == 200:
                    print("MLflow está accesible.")
                    break
        except Exception as e:
            print(f"Intento {i+1}/{attempts}: MLflow no está disponible aún ({e})")
        time.sleep(interval_seconds)
    else:
        raise HTTPException(status_code=504, detail=f"No se pudo establecer conexión con MLflow en {mlflow_server_url} después de {timeout_seconds} segundos.")

    return {"message": f"URL de MLflow configurada: {mlflow_server_url}"}


@router.post("/listener/{asset_name}")
async def save_model_in_mlflow(asset_name: str, request: Request):
    """Guarda un modelo en MLflow utilizando un archivo .zip recibido directamente en el body y el nombre del asset."""

    print(f"Nombre del asset: {asset_name}")

    if mlflow_server_url is None:
        return  # No hacer nada si no hay URL configurada

    # Leer el contenido ZIP desde el cuerpo de la petición
    try:
        zip_bytes = await request.body()
        if not zip_bytes:
            print("Body vacío. Ignorando petición.")
            return  # No hacer nada si el body está vacío
        print(f"Recibidos {len(zip_bytes)} bytes")
    except Exception as e:
        print(f"Error al leer el body: {str(e)}")
        return  # No hacer nada en caso de error

    # Configuración de MLflow
    client = MlflowClient(mlflow_server_url)
    mlflow.set_tracking_uri(mlflow_server_url)

    try:
        mlflow.set_experiment(asset_name)
    except Exception as e:
        print(f"Error al crear el experimento: {str(e)}")
        return  # No hacer nada

    # Preparar directorios
    timestamp = int(datetime.utcnow().timestamp())
    foldername = f"model_{timestamp}"
    base_dir = "/code/app/modelsMLflow"
    model_dir = os.path.join(base_dir, foldername)
    model_subdir = os.path.join(model_dir, "model")
    zip_path = os.path.join(base_dir, f"{foldername}.zip")

    os.makedirs(model_subdir, exist_ok=True)

    with open(zip_path, "wb") as f:
        f.write(zip_bytes)

    # Extraer ZIP
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zip_ref:
            for member in zip_ref.infolist():
                filename = os.path.basename(member.filename)
                if not filename:
                    continue
                source = zip_ref.open(member)
                target_path = (
                    os.path.join(model_dir, filename)
                    if filename == "params_metrics.json"
                    else os.path.join(model_subdir, filename)
                )
                with open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)
    except zipfile.BadZipFile:
        print("Archivo ZIP inválido.")
        return  # No hacer nada

    # Leer parámetros y métricas
    json_path = os.path.join(model_dir, "params_metrics.json")
    params, metrics = {}, {}
    if os.path.exists(json_path):
        try:
            with open(json_path, "r") as f:
                content = json.load(f)
                params = content.get("params", {})
                metrics = content.get("metrics", {})
        except Exception as e:
            print(f"Error al leer JSON: {str(e)}")

    # Loggear en MLflow
    try:
        with mlflow.start_run() as run:
            mlflow.log_artifacts(model_subdir)
            if params:
                mlflow.log_params(params)
            if metrics:
                mlflow.log_metrics(metrics)
            run_id = run.info.run_id
    except Exception as e:
        print(f"Error al guardar en MLflow: {str(e)}")
        return

    return {
        "message": "Modelo guardado exitosamente en MLflow",
        "logged_artifacts_dir": model_subdir,
        "params_logged": list(params.keys()),
        "metrics_logged": list(metrics.keys()),
        "run_id": run_id
    }
