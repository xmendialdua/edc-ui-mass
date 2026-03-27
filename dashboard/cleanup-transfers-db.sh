#!/bin/bash

# Script para eliminar transferencias directamente de la base de datos PostgreSQL del conector IKLN
# Uso: ./cleanup-transfers-db.sh [all|terminated|failed|completed]

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

echo -e "${GREEN}🧹 Limpiador de Transferencias - Base de Datos PostgreSQL${NC}"
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

# Mapeo de estados EDC (son integers)
# 600 = STARTED
# 850 = TERMINATED  
# 900 = FAILED
# 500 = COMPLETED

case $STATE_FILTER in
  all)
    WHERE_CLAUSE=""
    echo -e "${YELLOW}⚠️  ADVERTENCIA: Eliminarás TODAS las transferencias${NC}"
    ;;
  started)
    WHERE_CLAUSE="WHERE state = 600"
    echo -e "${GREEN}🎯 Objetivo: Transferencias STARTED (state=600)${NC}"
    ;;
  terminated)
    WHERE_CLAUSE="WHERE state = 850"
    echo -e "${GREEN}🎯 Objetivo: Transferencias TERMINATED (state=850)${NC}"
    ;;
  failed)
    WHERE_CLAUSE="WHERE state = 900"
    echo -e "${GREEN}🎯 Objetivo: Transferencias FAILED (state=900)${NC}"
    ;;
  completed)
    WHERE_CLAUSE="WHERE state = 500"
    echo -e "${GREEN}🎯 Objetivo: Transferencias COMPLETED (state=500)${NC}"
    ;;
  old)
    WHERE_CLAUSE="WHERE state IN (500, 850, 900)"
    echo -e "${GREEN}🎯 Objetivo: Transferencias finalizadas (COMPLETED, TERMINATED, FAILED)${NC}"
    ;;
  *)
    echo -e "${RED}❌ Estado inválido. Usa: all, started, terminated, failed, completed, old${NC}"
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

# Contar transferencias
echo "📊 Contando transferencias..."
echo "   Ejecutando: SELECT COUNT(*) FROM edc_transfer_process $WHERE_CLAUSE"

COUNT_RESULT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_transfer_process $WHERE_CLAUSE;" 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al contar transferencias${NC}"
  echo "Error: $COUNT_RESULT"
  exit 1
fi

COUNT=$(echo "$COUNT_RESULT" | tr -d ' ')

if [ -z "$COUNT" ]; then
  echo -e "${RED}❌ No se pudo obtener el conteo de transferencias${NC}"
  exit 1
fi

if [ "$COUNT" = "0" ]; then
  echo -e "${GREEN}✅ No hay transferencias para eliminar${NC}"
  exit 0
fi

echo -e "${YELLOW}📋 Encontradas $COUNT transferencias${NC}"
echo ""

# Mostrar TODAS las transferencias a eliminar
if [ "$COUNT" -gt 0 ]; then
  echo "📝 Lista COMPLETA de transferencias a eliminar:"
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
            asset_id, 
            to_timestamp(created_at/1000) as created 
     FROM edc_transfer_process $WHERE_CLAUSE 
     ORDER BY created_at DESC;"
  
  echo ""
  echo "=========================================="
  echo -e "${YELLOW}📊 RESUMEN: $COUNT transferencias serán eliminadas${NC}"
  echo "=========================================="
fi

echo ""
echo -e "${YELLOW}⚠️  Esta acción NO se puede deshacer${NC}"
echo -e "${YELLOW}⚠️  Revisa la lista anterior antes de confirmar${NC}"
echo ""
read -p "¿Confirmas que quieres eliminar estas $COUNT transferencias? (escribe SI en mayúsculas): " confirm

if [ "$confirm" != "SI" ]; then
  echo -e "${RED}❌ Operación cancelada${NC}"
  exit 0
fi

echo ""
echo "🗑️  Eliminando transferencias..."

# Eliminar
DELETED=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \
  "WITH deleted AS (DELETE FROM edc_transfer_process $WHERE_CLAUSE RETURNING *) SELECT COUNT(*) FROM deleted;" | tr -d ' ')

echo ""
if [ "$DELETED" = "$COUNT" ]; then
  echo -e "${GREEN}✅ Eliminadas $DELETED transferencias exitosamente${NC}"
else
  echo -e "${YELLOW}⚠️  Se esperaban $COUNT pero se eliminaron $DELETED${NC}"
fi

# Mostrar resumen final
REMAINING=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM edc_transfer_process;" | tr -d ' ')

echo ""
echo "📊 Resumen:"
echo "   • Eliminadas: $DELETED"
echo "   • Restantes en base de datos: $REMAINING"
echo ""
echo -e "${GREEN}✅ Limpieza completada${NC}"
