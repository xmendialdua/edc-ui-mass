#!/bin/bash

# Script genérico para eliminar EDRs de cualquier conector EDC
# Uso: ./cleanup-edrs-from-db.sh <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME> [all|old|ASSET_ID]

set -o pipefail

if [ $# -lt 3 ]; then
  echo "❌ Error: Faltan argumentos"
  echo "Uso: $0 <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME> [FILTER]"
  exit 1
fi

POD_NAME=$1
DB_PASSWORD=$2
CONNECTOR_NAME=$3
FILTER=${4:-all}

NAMESPACE="umbrella"
DB_NAME="edc"
DB_USER="user"
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🧹 Limpiador de EDRs - $CONNECTOR_NAME${NC}"
echo "=========================================="

case $FILTER in
  all)
    WHERE_CLAUSE=""
    echo -e "${YELLOW}⚠️  ADVERTENCIA: Eliminarás TODOS los EDRs${NC}"
    ;;
  old)
    SEVEN_DAYS_AGO=$(($(date +%s) - 7*24*60*60))
    SEVEN_DAYS_AGO_MS=$((SEVEN_DAYS_AGO * 1000))
    WHERE_CLAUSE="WHERE created_at < $SEVEN_DAYS_AGO_MS"
    echo -e "${GREEN}🎯 Objetivo: EDRs con más de 7 días${NC}"
    ;;
  *)
    WHERE_CLAUSE="WHERE asset_id = '$FILTER'"
    echo -e "${GREEN}🎯 Objetivo: EDRs del asset '$FILTER'${NC}"
    ;;
esac

echo ""
echo "🔧 Configuración:"
echo "   Conector: $CONNECTOR_NAME"
echo "   Pod: $POD_NAME"
echo ""

echo "🔍 Verificando acceso..."
if ! kubectl -n $NAMESPACE get pod $POD_NAME &> /dev/null; then
  echo -e "${RED}❌ No se puede acceder al pod${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Pod encontrado${NC}"

TEST_CONN=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT 1;" 2>&1 | tr -d ' ')
if [ "$TEST_CONN" != "1" ]; then
  echo -e "${RED}❌ Error de conexión${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Conexión exitosa${NC}"

echo ""
echo "📊 Contando EDRs..."
COUNT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_edr_entry $WHERE_CLAUSE;" 2>&1 | tr -d ' ')

if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
  echo -e "${GREEN}✅ No hay EDRs para eliminar${NC}"
  exit 0
fi

echo -e "${YELLOW}📋 Encontrados $COUNT EDRs${NC}"
echo ""

kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c \
  "SELECT 
     transfer_process_id, 
     asset_id, 
     provider_id,
     agreement_id,
     to_timestamp(created_at/1000) as created 
   FROM edc_edr_entry $WHERE_CLAUSE 
   ORDER BY created_at DESC;"

echo ""
echo -e "${BLUE}ℹ️  Los EDRs contienen endpoint y token para acceder a datos${NC}"
echo -e "${YELLOW}⚠️  Esta acción NO se puede deshacer${NC}"
read -p "¿Confirmar eliminar $COUNT EDRs? (escribe si): " confirm

if [ "$confirm" != "si" ]; then
  echo -e "${BLUE}ℹ️  Cancelado${NC}"
  exit 0
fi

echo ""
echo "🗑️  Eliminando..."
kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c "DELETE FROM edc_edr_entry $WHERE_CLAUSE;" &> /dev/null

echo -e "${GREEN}✅ EDRs eliminados${NC}"
echo -e "${GREEN}✅ Limpieza completada${NC}"
