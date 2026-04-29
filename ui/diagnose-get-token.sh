#!/bin/bash

# Script para diagnosticar el problema de "Get Token" en UI edc-consumer

echo "============================================"
echo "🔍 Diagnóstico: Get Token en UI edc-consumer"
echo "============================================"
echo ""

IKLN_API="https://edc-ikln-control.51.178.94.25.nip.io/management"
API_KEY="password"

# 1. Verificar conectividad al Management API
echo "1️⃣ Verificando conectividad al Management API..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X HEAD "$IKLN_API")
if [ "$CODE" == "404" ]; then
    echo "   ✅ Conector responde (404 es esperado en HEAD)"
elif [ "$CODE" == "000" ]; then
    echo "   ❌ No se puede conectar al conector"
    exit 1
else
    echo "   ✅ Conector responde (HTTP $CODE)"
fi
echo ""

# 2. Consultar EDRs disponibles
echo "2️⃣ Consultando EDRs disponibles..."
EDR_RESPONSE=$(curl -s -X POST \
  "$IKLN_API/v3/edrs/request" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"@context":{"@vocab":"https://w3id.org/edc/v0.0.1/ns/"},"@type":"QuerySpec"}')

EDR_COUNT=$(echo "$EDR_RESPONSE" | jq '. | length' 2>/dev/null || echo "0")

if [ "$EDR_COUNT" -gt 0 ]; then
    echo "   ✅ Se encontraron $EDR_COUNT EDR(s)"
    echo ""
    echo "   📋 Lista de EDRs:"
    echo "$EDR_RESPONSE" | jq -r '.[] | "      • Transfer: \(.transferProcessId // "N/A")\n        Agreement: \(.agreementId // "N/A")\n        ID: \(.["@id"] // "N/A")"' 2>/dev/null
else
    echo "   ⚠️  No se encontraron EDRs (array vacío)"
    echo "   💡 Posibles causas:"
    echo "      - No hay transfers en estado STARTED/COMPLETED"
    echo "      - La API Key '$API_KEY' es incorrecta"
    echo "      - Los transfers aún están en negociación"
fi
echo ""

# 3. Consultar transfers disponibles
echo "3️⃣ Consultando transfers en IKLN..."
TRANSFERS=$(curl -s -X POST \
  "$IKLN_API/v3/transferprocesses/request" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"@context":{"@vocab":"https://w3id.org/edc/v0.0.1/ns/"},"@type":"QuerySpec"}')

TRANSFER_COUNT=$(echo "$TRANSFERS" | jq '. | length' 2>/dev/null || echo "0")

if [ "$TRANSFER_COUNT" -gt 0 ]; then
    echo "   ✅ Se encontraron $TRANSFER_COUNT transfer(s)"
    echo ""
    echo "   📋 Estados de transfers:"
    echo "$TRANSFERS" | jq -r '.[] | "      • \(.["@id"] // "N/A")\n        Estado: \(.state // "N/A")\n        Contract: \(.contractId // "N/A")"' 2>/dev/null | head -30
    
    # Contar por estado
    STARTED=$(echo "$TRANSFERS" | jq '[.[] | select(.state == "STARTED")] | length' 2>/dev/null || echo "0")
    COMPLETED=$(echo "$TRANSFERS" | jq '[.[] | select(.state == "COMPLETED")] | length' 2>/dev/null || echo "0")
    TERMINATED=$(echo "$TRANSFERS" | jq '[.[] | select(.state == "TERMINATED")] | length' 2>/dev/null || echo "0")
    REQUESTED=$(echo "$TRANSFERS" | jq '[.[] | select(.state == "REQUESTED" or .state == "REQUESTING")] | length' 2>/dev/null || echo "0")
    
    echo ""
    echo "   📊 Resumen por estado:"
    echo "      STARTED: $STARTED (✅ Pueden tener EDR)"
    echo "      COMPLETED: $COMPLETED (✅ Pueden tener EDR)"
    echo "      TERMINATED: $TERMINATED (⚠️  Pueden tener EDR)"
    echo "      REQUESTED/ING: $REQUESTED (❌ No tienen EDR aún)"
else
    echo "   ⚠️  No se encontraron transfers"
fi
echo ""

# 4. Análisis de matching
echo "4️⃣ Análisis de matching EDR ↔ Transfer..."

