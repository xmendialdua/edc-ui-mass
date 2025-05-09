import os
from kubernetes import client, config
from kubernetes.client.rest import ApiException

# Ruta del archivo de configuración
CONFIG_FILE = "/code/app/flower/client/flower-config.env"

def load_env_from_file(filepath):
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

def deploy_pod():
    try:
        # Cargar configuración desde el ServiceAccount del pod
        config.load_incluster_config()

        # Cargar variables desde el archivo .env
        env_vars = load_env_from_file(CONFIG_FILE)

        # Obtener las variables necesarias
        SUPERNODE_IMAGE = env_vars.get('SUPERNODE_IMAGE')
        CLIENTAPP_IMAGE = env_vars.get('CLIENTAPP_IMAGE')
        MAX_CLIENTS = env_vars.get('MAX_CLIENTS')
        SUPERLINK = env_vars.get('SUPERLINK')
        CLIENT_API_ADDRESS = env_vars.get('CLIENT_API_ADDRESS')
        FLOWER_CLIENT_NEXT_ID = env_vars.get('FLOWER_CLIENT_NEXT_ID')
        FLOWER_CLIENT_NEXT_PORT = env_vars.get('FLOWER_CLIENT_NEXT_PORT')

        # Asegurarse de que las variables necesarias están disponibles
        if not all([SUPERNODE_IMAGE, CLIENTAPP_IMAGE, MAX_CLIENTS, SUPERLINK, FLOWER_CLIENT_NEXT_ID, FLOWER_CLIENT_NEXT_PORT]):
            raise ValueError("Faltan variables necesarias en el archivo de configuración.")

        # Convertir los valores numéricos a enteros
        FLOWER_CLIENT_NEXT_ID = int(FLOWER_CLIENT_NEXT_ID)
        FLOWER_CLIENT_NEXT_PORT = int(FLOWER_CLIENT_NEXT_PORT)

        # Crear el manifiesto del pod con las variables dinámicas
        pod_manifest = {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {"name": f"flower-client-{FLOWER_CLIENT_NEXT_ID}", "namespace": "flower"},
            "spec": {
                "containers": [
                    {
                        "name": "flwr-supernode",
                        "image": SUPERNODE_IMAGE,
                        "args": [
                            "--insecure",
                            "--superlink",
                            SUPERLINK,
                            "--node-config",
                            f"partition-id={FLOWER_CLIENT_NEXT_ID} num-partitions={MAX_CLIENTS}",
                            "--clientappio-api-address",
                            f"{CLIENT_API_ADDRESS}:{FLOWER_CLIENT_NEXT_PORT}",
                            "--isolation",
                            "process"
                        ],
                        "ports": [
                            {"name": f"port-{FLOWER_CLIENT_NEXT_PORT}", "containerPort": FLOWER_CLIENT_NEXT_PORT}
                        ]
                    },
                    {
                        "name": "flwr-clientapp",
                        "image": CLIENTAPP_IMAGE,
                        "args": [
                            "--insecure",
                            "--clientappio-api-address",
                            f"localhost:{FLOWER_CLIENT_NEXT_PORT}"
                        ]
                    }
                ]
            }
        }

        # Crear el cliente de la API de Kubernetes
        v1 = client.CoreV1Api()
        
        # Aplicar el manifiesto del pod
        v1.create_namespaced_pod(namespace="flower", body=pod_manifest)

        return {"message": "Pod desplegado exitosamente"}
    
    except ApiException as e:
        return {"message": f"Error en la API de Kubernetes: {str(e)}"}
    except FileNotFoundError as e:
        return {"message": str(e)}
    except Exception as e:
        return {"message": f"Error al desplegar el pod: {str(e)}"}

result = deploy_pod()
print(result["message"])
