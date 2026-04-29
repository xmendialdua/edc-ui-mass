# Resolución: Error de configuración EDC_IAM_DID_WEB_USE_HTTPS

**Fecha:** 27 de marzo de 2026  
**Componentes afectados:** MASS EDC, IKLN EDC  
**Severidad:** CRÍTICA - Bloqueaba toda funcionalidad de resolución DID

## 📋 Resumen Ejecutivo

Los conectores EDC fueron desplegados con la configuración `EDC_IAM_DID_WEB_USE_HTTPS: false`, causando que todos los intentos de resolución DID fallaran con error 404. Esto impedía el correcto funcionamiento del protocolo IATP (Identity And Trust Protocol) y, por tanto, bloqueaba cualquier operación de catálogo, negociación o transferencia entre conectores.

## 🔍 Descripción del Problema

### Error Observado

Al ejecutar la verificación de configuración DID desde el dashboard, se observó:

```
DID document: ❌ NO disponible (404 Not Found)
→ El conector NO está exponiendo su DID document
```

**Verificación manual:**
```bash
curl -k -s https://edc-mass-control.51.178.94.25.nip.io/.well-known/did.json
# Respuesta: 404 Not Found
```

### Síntomas

1. **Documentos DID inaccesibles:** Los endpoints `/.well-known/did.json` de los conectores devolvían 404
2. **Negociaciones fallidas:** Las negociaciones de contrato fallaban durante la fase de validación de identidad
3. **Catálogo vacío:** Los participantes no podían descubrir assets debido a fallos en autenticación IATP

## 🧩 Causa Raíz

### Variable de Configuración: `EDC_IAM_DID_WEB_USE_HTTPS`

Esta variable controla el **protocolo utilizado para construir URLs de resolución DID** en el contexto del método DID:web.

#### Funcionamiento

Cuando un conector EDC necesita resolver un DID (Decentralized Identifier) del tipo `did:web`, debe convertirlo en una URL HTTP(S) para obtener el documento DID:

**Ejemplo de transformación:**
```
DID: did:web:ssi-dim-wallet-stub.51.178.94.25.nip.io:BPNL00000000MASS
```

**Con `EDC_IAM_DID_WEB_USE_HTTPS: false`** (INCORRECTO en este caso):
```
URL construida: http://ssi-dim-wallet-stub.51.178.94.25.nip.io/BPNL00000000MASS/.well-known/did.json
                ^^^^^
```

**Con `EDC_IAM_DID_WEB_USE_HTTPS: true`** (CORRECTO):
```
URL construida: https://ssi-dim-wallet-stub.51.178.94.25.nip.io/BPNL00000000MASS/.well-known/did.json
                ^^^^^^
```

### Por qué falló con `false`

1. **Infraestructura con TLS:** El dominio `*.51.178.94.25.nip.io` está protegido por Nginx Ingress con TLS
2. **Solo HTTPS aceptado:** El Ingress está configurado para aceptar únicamente tráfico HTTPS
3. **HTTP rechazado:** Las peticiones HTTP son redirigidas o rechazadas
4. **Resultado:** 404 Not Found al intentar acceder vía HTTP

### Diagrama del Flujo Erróneo

```
EDC Connector (IKLN)
  │
  │ 1. Necesita verificar identidad de MASS
  │
  ├─► Construye URL con HTTP
  │   (debido a USE_HTTPS: false)
  │
  ├─► GET http://ssi-dim-wallet-stub.51.178.94.25.nip.io/...
  │
  └─► Nginx Ingress
       │
       ├─► Solo acepta HTTPS
       │
       └─► ❌ 404 Not Found / 308 Redirect → Fallo
```

## 💡 Cuándo usar `true` vs `false`

### ✅ Usar `EDC_IAM_DID_WEB_USE_HTTPS: true`

**Escenarios:**
- **Entornos de producción** con dominios públicos y certificados SSL/TLS
- **Despliegues con Ingress** (Nginx, Traefik, etc.) que terminan TLS
- **Infraestructuras cloud** con balanceadores de carga HTTPS
- **Cumplimiento de seguridad** que requiere cifrado en tránsito

**Nuestro caso (OVH):**
- Dominio: `*.51.178.94.25.nip.io`
- Nginx Ingress con certificados TLS
- **Valor correcto:** `true`

### ⚠️ Usar `EDC_IAM_DID_WEB_USE_HTTPS: false`

**Escenarios:**
- **Desarrollo local** sin configuración SSL
- **Entornos de testing** con URLs `localhost`
- **Redes privadas** sin infraestructura TLS
- **Docker Compose local** sin proxy reverso

**Ejemplo:**
```yaml
# docker-compose.yml para desarrollo local
services:
  edc-controlplane:
    environment:
      EDC_IAM_DID_WEB_USE_HTTPS: false  # OK para http://localhost
```

## 🔧 Solución Implementada

### 1. Identificación del problema

Mediante el botón "🆔 Verificar Configuración DID" implementado en el dashboard (FASE 1), que ejecuta:

```bash
kubectl get pod -n umbrella -l app.kubernetes.io/name=mass-edc-controlplane -o json | \
  jq -r '.items[0].spec.containers[0].env[] | 
  select(.name | test("PARTICIPANT|IATP|DID"; "i")) | 
  .name + ": " + (.value // "<from valueFrom>")'
```

