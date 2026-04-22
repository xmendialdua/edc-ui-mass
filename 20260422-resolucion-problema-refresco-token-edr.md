# Resolución: Problema de Refresco de Token EDR

**Fecha:** 22 de abril de 2026  
**Componentes afectados:** IKLN EDC Connector - Data Plane, DIM-Wallet, Vault  
**Severidad:** Alta - Impide la descarga de datos después de 5 minutos

---

## a) Contexto del Problema

### Situación Inicial

El dashboard EDC implementa un sistema de descarga de datos desde EDR (Endpoint Data Reference) tras completar negociaciones y transferencias entre conectores EDC. El flujo normal es:

1. IKLN (consumer) negocia un contrato con MASS (provider)
2. IKLN inicia una transferencia del asset
3. EDC genera un EDR con un token de acceso
4. El usuario puede descargar los datos usando ese token

### Síntomas del Problema

- ✅ **Primeros 5 minutos**: Las descargas funcionan correctamente
- ❌ **Después de 5 minutos**: Las descargas fallan con **HTTP 403 Forbidden**
- ⚠️ **Error específico**: `"Unsupported JWS algorithm RS256, must be ES256K"`

### Configuración del Sistema

- **Eclipse Tractus-X EDC**: v0.7.3+
- **Token expiry configurado**: 300 segundos (5 minutos) - `edc.dataplane.token.expiry: 300`
- **Arquitectura**: Control Plane + Data Plane separados
- **Identity Wallet**: DIM-Wallet Stub (ssi-dim-wallet-stub)
- **Protocolo de identidad**: IATP (Identity And Trust Protocol)

---

## b) Qué Estábamos Intentando Hacer

### Objetivo

Implementar un **sistema de renovación automática de tokens** para permitir que las descargas de datos funcionen más allá del tiempo de expiración inicial del token (5 minutos).

### Implementación Realizada

#### 1. Frontend (`/frontend/components/phases/transfers-content.tsx`)

```typescript
const handleDownloadData = async (transferId: string) => {
  try {
    // Intento inicial de descarga
    const response = await fetch(edrUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.status === 403) {
      // Token expirado, obtener uno nuevo
      const freshToken = await getFreshToken(transferId);
      
      // Reintentar descarga con nuevo token
      const retryResponse = await fetch(edrUrl, {
        headers: { Authorization: `Bearer ${freshToken}` }
      });
      // ...
    }
  } catch (error) {
    // ...
  }
};
```

#### 2. Backend (`/dashboard/backend.py`)

```python
@app.route('/api/phase6/get-fresh-token/<transfer_id>', methods=['GET'])
def get_fresh_token(transfer_id):
    """Obtiene un token fresco desde el EDC Data Plane"""
    # Consultar /v3/edrs con auto_refresh=true
    response = requests.get(
        f"{IKLN_API}/v3/edrs",
        params={
            "transferProcessId": transfer_id,
            "auto_refresh": "true"  # ← Parámetro clave
        },
        headers={"X-Api-Key": IKLN_API_KEY}
    )
    # ...
```

### Resultado Esperado vs. Real

| Comportamiento | Esperado | Real |
|----------------|----------|------|
| Detección de expiración (403) | ✅ Funciona | ✅ Funciona |
| Llamada a `getFreshToken()` | ✅ Se ejecuta | ✅ Se ejecuta |
| Obtención de nuevo token | ✅ Token renovado | ❌ **FALLA** |
| Reintento de descarga | ✅ Éxito | ❌ Falla con mismo error |

---

## c) Motivo del Problema y Verificación

### 🔍 Causa Raíz

El problema tiene **tres capas**:

#### Capa 1: Mismatch de Algoritmo Criptográfico

**DIM-Wallet requiere ES256K** (Elliptic Curve secp256k1 - mismo que Bitcoin/Ethereum)  
**EDC está usando RS256** (RSA con SHA-256)

```
ERROR en logs del EDC Data Plane:
"Unsupported JWS algorithm RS256, must be ES256K"
```

#### Capa 2: Dual Token System

Eclipse Tractus-X EDC usa un sistema de doble token:

