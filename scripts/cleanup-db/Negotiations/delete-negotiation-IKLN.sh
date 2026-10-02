#!/bin/bash

# Elimina una sola negociación del conector IKLN a partir de su ID
# Uso: ./delete-negotiation-IKLN.sh <NEGOTIATION_ID>

NAMESPACE="umbrella"
POD_NAME="ikln-edc-postgresql-0"
DB_PASSWORD="dbpassworddataconsumerone"
DB_NAME="edc"
DB_USER="user"
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ $# -ne 1 ]; then
  echo "Uso: $0 <NEGOTIATION_ID>"
  echo ""
  echo "Ejemplo:"
  echo "  $0 urn:uuid:12345678-abcd-1234-abcd-1234567890ab"
  exit 1
fi

NEGOTIATION_ID="$1"

echo -e "${GREEN}🗑️  Eliminar negociación - IKLN${NC}"
echo "============================================"

# Verificar acceso al pod
if ! kubectl -n "$NAMESPACE" get pod "$POD_NAME" &> /dev/null; then
  echo -e "${RED}❌ No se puede acceder al pod: $POD_NAME${NC}"
  exit 1
fi

# Buscar la negociación
echo "🔍 Buscando negociación: $NEGOTIATION_ID"
ROW=$(kubectl -n "$NAMESPACE" exec -i "$POD_NAME" -- env PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT id,
          contract_offers->0->>'assetId' AS asset,
          CASE state
            WHEN 200  THEN 'INITIAL'
            WHEN 400  THEN 'REQUESTING'
            WHEN 500  THEN 'REQUESTED'
            WHEN 600  THEN 'OFFERING'
            WHEN 700  THEN 'OFFERED'
            WHEN 800  THEN 'ACCEPTING'
            WHEN 900  THEN 'ACCEPTED'
            WHEN 1000 THEN 'AGREEING'
            WHEN 1100 THEN 'AGREED'
            WHEN 1200 THEN 'VERIFYING'
            WHEN 1300 THEN 'FINALIZED'
            WHEN 1500 THEN 'TERMINATED'
            ELSE state::text
          END,
          agreement_id,
          to_timestamp(created_at/1000)
   FROM edc_contract_negotiation
   WHERE id = '$NEGOTIATION_ID';" 2>&1)

if [ -z "$(echo "$ROW" | tr -d ' \n')" ]; then
  echo -e "${RED}❌ No se encontró ninguna negociación con ID: $NEGOTIATION_ID${NC}"
  exit 1
fi

echo ""
echo "📄 Negociación encontrada:"
echo "$ROW"
echo ""
echo -e "${YELLOW}⚠️  Esta acción NO se puede deshacer${NC}"
read -p "¿Confirmar eliminación? (escribe SI): " confirm

if [ "$confirm" != "SI" ]; then
  echo -e "${RED}❌ Cancelado${NC}"
  exit 0
fi

# Eliminar
kubectl -n "$NAMESPACE" exec -i "$POD_NAME" -- env PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "DELETE FROM edc_contract_negotiation WHERE id = '$NEGOTIATION_ID';"

echo ""
echo -e "${GREEN}✅ Negociación eliminada: $NEGOTIATION_ID${NC}"
