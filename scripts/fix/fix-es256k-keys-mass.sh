#!/bin/bash

# Script para generar claves ES256K (secp256k1) reales para MASS EDC
# Basado en documentación 20260422-resolucion-problema-refresco-token-edr.md

set -e

NAMESPACE="umbrella"
VAULT_POD="mass-edc-vault-0"
VAULT_TOKEN="root"
CONNECTOR_NAME="MASS"

echo "🔑 Generando claves ES256K (secp256k1) para ${CONNECTOR_NAME}"
echo "=============================================================="
echo ""

# 1. Generar clave privada ES256K (NO RSA) y convertir a PKCS#8 (BEGIN PRIVATE KEY)
# El signer de EDC requiere formato PKCS#8 con saltos de línea reales para parsear la clave
echo "1️⃣ Generando clave privada ES256K (secp256k1) en formato PKCS#8..."
openssl ecparam -name secp256k1 -genkey -noout \
  -out /tmp/mass-token-signer-private-ec.pem
openssl pkcs8 -topk8 -nocrypt \
  -in /tmp/mass-token-signer-private-ec.pem \
  -out /tmp/mass-token-signer-private.pem
rm -f /tmp/mass-token-signer-private-ec.pem

# 2. Generar clave pública correspondiente
echo "2️⃣ Generando clave pública correspondiente..."
openssl pkey -in /tmp/mass-token-signer-private.pem \
  -pubout -out /tmp/mass-token-signer-public.pem

# 3. Verificar que son claves secp256k1
echo "3️⃣ Verificando que son claves secp256k1..."
CURVE=$(openssl pkey -in /tmp/mass-token-signer-private.pem -text -noout 2>&1 | grep -i "secp256k1" || true)

if [ -z "$CURVE" ]; then
  echo "❌ ERROR: Las claves generadas NO son secp256k1"
  echo "   Verifica que tu versión de OpenSSL soporta secp256k1"
  exit 1
fi

echo "   ✅ Confirmado: ASN1 OID: secp256k1"
echo ""

# 4. Mostrar preview de las claves
echo "4️⃣ Preview de las claves generadas:"
echo ""
echo "   Clave Privada (primeras 3 líneas):"
head -3 /tmp/mass-token-signer-private.pem | sed 's/^/      /'
echo "      ..."
echo ""
echo "   Clave Pública (primeras 3 líneas):"
head -3 /tmp/mass-token-signer-public.pem | sed 's/^/      /'
echo "      ..."
echo ""

# 4b. Verificar que el pod de Vault existe y está Running ANTES de intentar escribir
echo "4️⃣b Verificando disponibilidad del pod de Vault..."
VAULT_POD_STATUS=$(kubectl get pod -n "$NAMESPACE" "$VAULT_POD" --no-headers 2>/dev/null | awk '{print $3}')
if [ "$VAULT_POD_STATUS" != "Running" ]; then
  echo "❌ ERROR: El pod $VAULT_POD no está en estado Running"
  echo "   Estado actual: ${VAULT_POD_STATUS:-no encontrado}"
  echo "   Verifica con: kubectl get pod -n $NAMESPACE $VAULT_POD"
  exit 1
fi
echo "   ✅ Pod $VAULT_POD en estado Running"
echo ""

# 5. Backup de claves existentes en Vault (si no son "changeme")
echo "5️⃣ Haciendo backup de claves existentes en Vault..."

EXISTING_PRIVATE=$(kubectl exec -n $NAMESPACE $VAULT_POD -- \
  vault kv get -format=json secret/tokenSignerPrivateKey 2>/dev/null | \
  jq -r '.data.data.content // "changeme"' || echo "changeme")

if [ "$EXISTING_PRIVATE" != "changeme" ]; then
  echo "   ⚠️  Claves existentes encontradas (no son 'changeme')"
  echo "   📦 Guardando backup en /tmp/mass-vault-backup.json"
  kubectl exec -n $NAMESPACE $VAULT_POD -- \
    vault kv get -format=json secret/tokenSignerPrivateKey > /tmp/mass-vault-backup-private.json
  kubectl exec -n $NAMESPACE $VAULT_POD -- \
    vault kv get -format=json secret/tokenSignerPublicKey > /tmp/mass-vault-backup-public.json
else
  echo "   ℹ️  Claves actuales son 'changeme' (placeholder), no se requiere backup"
fi

echo ""

# 6. Cargar claves en Vault usando kubectl cp para garantizar saltos de línea reales
# IMPORTANTE: NO usar sed para escapar \n — el parser PEM de EDC requiere saltos reales
# Gate de validación: solo se pondrá a true si TODAS las verificaciones pasan
KEYS_VALID=false
echo "6️⃣ Cargando claves ES256K en Vault..."

# 7. Copiar ficheros PEM al pod y cargar desde el propio pod
echo "   → Cargando tokenSignerPrivateKey..."
kubectl cp /tmp/mass-token-signer-private.pem \
  "$NAMESPACE/$VAULT_POD:/tmp/mass-token-signer-private.pem"
kubectl exec -n $NAMESPACE $VAULT_POD -- sh -lc \
  'vault kv put secret/tokenSignerPrivateKey content="$(cat /tmp/mass-token-signer-private.pem)"'

echo "   → Cargando tokenSignerPublicKey..."
kubectl cp /tmp/mass-token-signer-public.pem \
  "$NAMESPACE/$VAULT_POD:/tmp/mass-token-signer-public.pem"
kubectl exec -n $NAMESPACE $VAULT_POD -- sh -lc \
  'vault kv put secret/tokenSignerPublicKey content="$(cat /tmp/mass-token-signer-public.pem)"'

