#!/bin/bash

# Script wrapper para verificar el estado de la base de datos del conector IKLN
# Invoca el script genérico con los parámetros de IKLN

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERIC_SCRIPT="$SCRIPT_DIR/check-db-status.sh"

POD_NAME="ikln-edc-postgresql-0"
DB_PASSWORD="dbpassworddataconsumerone"
CONNECTOR_NAME="IKLN"

exec "$GENERIC_SCRIPT" "$POD_NAME" "$DB_PASSWORD" "$CONNECTOR_NAME"
