#!/bin/bash

# Script de monitorización paralela - UI + Consumer Control Plane
# Muestra logs de ambos componentes lado a lado

export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

echo "========================================="
echo "🔍 MONITORIZACIÓN DUAL: UI + CONSUMER"
echo "========================================="
echo ""

# Obtener nombres de pods
UI_POD=$(kubectl get pods -n edc-ui --no-headers | grep edc-ui | awk '{print $1}')
IKLN_CP_POD=$(kubectl get pods -n umbrella --no-headers | grep ikln-edc-controlplane | awk '{print $1}')

echo "Pods identificados:"
echo "  UI:       $UI_POD"
echo "  Consumer: $IKLN_CP_POD"
echo ""

# Crear directorio para logs
LOG_DIR="/tmp/edc-monitor-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"

echo "📁 Logs se guardarán en: $LOG_DIR"
echo ""
echo "========================================="
echo "📋 INSTRUCCIONES:"
echo "========================================="
echo ""
echo "  1. Deja esta terminal abierta"
echo "  2. Ve a http://edc-ui.51.178.94.25.nip.io/edc-consumer"
echo "  3. Realiza la transferencia"
echo "  4. Los logs se guardarán automáticamente"
echo "  5. En otra terminal ejecuta:"
echo "     tail -f $LOG_DIR/ui.log"
echo "     tail -f $LOG_DIR/consumer.log"
echo ""
echo "========================================="
echo ""

# Función de limpieza
cleanup() {
    echo ""
    echo "========================================="
    echo "⏹️  Deteniendo monitorización..."
    echo "========================================="
    
    # Matar procesos de kubectl logs
    pkill -P $$ kubectl 2>/dev/null
    
    echo ""
    echo "📊 Logs capturados en:"
    echo ""
    ls -lh "$LOG_DIR"
    echo ""
    echo "Para revisar los logs:"
    echo "  cat $LOG_DIR/ui.log | grep -i error"
    echo "  cat $LOG_DIR/consumer.log | grep -i '404\|error\|transfer'"
    echo ""
    
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar captura de logs en segundo plano
echo "Iniciando captura de logs..."

if [ -n "$UI_POD" ]; then
    kubectl logs -f -n edc-ui "$UI_POD" --tail=50 > "$LOG_DIR/ui.log" 2>&1 &
    UI_PID=$!
    echo "✅ Monitorizando UI (PID: $UI_PID)"
fi

if [ -n "$IKLN_CP_POD" ]; then
    kubectl logs -f -n umbrella "$IKLN_CP_POD" --tail=50 > "$LOG_DIR/consumer.log" 2>&1 &
    CONSUMER_PID=$!
    echo "✅ Monitorizando Consumer Control Plane (PID: $CONSUMER_PID)"
fi

echo ""
echo "========================================="
echo "✅ MONITORIZACIÓN ACTIVA"
echo "========================================="
echo ""
echo "Mostrando últimas líneas del Consumer Control Plane:"
echo ""

# Seguir el log del consumer en el foreground
if [ -n "$IKLN_CP_POD" ]; then
    tail -f "$LOG_DIR/consumer.log" 2>/dev/null | while IFS= read -r line; do
        # Colorear líneas importantes
        if echo "$line" | grep -qi "error\|exception"; then
            echo "🔴 ERROR: $line"
        elif echo "$line" | grep -qi "404"; then
            echo "❌ 404: $line"
        elif echo "$line" | grep -qi "transfer"; then
            echo "🔵 TRANSFER: $line"
        elif echo "$line" | grep -qi "POST\|GET\|PUT\|DELETE"; then
            echo "🌐 HTTP: $line"
        else
            echo "$line"
        fi
    done
else
    echo "⚠️  No se pudo monitorizar el Consumer Control Plane"
    sleep infinity
fi