1. **Token inicial** (primeros 5 min):
   - Generado localmente por el Data Plane
   - Usa las claves locales del Data Plane
   - ✅ **Funciona** porque no pasa por DIM-Wallet

2. **Token renovado** (después de 5 min):
   - Debe ser firmado por DIM-Wallet vía IATP
   - DIM-Wallet **rechaza** tokens firmados con RS256
   - ❌ **Falla** porque el algoritmo no coincide

#### Capa 3: Claves Placeholder en Vault

**Descubrimiento crítico:**

Las claves de firma de tokens en Vault contienen solo el string `"changeme"` en lugar de claves criptográficas reales.

```json
{
  "data": {
    "data": {
      "content": "changeme"  // ← ¡No es una clave real!
    }
  }
}
```

**Ubicación de las claves:**
- Path en Vault: `secret/tokenSignerPrivateKey` y `secret/tokenSignerPublicKey`
- Pod de Vault: `ikln-edc-vault-0` en namespace `umbrella`

**Por qué es un problema:**

- `"changeme"` es un **placeholder de texto**, no material criptográfico
- Una clave EC privada real tiene este formato:

```
-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIBq...base64...KoZIzj0DAQehBwNCAAR...
-----END EC PRIVATE KEY-----
```

- EDC no puede realizar operaciones de firma ECDSA con un string de texto
- El EDC probablemente está usando claves RSA por defecto (fallback), causando el error RS256

### ✅ Cómo Verificar el Problema

#### Paso 1: Verificar el contenido de las claves en Vault

```bash
# Ver la clave privada
kubectl exec ikln-edc-vault-0 -n umbrella -- \
  vault kv get -format=json secret/tokenSignerPrivateKey | jq '.'

# Resultado esperado si existe el problema:
# {
#   "data": {
#     "data": {
#       "content": "changeme"
#     }
#   }
# }
```

```bash
# Ver la clave pública
kubectl exec ikln-edc-vault-0 -n umbrella -- \
  vault kv get -format=json secret/tokenSignerPublicKey | jq '.'

# Resultado esperado si existe el problema:
# {
#   "data": {
#     "data": {
#       "content": "changeme"
#     }
#   }
# }
```

#### Paso 2: Verificar los logs del EDC Data Plane

```bash
# Ver logs del Data Plane de IKLN
kubectl logs -n umbrella deployment/ikln-edc-dataplane --tail=100 --follow

# Buscar líneas como:
# ERROR: Unsupported JWS algorithm RS256, must be ES256K
# ERROR: Could not refresh EDR token
# ERROR: Token validation failed
```

#### Paso 3: Reproducir el error

```bash
# 1. Iniciar una transferencia
# 2. Descargar datos inmediatamente (funciona ✅)
# 3. Esperar 6 minutos
# 4. Intentar descargar de nuevo (falla ❌ con 403)
```

#### Paso 4: Verificar configuración actual del EDC

```bash
# Ver variables de entorno del Data Plane
kubectl get pod -n umbrella -l app.kubernetes.io/name=ikln-edc-dataplane \
  -o json | jq '.items[0].spec.containers[0].env[] | 
  select(.name | test("TOKEN|KEY|ALGORITHM"))'

# Verificar si existe EDC_DATAPLANE_TOKEN_SIGNING_ALGORITHM
# Si no existe o no es "ES256K", confirma el problema
```

---

## d) Proceso Completo de Solución

### ⚠️ IMPORTANTE: Pre-requisitos

- Acceso a kubectl configurado para el cluster
- Token root de Vault o permisos de escritura en `secret/`
- OpenSSL instalado (para generar claves)
- Backup del estado actual (recomendado)

### 📋 Pasos de Solución

#### **Paso 1: Generar Claves ES256K (secp256k1)**

```bash
# 1.1 - Generar clave privada ES256K
openssl ecparam -name secp256k1 -genkey -noout \
  -out /tmp/ikln-token-signer-private.pem

# 1.2 - Generar clave pública correspondiente
openssl ec -in /tmp/ikln-token-signer-private.pem \
  -pubout -out /tmp/ikln-token-signer-public.pem

# 1.3 - Verificar que son claves secp256k1
openssl ec -in /tmp/ikln-token-signer-private.pem -text -noout | grep secp256k1
# Debe mostrar: ASN1 OID: secp256k1
```

