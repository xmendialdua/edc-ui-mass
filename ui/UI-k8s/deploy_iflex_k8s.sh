#!/bin/bash

# Mensaje de advertencia sobre docker login
echo "⚠️  Antes de continuar debes haber ejecutado 'docker login' para subir imágenes a Docker Hub."
echo "Presiona [Enter] para continuar o [Ctrl+C] para cancelar."
read

# Construir la imagen usando Dockerfile.k8s
echo "Construyendo la imagen Docker..."
docker build -f Dockerfile.fixed -t jalvaro8/iflex-ui:latest .

# Subir la imagen a Docker Hub
echo "Subiendo la imagen a Docker Hub..."
docker push jalvaro8/iflex-ui:latest

# Verificar si el namespace ya existe
kubectl get namespace iflex-provider > /dev/null 2>&1

# Si el namespace no existe, se crea
if [ $? -ne 0 ]; then
    echo "El namespace 'iflex-provider' no existe. Creando..."
    kubectl create namespace iflex-provider
else
    echo "El namespace 'iflex-provider' ya existe."
fi

# Aplicar los archivos YAML
kubectl apply -f k8s/rbac.yaml -n iflex-provider
kubectl apply -f k8s/configmap.yaml -n iflex-provider
kubectl apply -f k8s/deployment.yaml -n iflex-provider
kubectl apply -f k8s/service.yaml -n iflex-provider

echo "Despliegue completado en el namespace 'iflex-provider'."