echo ""
echo "✅ Claves ES256K cargadas exitosamente en Vault"
echo ""

# 8. Verificar que se guardaron correctamente
echo "7️⃣ Verificando integridad de claves en Vault..."

_VAULT_PRIV_RAW=$(kubectl exec -n $NAMESPACE $VAULT_POD -- \
  vault kv get -format=json secret/tokenSignerPrivateKey | \
  jq -r '.data.data.content')
VAULT_PRIVATE_FIRST_LINE=$(printf '%b\n' "$_VAULT_PRIV_RAW" | head -1)

if [ "$VAULT_PRIVATE_FIRST_LINE" = "-----BEGIN PRIVATE KEY-----" ]; then
  echo "   ✅ tokenSignerPrivateKey: Formato correcto (PKCS#8 PRIVATE KEY)"
else
  echo "   ❌ tokenSignerPrivateKey: ERROR - Primera línea: $VAULT_PRIVATE_FIRST_LINE"
  exit 1
fi

_VAULT_PUB_RAW=$(kubectl exec -n $NAMESPACE $VAULT_POD -- \
  vault kv get -format=json secret/tokenSignerPublicKey | \
  jq -r '.data.data.content')
VAULT_PUBLIC_FIRST_LINE=$(printf '%b\n' "$_VAULT_PUB_RAW" | head -1)

if [ "$VAULT_PUBLIC_FIRST_LINE" = "-----BEGIN PUBLIC KEY-----" ]; then
  echo "   ✅ tokenSignerPublicKey: Formato correcto (PUBLIC KEY)"
else
  echo "   ❌ tokenSignerPublicKey: ERROR - Primera línea: $VAULT_PUBLIC_FIRST_LINE"
  exit 1
fi

# c. Verificar que la clave privada leída de Vault sigue siendo EC / secp256k1
echo "   → Verificando tipo EC y curva secp256k1 (leyendo clave de Vault)..."
VAULT_PRIVATE_CONTENT=$(kubectl exec -n "$NAMESPACE" "$VAULT_POD" -- \
  vault kv get -format=json secret/tokenSignerPrivateKey | \
  jq -r '.data.data.content')
printf '%s' "$VAULT_PRIVATE_CONTENT" > /tmp/mass-vault-verify-private.pem
VAULT_KEY_CURVE=$(openssl pkey -text -noout -in /tmp/mass-vault-verify-private.pem 2>&1 | grep -i "secp256k1" || true)
if [ -z "$VAULT_KEY_CURVE" ]; then
  echo "   ❌ ERROR: La clave almacenada en Vault NO es de curva secp256k1"
  echo "   Diagnóstico openssl:"
  openssl ec -text -noout -in /tmp/mass-vault-verify-private.pem 2>&1 \
    | grep -iE 'ASN1|OID|NIST|prime|curve|Field' | sed 's/^/      /' || true
  rm -f /tmp/mass-vault-verify-private.pem
  exit 1
fi
echo "   ✅ Curva secp256k1 (ES256K) confirmada en clave almacenada en Vault"
rm -f /tmp/mass-vault-verify-private.pem

# Todas las verificaciones pasaron: activar gate
KEYS_VALID=true

echo ""

# a. Gate de seguridad: no reiniciar pods si alguna verificación falló
if [ "$KEYS_VALID" != "true" ]; then
  echo "❌ ABORTANDO reinicio: las verificaciones de clave no se completaron correctamente."
  echo "   Revisa los errores anteriores. Los pods NO han sido reiniciados."
  exit 1
fi

# 9. Reiniciar pods del EDC para que carguen las nuevas claves
echo "8️⃣ Reiniciando pods del conector ${CONNECTOR_NAME} para aplicar cambios..."

echo "   → Reiniciando Control Plane..."
kubectl rollout restart deployment -n $NAMESPACE mass-edc-controlplane

echo "   → Reiniciando Data Plane..."
kubectl rollout restart deployment -n $NAMESPACE mass-edc-dataplane

echo ""
echo "⏳ Esperando a que los pods se reinicien..."
kubectl rollout status deployment -n $NAMESPACE mass-edc-controlplane --timeout=300s
kubectl rollout status deployment -n $NAMESPACE mass-edc-dataplane --timeout=300s

echo ""
echo "🎉 ¡Claves ES256K configuradas exitosamente para ${CONNECTOR_NAME}!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verificar logs del Data Plane:"
echo "      kubectl logs -n umbrella deployment/mass-edc-dataplane --tail=100 | grep -i 'key\\|token\\|ES256'"
echo ""
echo "   2. Verificar que NO hay errores:"
echo "      kubectl logs -n umbrella deployment/mass-edc-dataplane --tail=200 | grep -i error"
echo ""
echo "   3. Limpiar transferencias antiguas desde el dashboard"
echo ""
echo "   4. Probar una nueva transferencia y esperar >5 minutos antes de descargar"
echo ""
echo "🔍 Si hay problemas, restaurar backup:"
echo "   kubectl exec -n umbrella mass-edc-vault-0 -- \\"
echo "     vault kv put secret/tokenSignerPrivateKey @/tmp/mass-vault-backup-private.json"
echo ""

# Limpiar archivos temporales locales y dentro del pod
rm -f /tmp/mass-token-signer-private.pem /tmp/mass-token-signer-public.pem
kubectl exec -n $NAMESPACE $VAULT_POD -- rm -f \
  /tmp/mass-token-signer-private.pem /tmp/mass-token-signer-public.pem 2>/dev/null || true

echo "✅ Script completado!"
