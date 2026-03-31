#!/bin/bash

###############################################################
# Script de inicio para POC EDC Dashboard
###############################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "🚀 POC EDC Dashboard"
echo "========================================"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 no encontrado. Por favor instala Python 3.8+${NC}"
    exit 1
fi

echo "✅ Python 3 encontrado: $(python3 --version)"

# Verificar .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado${NC}"
    echo "   Creando .env desde .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env creado. Por favor revisa y actualiza los valores si es necesario."
    else
        echo -e "${RED}❌ .env.example no encontrado${NC}"
        exit 1
    fi
else
    echo "✅ .env encontrado"
fi

# Verificar KUBECONFIG
# Busca en múltiples ubicaciones
if [ -n "$KUBECONFIG" ] && [ -f "$KUBECONFIG" ]; then
    KUBECONFIG_FILE="$KUBECONFIG"
elif grep -q "^KUBECONFIG_PATH=" .env 2>/dev/null; then
    KUBECONFIG_FILE=$(grep "^KUBECONFIG_PATH=" .env | cut -d '=' -f2)
elif [ -f "kubeconfig.yaml" ]; then
    KUBECONFIG_FILE="./kubeconfig.yaml"
elif [ -f "../kubeconfig.yaml" ]; then
    KUBECONFIG_FILE="../kubeconfig.yaml"
elif [ -f "../../dashboard/kubeconfig.yaml" ]; then
    KUBECONFIG_FILE="../../dashboard/kubeconfig.yaml"
elif [ -f "$HOME/.kube/config" ]; then
    KUBECONFIG_FILE="$HOME/.kube/config"
else
    KUBECONFIG_FILE="kubeconfig.yaml (no encontrado)"
fi

if [ -f "$KUBECONFIG_FILE" ]; then
    echo "✅ KUBECONFIG encontrado: $KUBECONFIG_FILE"
    export KUBECONFIG="$KUBECONFIG_FILE"
else
    echo -e "${YELLOW}⚠️  KUBECONFIG: $KUBECONFIG_FILE${NC}"
    echo "   Algunas funciones pueden no estar disponibles"
fi

# Activar entorno virtual si existe, o crearlo
if [ -d "venv" ]; then
    echo "🐍 Activando entorno virtual..."
    source venv/bin/activate
    echo "✅ Entorno virtual activado"
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
    echo "✅ Entorno virtual activado (raíz del proyecto)"
elif [ -d "../../venv" ]; then
    source ../../venv/bin/activate
    echo "✅ Entorno virtual activado (raíz del workspace)"
else
    echo -e "${YELLOW}⚠️  No se encontró entorno virtual${NC}"
    echo "🔨 Creando entorno virtual..."
    
    # Verificar python3-venv
    if ! python3 -m venv --help &>/dev/null; then
        echo -e "${RED}❌ python3-venv no está instalado${NC}"
        echo "   Instálalo con: sudo apt install python3-venv python3-full"
        exit 1
    fi
    
    python3 -m venv venv
    if [ $? -eq 0 ]; then
        echo "✅ Entorno virtual creado"
        source venv/bin/activate
        echo "✅ Entorno virtual activado"
    else
        echo -e "${RED}❌ Error al crear entorno virtual${NC}"
        exit 1
    fi
fi

# Verificar/instalar dependencias
echo ""
echo "📦 Verificando dependencias..."

# Verificar que estamos en un entorno virtual
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${RED}❌ No se está ejecutando en un entorno virtual${NC}"
    echo "   Esto no debería ocurrir. Por favor ejecuta:"
    echo "   source venv/bin/activate"
    exit 1
fi

if ! python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  FastAPI no instalado. Instalando dependencias...${NC}"
    pip install -r requirements.txt
    if [ $? -eq 0 ]; then
        echo "✅ Dependencias instaladas correctamente"
    else
        echo -e "${RED}❌ Error al instalar dependencias${NC}"
        exit 1
    fi
else
    echo "✅ Dependencias ya instaladas"
fi

# Verificar kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}⚠️  kubectl no encontrado en PATH${NC}"
    echo "   Algunas funciones pueden no estar disponibles"
else
    echo "✅ kubectl encontrado: $(kubectl version --client --short 2>/dev/null || kubectl version --client 2>&1 | head -1)"
fi

# Verificar lsof (necesario para gestión de puertos)
if ! command -v lsof &> /dev/null; then
    echo -e "${YELLOW}⚠️  lsof no encontrado (necesario para gestión de puertos)${NC}"
    echo "   Instálalo con: sudo apt install lsof"
fi

echo ""
echo "========================================"
echo "🎯 Iniciando POC Dashboard"
echo "========================================"
echo ""

# Función para verificar si un puerto está en uso
port_in_use() {
    lsof -ti:$1 >/dev/null 2>&1
}

# Función para limpiar puerto
kill_port() {
    if port_in_use $1; then
        echo -e "${YELLOW}⚠️  Puerto $1 en uso. Liberando...${NC}"
        lsof -ti:$1 | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Función para cleanup al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios..."
    kill $SERVER_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Limpiar puerto si está en uso
kill_port 5000

# Iniciar servidor FastAPI con uvicorn
echo "🚀 Iniciando servidor POC Dashboard (puerto 5000)..."
echo ""

# Necesitamos ejecutar desde src/ para que el módulo poc esté disponible
ORIGINAL_DIR="$(pwd)"
cd ..

if [ -d "poc" ] && [ -f "poc/main.py" ]; then
    echo "📂 Ejecutando desde: $(pwd)"
    
    # Añadir el directorio actual al PYTHONPATH
    export PYTHONPATH="$(pwd):$PYTHONPATH"
    
    python3 -m uvicorn poc.main:app --host 0.0.0.0 --port 5000 --reload &
    SERVER_PID=$!
    
    # Volver al directorio original para los mensajes
    cd "$ORIGINAL_DIR"
else
    echo -e "${RED}❌ No se encuentra el módulo poc${NC}"
    echo "   Ubicación actual: $(pwd)"
    cd "$ORIGINAL_DIR"
    exit 1
fi

# Esperar a que el servidor esté listo
echo "⏳ Esperando a que el servidor esté listo..."
sleep 3

# Verificar que el servidor esté corriendo
if ps -p $SERVER_PID > /dev/null; then
    echo ""
    echo "========================================"
    echo -e "${GREEN}✅ POC Dashboard iniciado exitosamente!${NC}"
    echo "========================================"
    echo ""
    echo "📊 Dashboard URL: http://localhost:5000"
    echo "📖 API Docs:      http://localhost:5000/docs"
    echo "🔍 ReDoc:         http://localhost:5000/redoc"
    echo ""
    echo "📋 Información de conectores:"
    echo "   MASS EDC: https://edc-mass-control.51.178.94.25.nip.io"
    echo "   IKLN EDC: https://edc-ikln-control.51.178.94.25.nip.io"
    echo ""
    echo -e "${YELLOW}💡 Presiona Ctrl+C para detener${NC}"
    echo ""

    # Abrir navegador automáticamente (opcional)
    if command -v xdg-open &> /dev/null; then
        echo "🌐 Abriendo navegador..."
        sleep 2
        xdg-open http://localhost:5000 2>/dev/null || true
    elif command -v open &> /dev/null; then
        sleep 2
        open http://localhost:5000 2>/dev/null || true
    fi

    # Mantener el script ejecutándose
    wait $SERVER_PID
else
    echo -e "${RED}❌ Error: El servidor no pudo iniciarse${NC}"
    echo "   Revisa los logs y la configuración"
    exit 1
fi
