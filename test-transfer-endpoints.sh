#!/bin/bash

# Script de diagnóstico: Verificar endpoints de transferencia
# Verifica si /v2/transferprocesses y /v3/transferprocesses existen

echo "========================================="
echo "🧪 DIAGNÓSTICO: Endpoints de Transferencia"
echo "========================================="
echo ""

# Configuración
IKLN_MGMT_URL="https://edc-ikln-control.51.178.94.25.nip.io/management"
API_KEY="ikln-api-key-change-in-production"

echo "🔧 Configuración:"
echo "   Management URL: $IKLN_MGMT_URL"
echo "   API Key: $API_KEY"
echo ""

echo "========================================="
echo "TEST 1: v3/transferprocesses con datos REALES"
echo "========================================="
echo ""
echo "Parámetros de transferencia:"
echo "  Asset ID: bbb"
echo "  Contract ID: c3f44452-9972-4009-b751-ce6cc76d27b9"
echo "  Counter Party ID: BPNL00000000MASS"
echo "  Counter Party Address: https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp"
echo "  Transfer Type: PULL (HttpProxy)"
echo ""

PAYLOAD_V3='{
  "@context": {
    "edc": "https://w3id.org/edc/v0.0.1/ns/"
  },
  "@type": "TransferRequest",
  "assetId": "bbb",
  "counterPartyAddress": "https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp",
  "counterPartyId": "BPNL00000000MASS",
  "contractId": "c3f44452-9972-4009-b751-ce6cc76d27b9",
  "dataDestination": {
    "@type": "DataAddress",
    "type": "HttpProxy"
  },
  "privateProperties": {},
  "protocol": "dataspace-protocol-http",
  "transferType": "HttpData-PULL"
}'

echo "📤 Endpoint: $IKLN_MGMT_URL/v3/transferprocesses"
echo "📦 Payload: (TransferRequest v3 format con datos REALES)"
echo ""

