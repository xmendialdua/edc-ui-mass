#!/bin/bash
# Test script para verificar la política contract-policy-membership-only

set -e

MASS_API="https://edc-mass-control.51.178.94.25.nip.io/management"
MASS_API_KEY="mass-api-key-change-in-production"

echo "🧪 Test: Contract Policy Membership-Only"
echo "=========================================="
echo ""

echo "1️⃣ Creando la política contract-policy-membership-only..."
POLICY_RESPONSE=$(curl -s -X POST "${MASS_API}/v3/policydefinitions" \
  -H "X-Api-Key: ${MASS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "@context": [
      "https://w3id.org/catenax/2025/9/policy/odrl.jsonld",
      "https://w3id.org/catenax/2025/9/policy/context.jsonld",
      {
        "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
      }
    ],
    "@type": "PolicyDefinition",
    "@id": "contract-policy-membership-only",
    "policy": {
      "@type": "Set",
      "permission": [{
        "action": "use",
        "constraint": {
          "and": [
            {
              "leftOperand": "Membership",
              "operator": "eq",
              "rightOperand": "active"
            }
          ]
        }
      }],
      "prohibition": [],
      "obligation": []
    }
  }')

if echo "$POLICY_RESPONSE" | grep -q '"@id"'; then
    echo "✅ Política creada exitosamente"
elif echo "$POLICY_RESPONSE" | grep -q "already exists\|409"; then
    echo "ℹ️  Política ya existe (OK)"
else
    echo "❌ Error creating policy:"
    echo "$POLICY_RESPONSE" | python3 -m json.tool
    exit 1
fi

echo ""
echo "2️⃣ Verificando que la política existe..."
POLICIES=$(curl -s -X POST "${MASS_API}/v3/policydefinitions/request" \
  -H "X-Api-Key: ${MASS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "@context": {"@vocab": "https://w3id.org/edc/v0.0.1/ns/"},
    "offset": 0,
    "limit": 100
  }') 

if echo "$POLICIES" | grep -q '"contract-policy-membership-only"'; then
    echo "✅ Política encontrada en el listado"
    echo ""
    echo "📋 Detalles de la política:"
    echo "$POLICIES" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for p in data:
    if p.get('@id') == 'contract-policy-membership-only':
        print(json.dumps(p, indent=2))
        break
"
else
    echo "❌ Política NO encontrada en el listado"
    exit 1
fi

echo ""
echo "✅ Test completado exitosamente"
echo ""
echo "📝 Siguiente paso:"
echo "   1. Reinicia el backend: cd dashboard && ./stop.sh && ./start.sh"
echo "   2. Abre data-publication.html"
echo "   3. Publica un asset"
echo "   4. La política 'contract-policy-membership-only' se usará automáticamente"
