#!/bin/bash

# Script para detener y limpiar los contenedores de prueba Docker

# Colors for output
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Deteniendo contenedores de POC Next...${NC}"

# Determine docker compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Stop and remove containers
if $DOCKER_COMPOSE down; then
    echo -e "${GREEN}✓ Contenedores detenidos y eliminados${NC}"
else
    echo -e "${RED}✗ Error al detener los contenedores${NC}"
    exit 1
fi

# Ask if user wants to remove images
echo ""
echo -e "${YELLOW}¿Quieres eliminar también las imágenes Docker construidas? [y/N]${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${YELLOW}Eliminando imágenes...${NC}"
    docker rmi poc-next-backend poc-next-frontend 2>/dev/null && echo -e "${GREEN}✓ Imágenes eliminadas${NC}"
else
    echo -e "${YELLOW}Las imágenes se mantienen para reutilización${NC}"
fi

echo ""
echo -e "${GREEN}✅ Limpieza completada${NC}"
