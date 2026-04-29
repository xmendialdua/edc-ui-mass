#!/bin/bash
# Script para verificar la configuración BDRS después del despliegue

export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

echo "=========================================="
echo "1. Verificando variables BDRS en IKLN"
echo "=========================================="
echo ""
echo "--- Variables con nuevo prefijo TX_EDC_IAM_IATP ---"
kubectl exec -n umbrella deployment/ikln-edc-controlplane -- env | grep TX_EDC_IAM_IATP_BDRS | sort
echo ""
echo "--- Variables deprecated TX_IAM_IATP ---"
kubectl exec -n umbrella deployment/ikln-edc-controlplane -- env | grep TX_IAM_IATP_BDRS | grep -v TX_EDC | sort
echo ""

echo "=========================================="
echo "2. Verificando variables BDRS en MASS"
echo "=========================================="
echo ""
echo "--- Variables con nuevo prefijo TX_EDC_IAM_IATP ---"
kubectl exec -n umbrella deployment/mass-edc-controlplane -- env | grep TX_EDC_IAM_IATP_BDRS | sort
echo ""
echo "--- Variables deprecated TX_IAM_IATP ---"
kubectl exec -n umbrella deployment/mass-edc-controlplane -- env | grep TX_IAM_IATP_BDRS | grep -v TX_EDC | sort
echo ""

echo "=========================================="
echo "3. Verificando warnings de deprecación"
echo "=========================================="
echo ""
echo "--- IKLN logs ---"
kubectl logs -n umbrella deployment/ikln-edc-controlplane --tail=100 | grep -i "deprecated.*bdrs" || echo "✅ No hay warnings de deprecación en IKLN"
echo ""
echo "--- MASS logs ---"
kubectl logs -n umbrella deployment/mass-edc-controlplane --tail=100 | grep -i "deprecated.*bdrs" || echo "✅ No hay warnings de deprecación en MASS"
echo ""

echo "=========================================="
echo "4. Probando consulta de catálogo"
echo "=========================================="
echo ""
echo "Ejecutando: curl catalog request de IKLN a MASS..."
curl -k -X POST "https://edc-ikln-control.51.178.94.25.nip.io/management/v3/catalog/request" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: ikln-api-key-change-in-production" \
  -d '{
    "@context": {
      "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
    },
    "counterPartyAddress": "http://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp",
    "counterPartyId": "BPNL00000000MASS",
    "protocol": "dataspace-protocol-http"
  }' | jq .

echo ""
echo "=========================================="
echo "Verificación completada"
echo "=========================================="
echo ""
echo "✅ Si ves TX_EDC_IAM_IATP_BDRS_SERVER_URL apuntando a bdrs-server.portal:8081"
echo "✅ Si no hay warnings de deprecación"
echo "✅ Si la consulta de catálogo devuelve datos (no error 401 ni 404)"
echo "   ➡️  Entonces el problema está RESUELTO"
echo ""
