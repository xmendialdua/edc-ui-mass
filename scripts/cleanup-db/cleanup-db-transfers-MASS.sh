#!/bin/bash

# Script wrapper para limpiar transferencias del conector MASS
# Invoca el script genérico con los parámetros de MASS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERIC_SCRIPT="$SCRIPT_DIR/cleanup-transfers-from-db.sh"

POD_NAME="mass-edc-postgresql-0"
DB_PASSWORD="dbpassworddataconsumerone"
CONNECTOR_NAME="MASS"
FILTER=${1:-terminated}

exec "$GENERIC_SCRIPT" "$POD_NAME" "$DB_PASSWORD" "$CONNECTOR_NAME" "$FILTER"
