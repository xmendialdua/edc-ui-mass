#!/bin/bash

# Script para eliminar negociaciones directamente de la base de datos PostgreSQL del conector IKLN
# Uso: ./cleanup-negotiations-db.sh [all|terminated|failed|old]

# No usar set -e para manejar errores manualmente
set -o pipefail

NAMESPACE="umbrella"
POD_NAME="ikln-edc-postgresql-0"
DB_NAME="edc"
DB_USER="user"
DB_PASSWORD="dbpassworddataconsumerone"

# Configurar kubeconfig
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧹 Limpiador de Negociaciones - Base de Datos PostgreSQL${NC}"
echo "=========================================="

# Verificar argumento
STATE_FILTER=${1:-terminated}

# Mostrar información de conexión
echo ""
echo "🔧 Configuración:"
echo "   Namespace: $NAMESPACE"
echo "   Pod: $POD_NAME"
echo "   Base de datos: $DB_NAME"
echo "   Usuario: $DB_USER"
echo "   Contraseña: ${DB_PASSWORD:0:8}... (primeros 8 caracteres)"
echo "   KUBECONFIG: $KUBECONFIG"
echo ""

# Mapeo de estados EDC para negociaciones (son integers)
# Estados típicos de ContractNegotiationStates:
# 100  = INITIAL
# 200  = REQUESTING
# 300  = REQUESTED
# 400  = OFFERING
# 500  = OFFERED
# 600  = ACCEPTING
# 700  = ACCEPTED
# 800  = AGREEING
# 900  = AGREED
# 1000 = VERIFYING
# 1100 = VERIFIED
# 1200 = FINALIZING
# 1300 = FINALIZED (contrato completado exitosamente)
# 1400 = TERMINATING
# 1500 = TERMINATED (negociación cancelada/fallida)

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
    echo -e "${RED}❌ Estado inválido. Usa: all, terminated, failed, old, stuck${NC}"
    echo ""
    echo "Opciones disponibles:"
    echo "  • all        - TODAS las negociaciones (⚠️ PELIGROSO)"
    echo "  • terminated - Solo negociaciones TERMINATED"
    echo "  • failed     - Negociaciones fallidas"
    echo "  • old        - TERMINATED + incompletas >7 días"
    echo "  • stuck      - Incompletas >24h (no FINALIZED)"
    exit 1
    ;;
esac

echo ""

# Verificar acceso al pod
echo "🔍 Verificando acceso a PostgreSQL..."
if ! kubectl -n $NAMESPACE get pod $POD_NAME &> /dev/null; then
  echo -e "${RED}❌ No se puede acceder al pod de PostgreSQL: $POD_NAME${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Pod encontrado: $POD_NAME${NC}"
echo ""

# Probar conexión a PostgreSQL
echo "🔌 Probando conexión a PostgreSQL..."
TEST_CONN=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT 1;" 2>&1 | tr -d ' ')

if [ "$TEST_CONN" != "1" ]; then
  echo -e "${RED}❌ Error de conexión a PostgreSQL${NC}"
  echo "Respuesta: $TEST_CONN"
  exit 1
fi

echo -e "${GREEN}✅ Conexión exitosa a PostgreSQL${NC}"
echo ""

# Verificar que existe la tabla de negociaciones
echo "🔍 Verificando tabla de negociaciones..."
TABLE_EXISTS=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'edc_contract_negotiation');" 2>&1 | tr -d ' ')

if [ "$TABLE_EXISTS" != "t" ]; then
  echo -e "${RED}❌ Tabla 'edc_contract_negotiation' no encontrada${NC}"
  echo "   Puede que el nombre de la tabla sea diferente."
  echo ""
  echo "   Tablas disponibles con 'negotiation' en el nombre:"
  kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c \
    "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%negotiat%';"
  exit 1
fi

echo -e "${GREEN}✅ Tabla 'edc_contract_negotiation' encontrada${NC}"
echo ""

# Contar negociaciones
echo "📊 Contando negociaciones..."
echo "   Ejecutando: SELECT COUNT(*) FROM edc_contract_negotiation $WHERE_CLAUSE"

COUNT_RESULT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_contract_negotiation $WHERE_CLAUSE;" 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al contar negociaciones${NC}"
  echo "Error: $COUNT_RESULT"
  exit 1
fi

COUNT=$(echo "$COUNT_RESULT" | tr -d ' ')

if [ -z "$COUNT" ]; then
  echo -e "${RED}❌ No se pudo obtener el conteo de negociaciones${NC}"
  exit 1
fi

if [ "$COUNT" = "0" ]; then
  echo -e "${GREEN}✅ No hay negociaciones para eliminar${NC}"
  exit 0
fi

echo -e "${YELLOW}📋 Encontradas $COUNT negociaciones${NC}"
echo ""