**Ejemplo de salida esperada:**

```
read EC key
writing EC key
-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIMGb3...
-----END EC PRIVATE KEY-----
```

#### **Paso 2: Reemplazar "changeme" en Vault con Claves Reales**

```bash
# 2.1 - Entrar al pod de Vault
kubectl exec -it ikln-edc-vault-0 -n umbrella -- sh

# 2.2 - Autenticarse en Vault (si es necesario)
vault login
# Token: root

# 2.3 - Copiar las claves al pod (desde otra terminal)
kubectl cp /tmp/ikln-token-signer-private.pem \
  umbrella/ikln-edc-vault-0:/tmp/private.pem

kubectl cp /tmp/ikln-token-signer-public.pem \
  umbrella/ikln-edc-vault-0:/tmp/public.pem

# 2.4 - Actualizar Vault con las claves reales
kubectl exec ikln-edc-vault-0 -n umbrella -- sh -c \
  'vault kv put secret/tokenSignerPrivateKey content="$(cat /tmp/private.pem)"'

kubectl exec ikln-edc-vault-0 -n umbrella -- sh -c \
  'vault kv put secret/tokenSignerPublicKey content="$(cat /tmp/public.pem)"'
```

#### **Paso 3: Verificar que las Claves se Guardaron Correctamente**

```bash
# 3.1 - Verificar clave privada
kubectl exec ikln-edc-vault-0 -n umbrella -- \
  vault kv get -format=json secret/tokenSignerPrivateKey | \
  jq -r '.data.data.content' | head -5

# Debe mostrar:
# -----BEGIN EC PRIVATE KEY-----
# MHQCAQEEIMGb3...
# ...

# 3.2 - Verificar clave pública
kubectl exec ikln-edc-vault-0 -n umbrella -- \
  vault kv get -format=json secret/tokenSignerPublicKey | \
  jq -r '.data.data.content' | head -5

# Debe mostrar:
# -----BEGIN PUBLIC KEY-----
# MFYwEAYHKoZI...
# ...
```

#### **Paso 4: Actualizar Configuración del EDC**

Editar el archivo `/home/xmendialdua/projects/assembly/iflex/edc-redeploy/values-ikln-connector-fixed.yaml`:

```yaml
# En la sección controlplane.env, agregar:
controlplane:
  env:
    # ... otras variables ...
    EDC_IAM_STS_OAUTH_TOKEN_SIGNING_ALGORITHM: "ES256K"

# En la sección dataplane.env, agregar:
dataplane:
  env:
    # ... otras variables ...
    EDC_DATAPLANE_TOKEN_SIGNING_ALGORITHM: "ES256K"
    
    # Asegurar que apunta a las claves correctas en Vault:
    EDC_TRANSFER_PROXY_TOKEN_SIGNER_PRIVATEKEY_ALIAS: "tokenSignerPrivateKey"
    EDC_TRANSFER_PROXY_TOKEN_VERIFIER_PUBLICKEY_ALIAS: "tokenSignerPublicKey"
```

#### **Paso 5: Redesplegar el Conector IKLN**

```bash
# 5.1 - Ir al directorio de redeploy
cd /home/xmendialdua/projects/assembly/iflex/edc-redeploy

# 5.2 - Ejecutar script de redeployment
./redeploy-connectors.sh

# O manualmente con Helm:
helm upgrade ikln-edc tractusx-edc/tractusx-connector \
  -f values-ikln-connector-fixed.yaml \
  -n umbrella \
  --wait

# 5.3 - Esperar a que los pods se reinicien
kubectl rollout status deployment/ikln-edc-controlplane -n umbrella
kubectl rollout status deployment/ikln-edc-dataplane -n umbrella
```

#### **Paso 6: Verificar Logs del Nuevo Deployment**

