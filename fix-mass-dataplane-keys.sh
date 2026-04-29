#!/bin/bash

# Script para reparar las claves del Data Plane de MASS
# El problema: tokenSignerPrivateKey tiene un formato inválido
# Solución: Generar nuevas claves RSA válidas y cargarlas en Vault

set -e

NAMESPACE="umbrella"
VAULT_POD="mass-edc-vault-0"
VAULT_TOKEN="root"

echo "🔧 Reparando claves del Data Plane de MASS"
echo "=========================================="
echo ""

# 1. Generar nueva clave RSA privada (para firmar tokens)
echo "1️⃣ Generando nueva clave RSA privada (4096 bits)..."
openssl genrsa -out /tmp/tokenSignerPrivateKey.pem 4096

# 2. Extraer la clave pública correspondiente
echo "2️⃣ Extrayendo clave pública correspondiente..."
openssl rsa -in /tmp/tokenSignerPrivateKey.pem -pubout -out /tmp/tokenSignerPublicKey.pem

# 3. Generar clave AES para encriptación (256 bits en hex)
echo "3️⃣ Generando clave AES para encriptación..."
openssl rand -hex 32 > /tmp/tokenEncryptionAesKey.txt

echo ""
echo "✅ Claves generadas exitosamente"
echo ""

# 4. Cargar las claves en Vault
echo "4️⃣ Cargando claves en Vault del conector MASS..."
echo ""

# Preparar el contenido de las claves para Vault (escapar saltos de línea)
PRIVATE_KEY=$(cat /tmp/tokenSignerPrivateKey.pem | sed -z 's/\n/\\n/g')
PUBLIC_KEY=$(cat /tmp/tokenSignerPublicKey.pem | sed -z 's/\n/\\n/g')
AES_KEY=$(cat /tmp/tokenEncryptionAesKey.txt)

echo "Cargando tokenSignerPrivateKey..."
kubectl exec -n $NAMESPACE $VAULT_POD -- sh -c "
vault kv put secret/tokenSignerPrivateKey content=\"${PRIVATE_KEY}\"
"

echo "Cargando tokenSignerPublicKey..."
kubectl exec -n $NAMESPACE $VAULT_POD -- sh -c "
vault kv put secret/tokenSignerPublicKey content=\"${PUBLIC_KEY}\"
"

echo "Cargando tokenEncryptionAesKey..."
kubectl exec -n $NAMESPACE $VAULT_POD -- sh -c "
vault kv put secret/tokenEncryptionAesKey content=\"${AES_KEY}\"
"

echo ""
echo "✅ Claves cargadas en Vault"
echo ""

# 5. Reiniciar pods del data plane
echo "5️⃣ Reiniciando pods del Data Plane para aplicar cambios..."
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
echo "   2. Limpia las transferencias antiguas desde el dashboard"
echo "   3. Intenta una nueva transferencia"
echo ""
echo "🔍 Para verificar los logs:"
echo "   kubectl logs -n umbrella -l app.kubernetes.io/instance=mass-edc,app.kubernetes.io/component=dataplane --tail=50"
echo ""

# Limpiar archivos temporales
rm -f /tmp/tokenSignerPrivateKey.pem /tmp/tokenSignerPublicKey.pem /tmp/tokenEncryptionAesKey.txt

echo "✅ Done!"
