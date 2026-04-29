#!/bin/bash

# Script CORREGIDO para reparar las claves del Data Plane de MASS
# Problema: vault kv put no funciona - necesitamos usar la API HTTP de Vault
# Solución: Usar wget/curl con formato JSON correcto

set -e

NAMESPACE="umbrella"
VAULT_POD="mass-edc-vault-0"
VAULT_URL="http://localhost:8200"
VAULT_TOKEN="root"

echo "🔧 Reparando claves del Data Plane de MASS (VERSIÓN CORREGIDA)"
echo "==============================================================="
echo ""

# 1. Generar nueva clave RSA privada (para firmar tokens)
echo "1️⃣ Generando nueva clave RSA privada (4096 bits)..."
openssl genrsa -out /tmp/tokenSignerPrivateKey.pem 4096

# 2. Extraer la clave pública correspondiente
echo "2️⃣ Extrayendo clave pública correspondiente..."
openssl rsa -in /tmp/tokenSignerPrivateKey.pem -pubout -out /tmp/tokenSignerPublicKey.pem

# 3. Generar clave AES para encriptación (256 bits en hex)
echo "3️⃣ Generando clave AES para encriptación..."
AES_KEY=$(openssl rand -hex 32)

echo ""
echo "✅ Claves generadas exitosamente"
echo ""

# 4. Preparar las claves en formato JSON para Vault KV v2
echo "4️⃣ Preparando claves en formato JSON para Vault..."

# Leer las claves y escapar para JSON (mantener \n literales)
PRIVATE_KEY_CONTENT=$(cat /tmp/tokenSignerPrivateKey.pem | sed 's/$/\\n/' | tr -d '\n' | sed 's/\\n$//')
PUBLIC_KEY_CONTENT=$(cat /tmp/tokenSignerPublicKey.pem | sed 's/$/\\n/' | tr -d '\n' | sed 's/\\n$//')

# Crear archivos JSON temporales
cat > /tmp/private-key.json <<EOF
{
  "data": {
    "content": "${PRIVATE_KEY_CONTENT}"
  }
}
EOF

cat > /tmp/public-key.json <<EOF
{
  "data": {
    "content": "${PUBLIC_KEY_CONTENT}"
  }
}
EOF

cat > /tmp/aes-key.json <<EOF
{
  "data": {
    "content": "${AES_KEY}"
  }
}
EOF

echo "✅ Archivos JSON creados"
echo ""

# 5. Copiar archivos JSON al pod de Vault
echo "5️⃣ Copiando archivos al pod de Vault..."
kubectl cp /tmp/private-key.json $NAMESPACE/$VAULT_POD:/tmp/private-key.json
kubectl cp /tmp/public-key.json $NAMESPACE/$VAULT_POD:/tmp/public-key.json
kubectl cp /tmp/aes-key.json $NAMESPACE/$VAULT_POD:/tmp/aes-key.json

echo "✅ Archivos copiados"
echo ""

# 6. Cargar las claves usando la API HTTP de Vault (exactamente como post-install)
echo "6️⃣ Cargando claves en Vault usando API HTTP..."

kubectl exec -n $NAMESPACE $VAULT_POD -- sh -c "
  wget --header 'Content-Type: application/json' \
       --header 'X-Vault-Token: ${VAULT_TOKEN}' \
       --post-file=/tmp/private-key.json \
       '${VAULT_URL}/v1/secret/data/tokenSignerPrivateKey' -O -
"

kubectl exec -n $NAMESPACE $VAULT_POD -- sh -c "
  wget --header 'Content-Type: application/json' \
       --header 'X-Vault-Token: ${VAULT_TOKEN}' \
       --post-file=/tmp/public-key.json \
       '${VAULT_URL}/v1/secret/data/tokenSignerPublicKey' -O -
"

kubectl exec -n $NAMESPACE $VAULT_POD -- sh -c "
  wget --header 'Content-Type: application/json' \
       --header 'X-Vault-Token: ${VAULT_TOKEN}' \
       --post-file=/tmp/aes-key.json \
       '${VAULT_URL}/v1/secret/data/tokenEncryptionAesKey' -O -
"

echo ""
echo "✅ Claves cargadas en Vault"
echo ""

# 7. Verificar que las claves se cargaron correctamente
echo "7️⃣ Verificando claves en Vault..."
echo "Private Key:"
kubectl exec -n $NAMESPACE $VAULT_POD -- sh -c "
  wget --header 'X-Vault-Token: ${VAULT_TOKEN}' \
       '${VAULT_URL}/v1/secret/data/tokenSignerPrivateKey' -O - | head -c 200
"
echo ""
echo ""

# 8. Limpiar archivos temporales del pod
kubectl exec -n $NAMESPACE $VAULT_POD -- rm -f /tmp/private-key.json /tmp/public-key.json /tmp/aes-key.json

# 9. Reiniciar pods del data plane
echo "8️⃣ Reiniciando pods del Data Plane para aplicar cambios..."
kubectl rollout restart deployment -n $NAMESPACE mass-edc-dataplane

echo ""
echo "⏳ Esperando a que el data plane reinicie..."
kubectl rollout status deployment -n $NAMESPACE mass-edc-dataplane --timeout=300s

echo ""
echo "🎉 Reparación completada exitosamente"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verifica que el data plane esté Running:"
echo "      kubectl get pods -n umbrella | grep mass-edc-dataplane"
echo "   2. Limpia las transferencias antiguas:"
echo "      cd dashboard && ./cleanup-transfers-db.sh terminated"
echo "   3. Intenta una nueva transferencia desde partner-data.html"
echo ""

# Limpiar archivos temporales locales
rm -f /tmp/tokenSignerPrivateKey.pem /tmp/tokenSignerPublicKey.pem
rm -f /tmp/private-key.json /tmp/public-key.json /tmp/aes-key.json

echo "✅ Done!"