if [ "$EDR_COUNT" -gt 0 ] && [ "$TRANSFER_COUNT" -gt 0 ]; then
    # Extraer IDs para comparación
    echo "$EDR_RESPONSE" | jq -r '.[] | @json' 2>/dev/null | while read -r edr; do
        EDR_TRANSFER_ID=$(echo "$edr" | jq -r '.transferProcessId // "N/A"')
        EDR_AGREEMENT_ID=$(echo "$edr" | jq -r '.agreementId // "N/A"')
        EDR_ID=$(echo "$edr" | jq -r '.["@id"] // "N/A"')
        
        # Buscar transfer correspondiente
        MATCHING_TRANSFER=$(echo "$TRANSFERS" | jq -r ".[] | select(.[\\"@id\\"] == \\"$EDR_TRANSFER_ID\\" or .contractId == \\"$EDR_AGREEMENT_ID\\")" 2>/dev/null)
        
        if [ -n "$MATCHING_TRANSFER" ]; then
            TRANSFER_STATE=$(echo "$MATCHING_TRANSFER" | jq -r '.state // "N/A"')
            TRANSFER_CONTRACT=$(echo "$MATCHING_TRANSFER" | jq -r '.contractId // "N/A"')
            echo "   ✅ Match encontrado:"
            echo "      EDR Transfer ID: $EDR_TRANSFER_ID"
            echo "      EDR Agreement ID: $EDR_AGREEMENT_ID"
            echo "      Transfer Estado: $TRANSFER_STATE"
            echo "      Transfer Contract: $TRANSFER_CONTRACT"
            
            if [ "$EDR_AGREEMENT_ID" == "$TRANSFER_CONTRACT" ]; then
                echo "      ✅ agreementId == contractId (matching perfecto)"
            else
                echo "      ⚠️  agreementId != contractId (matching por transferProcessId)"
            fi
            echo ""
        else
            echo "   ⚠️  EDR sin transfer correspondiente:"
            echo "      EDR ID: $EDR_ID"
            echo "      EDR Transfer ID: $EDR_TRANSFER_ID"
            echo "      EDR Agreement ID: $EDR_AGREEMENT_ID"
            echo ""
        fi
    done
else
    echo "   ⚠️  No hay suficientes datos para análisis"
fi

# 5. Verificar si el proxy de Next.js está corriendo
echo "5️⃣ Verificando proxy de Next.js..."
if pgrep -f "next dev" > /dev/null; then
    echo "   ✅ Next.js está corriendo"
    
    # Intentar consultar el proxy
    PROXY_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    if [ "$PROXY_TEST" == "200" ] || [ "$PROXY_TEST" == "404" ]; then
        echo "   ✅ Proxy accesible en http://localhost:3000"
    else
        echo "   ⚠️  Proxy no responde (HTTP $PROXY_TEST)"
    fi
else
    echo "   ⚠️  Next.js no está corriendo"
    echo "   💡 Ejecuta: cd ui && pnpm dev"
fi
echo ""

# 6. Recomendaciones
echo "============================================"
echo "📋 Recomendaciones:"
echo "============================================"

if [ "$EDR_COUNT" == "0" ]; then
    echo "❌ PROBLEMA: No hay EDRs disponibles"
    echo ""
    echo "Soluciones:"
    echo "1. Espera a que el transfer llegue a estado STARTED"
    echo "   → Usa 'Refresh Status' en la UI cada 5 segundos"
    echo ""
    echo "2. Verifica que la API Key sea correcta en ui/edc-config.ts:"
    echo "   connectors: {"
    echo "     '$IKLN_API': '$API_KEY',"
    echo "   }"
    echo ""
    echo "3. Inicia un nuevo transfer desde Negotiated Contracts"
    echo ""
elif [ "$STARTED" == "0" ] && [ "$COMPLETED" == "0" ]; then
    echo "⚠️  PROBLEMA: No hay transfers en estado STARTED/COMPLETED"
    echo ""
    echo "Solución:"
    echo "→ Los EDRs solo se generan cuando el transfer llega a STARTED"
    echo "→ Espera unos segundos y vuelve a consultar"
    echo ""
else
    echo "✅ Hay EDRs y transfers en estado correcto"
    echo ""
    echo "Si 'Get Token' sigue fallando:"
    echo "1. Abre DevTools → Console en el navegador"
    echo "2. Busca logs de 'Making EDRs request'"
    echo "3. Verifica que el matching esté correcto"
    echo ""
    echo "O usa el Dashboard (FASE 6):"
    echo "→ http://localhost:8083"
    echo "→ FASE 6: Consultar Contratos"
    echo "→ Click en '🔑 Get Token'"
fi

echo ""
echo "============================================"
echo "Diagnóstico completado"
echo "============================================"
