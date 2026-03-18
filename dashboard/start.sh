#!/bin/bash

###############################################################
# Script de inicio para EDC Asset Publishing Dashboard
###############################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "🚀 EDC Asset Publishing Dashboard"
echo "========================================"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 no encontrado. Por favor instala Python 3.8+"
    exit 1
fi

echo "✅ Python 3 encontrado: $(python3 --version)"

# Verificar KUBECONFIG
# Busca en múltiples ubicaciones
if [ -n "$KUBECONFIG" ] && [ -f "$KUBECONFIG" ]; then
    KUBECONFIG_FILE="$KUBECONFIG"
elif [ -f "kubeconfig.yaml" ]; then
    KUBECONFIG_FILE="./kubeconfig.yaml"
elif [ -f "../kubeconfig.yaml" ]; then
    KUBECONFIG_FILE="../kubeconfig.yaml"
elif [ -f "$HOME/.kube/config" ]; then
    KUBECONFIG_FILE="$HOME/.kube/config"
else
    echo "⚠️  KUBECONFIG no encontrado en ubicaciones estándar"
    echo "   Coloca kubeconfig.yaml en este directorio o configura \$KUBECONFIG"
    KUBECONFIG_FILE="kubeconfig.yaml (no encontrado)"
fi

if [ -f "$KUBECONFIG_FILE" ]; then
    echo "✅ KUBECONFIG encontrado: $KUBECONFIG_FILE"
else
    echo "⚠️  KUBECONFIG: $KUBECONFIG_FILE"
    echo "   Algunas funciones pueden no estar disponibles"
fi

# Activar entorno virtual si existe
if [ -d "venv" ]; then
    echo "🐍 Activando entorno virtual..."
    source venv/bin/activate
    echo "✅ Entorno virtual activado"
elif [ -d "../venv" ]; then
    source ../venv/bin/activate
    echo "✅ Entorno virtual activado"
fi

# Verificar/instalar dependencias
echo ""
echo "📦 Verificando dependencias..."

if ! python3 -c "import flask" 2>/dev/null; then
    echo "⚠️  Flask no instalado. Instalando dependencias..."
    if command -v pip &> /dev/null; then
        pip install -r requirements.txt
    else
        echo "❌ pip no encontrado. Por favor crea un entorno virtual:"
        echo "   python3 -m venv venv"
        echo "   source venv/bin/activate"
        echo "   pip install -r requirements.txt"
        exit 1
    fi
else
    echo "✅ Dependencias ya instaladas"
fi

# Verificar kubectl
if ! command -v kubectl &> /dev/null; then
    echo "⚠️  kubectl no encontrado en PATH"
    echo "   Algunas funciones pueden no estar disponibles"
else
    echo "✅ kubectl encontrado: $(kubectl version --client --short 2>/dev/null || kubectl version --client)"
fi

# Verificar lsof (necesario para gestión de puertos)
if ! command -v lsof &> /dev/null; then
    echo "⚠️  lsof no encontrado (necesario para gestión de puertos)"
    echo "   Instálalo con: sudo apt install lsof"
fi

echo ""
echo "========================================"
echo "🎯 Iniciando Dashboard"
echo "========================================"
echo ""

# Función para verificar si un puerto está en uso
port_in_use() {
    lsof -ti:$1 >/dev/null 2>&1
}

# Función para limpiar puerto
kill_port() {
    if port_in_use $1; then
        echo "⚠️  Puerto $1 en uso. Liberando..."
        lsof -ti:$1 | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Función para cleanup al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Limpiar puertos si están en uso
kill_port 5000
kill_port 8083

# Iniciar backend
echo "🔧 Iniciando Backend (puerto 5000)..."
python3 backend.py &
BACKEND_PID=$!

# Esperar a que el backend esté listo
sleep 3

# Iniciar frontend
echo "🌐 Iniciando Frontend (puerto 8083)..."
python3 -m http.server 8083 &
FRONTEND_PID=$!

# Esperar a que el frontend esté listo
sleep 2

echo ""
echo "========================================"
echo -e "${GREEN}✅ Dashboard iniciado exitosamente!${NC}"
echo "========================================"
echo ""
echo "📊 Dashboard URL: http://localhost:8083"
echo "🔌 Backend API:   http://localhost:5000"
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
    xdg-open http://localhost:8083 2>/dev/null || true
elif command -v open &> /dev/null; then
    open http://localhost:8083 2>/dev/null || true
fi

# Mantener el script ejecutándose
wait $BACKEND_PID $FRONTEND_PID