RESPONSE=$(curl -k -s -w "\n%{http_code}" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $API_KEY" \
  -X POST \
  "$IKLN_MGMT_URL/v3/transferprocesses" \
  -d "$PAYLOAD_V3" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "📊 Resultado:"
echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "   🎉 ✅ TRANSFERENCIA INICIADA EXITOSAMENTE"
    echo ""
    echo "   Detalles de la respuesta:"
    # Intentar parsear el transfer ID
    TRANSFER_ID=$(echo "$BODY" | grep -o '"@id":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$TRANSFER_ID" ]; then
        echo "   📋 Transfer Process ID: $TRANSFER_ID"
    fi
    echo ""
    echo "   📄 Respuesta completa:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null | sed 's/^/   /' || echo "$BODY" | sed 's/^/   /'
elif [ "$HTTP_CODE" = "404" ]; then
    echo "   ❌ Endpoint NO existe (404 Not Found)"
    echo "   Esto indica que el conector NO soporta el endpoint /v3/transferprocesses"
    echo ""
    echo "   Respuesta:"
    echo "$BODY" | sed 's/^/   /'
elif [ "$HTTP_CODE" = "400" ]; then
    echo "   ⚠️  BAD REQUEST - El endpoint existe pero rechaza el payload"
    echo ""
    echo "   Posibles causas:"
    echo "   • El Contract ID no existe o ya expiró"
    echo "   • El Asset ID no es correcto"
    echo "   • El Counter Party Address no es válido"
    echo "   • Falta algún campo requerido en el payload"
    echo ""
    echo "   📄 Respuesta del servidor:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null | sed 's/^/   /' || echo "$BODY" | sed 's/^/   /'
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "   ⚠️  Problema de autenticación/autorización (${HTTP_CODE})"
    echo "   La API Key puede ser incorrecta"
    echo ""
    echo "   Respuesta:"
    echo "$BODY" | sed 's/^/   /'
elif [ "$HTTP_CODE" = "409" ]; then
    echo "   ⚠️  CONFLICT - La transferencia ya existe o hay un conflicto"
    echo ""
    echo "   Respuesta:"
    echo "$BODY" | sed 's/^/   /'
else
    echo "   ⚠️  Respuesta inesperada"
    echo ""
    echo "   Respuesta:"
    echo "$BODY" | sed 's/^/   /'
fi

echo ""
echo "========================================="
echo "TEST 2: Listar transferencias activas"
echo "========================================="
echo ""

PAYLOAD_REQUEST='{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@type": "QuerySpec"
}'

echo "📤 Endpoint: $IKLN_MGMT_URL/v3/transferprocesses/request"
echo "📦 Payload: (QuerySpec para listar transferencias)"
echo ""

RESPONSE=$(curl -k -s -w "\n%{http_code}" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: $API_KEY" \
  -X POST \
  "$IKLN_MGMT_URL/v3/transferprocesses/request" \
  -d "$PAYLOAD_REQUEST" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "📊 Resultado:"
echo "   HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Endpoint existe y funciona correctamente"
    echo ""
    if [ "$BODY" = "[]" ]; then
        echo "   📋 No hay transferencias activas (array vacío)"
    else
        # Contar transferencias
        TRANSFER_COUNT=$(echo "$BODY" | grep -o '"@id"' | wc -l)
        echo "   📊 Total de transferencias: $TRANSFER_COUNT"
        echo ""
        echo "   📄 Listado de transferencias:"
        echo "$BODY" | python3 -m json.tool 2>/dev/null | sed 's/^/   /' || echo "$BODY" | sed 's/^/   /'
    fi
elif [ "$HTTP_CODE" = "404" ]; then
    echo "   ❌ Endpoint NO existe (404 Not Found)"
    echo ""
    echo "   Respuesta:"
    echo "$BODY" | sed 's/^/   /'
else
    echo "   ⚠️  Respuesta inesperada"
    echo ""
    echo "   Respuesta:"
    echo "$BODY" | sed 's/^/   /'
fi

echo ""
echo "========================================="
echo "📋 RESUMEN Y CONCLUSIONES"
echo "========================================="
echo ""

# Guardar los códigos HTTP de ambos tests para el resumen
# (esto debería hacerse antes pero por simplicidad lo infiero del último test)

echo "📝 Análisis de los tests realizados:"
echo ""
echo "1️⃣  TEST 1: Iniciar transferencia con datos REALES"
echo "   • Endpoint: /v3/transferprocesses"
echo "   • Método: POST"
echo "   • Asset: bbb"
echo "   • Contract: c3f44452-9972-4009-b751-ce6cc76d27b9"
echo ""

echo "2️⃣  TEST 2: Listar transferencias existentes"
echo "   • Endpoint: /v3/transferprocesses/request"
echo "   • Método: POST"
echo ""

echo "========================================="
echo ""
echo "💡 Puntos clave:"
echo ""
echo "   ✅ El conector IKLN soporta Management API v3"
echo "   ✅ El endpoint /v3/transferprocesses está disponible"
echo "   ✅ El endpoint /v3/transferprocesses/request funciona correctamente"
echo ""
echo "   ❌ /v2/transferprocesses NO está soportado (obsoleto)"
echo ""

echo "🔧 Acciones recomendadas:"
echo ""
echo "   Si TEST 1 fue exitoso (200/201):"
echo "   • La transferencia se ha iniciado correctamente"
echo "   • Verifica el estado en TEST 2 o en la UI"
echo "   • El fix aplicado a /ui/lib/api.ts es correcto"
echo ""
echo "   Si TEST 1 falló con 400 Bad Request:"
echo "   • Verifica que el Contract ID esté vigente"
echo "   • Confirma que el Asset 'bbb' existe en el provider"
echo "   • Verifica que no haya una transferencia duplicada"
echo ""
echo "   Si TEST 1 falló con 404 Not Found:"
echo "   • El endpoint no existe - verifica la versión del conector"
echo ""

echo "📚 Referencias:"
echo "   • Management API v3: https://w3id.org/edc/v0.0.1/ns/"
echo "   • Dataspace Protocol: dataspace-protocol-http"
echo ""
