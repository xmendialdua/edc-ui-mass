#!/bin/bash
# Script para detener Backend + Frontend de POC Next
# Uso: ./stop.sh

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   ⏹️  Deteniendo POC Next                              ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde el directorio src/poc_next/${NC}"
    exit 1
fi

STOPPED_COUNT=0

# Función para detener proceso por PID
stop_by_pid() {
    local PID_FILE=$1
    local SERVICE_NAME=$2
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${YELLOW}⏹️  Deteniendo $SERVICE_NAME (PID: $PID)...${NC}"
            kill $PID 2>/dev/null || kill -9 $PID 2>/dev/null
            
            # Esperar a que el proceso termine
            for i in {1..5}; do
                if ! ps -p $PID > /dev/null 2>&1; then
                    break
                fi
                sleep 1
            done
            
            if ! ps -p $PID > /dev/null 2>&1; then
                echo -e "${GREEN}✓${NC} $SERVICE_NAME detenido correctamente"
                ((STOPPED_COUNT++))
            else
                echo -e "${RED}✗${NC} No se pudo detener $SERVICE_NAME"
            fi
        else
            echo -e "${YELLOW}⚠️  $SERVICE_NAME no está corriendo (PID obsoleto)${NC}"
        fi
        rm "$PID_FILE"
    else
        echo -e "${YELLOW}⚠️  No se encontró archivo PID para $SERVICE_NAME${NC}"
    fi
}

# Función para detener proceso por puerto
stop_by_port() {
    local PORT=$1
    local SERVICE_NAME=$2
    
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        PID=$(lsof -t -i:$PORT)
        echo -e "${YELLOW}⏹️  Deteniendo $SERVICE_NAME en puerto $PORT (PID: $PID)...${NC}"
        kill $PID 2>/dev/null || kill -9 $PID 2>/dev/null
        sleep 1
        
        if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} $SERVICE_NAME detenido correctamente"
            ((STOPPED_COUNT++))
        else
            echo -e "${RED}✗${NC} No se pudo detener $SERVICE_NAME"
        fi
    fi
}

# Detener Backend
echo -e "${BLUE}📡 Deteniendo Backend...${NC}"
stop_by_pid ".backend.pid" "Backend"
# Intentar por puerto si el PID no funcionó
if ! lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Puerto 5001 liberado"
else
    stop_by_port 5001 "Backend"
fi
echo ""

# Detener Frontend
echo -e "${BLUE}🎨 Deteniendo Frontend...${NC}"
stop_by_pid ".frontend.pid" "Frontend"
# Intentar por puerto si el PID no funcionó
if ! lsof -Pi :3020 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Puerto 3020 liberado"
else
    stop_by_port 3020 "Frontend"
fi
echo ""

# Limpiar procesos node/python huérfanos relacionados con POC Next
echo -e "${BLUE}🧹 Limpiando procesos huérfanos...${NC}"

# Buscar y matar procesos de uvicorn con puerto 5001
UVICORN_PIDS=$(ps aux | grep "[u]vicorn.*5001" | awk '{print $2}')
if [ ! -z "$UVICORN_PIDS" ]; then
    echo -e "${YELLOW}   Deteniendo procesos uvicorn...${NC}"
    echo "$UVICORN_PIDS" | xargs kill -9 2>/dev/null || true
fi

# Buscar y matar procesos de next-server con puerto 3020
NEXT_PIDS=$(ps aux | grep "[n]ext-server.*3020" | awk '{print $2}')
if [ ! -z "$NEXT_PIDS" ]; then
    echo -e "${YELLOW}   Deteniendo procesos next-server...${NC}"
    echo "$NEXT_PIDS" | xargs kill -9 2>/dev/null || true
fi

echo -e "${GREEN}✓${NC} Limpieza completada"
echo ""

# Resumen final
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
if [ $STOPPED_COUNT -gt 0 ]; then
    echo -e "${GREEN}   ✅ POC Next detenido correctamente                  ${NC}"
    echo -e "${GREEN}      ($STOPPED_COUNT servicio(s) detenido(s))                    ${NC}"
else
    echo -e "${YELLOW}   ⚠️  No se encontraron servicios en ejecución       ${NC}"
fi
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar puertos
echo -e "${BLUE}📊 Estado de puertos:${NC}"
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "   ${RED}✗${NC} Puerto 5001 (Backend): AÚN EN USO"
else
    echo -e "   ${GREEN}✓${NC} Puerto 5001 (Backend): Libre"
fi

if lsof -Pi :3020 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "   ${RED}✗${NC} Puerto 3020 (Frontend): AÚN EN USO"
else
    echo -e "   ${GREEN}✓${NC} Puerto 3020 (Frontend): Libre"
fi
echo ""
