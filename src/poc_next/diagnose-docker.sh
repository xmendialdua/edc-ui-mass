#!/bin/bash

# Script de diagnóstico para POC Next
# Ejecutar mientras los contenedores están corriendo

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🔍 Diagnóstico Completo de POC Next                 ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Function to check if containers are running
check_containers() {
    echo -e "${CYAN}━━━ 1. ESTADO DE CONTENEDORES ━━━${NC}"
    
    # Check with docker-compose
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        echo -e "${RED}✗ docker-compose no disponible${NC}"
        return 1
    fi
    
    BACKEND_RUNNING=$(docker ps --filter "name=poc-next-backend" --filter "status=running" -q)
    FRONTEND_RUNNING=$(docker ps --filter "name=poc-next-frontend" --filter "status=running" -q)
    
    if [ -z "$BACKEND_RUNNING" ]; then
        echo -e "Backend: ${RED}✗ NO está corriendo${NC}"
        echo -e "${YELLOW}Ejecuta: ./test-docker.sh${NC}"
        return 1
    else
        echo -e "Backend: ${GREEN}✓ Corriendo${NC}"
    fi
    
    if [ -z "$FRONTEND_RUNNING" ]; then
        echo -e "Frontend: ${RED}✗ NO está corriendo${NC}"
        return 1
    else
        echo -e "Frontend: ${GREEN}✓ Corriendo${NC}"
    fi
    echo ""
    return 0
}

