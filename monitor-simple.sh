#!/bin/bash

# Script simplificado de monitorización de transferencia EDC
# Monitoriza en tiempo real los logs del connector consumer (IKLN)

export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

echo "========================================="
echo "🔍 MONITORIZACIÓN DE TRANSFERENCIA EDC"
echo "========================================="
echo ""
echo "📅 Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Obtener nombre del pod de control plane IKLN (consumer)
IKLN_CP_POD=$(kubectl get pods -n umbrella --no-headers | grep ikln-edc-controlplane | awk '{print $1}')

if [ -z "$IKLN_CP_POD" ]; then
    echo "❌ ERROR: No se pudo encontrar el pod de IKLN Control Plane"
    exit 1
fi

echo "✅ Pod IKLN Control Plane encontrado: $IKLN_CP_POD"
echo ""

# Obtener nombre del pod de UI
UI_POD=$(kubectl get pods -n edc-ui --no-headers | grep edc-ui | awk '{print $1}')

if [ -z "$UI_POD" ]; then
    echo "⚠️  WARNING: No se pudo encontrar el pod de la UI"
else
    echo "✅ Pod UI encontrado: $UI_POD"
fi

echo ""
echo "========================================="
echo "📋 INSTRUCCIONES:"
echo "========================================="
echo ""
echo "  1. Deja esta terminal abierta y visible"
echo "  2. Ve a http://edc-ui.51.178.94.25.nip.io/edc-consumer"
echo "  3. Inicia la transferencia con los parámetros:"
echo "     - Asset ID: bbb"
echo "     - Contract ID: c3f44452-9972-4009-b751-ce6cc76d27b9"
echo "     - Counter Party ID: did:web:provider-identityhub%3A7083:provider"
echo "     - Counter Party Address: https://control-plane-connector1.dataspace-ikerlan.es/api/v1/dsp"
echo "     - Transfer Type: PULL"
echo ""
echo "  4. Observa los logs que aparecen abajo en tiempo real"
echo "  5. Presiona Ctrl+C cuando hayas terminado"
echo ""
echo "========================================="
echo "📊 LOGS EN TIEMPO REAL"
echo "========================================="
echo ""
echo "Monitorizando: $IKLN_CP_POD (IKLN Consumer Control Plane)"
echo "Namespace: umbrella"
echo ""
echo "--- Logs comenzando ahora ---"
echo ""

# Función de limpieza
cleanup() {
    echo ""
    echo ""
    echo "========================================="
    echo "⏹️  MONITORIZACIÓN DETENIDA"
    echo "========================================="
    echo ""
    exit 0
}

# Capturar Ctrl+C
trap cleanup SIGINT SIGTERM

# Seguir los logs en tiempo real del control plane consumer
kubectl logs -f -n umbrella "$IKLN_CP_POD" --tail=30 2>&1 | while IFS= read -r line; do
    # Colorear líneas con errores o warnings
    if echo "$line" | grep -qi "error\|exception\|failed"; then
        echo "🔴 $line"
    elif echo "$line" | grep -qi "warn\|warning"; then
        echo "🟡 $line"
    elif echo "$line" | grep -qi "404"; then
        echo "❌ $line"
    elif echo "$line" | grep -qi "transfer"; then
        echo "🔵 $line"
    else
        echo "$line"
    fi
done
