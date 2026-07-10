#!/bin/bash

# Script genérico para verificar el estado de la base de datos de cualquier conector EDC
# Muestra el conteo de negociaciones, transferencias y EDRs agrupados por estado
#
# Uso: ./check-db-status.sh <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME>

set -o pipefail

# Validar argumentos
if [ $# -lt 3 ]; then
  echo "❌ Error: Faltan argumentos"
  echo ""
  echo "Uso: $0 <POD_NAME> <DB_PASSWORD> <CONNECTOR_NAME>"
  echo ""
  echo "Argumentos:"
  echo "  POD_NAME        - Nombre del pod PostgreSQL (ej: ikln-edc-postgresql-0)"
  echo "  DB_PASSWORD     - Contraseña de la base de datos"
  echo "  CONNECTOR_NAME  - Nombre del conector para mensajes (ej: IKLN, MASS)"
  echo ""
  exit 1
fi

POD_NAME=$1
DB_PASSWORD=$2
CONNECTOR_NAME=$3

# Configuración fija
NAMESPACE="umbrella"
DB_NAME="edc"
DB_USER="user"
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  📊 ESTADO DE BASE DE DATOS - ${CONNECTOR_NAME}                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar acceso al pod
echo -e "${BLUE}🔍 Verificando acceso a PostgreSQL...${NC}"
if ! kubectl -n $NAMESPACE get pod $POD_NAME &> /dev/null; then
  echo -e "${RED}❌ No se puede acceder al pod: $POD_NAME${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Pod encontrado${NC}"

# Probar conexión
TEST_CONN=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT 1;" 2>&1 | tr -d ' ')
if [ "$TEST_CONN" != "1" ]; then
  echo -e "${RED}❌ Error de conexión a PostgreSQL${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Conexión exitosa${NC}"
echo ""

# === TRANSFERENCIAS ===
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📦 TRANSFERENCIAS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

TRANSFER_COUNT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_transfer_process;" 2>&1 | tr -d ' ')

if [ -z "$TRANSFER_COUNT" ] || [ "$TRANSFER_COUNT" = "0" ]; then
  echo -e "${GREEN}✅ No hay transferencias en la base de datos${NC}"
else
  echo -e "${YELLOW}📋 Total: $TRANSFER_COUNT transferencias${NC}"
  echo ""
  kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c \
    "SELECT 
       state,
       COUNT(*) as count,
       CASE state 
         WHEN 100 THEN 'INITIAL'
         WHEN 200 THEN 'PROVISIONING'
         WHEN 300 THEN 'PROVISIONED'
         WHEN 400 THEN 'REQUESTING'
         WHEN 500 THEN 'REQUESTED'
         WHEN 550 THEN 'STARTING'
         WHEN 600 THEN 'STARTED'
         WHEN 650 THEN 'SUSPENDING'
         WHEN 700 THEN 'SUSPENDED'
         WHEN 750 THEN 'COMPLETING'
         WHEN 800 THEN 'COMPLETED'
         WHEN 850 THEN 'TERMINATED'
         WHEN 900 THEN 'FAILED'
         ELSE 'OTHER(' || state || ')'
       END as state_name
     FROM edc_transfer_process 
     GROUP BY state 
     ORDER BY state;" 2>&1
  
  echo ""
  echo -e "${BLUE}💡 Sugerencia de limpieza:${NC}"
  if echo "$TRANSFER_COUNT" | grep -q "^[0-9]*$" && [ "$TRANSFER_COUNT" -gt 0 ]; then
    echo "   ./cleanup-db-transfers-${CONNECTOR_NAME}.sh all     # Eliminar todas"
    echo "   ./cleanup-db-transfers-${CONNECTOR_NAME}.sh started # Solo estado 600"
  fi
fi

echo ""

# === NEGOCIACIONES ===
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🤝 NEGOCIACIONES${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

NEGOTIATION_COUNT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_contract_negotiation;" 2>&1 | tr -d ' ')

if [ -z "$NEGOTIATION_COUNT" ] || [ "$NEGOTIATION_COUNT" = "0" ]; then
  echo -e "${GREEN}✅ No hay negociaciones en la base de datos${NC}"
else
  echo -e "${YELLOW}📋 Total: $NEGOTIATION_COUNT negociaciones${NC}"
  echo ""
  kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c \
    "SELECT 
       state,
       COUNT(*) as count,
       CASE state
         WHEN 100 THEN 'INITIAL'
         WHEN 200 THEN 'REQUESTING'
         WHEN 300 THEN 'REQUESTED'
         WHEN 400 THEN 'PROVIDER_OFFERING'
         WHEN 500 THEN 'CONSUMER_OFFERING'
         WHEN 600 THEN 'PROVIDER_OFFERED'
         WHEN 700 THEN 'CONSUMER_OFFERED'
         WHEN 800 THEN 'ACCEPTING'
         WHEN 900 THEN 'ACCEPTED'
         WHEN 1000 THEN 'AGREEING'
         WHEN 1100 THEN 'AGREED'
         WHEN 1200 THEN 'VERIFYING'
         WHEN 1300 THEN 'VERIFIED'
         WHEN 1400 THEN 'FINALIZING'
         WHEN 1500 THEN 'FINALIZED'
         WHEN 1600 THEN 'TERMINATING'
         WHEN 1700 THEN 'TERMINATED'
         ELSE 'OTHER(' || state || ')'
       END as state_name
     FROM edc_contract_negotiation
     GROUP BY state
     ORDER BY state;" 2>&1
  
  echo ""
  echo -e "${BLUE}💡 Sugerencia de limpieza:${NC}"
  if echo "$NEGOTIATION_COUNT" | grep -q "^[0-9]*$" && [ "$NEGOTIATION_COUNT" -gt 0 ]; then
    echo "   ./cleanup-db-negotiations-${CONNECTOR_NAME}.sh all        # Eliminar todas"
    echo "   ./cleanup-db-negotiations-${CONNECTOR_NAME}.sh terminated # Solo estado 1500"
  fi
fi

echo ""

# === EDRs ===
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}🔗 EDRs (Endpoint Data References)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

# Primero verificar si la tabla existe
TABLE_EXISTS=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'edc_edr_entry');" 2>&1 | tr -d ' ')

if [ "$TABLE_EXISTS" = "t" ]; then
  EDR_COUNT=$(kubectl -n $NAMESPACE exec -i $POD_NAME -- env PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM edc_edr_entry;" 2>&1 | tr -d ' ')
  
  if [ -z "$EDR_COUNT" ] || [ "$EDR_COUNT" = "0" ]; then
    echo -e "${GREEN}✅ No hay EDRs en la base de datos${NC}"
  else
    echo -e "${YELLOW}📋 Total: $EDR_COUNT EDRs almacenados${NC}"
    echo ""
    echo -e "${BLUE}💡 Sugerencia de limpieza:${NC}"
    echo "   ./cleanup-db-edrs-${CONNECTOR_NAME}.sh all  # Eliminar todos"
  fi
else
  echo -e "${YELLOW}⚠️  Tabla edc_edr_entry no existe en esta versión de EDC${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ VERIFICACIÓN COMPLETADA                                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
