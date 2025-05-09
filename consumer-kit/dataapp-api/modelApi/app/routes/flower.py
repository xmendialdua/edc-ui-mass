from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel
import time
import os
import shutil
import requests
import subprocess
from urllib.parse import urlparse
from dotenv import load_dotenv
import boto3
from botocore.exceptions import NoCredentialsError

# Cargar las variables de entorno desde el archivo .env
load_dotenv("/code/app/flower/client/flower-config.env")

# Variables del entorno
CONFIG_FILE = "/code/app/flower/client/flower-config.env"
UPLOAD_FOLDER = "/code/app/data"

# Inicializar el router
router = APIRouter()

# Definir el modelo de datos para la recepción del JSON
class DataTransferRequest(BaseModel):
    SUPERNODE_IMAGE: str
    CLIENTAPP_IMAGE: str
    MAX_CLIENTS: int
    SUPERLINK: str
    CLIENT_API_ADDRESS: str

# Función para descargar un archivo desde S3
def download_from_s3(s3_url, download_path):
    try:
        s3 = boto3.client('s3')
        parsed_url = urlparse(s3_url)
        bucket_name = parsed_url.netloc
        file_path = parsed_url.path.lstrip('/')

        with open(download_path, 'wb') as file:
            s3.download_fileobj(bucket_name, file_path)
        print(f"Archivo descargado desde S3 a: {download_path}")
    except NoCredentialsError:
        raise HTTPException(status_code=400, detail="No se encontraron credenciales para acceder a S3.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al descargar archivo desde S3: {str(e)}")

# Función para correr subprocess y mostrar logs en consola
def run_subprocess(command):
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True
        )
        print(f"Comando ejecutado: {' '.join(command)}")
        print("STDOUT:")
        print(result.stdout)
        print("STDERR:")
        print(result.stderr)
    except subprocess.CalledProcessError as e:
        print(f"Error ejecutando: {' '.join(command)}")
        print("STDOUT:")
        print(e.stdout)
        print("STDERR:")
        print(e.stderr)
        raise

@router.post("/listener/{asset_name}")
async def receive_transfer(asset_name: str, request: DataTransferRequest):
    try:
        print("Recibiendo transferencia con los siguientes datos:")
        for key, value in request.dict().items():
            print(f"{key}: {value}")

        if not CONFIG_FILE:
            raise HTTPException(status_code=500, detail="CONFIG_FILE no está definido en las variables de entorno")

        print(f"Ruta del archivo .env: {CONFIG_FILE}")

        # Leer el archivo .env
        with open(CONFIG_FILE, "r") as file:
            lines = file.readlines()

        update_data = {
            "SUPERNODE_IMAGE": request.SUPERNODE_IMAGE,
            "CLIENTAPP_IMAGE": request.CLIENTAPP_IMAGE,
            "MAX_CLIENTS": str(request.MAX_CLIENTS),
            "SUPERLINK": request.SUPERLINK,
            "CLIENT_API_ADDRESS": request.CLIENT_API_ADDRESS,
        }

        # Actualizar el archivo .env
        with open(CONFIG_FILE, "w") as file:
            for line in lines:
                key_value = line.strip().split("=", 1)
                if len(key_value) == 2:
                    key, _ = key_value
                    file.write(f"{key}={update_data.get(key, line.strip().split('=')[1])}\n")
                else:
                    file.write(line)

        print("Archivo .env actualizado con éxito.")

    except Exception as e:
        print(f"Error al procesar la transferencia: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al procesar la transferencia.")

    try:
        print("Ejecutando scripts de inicialización...")

        run_subprocess(["python", "/code/app/flower/initialize_flower_settings.py"])
        run_subprocess(["python", "/code/app/flower/client_deployer.py"])

        print("Scripts ejecutados con éxito.")

    except Exception:
        raise HTTPException(status_code=500, detail="Error al ejecutar los scripts.")

@router.post("/set-data-source")
async def set_data_source(
    type: str = Query(..., regex="^(local|remote|flower)$"),
    remote_url: str = Query(None),
    file: UploadFile = File(None)
):
    try:
        print("Configurando fuente de datos...")

        update_data = {"DATA_SOURCE_TYPE": type}
        timestamp = str(int(time.time()))

        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

        if type == "local":
            if not file:
                raise HTTPException(status_code=400, detail="Debe proporcionar un archivo para tipo 'local'.")
            file_location = os.path.join(UPLOAD_FOLDER, f"{timestamp}_{file.filename}")
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            print(f"Archivo subido localmente: {file_location}")
            update_data["LOCAL_DATA_FILE"] = file_location

        elif type == "remote":
            if not remote_url:
                raise HTTPException(status_code=400, detail="Debe proporcionar una URL remota para tipo 'remote'.")
            filename = remote_url.split("/")[-1]
            file_location = os.path.join(UPLOAD_FOLDER, f"{timestamp}_{filename}")

            if remote_url.startswith("s3://"):
                download_from_s3(remote_url, file_location)
            else:
                response = requests.get(remote_url)
                if response.status_code != 200:
                    raise HTTPException(status_code=400, detail="Error al descargar archivo remoto.")
                with open(file_location, "wb") as f:
                    f.write(response.content)
                print(f"Archivo descargado de URL remota: {file_location}")

            update_data["REMOTE_DATA_FILE"] = file_location

        # Actualizar el archivo .env con nueva fuente de datos
        with open(CONFIG_FILE, "r") as file:
            lines = file.readlines()

        with open(CONFIG_FILE, "w") as file:
            for line in lines:
                key_value = line.strip().split("=", 1)
                if len(key_value) == 2:
                    key, _ = key_value
                    file.write(f"{key}={update_data.get(key, line.strip().split('=')[1])}\n")
                else:
                    file.write(line)

        print("Fuente de datos actualizada en el archivo .env.")

    except Exception as e:
        print(f"Error configurando la fuente de datos: {str(e)}")
        raise HTTPException(status_code=500, detail="Error configurando la fuente de datos.")
