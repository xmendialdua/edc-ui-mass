#!/bin/bash

# Lista todas las negociaciones del conector IKLN con su ID y nombre/estado

NAMESPACE="umbrella"
POD_NAME="ikln-edc-postgresql-0"
DB_PASSWORD="dbpassworddataconsumerone"
DB_NAME="edc"
DB_USER="user"
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}📋 Negociaciones del conector IKLN${NC}"
echo "============================================"

# Verificar acceso al pod
if ! kubectl -n $NAMESPACE get pod $POD_NAME &> /dev/null; then
  echo -e "${RED}❌ No se puede acceder al pod: $POD_NAME${NC}"
  exit 1
fi

kubectl -n "$NAMESPACE" exec -i "$POD_NAME" -- env PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT
     id,
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
     END AS state,
     agreement_id,
     to_timestamp(created_at/1000) AS created
   FROM edc_contract_negotiation
   ORDER BY created_at DESC;"
