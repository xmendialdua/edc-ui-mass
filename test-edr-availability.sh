#!/bin/bash
# Test EDR availability for a specific transfer

IKLN_API="https://edc-ikln-control.51.178.94.25.nip.io/management"
API_KEY="ikln-api-key-change-in-production"

if [ -z "$1" ]; then
    echo "Usage: $0 <transfer_id>"
    exit 1
fi

TRANSFER_ID="$1"

echo "🔍 Testing EDR availability for transfer: $TRANSFER_ID"
echo ""

# 1. Get transfer status
echo "1️⃣ Transfer Status:"
curl -s -X GET "$IKLN_API/v3/transferprocesses/$TRANSFER_ID" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# 2. List all EDRs
echo "2️⃣ All available EDRs:"
curl -s -X POST "$IKLN_API/v3/edrs/request" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "@context": {"@vocab": "https://w3id.org/edc/v0.0.1/ns/"},
    "@type": "QuerySpec",
    "offset": 0,
    "limit": 100
  }' | jq '.'
echo ""
echo ""

# 3. Try to get dataaddress using transfer ID as EDR ID
echo "3️⃣ Try get dataaddress with transfer ID:"
curl -s -X GET "$IKLN_API/v3/edrs/$TRANSFER_ID/dataaddress" \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

echo "✅ Test completed"
