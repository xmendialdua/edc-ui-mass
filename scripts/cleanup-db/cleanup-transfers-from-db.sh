#!/bin/bash

# Script genérico para eliminar transferencias de cualquier conector EDC
# Uso: ./cleanup-transfers-from-db.sh <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME> [all|started|terminated|failed|completed|old]

set -o pipefail

if [ $# -lt 3 ]; then
  echo "❌ Error: Faltan argumentos"
  echo "Uso: $0 <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME> [FILTER]"
  exit 1
fi

POD_NAME=$1
DB_PASSWORD=$2
CONNECTOR_NAME=$3
STATE_FILTER=${4:-terminated}

NAMESPACE="umbrella"
DB_NAME="edc"
DB_USER="user"
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🧹 Limpiador de Transferencias - $CONNECTOR_NAME${NC}"
echo "=========================================="

case $STATE_FILTER in
  all)
    WHERE_CLAUSE=""
    echo -e "${YELLOW}⚠️  ADVERTENCIA: Eliminarás TODAS las transferencias${NC}"
    ;;
  started)
    WHERE_CLAUSE="WHERE state = 600"
    echo -e "${GREEN}🎯 Objetivo: Transferencias STARTED (600)${NC}"
    ;;
  terminated)
    WHERE_CLAUSE="WHERE state = 850"
    echo -e "${GREEN}🎯 Objetivo: Transferencias TERMINATED (850)${NC}"
    ;;
  failed)
    WHERE_CLAUSE="WHERE state = 900"
    echo -e "${GREEN}🎯 Objetivo: Transferencias FAILED (900)${NC}"
    ;;
  completed)
    WHERE_CLAUSE="WHERE state = 500"
    echo -e "${GREEN}🎯 Objetivo: Transferencias COMPLETED (500)${NC}"
    ;;
  old)
    WHERE_CLAUSE="WHERE state IN (500, 850, 900)"
    echo -e "${GREEN}🎯 Objetivo: Transferencias finalizadas${NC}"
    ;;
  *)
    echo -e "${RED}❌ Estado inválido: $STATE_FILTER${NC}"
    echo "Opciones: all, started, terminated, failed, completed, old"
    exit 1
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
echo "📊 Contando transferencias..."
COUNT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_transfer_process $WHERE_CLAUSE;" 2>&1 | tr -d ' ')

if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
  echo -e "${GREEN}✅ No hay transferencias para eliminar${NC}"
  exit 0
fi

echo -e "${YELLOW}📋 Encontradas $COUNT transferencias${NC}"
echo ""

kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c \
  "SELECT transferprocess_id as id, 
          CASE state 
            WHEN 600 THEN 'STARTED' 
            WHEN 850 THEN 'TERMINATED' 
            WHEN 900 THEN 'FAILED' 
            WHEN 500 THEN 'COMPLETED' 
            ELSE state::text 
          END as state_name, 
          state,
          asset_id, 
          to_timestamp(created_at/1000) as created 
   FROM edc_transfer_process $WHERE_CLAUSE 
   ORDER BY created_at DESC;"

echo ""
echo -e "${YELLOW}⚠️  Esta acción NO se puede deshacer${NC}"
read -p "¿Confirmar eliminar $COUNT transferencias? (escribe SI): " confirm

if [ "$confirm" != "SI" ]; then
  echo -e "${RED}❌ Cancelado${NC}"
  exit 0
fi

echo ""
echo "🗑️  Eliminando..."
DELETED=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \
  "WITH deleted AS (DELETE FROM edc_transfer_process $WHERE_CLAUSE RETURNING *) SELECT COUNT(*) FROM deleted;" | tr -d ' ')

echo -e "${GREEN}✅ Eliminadas $DELETED transferencias${NC}"
echo -e "${GREEN}✅ Limpieza completada${NC}"
