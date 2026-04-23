#!/bin/bash

# Script para verificar que la aplicación dockerizada funciona correctamente
# Ejecutar este script mientras los contenedores están corriendo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🔍 Verificación de POC Next Dockerizado            ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if containers are running
echo -e "${YELLOW}1. Verificando contenedores...${NC}"
BACKEND_RUNNING=$(docker ps --filter "name=poc-next-backend" --filter "status=running" -q)
FRONTEND_RUNNING=$(docker ps --filter "name=poc-next-frontend" --filter "status=running" -q)

if [ -z "$BACKEND_RUNNING" ]; then
    echo -e "   Backend: ${RED}✗ No está corriendo${NC}"
    echo -e "   ${YELLOW}Ejecuta: ./test-docker.sh${NC}"
    exit 1
else
    echo -e "   Backend: ${GREEN}✓ Corriendo${NC}"
fi

if [ -z "$FRONTEND_RUNNING" ]; then
    echo -e "   Frontend: ${RED}✗ No está corriendo${NC}"
    echo -e "   ${YELLOW}Ejecuta: ./test-docker.sh${NC}"
    exit 1
else
    echo -e "   Frontend: ${GREEN}✓ Corriendo${NC}"
fi

# Check backend health
echo ""
echo -e "${YELLOW}2. Verificando salud del backend...${NC}"
BACKEND_HEALTH=$(curl -sf http://localhost:5001/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✓ Backend responde correctamente${NC}"
    echo -e "   Response: ${BACKEND_HEALTH}"
else
    echo -e "   ${RED}✗ Backend no responde${NC}"
    exit 1
fi

# Check frontend
echo ""
echo -e "${YELLOW}3. Verificando frontend...${NC}"
FRONTEND_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✓ Frontend responde correctamente (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "   ${RED}✗ Frontend no responde o error HTTP $FRONTEND_STATUS${NC}"
    exit 1
fi

# Check backend API docs
echo ""
echo -e "${YELLOW}4. Verificando documentación API...${NC}"
DOCS_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:5001/docs 2>/dev/null)
if [ "$DOCS_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✓ API docs disponible (HTTP $DOCS_STATUS)${NC}"
else
    echo -e "   ${YELLOW}⚠ API docs no disponible (HTTP $DOCS_STATUS)${NC}"
fi

# Check frontend routes
echo ""
echo -e "${YELLOW}5. Verificando rutas del frontend...${NC}"

DATA_PUB_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/data-publication 2>/dev/null)
if [ "$DATA_PUB_STATUS" = "200" ]; then
    echo -e "   /data-publication: ${GREEN}✓ OK (HTTP $DATA_PUB_STATUS)${NC}"
else
    echo -e "   /data-publication: ${RED}✗ Error (HTTP $DATA_PUB_STATUS)${NC}"
fi

PARTNER_DATA_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/partner-data 2>/dev/null)
if [ "$PARTNER_DATA_STATUS" = "200" ]; then
    echo -e "   /partner-data: ${GREEN}✓ OK (HTTP $PARTNER_DATA_STATUS)${NC}"
else
    echo -e "   /partner-data: ${RED}✗ Error (HTTP $PARTNER_DATA_STATUS)${NC}"
fi

# Check container logs for errors
echo ""
echo -e "${YELLOW}6. Buscando errores en los logs...${NC}"
BACKEND_ERRORS=$(docker logs poc-next-backend 2>&1 | grep -i "error" | tail -3)
FRONTEND_ERRORS=$(docker logs poc-next-frontend 2>&1 | grep -i "error" | tail -3)

if [ -z "$BACKEND_ERRORS" ]; then
    echo -e "   Backend logs: ${GREEN}✓ Sin errores recientes${NC}"
else
    echo -e "   Backend logs: ${YELLOW}⚠ Errores encontrados:${NC}"
    echo "$BACKEND_ERRORS" | while IFS= read -r line; do
        echo -e "     ${YELLOW}$line${NC}"
    done
fi

if [ -z "$FRONTEND_ERRORS" ]; then
    echo -e "   Frontend logs: ${GREEN}✓ Sin errores recientes${NC}"
else
    echo -e "   Frontend logs: ${YELLOW}⚠ Errores encontrados:${NC}"
    echo "$FRONTEND_ERRORS" | while IFS= read -r line; do
        echo -e "     ${YELLOW}$line${NC}"
    done
fi

# Check resource usage
echo ""
echo -e "${YELLOW}7. Uso de recursos...${NC}"
docker stats --no-stream poc-next-backend poc-next-frontend | tail -2

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Verificación completada                         ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 URLs para probar en el navegador:${NC}"
echo -e "   Frontend:             ${GREEN}http://localhost:3001${NC}"
echo -e "   Publicación de datos: ${GREEN}http://localhost:3001/data-publication${NC}"
echo -e "   Datos de partners:    ${GREEN}http://localhost:3001/partner-data${NC}"
echo -e "   Backend API Docs:     ${GREEN}http://localhost:5001/docs${NC}"
echo ""
echo -e "${BLUE}📝 Siguientes pasos:${NC}"
echo -e "   1. Prueba manualmente todas las funcionalidades"
echo -e "   2. Si todo funciona bien:"
echo -e "      ${YELLOW}./stop-docker.sh${NC}      (detener contenedores)"
echo -e "      ${YELLOW}./build.sh${NC}            (construir y publicar en Docker Hub)"
echo -e "      ${YELLOW}cd k8s && ./deploy.sh${NC} (desplegar en OVH)"
echo ""
