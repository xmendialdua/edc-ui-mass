from fastapi import APIRouter, Request, Query, HTTPException, UploadFile, File
import os
import zipfile
import mlflow
from mlflow.tracking.client import MlflowClient
from datetime import datetime
import sys
import subprocess
import shutil

# Añadir el directorio raíz de la estructura al PYTHONPATH para importar deploy_mlflow
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../mlflow')))


router = APIRouter()

# Variable global para almacenar la URL de MLflow
mlflow_server_url = None

@router.post("/set-mlflow-url")
async def set_mlflow_url(request: Request, mlflow_url: str = Query(None)):
    """Recibe la URL del servidor MLflow y la persiste. Si la URL es nula, usa la URL predeterminada."""
    global mlflow_server_url
    
    # Si se recibe una URL, la usamos; si no, se asigna la URL predeterminada
    if mlflow_url:
        # Validar que la URL es válida
        if not mlflow_url.startswith("http://") and not mlflow_url.startswith("https://"):
            raise HTTPException(status_code=400, detail="La URL debe empezar con http:// o https://")
        mlflow_server_url = mlflow_url
        return {"message": f"URL de MLflow configurada: {mlflow_server_url}"}
    else:
        # Si la URL es nula, usamos la predeterminada
        if mlflow_server_url is None:
            try:
                # Ejecutar el script de despliegue de MLflow utilizando subprocess
                print("Desplegando MLflow...")

                # Ejecutar el script deploy_mlflow.py
                result = subprocess.run(["python3", "/code/app/mlflow/deploy_mlflow.py"], capture_output=True, text=True, check=True)

                # Verificar si el despliegue fue exitoso
                if result.returncode != 0:
                    raise HTTPException(status_code=500, detail=f"Error al desplegar MLflow: {result.stderr}")
                
                print("Despliegue de MLflow completado exitosamente.")
                mlflow_server_url = "http://172.19.0.2:30021"  # URL predeterminada para MLflow

            except subprocess.CalledProcessError as e:
                raise HTTPException(status_code=500, detail=f"Error al ejecutar el script de despliegue: {e.stderr}")

        return {"message": f"URL de MLflow configurada: {mlflow_server_url}"}


@router.post("/listener/{asset_name}")
async def save_model_in_mlflow(asset_name: str, file: UploadFile = File(...)):
    """Guarda un modelo en MLflow utilizando un archivo .zip recibido directamente en la solicitud y el nombre del asset."""

    global mlflow_server_url

    # Comprobar si la URL de MLflow está configurada
    if mlflow_server_url is None:
        raise HTTPException(status_code=400, detail="La URL de MLflow no está configurada. Use /set-mlflow-url para configurarla.")
    
    # Configuración de MLflow con la URL persistida
    client = MlflowClient(mlflow_server_url)
    mlflow.set_tracking_uri(mlflow_server_url)
    
    # Crear el experimento con el nombre proporcionado (asset_name)
    try:
        mlflow.set_experiment(asset_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al crear el experimento: {str(e)}")
    
    # Ruta para guardar el modelo extraído
    timestamp = int(datetime.utcnow().timestamp())
    foldername = f"model_{timestamp}"
    route = "/code/app/modelsMLflow"
    
    if not os.path.exists(route):
        os.makedirs(route)
    
    # Guardar el archivo .zip recibido en una ubicación temporal
    zip_location = os.path.join(route, "model.zip")
    with open(zip_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Verificar si el archivo es un ZIP y extraer el contenido
    try:
        with zipfile.ZipFile(zip_location, 'r') as zip_ref:
            zip_ref.extractall(route)
        os.rename(f"{route}/model", f"{route}/{foldername}")
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="El archivo proporcionado no es un archivo zip válido.")
    
    # Loggear el modelo como un artefacto en MLflow
    try:
        mlflow.log_artifact(f"{route}/{foldername}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el modelo en MLflow: {str(e)}")
    
    return {"message": "Modelo guardado exitosamente en MLflow"}