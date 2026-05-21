#!/bin/bash

# Script wrapper para limpiar negociaciones del conector IKLN
# Invoca el script genérico con los parámetros de IKLN

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERIC_SCRIPT="$SCRIPT_DIR/cleanup-negotiations-from-db.sh"

POD_NAME="ikln-edc-postgresql-0"
DB_PASSWORD="dbpassworddataconsumerone"
CONNECTOR_NAME="IKLN"
FILTER=${1:-terminated}

exec "$GENERIC_SCRIPT" "$POD_NAME" "$DB_PASSWORD" "$CONNECTOR_NAME" "$FILTER"