```bash
# 6.1 - Ver logs del Data Plane recién desplegado
kubectl logs -n umbrella deployment/ikln-edc-dataplane --tail=100 | grep -i "key\|token\|ES256"

# Buscar líneas como:
# INFO: Loaded signing key from Vault: tokenSignerPrivateKey
# INFO: Token signing algorithm: ES256K
# INFO: Successfully initialized token signer

# 6.2 - Verificar que NO hay errores de carga de claves
kubectl logs -n umbrella deployment/ikln-edc-dataplane --tail=200 | grep -i error

# No debe haber errores relacionados con:
# - "Could not load private key"
# - "Invalid key format"
# - "changeme"
```

---

## e) Verificación Paso a Paso de la Solución

### Test 1: Verificar Configuración Base

#### Test 1.1: Claves en Vault

```bash
# Comando
kubectl exec ikln-edc-vault-0 -n umbrella -- \
  vault kv get -format=json secret/tokenSignerPrivateKey | \
  jq -r '.data.data.content' | head -1

# ✅ Resultado esperado: Debe mostrar "-----BEGIN EC PRIVATE KEY-----"
# ❌ Si muestra "changeme", el problema persiste
```

#### Test 1.2: Configuración del EDC

```bash
# Comando
kubectl get pod -n umbrella -l app.kubernetes.io/name=ikln-edc-dataplane \
  -o json | jq -r '.items[0].spec.containers[0].env[] | 
  select(.name=="EDC_DATAPLANE_TOKEN_SIGNING_ALGORITHM") | .value'

# ✅ Resultado esperado: "ES256K"
# ❌ Si está vacío o muestra otro valor, falta configuración
```

#### Test 1.3: Pods Running

```bash
# Comando
kubectl get pods -n umbrella | grep ikln-edc

# ✅ Resultado esperado:
# ikln-edc-controlplane-xxx   1/1   Running   0   5m
# ikln-edc-dataplane-xxx      1/1   Running   0   5m
# ❌ Si hay CrashLoopBackOff o Error, revisar logs
```

### Test 2: Verificar Token Inicial (Sin Renovación)

#### Test 2.1: Iniciar Transferencia

```bash
# En el dashboard:
# 1. Ir a Fase 6
# 2. Consultar catálogo (debe mostrar assets)
# 3. Negociar contrato (debe completarse exitosamente)
# 4. Iniciar transferencia (debe mostrar estado STARTED → COMPLETED)
```

#### Test 2.2: Descarga Inmediata (< 5 minutos)

```bash
# En el dashboard:
# 1. Hacer clic en "Descargar Datos" inmediatamente
# ✅ Resultado esperado: Descarga exitosa, archivo PDF se descarga
# ❌ Si falla aquí, hay un problema más básico
```

**Verificar en logs:**

```bash
kubectl logs -n umbrella deployment/ikln-edc-dataplane --tail=50 --follow

# Buscar:
# INFO: Token generated successfully
# INFO: Data access granted for transfer xxx
```

### Test 3: Verificar Renovación de Token (Después de 5 minutos)

#### Test 3.1: Esperar Expiración

```bash
# Después de la descarga exitosa del Test 2.2:
# 1. Esperar 6 minutos (asegurar que el token expire)
# 2. Observar los logs del navegador (abrir DevTools → Console)
```

**En la consola del navegador debe aparecer:**

```
[Console] 📥 Descargando datos de transferencia: xxx
[Console] ⚠️ Token expirado (403), obteniendo token fresco...
[Console] ✅ Token renovado, reintentando descarga...
```

#### Test 3.2: Descarga con Token Renovado

```bash
# En el dashboard:
# 1. Hacer clic en "Descargar Datos" (después de 6 minutos)
# ✅ Resultado esperado: 
#    - Breve pausa (1-2 segundos)
#    - Mensaje "Token renovado"
#    - Descarga exitosa del archivo PDF
# ❌ Si falla con 403, el problema persiste
```

**Verificar en logs del Data Plane:**

```bash
kubectl logs -n umbrella deployment/ikln-edc-dataplane --tail=100 --follow

# ✅ Buscar estas líneas (indican éxito):
# INFO: Token refresh requested for EDR xxx
# INFO: Contacting DIM-Wallet for token signature
# INFO: DIM-Wallet returned signed token (ES256K)
# INFO: New token generated successfully
# INFO: Token expiry extended for 300 seconds

# ❌ Si aparecen estos errores, hay problema:
# ERROR: Unsupported JWS algorithm RS256, must be ES256K
# ERROR: DIM-Wallet rejected token signature request
# ERROR: Token refresh failed
```

