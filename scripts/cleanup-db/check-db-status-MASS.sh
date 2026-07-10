#!/bin/bash

# Script wrapper para verificar el estado de la base de datos del conector MASS
# Invoca el script genérico con los parámetros de MASS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERIC_SCRIPT="$SCRIPT_DIR/check-db-status.sh"

POD_NAME="mass-edc-postgresql-0"
DB_PASSWORD="dbpassworddataproviderone"
CONNECTOR_NAME="MASS"

exec "$GENERIC_SCRIPT" "$POD_NAME" "$DB_PASSWORD" "$CONNECTOR_NAME"
