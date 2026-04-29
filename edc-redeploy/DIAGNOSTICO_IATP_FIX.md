# 🔧 DIAGNÓSTICO Y SOLUCIÓN: Error "Unable to obtain credentials"

## 📋 Fecha: 18 de Marzo, 2026

---

## 🎯 PROBLEMA IDENTIFICADO

### Síntoma Principal
- **Error HTTP 502**: "Unable to obtain credentials: Empty optional"
- **Flujo bloqueado**: IKLN no puede consultar el catálogo de MASS
- **Logs DIM Wallet**: Funcionaba en febrero 2026, dejó de funcionar en marzo

### Análisis de Causa Raíz

La configuración DID en los conectores tiene **dos errores críticos**:

#### ❌ Error 1: DID apunta al Wallet en lugar del Conector

**Configuración incorrecta:**
```yaml
iatp:
  id: did:web:ssi-dim-wallet-stub.51.178.94.25.nip.io:BPNL00000002IKLN
```

**Problema**: El DID apunta al DIM Wallet Stub, pero el **DID document debe estar expuesto en el DSP endpoint del conector**, no en el wallet.

**Resolución esperada:**
```
DID: did:web:edc-ikln-control.51.178.94.25.nip.io:BPNL00000002IKLN
Resuelve a: https://edc-ikln-control.51.178.94.25.nip.io/.well-known/did.json
```

#### ❌ Error 2: HTTPS desactivado con Ingress que fuerza HTTPS

**Configuración incorrecta:**
```yaml
controlplane:
  env:
    EDC_IAM_DID_WEB_USE_HTTPS: false  # ❌ Intenta resolver por HTTP
```

**Problema**: 
- EDC intenta resolver DIDs por HTTP (por `EDC_IAM_DID_WEB_USE_HTTPS: false`)
- Nginx Ingress redirige HTTP→HTTPS (308 Permanent Redirect)
- Resultado: **mismatch de protocolos** → resolución DID falla → 404 Not Found

---

## 🔍 Flujo IATP que Falla

### Flujo Esperado (funcionaba en febrero):

1. ✅ IKLN se autentica con DIM Wallet (obtiene token propio)
2. ✅ IKLN solicita credenciales para comunicarse con MASS
3. ✅ DIM Wallet necesita resolver el DID de MASS: `did:web:edc-mass-control...`
4. ✅ DIM Wallet consulta: `https://edc-mass-control.51.178.94.25.nip.io/.well-known/did.json`
5. ✅ DIM Wallet valida identidad y emite Verifiable Presentation (VP)
6. ✅ IKLN envía catalog request a MASS con VP adjunto

### Flujo Actual (marzo 2026 - ROTO):

1. ✅ IKLN se autentica con DIM Wallet
2. ❌ IKLN intenta resolver DID de MASS
   - DID configured: `did:web:ssi-dim-wallet-stub...` (apunta al wallet, no existe)
   - O intenta resolver por HTTP con `EDC_IAM_DID_WEB_USE_HTTPS: false`
   - Ingress redirige HTTP→HTTPS (308)
3. ❌ Resolución DID falla (404 Not Found)
4. ❌ Sin DID, no se pueden obtener credenciales → **"Empty optional"**
5. ❌ Catalog request falla con HTTP 502

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Cambios en Configuración

#### 1. DID corregido (apunta al DSP endpoint del conector)

**IKLN:**
```yaml
iatp:
  id: did:web:edc-ikln-control.51.178.94.25.nip.io:BPNL00000002IKLN
```

**MASS:**
```yaml
iatp:
  id: did:web:edc-mass-control.51.178.94.25.nip.io:BPNL00000000MASS
```

#### 2. HTTPS forzado en resolución DID

**Ambos conectores:**
```yaml
controlplane:
  env:
    EDC_IAM_DID_WEB_USE_HTTPS: "true"
dataplane:
  env:
    EDC_IAM_DID_WEB_USE_HTTPS: "true"
```

### Archivos Creados

1. **`values-ikln-connector-fixed.yaml`** - Configuración corregida para IKLN
2. **`values-mass-connector-fixed.yaml`** - Configuración corregida para MASS
3. **`redeploy-connectors.sh`** - Script de redespliegue con verificaciones

---

## 🚀 PROCEDIMIENTO DE REDESPLIEGUE

### Paso 1: Revisar archivos corregidos

```bash
cd /home/xmendialdua/projects/assembly/iflex/edc
cat values-ikln-connector-fixed.yaml | grep -A5 "iatp:"
cat values-mass-connector-fixed.yaml | grep -A5 "iatp:"
```

### Paso 2: Ejecutar redespliegue

```bash
cd /home/xmendialdua/projects/assembly/iflex/edc
./redeploy-connectors.sh
```

El script:
- Muestra estado actual de pods
- Solicita confirmación
- Redespliegue MASS con valores corregidos
- Redespliegue IKLN con valores corregidos
- Espera a que los pods estén listos
- Verifica variables DID en pods

### Paso 3: Verificar DID documents

```bash
# DID document de MASS (debe devolver JSON, no 404)
curl -k https://edc-mass-control.51.178.94.25.nip.io/.well-known/did.json

# DID document de IKLN (debe devolver JSON, no 404)
curl -k https://edc-ikln-control.51.178.94.25.nip.io/.well-known/did.json
```

**Resultado esperado**: JSON con estructura DID document, no HTML 404.

### Paso 4: Probar catalog request

```bash
# Desde el dashboard
cd /home/xmendialdua/projects/assembly/iflex/dashboard
curl -X POST http://localhost:5000/api/phase5/catalog-request
```

