#!/bin/bash

# Mensaje de advertencia sobre docker login
echo "⚠️  Antes de continuar debes haber ejecutado 'docker login' para subir imágenes a Docker Hub."
echo "Presiona [Enter] para continuar o [Ctrl+C] para cancelar."
read

# Construir la imagen usando Dockerfile.k8s
echo "Construyendo la imagen Docker..."
docker build -f Dockerfile.k8s -t jalvaro8/iflex-ui:latest .

# Subir la imagen a Docker Hub
echo "Subiendo la imagen a Docker Hub..."
docker push jalvaro8/iflex-ui:latest

# Verificar si el namespace ya existe
kubectl get namespace iflex-ui > /dev/null 2>&1

# Si el namespace no existe, se crea
if [ $? -ne 0 ]; then
    echo "El namespace 'iflex-ui' no existe. Creando..."
    kubectl create namespace iflex-ui
else
    echo "El namespace 'iflex-ui' ya existe."
fi

# Aplicar los archivos YAML
kubectl apply -f k8s/rbac.yaml -n iflex-ui
kubectl apply -f k8s/configmap.yaml -n iflex-ui
kubectl apply -f k8s/deployment.yaml -n iflex-ui
kubectl apply -f k8s/service.yaml -n iflex-ui

echo "Despliegue completado en el namespace 'iflex-ui'."