### 2. Valores corregidos

Archivos de configuración actualizados en `/edc-redeploy/`:

**`values-mass-connector-fixed.yaml`:**
```yaml
iatp:
  id: did:web:ssi-dim-wallet-stub.51.178.94.25.nip.io:BPNL00000000MASS
  trustedIssuers:
    - did:web:ssi-dim-wallet-stub.51.178.94.25.nip.io
  sts:
    dim:
      url: http://dim-wallet-proxy.portal.svc.cluster.local:8080
    oauth:
      token_url: http://keycloak.portal.svc.cluster.local:8080/realms/miw_test/protocol/openid-connect/token
      client:
        id: mass_edc
        secret_alias: mass-dim-client-secret
controlplane:
  ssi:
    endpoint:
      audience: https://edc-mass-control.51.178.94.25.nip.io
  env:
    EDC_IAM_DID_WEB_USE_HTTPS: "true"  # ✅ CORREGIDO
```

**`values-ikln-connector-fixed.yaml`:**
```yaml
iatp:
  id: did:web:ssi-dim-wallet-stub.51.178.94.25.nip.io:BPNL00000002IKLN
  trustedIssuers:
    - did:web:ssi-dim-wallet-stub.51.178.94.25.nip.io
  sts:
    dim:
      url: http://dim-wallet-proxy.portal.svc.cluster.local:8080
    oauth:
      token_url: http://keycloak.portal.svc.cluster.local:8080/realms/miw_test/protocol/openid-connect/token
      client:
        id: ikln_edc
        secret_alias: ikln-dim-client-secret
controlplane:
  ssi:
    endpoint:
      audience: https://edc-ikln-control.51.178.94.25.nip.io
  env:
    EDC_IAM_DID_WEB_USE_HTTPS: "true"  # ✅ CORREGIDO
```

### 3. Script de redespliegue

Preparado en `/edc-redeploy/redeploy-connectors.sh`:

```bash
#!/bin/bash
# Redespliegue de conectores con configuración DID corregida
# Duración estimada: 10-15 minutos (downtime)

echo "🔄 Redespliegue de conectores EDC con EDC_IAM_DID_WEB_USE_HTTPS: true"

# MASS Connector
helm upgrade mass-edc tractusx-edc/tractusx-connector \
  --namespace umbrella \
  --values values-mass-connector-fixed.yaml

# IKLN Connector
helm upgrade ikln-edc tractusx-edc/tractusx-connector \
  --namespace umbrella \
  --values values-ikln-connector-fixed.yaml

echo "✅ Redespliegue completado"
```

## 🧪 Validación Post-Redespliegue

### Verificaciones requeridas:

1. **Configuración correcta:**
   ```bash
   kubectl get pod -n umbrella -l app.kubernetes.io/name=mass-edc-controlplane -o json | \
     jq -r '.items[0].spec.containers[0].env[] | select(.name == "EDC_IAM_DID_WEB_USE_HTTPS")'
   # Esperado: "true"
   ```

2. **DID documents accesibles:**
   ```bash
   curl -k -s https://ssi-dim-wallet-stub.51.178.94.25.nip.io/.well-known/did.json | jq .
   # Esperado: JSON válido con verificationMethod, service, etc.
   ```

3. **Catálogo funcional:**
   - Ejecutar "📋 Consultar Catálogo" desde FASE 6
   - Verificar que IKLN puede ver assets publicados por MASS

4. **Negociación exitosa:**
   - Iniciar negociación desde dashboard
   - Estado debe llegar a `FINALIZED` con `contractAgreementId`

## 📚 Referencias

- **Tractus-X EDC:** v0.11.1
- **Protocolo DID:web:** [W3C DID Method](https://w3c-ccg.github.io/did-method-web/)
- **Resolución DID:** RFC para transformación `did:web:` → `https://`
- **IATP:** Identity And Trust Protocol (Catena-X/Tractus-X)

## 📝 Lecciones Aprendidas

1. **Validar arquitectura antes de configurar:** La variable `USE_HTTPS` debe coincidir con la infraestructura de red
2. **Diagnósticos tempranos:** Implementar verificaciones de configuración en el dashboard facilitó la detección
3. **Documentación clara:** Los parámetros críticos de infraestructura deben estar bien documentados
4. **Testing por capas:** Verificar primero conectividad de red, luego resolución DID, finalmente lógica de negocio

## ✅ Estado Actual

- **Problema:** IDENTIFICADO y DOCUMENTADO
- **Solución:** PREPARADA (values-*-fixed.yaml + redeploy script)
- **Próximo paso:** Ejecutar redespliegue con `./redeploy-connectors.sh`
- **Impacto esperado:** ~10-15 min de downtime durante redespliegue
- **Validación:** Herramienta de verificación DID disponible en dashboard (FASE 1)

---

**Autor:** Dashboard EDC - Sistema de Diagnóstico Automatizado  
**Ubicación:** `/home/xmendialdua/projects/assembly/iflex/dashboard/`  
**Relacionado:** `20260318-resolucion-error-502-dsp-endpoints.md`, `DIAGNOSTICO_IATP_FIX.md`
