#!/bin/bash

# Script para construir y subir la imagen del frontend con las variables de SharePoint
# Este script debe ejecutarse desde el directorio k8s

set -e

echo "════════════════════════════════════════════════════════"
echo "   Building Frontend with SharePoint Integration       "
echo "════════════════════════════════════════════════════════"
echo ""

# Variables de configuración
IMAGE_NAME="xmendialdua/poc-next-frontend"
IMAGE_TAG="latest"

# Valores de las variables NEXT_PUBLIC_*
NEXT_PUBLIC_API_URL="http://ds-management.51.178.94.25.nip.io"
NEXT_PUBLIC_APP_NAME="POC Next Dashboard"
NEXT_PUBLIC_APP_VERSION="0.1.0"
NEXT_PUBLIC_AZURE_CLIENT_ID="a1fc2076-f046-4a0f-90e7-4601aeb5b856"
NEXT_PUBLIC_AZURE_TENANT_ID="910ac815-f855-4a08-bf29-90b46552cf11"
NEXT_PUBLIC_AZURE_REDIRECT_URI="http://ds-management.51.178.94.25.nip.io/sharepoint-data"
NEXT_PUBLIC_SHAREPOINT_SITE_URL="https://ikerlan.sharepoint.com/sites/IKDataSpace"

# Navegar al directorio del frontend
cd ../frontend

echo "🔨 Building Docker image with build arguments..."
docker build \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
  --build-arg NEXT_PUBLIC_APP_NAME="${NEXT_PUBLIC_APP_NAME}" \
  --build-arg NEXT_PUBLIC_APP_VERSION="${NEXT_PUBLIC_APP_VERSION}" \
  --build-arg NEXT_PUBLIC_AZURE_CLIENT_ID="${NEXT_PUBLIC_AZURE_CLIENT_ID}" \
  --build-arg NEXT_PUBLIC_AZURE_TENANT_ID="${NEXT_PUBLIC_AZURE_TENANT_ID}" \
  --build-arg NEXT_PUBLIC_AZURE_REDIRECT_URI="${NEXT_PUBLIC_AZURE_REDIRECT_URI}" \
  --build-arg NEXT_PUBLIC_SHAREPOINT_SITE_URL="${NEXT_PUBLIC_SHAREPOINT_SITE_URL}" \
  -t ${IMAGE_NAME}:${IMAGE_TAG} \
  -f Dockerfile .

echo ""
echo "✅ Image built successfully: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""

read -p "¿Deseas subir la imagen a Docker Hub? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "📤 Pushing image to Docker Hub..."
    docker push ${IMAGE_NAME}:${IMAGE_TAG}
    echo ""
    echo "✅ Image pushed successfully!"
    echo ""
    echo "Para redesplegar en Kubernetes, ejecuta:"
    echo "  cd ../k8s"
    echo "  kubectl rollout restart deployment/poc-next-frontend -n ds-management-ui"
else
    echo ""
    echo "⚠️  Imagen no subida. Para desplegar localmente, asegúrate de que el cluster"
    echo "   tenga acceso a la imagen."
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "   Build completed                                      "
echo "════════════════════════════════════════════════════════"
