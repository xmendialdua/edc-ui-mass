#!/bin/bash
# Script para lanzar automáticamente Backend + Frontend de POC Next
# Uso: ./start.sh

set -e  # Salir si hay errores

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🚀 Iniciando POC Next - Dashboard de Tractus-X     ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Guardar directorio actual
ROOT_DIR=$(pwd)

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde el directorio src/poc_next/${NC}"
    exit 1
fi

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}⏹️  Deteniendo servicios...${NC}"
    
    if [ -f .backend.pid ]; then
        BACKEND_PID=$(cat .backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            kill $BACKEND_PID 2>/dev/null || true
            echo -e "${GREEN}✓${NC} Backend detenido"
        fi
        rm .backend.pid
    fi
    
    if [ -f .frontend.pid ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            kill $FRONTEND_PID 2>/dev/null || true
            echo -e "${GREEN}✓${NC} Frontend detenido"
        fi
        rm .frontend.pid
    fi
    
    # Limpiar procesos hijos
    pkill -P $$ 2>/dev/null || true
    
    echo -e "${GREEN}✅ Servicios detenidos correctamente${NC}"
    exit 0
}

# Capturar Ctrl+C y otras señales
trap cleanup SIGINT SIGTERM EXIT

# ============================================================
# 1. VERIFICAR REQUISITOS
# ============================================================

echo -e "${BLUE}📋 Verificando requisitos...${NC}"

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Python $(python3 --version | cut -d' ' -f2) encontrado"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node --version) encontrado"

# Verificar pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm no está instalado${NC}"
    echo -e "${YELLOW}   Instálalo con: npm install -g pnpm${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} pnpm $(pnpm --version) encontrado"

echo ""

# ============================================================
# 2. VERIFICAR Y LIMPIAR PUERTOS
# ============================================================

echo -e "${BLUE}🔍 Verificando puertos...${NC}"

# Función para verificar si un puerto está en uso
check_port() {
    local PORT=$1
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Puerto en uso
    else
        return 1  # Puerto libre
    fi
}

# Verificar puerto 5001 (Backend)
if check_port 5001; then
    echo -e "${YELLOW}⚠️  Puerto 5001 (Backend) ya está en uso${NC}"
    read -p "¿Deseas detener el proceso actual? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        PID=$(lsof -t -i:5001)
        kill $PID 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓${NC} Proceso detenido"
    else
        echo -e "${RED}❌ Cancelando inicio...${NC}"
        trap - EXIT  # Desactivar cleanup
        exit 1
    fi
fi

# Verificar puerto 3001 (Frontend)
if check_port 3001; then
    echo -e "${YELLOW}⚠️  Puerto 3001 (Frontend) ya está en uso${NC}"
    read -p "¿Deseas detener el proceso actual? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        PID=$(lsof -t -i:3001)
        kill $PID 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}✓${NC} Proceso detenido"
    else
        echo -e "${RED}❌ Cancelando inicio...${NC}"
        trap - EXIT  # Desactivar cleanup
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Puertos disponibles"
echo ""

# ============================================================
# 3. CONFIGURAR E INICIAR BACKEND
# ============================================================

echo -e "${BLUE}📡 Configurando Backend (FastAPI)...${NC}"
cd backend

# Verificar/crear entorno virtual
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}   Creando entorno virtual...${NC}"
    python3 -m venv venv
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar/actualizar dependencias
echo -e "   Verificando dependencias..."
pip install -q --upgrade pip > /dev/null 2>&1
pip install -q -r requirements.txt > /dev/null 2>&1

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No se encontró archivo .env${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Creado .env desde .env.example"
    fi
fi

# Iniciar backend en background con logs visibles
echo -e "${GREEN}✓${NC} Iniciando servidor backend en puerto 5001..."
# Usar tee para mostrar logs en terminal Y guardarlos en archivo
python3 main.py 2>&1 | tee ../backend.log &
BACKEND_PID=$!
echo $BACKEND_PID > ../.backend.pid

# Esperar a que el backend esté listo
echo -n "   Esperando a que el backend esté listo"
for i in {1..10}; do
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓${NC} Backend operativo en http://localhost:5001"
        break
    fi
    echo -n "."
    sleep 1
    
    if [ $i -eq 10 ]; then
        echo ""
        echo -e "${RED}❌ El backend no responde. Ver backend.log para detalles${NC}"
        cd "$ROOT_DIR"
        exit 1
    fi
done

cd "$ROOT_DIR"
echo ""

# ============================================================
# 4. CONFIGURAR E INICIAR FRONTEND
# ============================================================

echo -e "${BLUE}🎨 Configurando Frontend (Next.js)...${NC}"
cd frontend

# Verificar/instalar dependencias
if [ ! -d "node_modules" ]; then
    echo -e "   Instalando dependencias (esto puede tardar un momento)..."
    pnpm install > /dev/null 2>&1
else
    echo -e "   Verificando dependencias..."
fi

# Iniciar frontend en background
echo -e "${GREEN}✓${NC} Iniciando servidor frontend en puerto 3001..."
pnpm dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../.frontend.pid

# Esperar a que el frontend esté listo
echo -n "   Esperando a que el frontend esté listo"
for i in {1..15}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✓${NC} Frontend operativo en http://localhost:3001"
        break
    fi
    echo -n "."
    sleep 1
    
    if [ $i -eq 15 ]; then
        echo ""
        echo -e "${YELLOW}⚠️  El frontend está tardando más de lo esperado${NC}"
        echo -e "   Puede que esté compilando. Ver frontend.log para detalles"
        break
    fi
done

cd "$ROOT_DIR"
echo ""

# ============================================================
# 5. RESUMEN Y ACCESO
# ============================================================

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ POC Next iniciado correctamente                   ${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📍 URLs disponibles:${NC}"
echo -e "   ${GREEN}●${NC} Backend API:        http://localhost:5001"
echo -e "   ${GREEN}●${NC} Health Check:       http://localhost:5001/health"
echo -e "   ${GREEN}●${NC} API Docs:           http://localhost:5001/docs"
echo ""
echo -e "   ${GREEN}●${NC} Data Publication:   http://localhost:3001/data-publication"
echo -e "   ${GREEN}●${NC} Partner Data:       http://localhost:3001/partner-data"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo -e "   Backend:  tail -f backend.log"
echo -e "   Frontend: tail -f frontend.log"
echo ""
echo -e "${BLUE}⏹️  Para detener:${NC} Ctrl+C o ejecuta ./stop.sh"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   Presiona Ctrl+C para detener los servicios         ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Mostrar logs en tiempo real (opcional)
# Descomentar la siguiente línea si quieres ver los logs en tiempo real:
# tail -f backend.log frontend.log

# Esperar indefinidamente
wait