### Test 4: Verificar Múltiples Renovaciones

#### Test 4.1: Ciclo Completo de Vida del Token

```bash
# Cronograma de test (total: 15 minutos):
# Minuto 0: Descarga inicial (✅ debe funcionar)
# Minuto 6: Primera renovación (✅ debe funcionar)
# Minuto 12: Segunda renovación (✅ debe funcionar)

# En cada punto:
# 1. Hacer clic en "Descargar Datos"
# 2. Verificar descarga exitosa
# 3. Revisar logs del Data Plane
```

**Métricas de éxito:**

| Tiempo | Acción | Resultado Esperado |
|--------|--------|-------------------|
| 0 min | Descarga inicial | ✅ Éxito (token inicial) |
| 6 min | Primera renovación | ✅ Éxito (token renovado #1) |
| 12 min | Segunda renovación | ✅ Éxito (token renovado #2) |

### Test 5: Verificar Integración con DIM-Wallet

#### Test 5.1: Logs del DIM-Wallet

```bash
# Verificar que DIM-Wallet está procesando solicitudes
kubectl logs -n umbrella deployment/ssi-dim-wallet-stub --tail=100 --follow

# ✅ Buscar:
# INFO: Received token signing request from IKLN
# INFO: Validating token with ES256K
# INFO: Token signed successfully
# INFO: Returning signed token to IKLN

# ❌ Si aparece:
# ERROR: Invalid algorithm, expected ES256K
# ERROR: Unable to verify token signature
```

#### Test 5.2: Verificar VP (Verifiable Presentation)

```bash
# En logs del IKLN Control Plane
kubectl logs -n umbrella deployment/ikln-edc-controlplane --tail=100 | grep -i "presentation\|credential"

# ✅ Buscar:
# INFO: Verifiable Presentation received from DIM-Wallet
# INFO: Membership credential validated
# INFO: Token signing authorized

# ❌ Si falta esta información, hay problema en IATP
```

### Test 6: Verificar en Base de Datos

#### Test 6.1: Consultar EDRs en PostgreSQL

```bash
# Conectar a PostgreSQL del IKLN
kubectl exec -it -n umbrella deployment/ikln-edc-postgresql -- psql -U user -d edc

# Consultar EDRs
SELECT 
  transfer_process_id,
  agreement_id,
  created_at,
  (SELECT COUNT(*) FROM edc_edr_entry WHERE transfer_process_id = e.transfer_process_id) as refresh_count
FROM edc_edr_entry e
ORDER BY created_at DESC
LIMIT 10;

# ✅ refresh_count debe incrementar con cada renovación
# ❌ Si refresh_count = 1 siempre, no se están renovando tokens
```

### Test 7: Test de Carga (Opcional)

```bash
# Script para test de estrés de renovación
for i in {1..10}; do
  echo "=== Test $i ==="
  
  # Descargar datos
  curl -X GET "http://localhost:3000/api/phase6/download-data/$TRANSFER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n"
  
  # Esperar 6 minutos
  echo "Esperando 6 minutos para expiración..."
  sleep 360
done

# ✅ Resultado esperado: Todos los tests 200 OK
# ❌ Si alguno falla, hay problema de estabilidad
```

---

## 📊 Checklist Final de Verificación

### Antes del Deploy

- [ ] Claves ES256K generadas correctamente
- [ ] Claves verificadas como secp256k1 con OpenSSL
- [ ] Backup de configuración actual realizado
- [ ] `values-ikln-connector-fixed.yaml` actualizado con `ES256K`

### Después del Deploy

- [ ] Pods de IKLN en estado Running
- [ ] Logs no muestran errores de carga de claves
- [ ] Vault contiene claves PEM válidas (no "changeme")
- [ ] Variable `EDC_DATAPLANE_TOKEN_SIGNING_ALGORITHM=ES256K` configurada

### Pruebas Funcionales

- [ ] Descarga inicial (< 5 min) funciona
- [ ] Primera renovación (6 min) funciona
- [ ] Segunda renovación (12 min) funciona
- [ ] Logs muestran "ES256K" en lugar de "RS256"
- [ ] DIM-Wallet acepta tokens sin error de algoritmo

---

## 🔧 Troubleshooting

### Problema: El pod no inicia después del redespliegue

```bash
# Ver describe del pod
kubectl describe pod -n umbrella -l app.kubernetes.io/name=ikln-edc-dataplane

# Buscar en Events:
# Si dice "CrashLoopBackOff", ver logs:
kubectl logs -n umbrella -l app.kubernetes.io/name=ikln-edc-dataplane --previous

# Posible causa: Claves mal formateadas en Vault
# Solución: Verificar formato PEM de las claves
```

### Problema: Sigue apareciendo "changeme" en logs

```bash
# El EDC puede cachear la configuración
# Forzar recreación del pod:
kubectl delete pod -n umbrella -l app.kubernetes.io/name=ikln-edc-dataplane

# Esperar a que Kubernetes cree nuevo pod
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=ikln-edc-dataplane \
  -n umbrella --timeout=120s
```

### Problema: DIM-Wallet sigue rechazando tokens

```bash
# Verificar que DIM-Wallet también está configurado para ES256K
kubectl get cm -n umbrella ssi-dim-wallet-stub-config -o yaml | grep -i algorithm

# Puede ser necesario redesplegar también DIM-Wallet
helm upgrade ssi-dim-wallet-stub ... -n umbrella
```

### Problema: Error "Could not load private key from Vault"

```bash
# Verificar permisos del Service Account
kubectl get sa ikln-edc -n umbrella -o yaml

# Verificar role binding con Vault
kubectl get rolebinding -n umbrella | grep vault

# Verificar que el secreto de Vault está montado
kubectl get pod -n umbrella -l app.kubernetes.io/name=ikln-edc-dataplane \
  -o json | jq '.items[0].spec.volumes[] | select(.name | contains("vault"))'
```

---

## 📚 Referencias

- **Eclipse Tractus-X EDC Documentation**: https://eclipse-tractusx.github.io/docs-kits/
- **IATP Protocol Specification**: https://github.com/eclipse-tractusx/identity-trust
- **ES256K Algorithm (RFC 8812)**: https://datatracker.ietf.org/doc/html/rfc8812
- **OpenSSL EC Commands**: https://www.openssl.org/docs/man1.1.1/man1/openssl-ec.html
- **Vault KV Secrets**: https://developer.hashicorp.com/vault/docs/secrets/kv

---

## 📝 Notas Adicionales

### Por qué ES256K y no otros algoritmos

- **ES256K** usa la curva elíptica **secp256k1**
- Es la misma curva utilizada por **Bitcoin** y **Ethereum**
- Catena-X/Tractus-X usa blockchain para identidad descentralizada
- Los DIDs (Decentralized Identifiers) se verifican on-chain
- Por eso es **obligatorio** ES256K, no es opcional

### Diferencias entre RS256 y ES256K

| Característica | RS256 | ES256K |
|----------------|-------|--------|
| Algoritmo base | RSA + SHA-256 | ECDSA + secp256k1 |
| Tamaño de clave | 2048-4096 bits | 256 bits |
| Tamaño de firma | ~256 bytes | ~64 bytes |
| Velocidad | Lento | Rápido |
| Blockchain-compatible | ❌ No | ✅ Sí |
| Usado en | JWT tradicional | Blockchain, Catena-X |

### Impacto en Producción

- **Tiempo de downtime**: ~5-10 minutos (tiempo de redespliegue)
- **Pérdida de datos**: No (las claves nuevas son compatibles hacia atrás)
- **Transferencias activas**: Se interrumpirán y deberán reiniciarse
- **Assets y contratos**: No se ven afectados

### Automatización Futura

Considerar implementar:

1. **Init Container** en el Helm chart que genere claves ES256K automáticamente si no existen
2. **Validation Job** que verifique las claves antes del deploy
3. **Monitoring** de renovaciones de token para alertar sobre fallos
4. **Health check** específico para validar firma ES256K

---

**Documento creado el**: 22 de abril de 2026  
**Última actualización**: 22 de abril de 2026  
**Autor**: Dashboard EDC Team  
**Versión**: 1.0