**Resultado esperado**: HTTP 200 con datasets en respuesta (no 502).

---

## 🔐 Consideraciones de Seguridad

### DIDs y Confianza

Los DIDs ahora apuntan a los DSP endpoints de los conectores:
- **IKLN**: `did:web:edc-ikln-control.51.178.94.25.nip.io:BPNL00000002IKLN`
- **MASS**: `did:web:edc-mass-control.51.178.94.25.nip.io:BPNL00000000MASS`

Los DID documents se exponen públicamente en `/.well-known/did.json` (estándar W3C DID spec).

### Trusted Issuers

Ambos conectores confían en el mismo issuer:
```yaml
trustedIssuers:
  - did:web:ssi-dim-wallet-stub.51.178.94.25.nip.io:BPNL00000003CRHK
```

Este es el DIM Wallet que emite las Verifiable Credentials (VCs) para MembershipCredential.

### Certificados Custom CA

Los conectores mantienen el certificado CA custom de Tractus-X para validar comunicaciones TLS internas.

---

## 📊 Verificación Post-Despliegue

### 1. Estado de Pods

```bash
kubectl get pods -n umbrella | grep -E "mass-edc|ikln-edc"
```

**Esperado**: Todos los pods `Running` (1/1 Ready).

### 2. Variables de Entorno DID

```bash
# IKLN
kubectl exec -n umbrella $(kubectl get pod -n umbrella -l app.kubernetes.io/instance=ikln-edc,app.kubernetes.io/component=controlplane -o jsonpath='{.items[0].metadata.name}') -- env | grep -E "EDC_PARTICIPANT_ID|EDC_IAM_DID_WEB_USE_HTTPS"

# MASS
kubectl exec -n umbrella $(kubectl get pod -n umbrella -l app.kubernetes.io/instance=mass-edc,app.kubernetes.io/component=controlplane -o jsonpath='{.items[0].metadata.name}') -- env | grep -E "EDC_PARTICIPANT_ID|EDC_IAM_DID_WEB_USE_HTTPS"
```

**Esperado**:
```
EDC_PARTICIPANT_ID=did:web:edc-ikln-control.51.178.94.25.nip.io:BPNL00000002IKLN
EDC_IAM_DID_WEB_USE_HTTPS=true
```

### 3. Logs DIM Wallet (durante catalog request)

```bash
kubectl logs -n portal ssi-dim-wallet-stub-75bd9865cf-ntxhj --tail=50 -f
```

**Esperado** (al hacer catalog request):
```
Token created for client id -> BPNL00000002IKLN
Getting request to create STS with request -> {...consumerDid":"did:web:edc-ikln-control.51.178.94.25.nip.io:BPNL00000002IKLN"...}
Requested VC -> types : MembershipCredential, caller bpn ->BPNL00000002IKLN
Getting request to create STS with request -> {...providerDid":"did:web:edc-mass-control.51.178.94.25.nip.io:BPNL00000000MASS"...}
```

### 4. Catalog Request Exitoso

```bash
curl -X POST http://localhost:5000/api/phase5/catalog-request
```

**Esperado**: HTTP 200 con JSON que contiene `datasets` array.

---

## 🐛 Troubleshooting

### Si aún devuelve 502

1. **Verificar resolución DID**:
   ```bash
   curl -k https://edc-mass-control.51.178.94.25.nip.io/.well-known/did.json
   ```
   - Si devuelve 404: El conector no está exponiendo el DID document
   - Si devuelve JSON: El DID document está disponible ✅

2. **Verificar logs controlplane**:
   ```bash
   kubectl logs -n umbrella ikln-edc-controlplane-xxx-xxx | grep -i "did\|iatp\|credential"
   ```

3. **Verificar comunicación con DIM Wallet**:
   ```bash
   kubectl exec -n umbrella ikln-edc-controlplane-xxx-xxx -- curl -v http://ssi-dim-wallet-service.portal.svc.cluster.local:8080/oauth/token
   ```

### Si DID document no se expone

El `dataspace-connector-bundle` chart podría no tener configurado el endpoint `/.well-known/did.json`. En ese caso:

- **Opción A**: Actualizar a la versión más reciente del chart
- **Opción B**: Configurar manualmente un ConfigMap/endpoint para servir el DID document
- **Opción C**: Migrar a `tractusx-connector` Helm chart (versión más reciente)

---

## 📚 Referencias

- **W3C DID Specification**: https://www.w3.org/TR/did-core/
- **did:web Method**: https://w3c-ccg.github.io/did-method-web/
- **Eclipse Tractus-X IATP**: https://eclipse-tractusx.github.io/docs/kit/Digital%20Twin%20Kit/Software%20Development%20View/dt-kit-interaction-patterns#identity-and-trust-protocol-iatp
- **EDC Documentation**: https://github.com/eclipse-edc/Connector

---

## ✅ Estado Final Esperado

Después del redespliegue:

1. ✅ DIDs apuntan a DSP endpoints de conectores (no al wallet)
2. ✅ Resolución DID funciona via HTTPS
3. ✅ DID documents accesibles en `/.well-known/did.json`
4. ✅ IKLN puede obtener credenciales para comunicarse con MASS
5. ✅ Catalog request devuelve HTTP 200 con datasets
6. ✅ Dashboard FASE 5 muestra catálogo correctamente

---

**Nota**: Los archivos en `documentos_utilizados_en_despliegue_conectores/` se mantienen sin cambios como referencia histórica. Los nuevos values corregidos están en `/edc/values-*-fixed.yaml`.
