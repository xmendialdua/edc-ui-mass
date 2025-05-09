import subprocess
import os

def deploy_mlflow():
    """Despliega MLflow en el clúster de Kubernetes utilizando Helm."""
    
    # Ruta al archivo de configuración de Helm
    mlflow_yaml_path = "/code/app/mlflow/values-mlflow-stack.yaml"
    
    # Verificar si el archivo de configuración existe
    if not os.path.exists(mlflow_yaml_path):
        raise FileNotFoundError(f"El archivo de configuración de MLflow no se encuentra en {mlflow_yaml_path}")
    
    # Comando para desplegar MLflow con Helm
    command = [
        "helm", "upgrade", "--install", "mlflow", "bitnami/mlflow",
        "-f", mlflow_yaml_path,
        "--namespace", "mlflow"
    ]
    
    # Ejecutar el comando de Helm
    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        return {"message": "MLflow desplegado exitosamente", "output": result.stdout}
    
    except subprocess.CalledProcessError as e:
        return {"error": "Hubo un problema al intentar desplegar MLflow", "details": e.stderr}

result = deploy_mlflow()

if "message" in result:
    print(result["message"])
else:
    print(result["error"], "-", result["details"])

