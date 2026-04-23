#!/bin/bash

# Script para probar la aplicación dockerizada localmente
# Este script construye y ejecuta los contenedores sin publicar en Docker Hub

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🐳 Prueba Local de POC Next con Docker             ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Este script debe ejecutarse desde el directorio src/poc_next${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Error: docker-compose no está instalado${NC}"
    echo -e "${YELLOW}Instala docker-compose o usa Docker con plugin compose${NC}"
    exit 1
fi

# Determine docker compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${BLUE}📦 Construyendo imágenes Docker...${NC}"
echo -e "${YELLOW}Esto puede tomar varios minutos la primera vez...${NC}"
echo ""

# Build images with --no-cache for frontend to ensure env vars are applied
echo -e "${YELLOW}Reconstruyendo frontend para aplicar variables de entorno...${NC}"
if $DOCKER_COMPOSE build --no-cache frontend && $DOCKER_COMPOSE build backend; then
    echo -e "${GREEN}✓ Imágenes construidas exitosamente${NC}"
else
    echo -e "${RED}✗ Error al construir las imágenes${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚀 Iniciando contenedores...${NC}"
echo ""

# Start containers
if $DOCKER_COMPOSE up -d; then
    echo -e "${GREEN}✓ Contenedores iniciados${NC}"
else
    echo -e "${RED}✗ Error al iniciar los contenedores${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}⏳ Esperando a que los servicios estén listos...${NC}"

# Wait for backend to be healthy
echo -n "Backend: "
for i in {1..30}; do
    if curl -sf http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Listo${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        echo -e "${YELLOW}Verificando logs del backend:${NC}"
        $DOCKER_COMPOSE logs backend | tail -20
        exit 1
    fi
    sleep 2
    echo -n "."
done

# Wait for frontend to be healthy
echo -n "Frontend: "
for i in {1..30}; do
    if curl -sf http://localhost:3001 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Listo${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Timeout${NC}"
        echo -e "${YELLOW}Verificando logs del frontend:${NC}"
        $DOCKER_COMPOSE logs frontend | tail -20
        exit 1
    fi
    sleep 2
    echo -n "."
done

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Aplicación ejecutándose correctamente!          ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📍 URLs de acceso:${NC}"
echo -e "  Frontend:               ${GREEN}http://localhost:3001${NC}"
echo -e "  Publicación de datos:   ${GREEN}http://localhost:3001/data-publication${NC}"
echo -e "  Datos de partners:      ${GREEN}http://localhost:3001/partner-data${NC}"
echo -e "  Backend Health:         ${GREEN}http://localhost:5001/health${NC}"
echo -e "  Backend API Docs:       ${GREEN}http://localhost:5001/docs${NC}"
echo ""
echo -e "${BLUE}🔍 Comandos útiles:${NC}"
echo -e "  Ver logs (todos):       ${YELLOW}$DOCKER_COMPOSE logs -f${NC}"
echo -e "  Ver logs backend:       ${YELLOW}$DOCKER_COMPOSE logs -f backend${NC}"
echo -e "  Ver logs frontend:      ${YELLOW}$DOCKER_COMPOSE logs -f frontend${NC}"
echo -e "  Ver estado:             ${YELLOW}$DOCKER_COMPOSE ps${NC}"
echo -e "  Detener servicios:      ${YELLOW}$DOCKER_COMPOSE down${NC}"
echo -e "  Reiniciar servicios:    ${YELLOW}$DOCKER_COMPOSE restart${NC}"
echo ""
echo -e "${BLUE}🧪 Prueba la aplicación en tu navegador y cuando esté OK:${NC}"
echo -e "  1. Detén los contenedores: ${YELLOW}$DOCKER_COMPOSE down${NC}"
echo -e "  2. Construye y publica:    ${YELLOW}./build.sh${NC}"
echo -e "  3. Despliega en OVH:       ${YELLOW}cd k8s && ./deploy.sh${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
