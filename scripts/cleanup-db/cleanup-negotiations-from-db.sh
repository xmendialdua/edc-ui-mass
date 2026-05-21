#!/bin/bash

# Script genérico para eliminar negociaciones de cualquier conector EDC
# Uso: ./cleanup-negotiations-from-db.sh <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME> [all|terminated|failed|old|stuck]
#
# Ejemplos:
#   ./cleanup-negotiations-from-db.sh ikln-edc-postgresql-0 dbpassworddataconsumerone IKLN terminated
#   ./cleanup-negotiations-from-db.sh mass-edc-postgresql-0 dbpassworddataproviderone MASS all

set -o pipefail

# Validar argumentos
if [ $# -lt 3 ]; then
  echo "❌ Error: Faltan argumentos"
  echo ""
  echo "Uso: $0 <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME> [FILTER]"
  echo ""
  echo "Argumentos:"
  echo "  POD_NAME        - Nombre del pod PostgreSQL (ej: ikln-edc-postgresql-0)"
  echo "  DB_PASSWORD     - Contraseña de la base de datos"
  echo "  CONNECTOR_NAME  - Nombre del conector para mensajes (ej: IKLN, MASS)"
  echo "  FILTER          - [opcional] all, terminated, failed, old, stuck (default: terminated)"
  echo ""
  exit 1
fi

POD_NAME=$1
DB_PASSWORD=$2
CONNECTOR_NAME=$3
STATE_FILTER=${4:-terminated}

# Configuración fija
NAMESPACE="umbrella"
DB_NAME="edc"
DB_USER="user"
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🧹 Limpiador de Negociaciones - $CONNECTOR_NAME${NC}"
echo "=========================================="

# Construir WHERE clause según filtro
case $STATE_FILTER in
  all)
    WHERE_CLAUSE=""
    echo -e "${YELLOW}⚠️  ADVERTENCIA: Eliminarás TODAS las negociaciones${NC}"
    echo -e "${RED}⚠️  IMPORTANTE: NO se recomienda eliminar negociaciones FINALIZED con contratos activos${NC}"
    ;;
  terminated)
    WHERE_CLAUSE="WHERE state = 1500"
    echo -e "${GREEN}🎯 Objetivo: Negociaciones TERMINATED (state=1500)${NC}"
    ;;
  failed)
    WHERE_CLAUSE="WHERE state IN (1500)"
    echo -e "${GREEN}🎯 Objetivo: Negociaciones fallidas (TERMINATED)${NC}"
    ;;
  old)
    WHERE_CLAUSE="WHERE state IN (1500) OR (state < 1300 AND created_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days') * 1000)"
    echo -e "${GREEN}🎯 Objetivo: Negociaciones TERMINATED + antiguas sin finalizar (>7 días)${NC}"
    ;;
  stuck)
    WHERE_CLAUSE="WHERE state < 1300 AND created_at < EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000"
    echo -e "${GREEN}🎯 Objetivo: Negociaciones incompletas con >24h (posiblemente atascadas)${NC}"
    ;;
  *)
    echo -e "${RED}❌ Estado inválido: $STATE_FILTER${NC}"
    echo "Opciones: all, terminated, failed, old, stuck"
    exit 1
    ;;
esac

echo ""
echo "🔧 Configuración:"
echo "   Conector: $CONNECTOR_NAME"
echo "   Namespace: $NAMESPACE"
echo "   Pod: $POD_NAME"
echo "   Base de datos: $DB_NAME"
echo ""

# Verificar acceso al pod
echo "🔍 Verificando acceso a PostgreSQL..."
if ! kubectl -n $NAMESPACE get pod $POD_NAME &> /dev/null; then
  echo -e "${RED}❌ No se puede acceder al pod: $POD_NAME${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Pod encontrado${NC}"

# Probar conexión
echo "🔌 Probando conexión..."
TEST_CONN=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT 1;" 2>&1 | tr -d ' ')
if [ "$TEST_CONN" != "1" ]; then
  echo -e "${RED}❌ Error de conexión a PostgreSQL${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Conexión exitosa${NC}"

# Contar negociaciones
echo ""
echo "📊 Contando negociaciones..."
COUNT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_contract_negotiation $WHERE_CLAUSE;" 2>&1 | tr -d ' ')

if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
  echo -e "${GREEN}✅ No hay negociaciones para eliminar${NC}"
  exit 0
fi

echo -e "${YELLOW}📋 Encontradas $COUNT negociaciones${NC}"
echo ""

# Mostrar lista
echo "📝 Lista de negociaciones a eliminar:"
kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c \
  "SELECT contractnegotiation_id as id, 
          CASE state 
            WHEN 1300 THEN 'FINALIZED'
            WHEN 1500 THEN 'TERMINATED'
            ELSE state::text 
          END as state_name, 
          state,
          contractagreement_id as contract_id,
          counterparty_id,
          to_timestamp(created_at/1000) as created 
   FROM edc_contract_negotiation $WHERE_CLAUSE 
   ORDER BY created_at DESC;"

echo ""
echo "=========================================="
echo -e "${YELLOW}📊 RESUMEN: $COUNT negociaciones serán eliminadas${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}⚠️  Esta acción NO se puede deshacer${NC}"
read -p "¿Confirmar? (escribe SI): " confirm

if [ "$confirm" != "SI" ]; then
  echo -e "${RED}❌ Cancelado${NC}"
  exit 0
fi

# Eliminar
echo ""
echo "🗑️  Eliminando..."
DELETED=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \
  "WITH deleted AS (DELETE FROM edc_contract_negotiation $WHERE_CLAUSE RETURNING *) SELECT COUNT(*) FROM deleted;" | tr -d ' ')

echo ""
echo -e "${GREEN}✅ Eliminadas $DELETED negociaciones${NC}"
echo -e "${GREEN}✅ Limpieza completada${NC}"
