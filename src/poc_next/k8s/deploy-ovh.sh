#!/bin/bash

# Script de despliegue para POC Next en OVH
# Uso: ./deploy-ovh.sh

echo "════════════════════════════════════════════════════════"
echo "   Desplegando POC Next en OVH Kubernetes Cluster      "
echo "════════════════════════════════════════════════════════"
echo ""

# Configurar KUBECONFIG para el cluster OVH
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

# Verificación de conectividad con el cluster
echo "🔍 Verificando conectividad con el cluster..."
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Error: No se puede conectar al cluster de Kubernetes"
    echo "   Verifica que el KUBECONFIG esté configurado correctamente"
    exit 1
fi

echo "✓ Conectado al cluster de Kubernetes"
echo ""

# Obtener el directorio actual del script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Ejecutar el script de despliegue principal
echo "🚀 Ejecutando despliegue..."
bash "${SCRIPT_DIR}/deploy.sh"

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "════════════════════════════════════════════════════════"
    echo "   ✅ Despliegue completado exitosamente               "
    echo "════════════════════════════════════════════════════════"
    echo ""
    echo "📍 URLs de acceso:"
    echo "   - Data Publication:     http://ds-management.51.178.94.25.nip.io/data-publication"
    echo "   - Partner Data:         http://ds-management.51.178.94.25.nip.io/partner-data"
    echo "   - Sharepoint Data:      http://ds-management.51.178.94.25.nip.io/sharepoint-data"
    echo ""
    echo "🔍 Comandos útiles:"
    echo "   kubectl get pods -n ds-management-ui"
    echo "   kubectl logs -f deployment/poc-next-frontend -n ds-management-ui"
    echo "   kubectl logs -f deployment/poc-next-backend -n ds-management-ui"
else
    echo ""
    echo "❌ Error durante el despliegue (código: $exit_code)"
fi

exit $exit_code
