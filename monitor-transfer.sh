#!/bin/bash

# Script de monitorización en tiempo real de transferencia EDC
# Fecha: 27 Marzo 2026

export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

echo "========================================="
echo "MONITORIZACIÓN DE TRANSFERENCIA EDC"
echo "========================================="
echo ""
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "Componentes monitorizados:"
echo "  1. UI edc-consumer (namespace: edc-ui)"
echo "  2. IKLN Control Plane - CONSUMER (namespace: umbrella)"
echo "  3. IKLN Data Plane - CONSUMER (namespace: umbrella)"
echo "  4. MASS Control Plane - PROVIDER (namespace: umbrella)"
echo "  5. MASS Data Plane - PROVIDER (namespace: umbrella)"
echo ""
echo "========================================="
echo ""

# Crear directorio para logs
LOG_DIR="/tmp/edc-transfer-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"

echo "📁 Logs se guardarán en: $LOG_DIR"
echo ""

# Función para capturar logs en segundo plano
capture_logs() {
    local namespace=$1
    local pod_name=$2
    local component=$3
    local log_file="$LOG_DIR/${component}.log"
    
    echo "🔍 Monitorizando: $component"
    kubectl logs -f -n "$namespace" "$pod_name" --tail=50 > "$log_file" 2>&1 &
    echo $! # Retornar PID del proceso
}

# Obtener nombres exactos de los pods
echo "Identificando pods..."
UI_POD=$(kubectl get pods -n edc-ui -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
IKLN_CP_POD=$(kubectl get pods -n umbrella -l app.kubernetes.io/name=tractusx-connector,app.kubernetes.io/component=controlplane,app.kubernetes.io/instance=ikln-edc -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
IKLN_DP_POD=$(kubectl get pods -n umbrella -l app.kubernetes.io/name=tractusx-connector,app.kubernetes.io/component=dataplane,app.kubernetes.io/instance=ikln-edc -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
MASS_CP_POD=$(kubectl get pods -n umbrella -l app.kubernetes.io/name=tractusx-connector,app.kubernetes.io/component=controlplane,app.kubernetes.io/instance=mass-edc -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
MASS_DP_POD=$(kubectl get pods -n umbrella -l app.kubernetes.io/name=tractusx-connector,app.kubernetes.io/component=dataplane,app.kubernetes.io/instance=mass-edc -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

echo ""
echo "Pods identificados:"
echo "  - UI:              $UI_POD"
echo "  - IKLN ControlP:   $IKLN_CP_POD"
echo "  - IKLN DataPlane:  $IKLN_DP_POD"
echo "  - MASS ControlP:   $MASS_CP_POD"
echo "  - MASS DataPlane:  $MASS_DP_POD"
echo ""

# Iniciar captura de logs
echo "========================================="
echo "INICIANDO CAPTURA DE LOGS..."
echo "========================================="
echo ""

# Array para almacenar PIDs de procesos de captura
declare -a PIDS

if [ -n "$UI_POD" ]; then
    PID=$(capture_logs "edc-ui" "$UI_POD" "ui-edc-consumer")
    PIDS+=($PID)
fi

if [ -n "$IKLN_CP_POD" ]; then
    PID=$(capture_logs "umbrella" "$IKLN_CP_POD" "ikln-controlplane")
    PIDS+=($PID)
fi

if [ -n "$IKLN_DP_POD" ]; then
    PID=$(capture_logs "umbrella" "$IKLN_DP_POD" "ikln-dataplane")
    PIDS+=($PID)
fi

if [ -n "$MASS_CP_POD" ]; then
    PID=$(capture_logs "umbrella" "$MASS_CP_POD" "mass-controlplane")
    PIDS+=($PID)
fi

if [ -n "$MASS_DP_POD" ]; then
    PID=$(capture_logs "umbrella" "$MASS_DP_POD" "mass-dataplane")
    PIDS+=($PID)
fi

echo ""
echo "========================================="
echo "✅ MONITORIZACIÓN ACTIVA"
echo "========================================="
echo ""
echo "📋 INSTRUCCIONES:"
echo ""
echo "  1. Deja esta terminal abierta"
echo "  2. Ve a http://edc-ui.51.178.94.25.nip.io/edc-consumer"
echo "  3. Realiza la transferencia con los parámetros:"
echo "     - Asset ID: bbb"
echo "     - Contract ID: c3f44452-9972-4009-b751-ce6cc76d27b9"
echo "     - Counter Party ID: did:web:provider-identityhub%3A7083:provider"
echo "     - Counter Party Address: https://control-plane-connector1.dataspace-ikerlan.es/api/v1/dsp"
echo "     - Transfer Type: PULL"
echo ""
echo "  4. Presiona Ctrl+C cuando termines de observar"
echo ""
echo "Los logs se están guardando en tiempo real en:"
echo "  $LOG_DIR/"
echo ""
echo "========================================="
echo ""

# Función de limpieza al recibir Ctrl+C
cleanup() {
    echo ""
    echo ""
    echo "========================================="
    echo "DETENIENDO MONITORIZACIÓN..."
    echo "========================================="
    echo ""
    
    # Matar todos los procesos de captura
    for pid in "${PIDS[@]}"; do
        kill $pid 2>/dev/null
    done
    
    echo "📊 ANÁLISIS DE LOGS CAPTURADOS:"
    echo ""
    
    # Mostrar resumen de cada log
    for log_file in "$LOG_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            filename=$(basename "$log_file")
            line_count=$(wc -l < "$log_file")
            echo "  - $filename: $line_count líneas"
        fi
    done
    
    echo ""
    echo "========================================="
    echo "📁 Logs guardados en: $LOG_DIR"
    echo "========================================="
    echo ""
    echo "Para revisar los logs:"
    echo "  cat $LOG_DIR/ui-edc-consumer.log"
    echo "  cat $LOG_DIR/ikln-controlplane.log"
    echo "  cat $LOG_DIR/mass-controlplane.log"
    echo ""
    echo "Para buscar errores:"
    echo "  grep -i error $LOG_DIR/*.log"
    echo "  grep -i 404 $LOG_DIR/*.log"
    echo "  grep -i 'connector not found' $LOG_DIR/*.log"
    echo ""
    
    exit 0
}

# Capturar Ctrl+C
trap cleanup SIGINT SIGTERM

# Mantener el script corriendo y mostrar logs en tiempo real de IKLN control plane
echo "Mostrando logs en tiempo real de IKLN Control Plane (CONSUMER):"
echo "----------------------------------------------------------------"
echo ""

# Seguir los logs del control plane del consumer (donde ocurre el error)
if [ -n "$IKLN_CP_POD" ]; then
    kubectl logs -f -n umbrella "$IKLN_CP_POD" --tail=20
else
    echo "⚠️  No se pudo encontrar el pod de IKLN Control Plane"
    echo "Manteniendo captura en segundo plano..."
    # Esperar indefinidamente
    while true; do
        sleep 1
    done
fi
