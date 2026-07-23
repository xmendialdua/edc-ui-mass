#!/bin/bash

# Script wrapper para limpiar negociaciones del conector PRTA
# Invoca el script genérico con los parámetros de PRTA

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERIC_SCRIPT="$SCRIPT_DIR/cleanup-negotiations-from-db.sh"

POD_NAME="prta-edc-postgresql-0"
DB_PASSWORD="dbpassworddataconsumerone"
CONNECTOR_NAME="PRTA"
FILTER=${1:-terminated}

exec "$GENERIC_SCRIPT" "$POD_NAME" "$DB_PASSWORD" "$CONNECTOR_NAME" "$FILTER"
