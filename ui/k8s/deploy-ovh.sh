#!/bin/bash

# Script de despliegue para EDC UI en OVH
# Uso: ./deploy-ovh.sh

echo "=============================================="
echo "Despliegue de EDC UI en cluster OVH"
echo "=============================================="
echo ""

# Configurar KUBECONFIG
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

# Verificar conectividad con el cluster
echo "Verificando conexión con cluster OVH..."
if ! kubectl cluster-info &> /dev/null; then
  echo "ERROR: No se puede conectar al cluster OVH"
  echo "Verifica que el archivo kubeconfig.yaml sea correcto y tengas conectividad"
  exit 1
fi

echo "✓ Conexión establecida con el cluster"
echo ""

# Ejecutar el script de despliegue desde el directorio correcto
cd ~/projects/assembly/iflex/ui
bash k8s/deploy.sh
