#!/bin/bash

# Script para construir la aplicación para Kubernetes sin Docker

echo "Verificando versión de Node.js..."
node_version=$(node -v)
echo "Usando Node.js $node_version"

# Verificar si la versión de Node.js es compatible
if [[ ! $node_version =~ ^v1[8-9]\. && ! $node_version =~ ^v2[0-9]\. ]]; then
  echo "ERROR: Se requiere Node.js v18 o superior. Versión actual: $node_version"
  echo "Por favor, actualiza Node.js o usa nvm para cambiar a una versión compatible."
  exit 1
fi

echo "Instalando dependencias..."
npm ci || npm install

echo "Configurando variables de entorno para la construcción..."
export NEXT_PUBLIC_API_URL=http://provider-qna/cp/api/management
export NEXT_PUBLIC_KUBERNETES_ENABLED=true
export NODE_ENV=production

echo "Construyendo la aplicación..."
npm run build

if [ -d ".next" ]; then
  echo "Construcción exitosa. Directorio .next creado."
else
  echo "ERROR: La construcción falló. No se encontró el directorio .next."
  exit 1
fi

echo "Construcción completada con éxito."
echo "Para desplegar en Kubernetes, usa los archivos en el directorio k8s/"
