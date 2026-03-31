#!/bin/bash

###############################################################
# Script para detener POC EDC Dashboard
###############################################################

echo "🛑 Deteniendo POC Dashboard..."

# Matar procesos de uvicorn
if pgrep -f "uvicorn.*main:app" > /dev/null; then
    pkill -f "uvicorn.*main:app"
    echo "✅ Servidor detenido"
else
    echo "ℹ️  Servidor no estaba ejecutándose"
fi

# Matar procesos de main.py (por si acaso)
if pgrep -f "python.*main.py" > /dev/null; then
    pkill -f "python.*main.py"
    echo "✅ Procesos Python detenidos"
fi

# Limpiar puerto si está en uso
if command -v lsof &> /dev/null; then
    if lsof -ti:5000 >/dev/null 2>&1; then
        lsof -ti:5000 | xargs -r kill -9 2>/dev/null || true
        echo "✅ Puerto 5000 liberado"
    fi
fi

echo ""
echo "✅ POC Dashboard detenido completamente"
