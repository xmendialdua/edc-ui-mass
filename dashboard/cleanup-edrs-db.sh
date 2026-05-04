#!/bin/bash

# Script para eliminar EDRs (Endpoint Data References) directamente de la base de datos PostgreSQL del conector IKLN
# Los EDRs se almacenan en el CONSUMIDOR (IKLN), no en el proveedor
# Uso: ./cleanup-edrs-db.sh [all|asset_id|old]

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
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧹 Limpiador de EDRs - Base de Datos PostgreSQL${NC}"
echo "=========================================="

# Verificar argumento
FILTER=${1:-all}

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

# Construir cláusula WHERE según el filtro
case $FILTER in
  all)
    WHERE_CLAUSE=""
    echo -e "${YELLOW}⚠️  ADVERTENCIA: Eliminarás TODOS los EDRs${NC}"
    ;;
  old)
    # EDRs con más de 7 días
    SEVEN_DAYS_AGO=$(($(date +%s) - 7*24*60*60))
    SEVEN_DAYS_AGO_MS=$((SEVEN_DAYS_AGO * 1000))
    WHERE_CLAUSE="WHERE created_at < $SEVEN_DAYS_AGO_MS"
    echo -e "${GREEN}🎯 Objetivo: EDRs con más de 7 días${NC}"
    ;;
  *)
    # Si no es 'all' ni 'old', asumir que es un asset_id
    WHERE_CLAUSE="WHERE asset_id = '$FILTER'"
    echo -e "${GREEN}🎯 Objetivo: EDRs del asset '$FILTER'${NC}"
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

# Contar EDRs
echo "📊 Contando EDRs..."
echo "   Ejecutando: SELECT COUNT(*) FROM edc_edr_entry $WHERE_CLAUSE"

COUNT_RESULT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_edr_entry $WHERE_CLAUSE;" 2>&1)

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al contar EDRs${NC}"
  echo "Error: $COUNT_RESULT"
  exit 1
fi

COUNT=$(echo "$COUNT_RESULT" | tr -d ' ')

if [ -z "$COUNT" ]; then
  echo -e "${RED}❌ No se pudo obtener el conteo de EDRs${NC}"
  exit 1
fi

if [ "$COUNT" = "0" ]; then
  echo -e "${GREEN}✅ No hay EDRs para eliminar${NC}"
  exit 0
fi

echo -e "${YELLOW}📋 Encontrados $COUNT EDRs${NC}"
echo ""

# Mostrar TODOS los EDRs a eliminar
if [ "$COUNT" -gt 0 ]; then
  echo "📝 Lista COMPLETA de EDRs a eliminar:"
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
  echo "=========================================="
  echo -e "${YELLOW}📊 RESUMEN: $COUNT EDRs serán eliminados${NC}"
  echo "=========================================="
  echo ""
  echo -e "${BLUE}ℹ️  Información:${NC}"
  echo "   - Los EDRs contienen el endpoint y token para acceder a datos"
  echo "   - Se almacenan en el CONSUMIDOR (IKLN), no en el proveedor"
  echo "   - Son creados cuando una transferencia se completa exitosamente"
  echo ""
  echo -e "${YELLOW}⚠️  ADVERTENCIA: Esta acción NO se puede deshacer${NC}"
  echo ""
  read -p "¿Continuar? (escribe 'si' para confirmar): " confirmation
  echo ""
  
  if [ "$confirmation" != "si" ]; then
    echo -e "${BLUE}ℹ️  Operación cancelada${NC}"
    exit 0
  fi
  
  # Realizar la eliminación
  echo "🗑️  Eliminando EDRs de la base de datos..."
  DELETE_RESULT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c "DELETE FROM edc_edr_entry $WHERE_CLAUSE;" 2>&1)
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al eliminar EDRs${NC}"
    echo "Error: $DELETE_RESULT"
    exit 1
  fi
  
  echo -e "${GREEN}✅ EDRs eliminados exitosamente${NC}"
  echo ""
  
  # Verificar conteo final
  echo "📊 Verificando eliminación..."
  FINAL_COUNT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_edr_entry $WHERE_CLAUSE;" 2>&1 | tr -d ' ')
  
  if [ "$FINAL_COUNT" = "0" ]; then
    echo -e "${GREEN}✅ Verificación exitosa: 0 EDRs restantes${NC}"
  else
    echo -e "${YELLOW}⚠️  Atención: Aún quedan $FINAL_COUNT EDRs${NC}"
  fi
  
  # Mostrar total de EDRs restantes en la base de datos
  TOTAL_REMAINING=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_edr_entry;" 2>&1 | tr -d ' ')
  echo ""
  echo -e "${BLUE}ℹ️  Total de EDRs en base de datos: $TOTAL_REMAINING${NC}"
  echo ""
  echo -e "${GREEN}🎉 Limpieza completada!${NC}"
fi
