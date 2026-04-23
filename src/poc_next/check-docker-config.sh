#!/bin/bash

# Script para verificar que la configuración de docker-compose.yml es correcta
# antes de iniciar los contenedores

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🔍 Verificación de Configuración Docker            ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

CONFIG_FILE="docker-compose.yml"
ERRORS=0

# Check if docker-compose.yml exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}✗ docker-compose.yml no encontrado${NC}"
    exit 1
fi

echo -e "${YELLOW}Verificando configuración en $CONFIG_FILE...${NC}"
echo ""

# Check 1: SSL configuration in backend
echo -n "1. Configuración SSL en backend: "
if grep -q "PYTHONHTTPSVERIFY.*0" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ FALTA${NC}"
    echo -e "   ${YELLOW}Necesitas agregar: PYTHONHTTPSVERIFY: \"0\"${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Frontend API URL uses localhost
echo -n "2. Frontend API URL (debe ser localhost): "
FRONTEND_URL=$(grep -A 10 "frontend:" "$CONFIG_FILE" | grep "NEXT_PUBLIC_API_URL" | sed 's/.*: "\(.*\)"/\1/')
if [[ "$FRONTEND_URL" == *"localhost"* ]]; then
    echo -e "${GREEN}✓ OK ($FRONTEND_URL)${NC}"
elif [[ "$FRONTEND_URL" == *"backend"* ]]; then
    echo -e "${RED}✗ ERROR${NC}"
    echo -e "   ${YELLOW}Encontrado: $FRONTEND_URL${NC}"
    echo -e "   ${YELLOW}Debe ser: http://localhost:5001${NC}"
    echo -e "   ${YELLOW}Razón: El navegador llama desde el host, no desde el contenedor${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${YELLOW}⚠ ADVERTENCIA ($FRONTEND_URL)${NC}"
fi

# Check 3: Backend ports exposed
echo -n "3. Puerto del backend expuesto: "
if grep -q "5001:5001" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ OK (5001:5001)${NC}"
else
    echo -e "${RED}✗ FALTA${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: Frontend ports exposed
echo -n "4. Puerto del frontend expuesto: "
if grep -q "3001:3001" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ OK (3001:3001)${NC}"
else
    echo -e "${RED}✗ FALTA${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 5: EDC connector URLs
echo -n "5. URLs de conectores EDC: "
MASS_URL=$(grep "MASS_MANAGEMENT_URL" "$CONFIG_FILE" | head -1 | sed 's/.*: "\(.*\)"/\1/')
IKLN_URL=$(grep "IKLN_MANAGEMENT_URL" "$CONFIG_FILE" | head -1 | sed 's/.*: "\(.*\)"/\1/')
if [ -n "$MASS_URL" ] && [ -n "$IKLN_URL" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    echo -e "   MASS: $MASS_URL"
    echo -e "   IKLN: $IKLN_URL"
else
    echo -e "${RED}✗ FALTA${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 6: Network configuration
echo -n "6. Red de Docker: "
if grep -q "poc-next-network" "$CONFIG_FILE"; then
    echo -e "${GREEN}✓ OK (poc-next-network)${NC}"
else
    echo -e "${YELLOW}⚠ No se encontró red específica${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Configuración correcta - Puedes ejecutar ./test-docker.sh${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Se encontraron $ERRORS error(es) en la configuración${NC}"
    echo ""
    echo -e "${YELLOW}Para corregir:${NC}"
    echo -e "  1. Revisa ${BLUE}TROUBLESHOOTING_DOCKER.md${NC}"
    echo -e "  2. Corrige los errores en ${BLUE}docker-compose.yml${NC}"
    echo -e "  3. Ejecuta este script de nuevo: ${BLUE}./check-docker-config.sh${NC}"
    echo ""
    exit 1
fi