# Function to test backend API
test_backend_api() {
    echo -e "${CYAN}━━━ 2. PRUEBAS DE BACKEND API ━━━${NC}"
    
    # Health check
    echo -n "Health endpoint: "
    HEALTH_RESPONSE=$(curl -sf http://localhost:5001/health 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FALLO${NC}"
        echo -e "${YELLOW}  Response: $HEALTH_RESPONSE${NC}"
    fi
    
    # Root endpoint
    echo -n "Root endpoint: "
    ROOT_RESPONSE=$(curl -sf http://localhost:5001/ 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FALLO${NC}"
    fi
    
    # Test Phase 1 endpoint (crear asset)
    echo -n "Phase 1 endpoint (GET): "
    PHASE1_RESPONSE=$(curl -sf -X GET http://localhost:5001/api/phase1/assets 2>&1)
    PHASE1_STATUS=$?
    if [ $PHASE1_STATUS -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        echo -e "${YELLOW}  Response: ${PHASE1_RESPONSE:0:100}...${NC}"
    else
        echo -e "${RED}✗ FALLO (curl exit code: $PHASE1_STATUS)${NC}"
        echo -e "${YELLOW}  Response: $PHASE1_RESPONSE${NC}"
    fi
    
    echo ""
}

# Function to test frontend
test_frontend() {
    echo -e "${CYAN}━━━ 3. PRUEBAS DE FRONTEND ━━━${NC}"
    
    echo -n "Frontend home: "
    FRONTEND_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001 2>&1)
    if [ "$FRONTEND_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ OK (HTTP $FRONTEND_STATUS)${NC}"
    else
        echo -e "${RED}✗ FALLO (HTTP $FRONTEND_STATUS)${NC}"
    fi
    
    echo -n "/data-publication: "
    DATA_PUB_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/data-publication 2>&1)
    if [ "$DATA_PUB_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ OK (HTTP $DATA_PUB_STATUS)${NC}"
    else
        echo -e "${RED}✗ FALLO (HTTP $DATA_PUB_STATUS)${NC}"
    fi
    
    echo -n "/partner-data: "
    PARTNER_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/partner-data 2>&1)
    if [ "$PARTNER_STATUS" = "200" ]; then
        echo -e "${GREEN}✓ OK (HTTP $PARTNER_STATUS)${NC}"
    else
        echo -e "${RED}✗ FALLO (HTTP $PARTNER_STATUS)${NC}"
    fi
    
    echo ""
}

# Function to test backend connectivity to EDC connectors
test_edc_connectivity() {
    echo -e "${CYAN}━━━ 4. CONECTIVIDAD A CONECTORES EDC ━━━${NC}"
    
    # Get config from backend environment
    MASS_URL=$(docker exec poc-next-backend env | grep MASS_MANAGEMENT_URL | cut -d'=' -f2)
    IKLN_URL=$(docker exec poc-next-backend env | grep IKLN_MANAGEMENT_URL | cut -d'=' -f2)
    MASS_KEY=$(docker exec poc-next-backend env | grep MASS_API_KEY | cut -d'=' -f2)
    IKLN_KEY=$(docker exec poc-next-backend env | grep IKLN_API_KEY | cut -d'=' -f2)
    
    echo "MASS Management URL: $MASS_URL"
    echo "IKLN Management URL: $IKLN_URL"
    echo ""
    
    # Test MASS connector from host
    echo -n "MASS desde host: "
    MASS_TEST=$(curl -sf -X POST "${MASS_URL}/v3/assets/request" \
        -H "Content-Type: application/json" \
        -H "X-Api-Key: ${MASS_KEY}" \
        -d '{"@context": {}, "@type": "QuerySpec"}' 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Conecta${NC}"
    else
        echo -e "${RED}✗ NO conecta${NC}"
        echo -e "${YELLOW}  Error: $MASS_TEST${NC}"
    fi
    
    # Test IKLN connector from host
    echo -n "IKLN desde host: "
    IKLN_TEST=$(curl -sf -X POST "${IKLN_URL}/v3/assets/request" \
        -H "Content-Type: application/json" \
        -H "X-Api-Key: ${IKLN_KEY}" \
        -d '{"@context": {}, "@type": "QuerySpec"}' 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Conecta${NC}"
    else
        echo -e "${RED}✗ NO conecta${NC}"
        echo -e "${YELLOW}  Error: $IKLN_TEST${NC}"
    fi
    
    # Test from backend container
    echo ""
    echo -n "MASS desde container backend: "
    MASS_FROM_CONTAINER=$(docker exec poc-next-backend curl -sf -X POST "${MASS_URL}/v3/assets/request" \
        -H "Content-Type: application/json" \
        -H "X-Api-Key: ${MASS_KEY}" \
        -d '{"@context": {}, "@type": "QuerySpec"}' 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Conecta${NC}"
    else
        echo -e "${RED}✗ NO conecta${NC}"
        echo -e "${YELLOW}  Error: $MASS_FROM_CONTAINER${NC}"
    fi
    
    echo ""
}

# Function to check frontend-backend communication
test_frontend_backend_comm() {
    echo -e "${CYAN}━━━ 5. COMUNICACIÓN FRONTEND → BACKEND ━━━${NC}"
    
    # Get API URL from frontend
    API_URL=$(docker exec poc-next-frontend env | grep NEXT_PUBLIC_API_URL | cut -d'=' -f2)
    echo "NEXT_PUBLIC_API_URL: ${API_URL}"
    echo ""
    
    # Test from frontend container
    echo -n "Frontend → Backend (health): "
    FRONTEND_TO_BACKEND=$(docker exec poc-next-frontend wget -qO- http://backend:5001/health 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        echo -e "${YELLOW}  Response: $FRONTEND_TO_BACKEND${NC}"
    else
        echo -e "${RED}✗ FALLO${NC}"
        echo -e "${YELLOW}  Error: $FRONTEND_TO_BACKEND${NC}"
    fi
    
    echo ""
}

# Function to show logs with errors
show_error_logs() {
    echo -e "${CYAN}━━━ 6. ERRORES EN LOGS ━━━${NC}"
    
    echo -e "${YELLOW}Backend (últimos errores):${NC}"
    docker logs poc-next-backend 2>&1 | grep -i "error\|exception\|failed\|traceback" | tail -10
    if [ $? -ne 0 ] || [ -z "$(docker logs poc-next-backend 2>&1 | grep -i 'error')" ]; then
        echo -e "${GREEN}  ✓ Sin errores recientes${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}Frontend (últimos errores):${NC}"
    docker logs poc-next-frontend 2>&1 | grep -i "error\|failed" | tail -10
    if [ $? -ne 0 ] || [ -z "$(docker logs poc-next-frontend 2>&1 | grep -i 'error')" ]; then
        echo -e "${GREEN}  ✓ Sin errores recientes${NC}"
    fi
    
    echo ""
}

# Function to test API endpoints that the frontend uses
test_frontend_api_calls() {
    echo -e "${CYAN}━━━ 7. ENDPOINTS QUE USA EL FRONTEND ━━━${NC}"
    
    # Test getting assets (Phase 2)
    echo -n "POST /api/phase2/list-assets: "
    ASSETS_RESPONSE=$(curl -sf -X POST http://localhost:5001/api/phase2/list-assets \
        -H "Content-Type: application/json" 2>&1)
    ASSETS_STATUS=$?
    if [ $ASSETS_STATUS -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        # Count assets if response has assets array
        ASSET_COUNT=$(echo "$ASSETS_RESPONSE" | jq '.assets | length' 2>/dev/null)
        if [ -n "$ASSET_COUNT" ] && [ "$ASSET_COUNT" != "null" ]; then
            echo -e "  ${CYAN}Assets encontrados: $ASSET_COUNT${NC}"
        fi
    else
        echo -e "${RED}✗ FALLO${NC}"
        echo -e "  ${YELLOW}Error: $ASSETS_RESPONSE${NC}"
    fi
    
    # Test catalog (Phase 6)
    echo -n "POST /api/phase6/catalog-request: "
    CATALOG_RESPONSE=$(curl -sf -X POST http://localhost:5001/api/phase6/catalog-request \
        -H "Content-Type: application/json" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
        # Try to extract dataset count if present
        DATASET_COUNT=$(echo "$CATALOG_RESPONSE" | jq '.datasets | length' 2>/dev/null)
        if [ -n "$DATASET_COUNT" ] && [ "$DATASET_COUNT" != "null" ]; then
            echo -e "  ${CYAN}Datasets encontrados: $DATASET_COUNT${NC}"
        fi
    else
        echo -e "${RED}✗ FALLO${NC}"
        echo -e "  ${YELLOW}Error: $CATALOG_RESPONSE${NC}"
    fi
    
    # Test connectivity check (Phase 1)
    echo -n "POST /api/phase1/check-connectivity: "
    CONN_RESPONSE=$(curl -sf -X POST http://localhost:5001/api/phase1/check-connectivity \
        -H "Content-Type: application/json" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FALLO${NC}"
    fi
    
    echo ""
}

# Function to show network info
show_network_info() {
    echo -e "${CYAN}━━━ 8. INFORMACIÓN DE RED ━━━${NC}"
    
    echo "Red de Docker Compose:"
    docker network ls | grep poc-next
    
    echo ""
    echo "IPs de los contenedores:"
    docker inspect poc-next-backend | jq -r '.[0].NetworkSettings.Networks | to_entries[] | "  Backend: \(.key) → \(.value.IPAddress)"' 2>/dev/null
    docker inspect poc-next-frontend | jq -r '.[0].NetworkSettings.Networks | to_entries[] | "  Frontend: \(.key) → \(.value.IPAddress)"' 2>/dev/null
    
    echo ""
}

# Main execution
check_containers
if [ $? -ne 0 ]; then
    echo -e "${RED}Los contenedores no están corriendo. Ejecuta: ./test-docker.sh${NC}"
    exit 1
fi

test_backend_api
test_frontend
test_frontend_backend_comm
test_edc_connectivity
test_frontend_api_calls
show_error_logs
show_network_info

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   📊 Diagnóstico Completado                           ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}💡 Próximos pasos según los resultados:${NC}"
echo ""
echo -e "Si el backend no conecta a EDC:"
echo -e "  → Verifica certificados SSL: ${CYAN}NODE_TLS_REJECT_UNAUTHORIZED${NC}"
echo -e "  → Verifica API keys en docker-compose.yml"
echo -e "  → Verifica URLs de conectores"
echo ""
echo -e "Si frontend no llama al backend:"
echo -e "  → Verifica ${CYAN}NEXT_PUBLIC_API_URL${NC} en docker-compose.yml"
echo -e "  → Verifica CORS en backend"
echo -e "  → Abre DevTools del navegador (F12) → Console → Network"
echo ""
echo -e "Para ver logs en tiempo real:"
echo -e "  ${CYAN}docker-compose logs -f backend${NC}"
echo -e "  ${CYAN}docker-compose logs -f frontend${NC}"
echo ""
