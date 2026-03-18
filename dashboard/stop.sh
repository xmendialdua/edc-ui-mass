#!/bin/bash

###############################################################
# Script para detener EDC Asset Publishing Dashboard
###############################################################

echo "🛑 Deteniendo EDC Dashboard..."

# Matar procesos de backend
if pgrep -f "backend.py" > /dev/null; then
    pkill -f "backend.py"
    echo "✅ Backend detenido"
else
    echo "ℹ️  Backend no estaba ejecutándose"
fi

# Matar procesos de frontend
if pgrep -f "http.server 8083" > /dev/null; then
    pkill -f "http.server 8083"
    echo "✅ Frontend detenido"
else
    echo "ℹ️  Frontend no estaba ejecutándose"
fi

# Limpiar puertos si están en uso
if command -v lsof &> /dev/null; then
    if lsof -ti:5000 >/dev/null 2>&1; then
        lsof -ti:5000 | xargs -r kill -9 2>/dev/null || true
        echo "✅ Puerto 5000 liberado"
    fi
    
    if lsof -ti:8083 >/dev/null 2>&1; then
        lsof -ti:8083 | xargs -r kill -9 2>/dev/null || true
        echo "✅ Puerto 8083 liberado"
    fi
fi

echo ""
echo "✅ Dashboard detenido completamente"
