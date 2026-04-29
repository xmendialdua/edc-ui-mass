#!/bin/bash

# Script de verificación pre-monitorización
# Verifica el estado de los conectores antes de monitorizar la transferencia

export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

echo "========================================="
echo "VERIFICACIÓN PRE-MONITORIZACIÓN"
echo "========================================="
echo ""

# 1. Verificar conectividad con endpoints Management API
echo "1️⃣  VERIFICANDO ENDPOINTS MANAGEMENT API"
echo "========================================="
echo ""

echo "🔍 IKLN Control Plane (Consumer):"
curl -k -s -o /dev/null -w "   Status: %{http_code}\n" https://edc-ikln-control.51.178.94.25.nip.io/management/v3/assets
echo ""

echo "🔍 MASS Control Plane (Provider):"
curl -k -s -o /dev/null -w "   Status: %{http_code}\n" https://edc-mass-control.51.178.94.25.nip.io/management/v3/assets
echo ""

# 2. Verificar estado de pods
echo "2️⃣  VERIFICANDO ESTADO DE PODS"
echo "========================================="
echo ""

echo "📦 UI edc-consumer (namespace: edc-ui):"
kubectl get pods -n edc-ui -o wide 2>/dev/null | grep -E "NAME|edc-ui"
echo ""

echo "📦 IKLN Connector - CONSUMER (namespace: umbrella):"
kubectl get pods -n umbrella -o wide 2>/dev/null | grep -E "NAME|ikln-edc"
echo ""

echo "📦 MASS Connector - PROVIDER (namespace: umbrella):"
kubectl get pods -n umbrella -o wide 2>/dev/null | grep -E "NAME|mass-edc"
echo ""

# 3. Verificar ingress
echo "3️⃣  VERIFICANDO INGRESS"
echo "========================================="
echo ""

kubectl get ingress -n umbrella 2>/dev/null | grep -E "NAME|ikln-edc-controlplane|mass-edc-controlplane"
echo ""

# 4. Verificar services
echo "4️⃣  VERIFICANDO SERVICES"
echo "========================================="
echo ""

echo "🔌 IKLN Services:"
kubectl get svc -n umbrella 2>/dev/null | grep -E "NAME|ikln-edc-controlplane"
echo ""

echo "🔌 MASS Services:"
kubectl get svc -n umbrella 2>/dev/null | grep -E "NAME|mass-edc-controlplane"
echo ""

# 5. Test directo al Management API con query específica
echo "5️⃣  TEST DETALLADO MANAGEMENT API"
echo "========================================="
echo ""

echo "🧪 Testing IKLN Management API (v3/assets):"
echo "   Endpoint: https://edc-ikln-control.51.178.94.25.nip.io/management/v3/assets"
RESPONSE=$(curl -k -s -w "\n%{http_code}" -H "Content-Type: application/json" -H "X-Api-Key: ikln-api-key-change-in-production" -X POST https://edc-ikln-control.51.178.94.25.nip.io/management/v3/assets/request -d '{"@context": {}, "offset": 0, "limit": 10}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ API Accesible"
    echo "   Response preview: $(echo "$BODY" | head -c 200)..."
elif [ "$HTTP_CODE" = "404" ]; then
    echo "   ❌ 404 NOT FOUND - El endpoint no existe o la ruta es incorrecta"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "   ⚠️  Problema de autenticación/autorización"
    echo "   Response: $BODY"
else
    echo "   ⚠️  Error inesperado"
    echo "   Response: $BODY"
fi
echo ""

echo "🧪 Testing MASS Management API (v3/assets):"
echo "   Endpoint: https://edc-mass-control.51.178.94.25.nip.io/management/v3/assets"
RESPONSE=$(curl -k -s -w "\n%{http_code}" -H "Content-Type: application/json" -H "X-Api-Key: mass-api-key-change-in-production" -X POST https://edc-mass-control.51.178.94.25.nip.io/management/v3/assets/request -d '{"@context": {}, "offset": 0, "limit": 10}' 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ API Accesible"
    echo "   Response preview: $(echo "$BODY" | head -c 200)..."
elif [ "$HTTP_CODE" = "404" ]; then
    echo "   ❌ 404 NOT FOUND - El endpoint no existe o la ruta es incorrecta"
    echo "   Response: $BODY"
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "   ⚠️  Problema de autenticación/autorización"
    echo "   Response: $BODY"
else
    echo "   ⚠️  Error inesperado"
    echo "   Response: $BODY"
fi
echo ""

# 6. Verificar últimas líneas de logs para detectar problemas recientes
echo "6️⃣  ÚLTIMAS LÍNEAS DE LOGS"
echo "========================================="
echo ""

IKLN_CP_POD=$(kubectl get pods -n umbrella -l app.kubernetes.io/name=tractusx-connector,app.kubernetes.io/component=controlplane,app.kubernetes.io/instance=ikln-edc -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ -n "$IKLN_CP_POD" ]; then
    echo "📋 Últimas 10 líneas del log de IKLN Control Plane:"
    echo "   Pod: $IKLN_CP_POD"
    echo ""
    kubectl logs -n umbrella "$IKLN_CP_POD" --tail=10 2>/dev/null | sed 's/^/   /'
else
    echo "⚠️  No se pudo encontrar el pod de IKLN Control Plane"
fi

echo ""
echo "========================================="
echo "✅ VERIFICACIÓN COMPLETADA"
echo "========================================="
echo ""
echo "Si los tests son exitosos, puedes proceder a ejecutar:"
echo "  ./monitor-transfer.sh"
echo ""
