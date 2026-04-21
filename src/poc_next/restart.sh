#!/bin/bash
# Script para reiniciar Backend + Frontend de POC Next
# Uso: ./restart.sh

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🔄 Reiniciando POC Next                             ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde el directorio src/poc_next/${NC}"
    exit 1
fi

# Paso 1: Detener servicios actuales
echo -e "${YELLOW}📍 Paso 1: Deteniendo servicios actuales...${NC}"
echo ""
./stop.sh

echo ""
echo -e "${YELLOW}⏳ Esperando 2 segundos antes de reiniciar...${NC}"
sleep 2
echo ""

# Paso 2: Iniciar servicios
echo -e "${YELLOW}📍 Paso 2: Iniciando servicios...${NC}"
echo ""
./start.sh