# Mostrar TODAS las negociaciones a eliminar
if [ "$COUNT" -gt 0 ]; then
  echo "📝 Lista COMPLETA de negociaciones a eliminar:"
  echo ""
  kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c \
    "SELECT contractnegotiation_id as id, 
            CASE state 
              WHEN 100  THEN 'INITIAL' 
              WHEN 200  THEN 'REQUESTING'
              WHEN 300  THEN 'REQUESTED'
              WHEN 400  THEN 'OFFERING'
              WHEN 500  THEN 'OFFERED'
              WHEN 600  THEN 'ACCEPTING'
              WHEN 700  THEN 'ACCEPTED'
              WHEN 800  THEN 'AGREEING'
              WHEN 900  THEN 'AGREED'
              WHEN 1000 THEN 'VERIFYING'
              WHEN 1100 THEN 'VERIFIED'
              WHEN 1200 THEN 'FINALIZING'
              WHEN 1300 THEN 'FINALIZED'
              WHEN 1400 THEN 'TERMINATING'
              WHEN 1500 THEN 'TERMINATED'
              ELSE state::text 
            END as state_name, 
            state as state_code,
            contractagreement_id as contract_id,
            counterparty_id as counterparty,
            to_timestamp(created_at/1000) as created 
     FROM edc_contract_negotiation $WHERE_CLAUSE 
     ORDER BY created_at DESC;"
  
  echo ""
  echo "=========================================="
  echo -e "${YELLOW}📊 RESUMEN: $COUNT negociaciones serán eliminadas${NC}"
  echo "=========================================="
fi

# Advertencia especial si se incluyen negociaciones FINALIZED
if [ "$STATE_FILTER" = "all" ]; then
  FINALIZED_COUNT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM edc_contract_negotiation WHERE state = 1300;" 2>&1 | tr -d ' ')
  
  if [ "$FINALIZED_COUNT" -gt 0 ]; then
    echo ""
    echo -e "${RED}⚠️⚠️⚠️  ADVERTENCIA CRÍTICA  ⚠️⚠️⚠️${NC}"
    echo -e "${RED}Se eliminarán $FINALIZED_COUNT negociaciones FINALIZED con contratos activos${NC}"
    echo -e "${RED}Esto podría afectar transferencias que dependen de esos contratos${NC}"
    echo ""
  fi
fi

echo ""
echo -e "${YELLOW}⚠️  Esta acción NO se puede deshacer${NC}"
echo -e "${YELLOW}⚠️  Revisa la lista anterior antes de confirmar${NC}"
echo ""
read -p "¿Confirmas que quieres eliminar estas $COUNT negociaciones? (escribe SI en mayúsculas): " confirm

if [ "$confirm" != "SI" ]; then
  echo -e "${RED}❌ Operación cancelada${NC}"
  exit 0
fi

echo ""
echo "🗑️  Eliminando negociaciones..."

# Eliminar
DELETED=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \
  "WITH deleted AS (DELETE FROM edc_contract_negotiation $WHERE_CLAUSE RETURNING *) SELECT COUNT(*) FROM deleted;" | tr -d ' ')

echo ""
if [ "$DELETED" = "$COUNT" ]; then
  echo -e "${GREEN}✅ Eliminadas $DELETED negociaciones exitosamente${NC}"
else
  echo -e "${YELLOW}⚠️  Se esperaban $COUNT pero se eliminaron $DELETED${NC}"
fi

# Mostrar resumen final
REMAINING=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM edc_contract_negotiation;" | tr -d ' ')

echo ""
echo "📊 Resumen:"
echo "   • Eliminadas: $DELETED"
echo "   • Restantes en base de datos: $REMAINING"
echo ""

# Mostrar estadísticas de estados restantes
echo "📊 Distribución de estados restantes:"
kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c \
  "SELECT 
      CASE state 
        WHEN 100  THEN 'INITIAL' 
        WHEN 200  THEN 'REQUESTING'
        WHEN 300  THEN 'REQUESTED'
        WHEN 400  THEN 'OFFERING'
        WHEN 500  THEN 'OFFERED'
        WHEN 600  THEN 'ACCEPTING'
        WHEN 700  THEN 'ACCEPTED'
        WHEN 800  THEN 'AGREEING'
        WHEN 900  THEN 'AGREED'
        WHEN 1000 THEN 'VERIFYING'
        WHEN 1100 THEN 'VERIFIED'
        WHEN 1200 THEN 'FINALIZING'
        WHEN 1300 THEN 'FINALIZED'
        WHEN 1400 THEN 'TERMINATING'
        WHEN 1500 THEN 'TERMINATED'
        ELSE state::text 
      END as estado, 
      COUNT(*) as cantidad
   FROM edc_contract_negotiation 
   GROUP BY state 
   ORDER BY state;"

echo ""
echo -e "${GREEN}✅ Limpieza completada${NC}"
