import subprocess
import os
import sys
from dotenv import load_dotenv

from kubernetes import client, config  # Asegúrate de importar estos módulos

# Configuración
CONFIG_FILE = "/code/app/flower/client/flower-config.env"  # Asegúrate de que este archivo esté disponible en el pod
YAML_TEMPLATE = "/code/app/flower/client/flower-client.yaml"

# --------------------------------------------------------------------------| CHECKEO DE PREREQUISITOS
def load_env_from_file(filepath): #funcion para cargar los datos del .env
    """Carga las variables de entorno desde un archivo .env en un diccionario."""
    env_vars = {}
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"El archivo de configuración '{filepath}' no existe.")

    with open(filepath, "r") as file:
        for line in file:
            line = line.strip()
            if line and not line.startswith("#"):  # Ignorar líneas vacías y comentarios
                key, value = line.split("=", 1)
                env_vars[key] = value

    return env_vars
# Verificar archivo de configuración
if not os.path.isfile(CONFIG_FILE):
    print(f"El archivo de configuración '{CONFIG_FILE}' no existe. Por favor, créalo primero.")
    sys.exit(1)

# Cargar configuración
load_dotenv(dotenv_path=CONFIG_FILE)

# Obtener el valor de MAX_CLIENTS desde el archivo .env
env_vars = load_env_from_file(CONFIG_FILE)
MAX_CLIENTS = env_vars.get('MAX_CLIENTS')

# Verificar si MAX_CLIENTS está definida
if not MAX_CLIENTS:
    print("MAX_CLIENTS no está definida en el archivo de configuración.")
    sys.exit(1)

# --------------------------------------------------------------------------| FUNCIONES DE ACTUALIZACIÓN DEL .ENV
def update_env_variable(file_path, key, value):
    """Actualiza una variable de entorno en el archivo .env, o la agrega si no existe."""
    with open(file_path, "r") as file:
        lines = file.readlines()

    updated = False
    with open(file_path, "w") as file:
        for line in lines:
            if line.startswith(f"{key}="):
                file.write(f"{key}={value}\n")
                updated = True
            else:
                file.write(line)
        
        if not updated:
            file.write(f"{key}={value}\n")

def initialize_variables():
    # Cargar la configuración de Kubernetes dentro del clúster
    config.load_incluster_config()

    # Crear un cliente de Kubernetes para obtener los pods
    v1 = client.CoreV1Api()

    # Obtener todos los pods en todos los namespaces
    pods = v1.list_pod_for_all_namespaces(watch=False)

    # Contar los pods que tienen 'flower-client' en su nombre
    count = sum(1 for pod in pods.items if 'flower-client' in pod.metadata.name)
    
    print(f"Número de pods 'flower-client' en el clúster: {count}")

    if count >= int(MAX_CLIENTS):
        print(f"Se alcanzó el número máximo de clientes ({MAX_CLIENTS}).")
        sys.exit(1)

    # Asignar ID y Puerto
    FLOWER_CLIENT_NEXT_ID = count
    FLOWER_CLIENT_NEXT_PORT = 9094 + count

    # Actualizar las variables en el archivo .env
    update_env_variable(CONFIG_FILE, 'FLOWER_CLIENT_NEXT_ID', FLOWER_CLIENT_NEXT_ID)
    update_env_variable(CONFIG_FILE, 'FLOWER_CLIENT_NEXT_PORT', FLOWER_CLIENT_NEXT_PORT)

    print(f"Inicialización completada: ID={FLOWER_CLIENT_NEXT_ID}, Puerto={FLOWER_CLIENT_NEXT_PORT}.")
    print(f"Valores guardados en {CONFIG_FILE}")

# --------------------------------------------------------------------------| MAIN
print("Iniciando despliegue de Flower Clients...")
initialize_variables()
