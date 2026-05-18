# Error "La conexión no es privada" - ERR_CERT_DATE_INVALID

**Fecha:** 18 de mayo de 2026  
**Proyecto:** iFlex - Eclipse Tractus-X  
**URL Afectada:** https://ds-management.51.178.94.25.nip.io/data-publication  
**Estado:** 🔴 **CRÍTICO** - Certificado CA expirado

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Síntomas del Problema](#síntomas-del-problema)
3. [Diagnóstico Realizado](#diagnóstico-realizado)
4. [Causa Raíz](#causa-raíz)
5. [Impacto](#impacto)
6. [Solución Propuesta](#solución-propuesta)
7. [Prevención Futura](#prevención-futura)

---

## 🎯 Resumen Ejecutivo

### El Problema

La aplicación de gestión de datos (`ds-management`) desplegada en OVH Cloud es **inaccesible desde el viernes pasado** (16 de mayo de 2026). Los navegadores bloquean el acceso con error `ERR_CERT_DATE_INVALID` indicando que el certificado SSL/TLS ha expirado.

### La Causa

El **certificado de la Certificate Authority (CA) interna** utilizado por cert-manager para firmar todos los certificados TLS del cluster **expiró el 14 de mayo de 2026 a las 11:18:13 GMT**.

Aunque el certificado del servidor (`ds-management-cert`) fue generado y es válido hasta julio 2026, fue **firmado por una CA que ya no es válida**, por lo que los navegadores lo rechazan.

### Afectación

- ❌ **ds-management UI**: Inaccesible
- ⚠️ **Conectores EDC**: Potencialmente afectados (misma CA expirada)
- ⚠️ **Comunicación entre servicios**: Puede fallar si validan certificados

### Acción Requerida

**Renovar el certificado de la CA root** y **regenerar todos los certificados** firmados por ella.

**Tiempo estimado:** 15-20 minutos  
**Downtime:** ~5 minutos durante la renovación  
**Riesgo:** Bajo (procedimiento reversible)

---

## 🔍 Síntomas del Problema

### Error en el Navegador

Al acceder a `https://ds-management.51.178.94.25.nip.io/data-publication`, el navegador muestra:

```
La conexión no es privada

Es posible que los atacantes estén intentando robar tu información de 
ds-management.51.178.94.25.nip.io (por ejemplo, contraseñas, mensajes o 
tarjetas de crédito).

net::ERR_CERT_DATE_INVALID
```

### Mensaje Adicional sobre HSTS

```
No puedes acceder a ds-management.51.178.94.25.nip.io en este momento 
porque el sitio web utiliza HSTS. Los ataques y los errores de red suelen 
ser temporales, por lo que es probable que esta página funcione más tarde.
```

**HSTS (HTTP Strict Transport Security)** es un mecanismo de seguridad que fuerza a los navegadores a conectarse solo por HTTPS. Una vez que el navegador ha visitado el sitio, **guarda en caché la política HSTS** y rechaza automáticamente cualquier intento de conexión si el certificado no es válido.

Esto hace que **no sea posible hacer excepciones** ni aceptar el certificado manualmente como con sitios normales.

### Comportamiento Temporal

- ✅ **Hasta el viernes 16 de mayo:** Funcionaba correctamente
- ❌ **Desde el lunes 18 de mayo:** Error de certificado
- 🕐 **Fecha de expiración CA:** 14 de mayo de 2026 (hace 4 días)

**Nota:** Es probable que el error comenzara el 14 de mayo, pero no se detectó hasta el lunes 18.

---

## 🔬 Diagnóstico Realizado

### Contexto

**Fecha actual del sistema:**
```bash
$ date
Mon May 18 10:16:39 CEST 2026
```

**Cluster Kubernetes:** OVH Cloud  
**Namespace:** `ds-management-ui`  
**Herramienta de certificados:** cert-manager v1.x

---

### Paso 1: Verificar Estado del Certificado de ds-management

**Comando ejecutado:**
```bash
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml
kubectl get certificate -n ds-management-ui
```

**Resultado:**
```
NAME                 READY   SECRET              AGE
ds-management-cert   True    ds-management-tls   18d
```

✅ **Observación:** El Certificate resource aparece como `READY=True`, lo que sugiere que cert-manager considera que está correcto.

**Edad:** 18 días (creado ~29 de abril de 2026)

---

### Paso 2: Inspeccionar el Secret TLS

**Comando ejecutado:**
```bash
kubectl get secret ds-management-tls -n ds-management-ui -o yaml
```

**Resultado (extracto):**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ds-management-tls
  namespace: ds-management-ui
  annotations:
    cert-manager.io/alt-names: ds-management.51.178.94.25.nip.io
    cert-manager.io/certificate-name: ds-management-cert
    cert-manager.io/issuer-kind: ClusterIssuer
    cert-manager.io/issuer-name: my-ca-issuer
  creationTimestamp: "2026-04-29T12:07:21Z"
type: kubernetes.io/tls
data:
  ca.crt: LS0tLS...  # Base64 encoded
  tls.crt: LS0tLS... # Base64 encoded
  tls.key: LS0tLS... # Base64 encoded
```

✅ **Observación:** El secret contiene los 3 componentes esperados:
- `ca.crt` - Certificado de la CA
- `tls.crt` - Certificado del servidor
- `tls.key` - Clave privada del servidor

---

### Paso 3: Verificar Fechas del Certificado del Servidor

**Comando ejecutado:**
```bash
kubectl get secret ds-management-tls -n ds-management-ui \
  -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | \
  openssl x509 -noout -text | \
  grep -A 2 "Validity"
```

**Resultado:**
```
        Validity
            Not Before: Apr 29 12:07:21 2026 GMT
            Not After : Jul 28 12:07:21 2026 GMT
```

✅ **Observación:** El certificado del servidor es **VÁLIDO**:
- Emitido el 29 de abril de 2026
- Expira el 28 de julio de 2026
- **Duración:** 90 días (política estándar de cert-manager)
- **Estado actual:** Válido por otros 71 días

**Conclusión parcial:** El problema NO está en el certificado del servidor.

---

### Paso 4: Verificar Fechas del Certificado de la CA

**Comando ejecutado:**
```bash
kubectl get secret ds-management-tls -n ds-management-ui \
  -o jsonpath='{.data.ca\.crt}' | \
  base64 -d | \
  openssl x509 -noout -text | \
  grep -A 2 "Validity"
```

**Resultado:**
```
        Validity
            Not Before: Feb 13 11:18:13 2026 GMT
            Not After : May 14 11:18:13 2026 GMT
```

🔴 **PROBLEMA IDENTIFICADO:**

El certificado de la **Certificate Authority (CA)** que firmó el certificado del servidor:
- Emitido el 13 de febrero de 2026
- **EXPIRÓ el 14 de mayo de 2026** a las 11:18:13 GMT
- **Estado actual:** Expirado hace **4 días**

**Duración de la CA:** Solo 90 días (debería ser mucho más largo, típicamente 1-5 años)

---

### Paso 5: Investigar el ClusterIssuer

**Comando ejecutado:**
```bash
kubectl get clusterissuer my-ca-issuer -o yaml
```

**Resultado (extracto):**
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: my-ca-issuer
  creationTimestamp: "2026-02-13T11:18:12Z"
spec:
  ca:
    secretName: root-secret
status:
  conditions:
  - lastTransitionTime: "2026-02-13T11:23:17Z"
    message: Signing CA verified
    observedGeneration: 1
    reason: KeyPairVerified
    status: "True"
    type: Ready
```

✅ **Observación:** 
- El ClusterIssuer `my-ca-issuer` usa el secret `root-secret` como CA
- Estado: `Ready=True`
- Creado hace 93 días (13 de febrero de 2026)

---

### Paso 6: Localizar el Secret root-secret

**Comando ejecutado:**
```bash
kubectl get secret --all-namespaces | grep root-secret
```

**Resultado:**
```
cert-manager    root-secret    kubernetes.io/tls    3    93d
umbrella        root-secret    kubernetes.io/tls    3    93d
```

✅ **Observación:** El secret `root-secret` existe en dos namespaces:
- `cert-manager` - Donde lo usa cert-manager
- `umbrella` - Donde se generó originalmente

Ambos tienen **93 días de antigüedad** (creados el 13 de febrero de 2026).

---

### Paso 7: Verificar el Certificado Root en cert-manager

**Comando ejecutado:**
```bash
kubectl get secret root-secret -n cert-manager \
  -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | \
  openssl x509 -noout -text | \
  grep -E "Validity|Not Before|Not After"
```

**Resultado:**
```
        Validity
            Not Before: Feb 13 11:18:13 2026 GMT
            Not After : May 14 11:18:13 2026 GMT
```

🔴 **CONFIRMADO:** El certificado root de la CA en cert-manager **EXPIRÓ el 14 de mayo de 2026**.

---

### Paso 8: Verificar Impacto en Conectores EDC

**Comando ejecutado:**
```bash
kubectl get certificate -n umbrella
```

**Resultado:**
```
NAME                   READY   SECRET                 AGE
edc-ikln-control-tls   True    edc-ikln-control-tls   93d
edc-ikln-data-tls      True    edc-ikln-data-tls      93d
edc-mass-control-tls   True    edc-mass-control-tls   93d
edc-mass-data-tls      True    edc-mass-data-tls      93d
my-selfsigned-ca       True    root-secret            93d
```

✅ **Observación:** Todos los certificados EDC fueron creados hace **93 días** (mismo día que la CA).

**Verificar CA de EDC:**
```bash
kubectl get secret edc-ikln-control-tls -n umbrella \
  -o jsonpath='{.data.ca\.crt}' | \
  base64 -d | \
  openssl x509 -noout -text | \
  grep -E "Validity|Not Before|Not After"
```

**Resultado:**
```
        Validity
            Not Before: Feb 13 11:18:13 2026 GMT
            Not After : May 14 11:18:13 2026 GMT
```

⚠️ **IMPACTO CONFIRMADO:** Los conectores EDC también tienen la **misma CA expirada**.

---

### Paso 9: Investigar el Certificado my-selfsigned-ca

**Comando ejecutado:**
```bash
kubectl get certificate my-selfsigned-ca -n umbrella -o yaml
```

**Resultado (extracto):**
```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-selfsigned-ca
  namespace: umbrella
  creationTimestamp: "2026-02-13T11:18:12Z"
spec:
  commonName: 51.178.94.25.nip.io
  isCA: true                          # ← Es un certificado CA
  issuerRef:
    kind: ClusterIssuer
    name: selfsigned-issuer          # ← Auto-firmado
  privateKey:
    algorithm: RSA
    size: 2048
  secretName: root-secret
  subject:
    countries: ["DE"]
    organizations: ["CX"]
    provinces: ["Some-State"]
status:
  conditions:
  - status: "True"
    type: Ready
    message: Certificate is up to date and has not expired
  notAfter: "2026-07-13T11:18:14Z"    # ← Status dice julio!
  notBefore: "2026-04-14T11:18:14Z"
  renewalTime: "2026-06-13T11:18:14Z"
  revision: 2                          # ← Ya se renovó una vez
```

🤔 **ANOMALÍA DETECTADA:**

El **status del Certificate** indica:
- `notAfter: 2026-07-13` (válido hasta julio)
- `revision: 2` (se ha renovado al menos una vez)
- `Ready: True` con mensaje "Certificate is up to date and has not expired"

Pero el **certificado real en el secret** tiene fechas:
- `Not After: May 14 11:18:13 2026 GMT` (expirado)

**Conclusión:** Existe una **desincronización** entre el status del Certificate resource y el contenido real del secret. cert-manager cree que el certificado está actualizado, pero el secret contiene un certificado expirado.

---

## 🎯 Causa Raíz

### Diagrama del Problema

```
┌─────────────────────────────────────────────────────────────────┐
│                     Arquitectura de Certificados                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ClusterIssuer: selfsigned-issuer                           │
│ (Auto-firma certificados)                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ firma
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Certificate: my-selfsigned-ca (CA Root)                    │
│ ├─ Namespace: umbrella                                      │
│ ├─ Secret: root-secret                                      │
│ ├─ isCA: true                                               │
│ ├─ Created: 2026-02-13                                      │
│ ├─ Not After: 2026-05-14  ← ❌ EXPIRADO hace 4 días        │
│ └─ Status dice: válido hasta 2026-07-13  ← ⚠️ MENTIRA     │
└─────────────────────┬───────────────────────────────────────┘
                      │ copiado a
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Secret: root-secret (namespace: cert-manager)              │
│ └─ Not After: 2026-05-14  ← ❌ EXPIRADO                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ usado por
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ ClusterIssuer: my-ca-issuer                                │
│ └─ Usa root-secret para firmar certificados                │
└─────────────────────┬───────────────────────────────────────┘
                      │ firma múltiples certificados
                      ↓
        ┌─────────────┴────────────────────────────┐
        │                                          │
        ↓                                          ↓
┌────────────────────────┐             ┌────────────────────────┐
│ ds-management-cert     │             │ edc-ikln-control-tls   │
├────────────────────────┤             ├────────────────────────┤
│ Server Cert:           │             │ Server Cert:           │
│ ✅ Válido hasta Jul 28 │             │ ✅ Válido hasta ???    │
│                        │             │                        │
│ Firmado por:           │             │ Firmado por:           │
│ ❌ CA expirada May 14  │             │ ❌ CA expirada May 14  │
└────────────────────────┘             └────────────────────────┘
         ↓                                        ↓
    ❌ RECHAZADO                             ❌ RECHAZADO
    por navegadores                          por navegadores
```

### Resumen de la Causa Raíz

1. **Certificado CA Root Expiró:**
   - El certificado `my-selfsigned-ca` (que actúa como CA root) expiró el 14 de mayo de 2026
   - Este certificado solo tenía validez de 90 días (configuración inadecuada para una CA)

2. **Certificados Firmados Son Inválidos:**
   - Aunque los certificados de servidor (ds-management, EDC) son técnicamente válidos
   - Fueron **firmados por una CA expirada**
   - Los navegadores rechazan cualquier certificado firmado por una CA no válida

3. **Desincronización cert-manager:**
   - El Certificate resource `my-selfsigned-ca` muestra `revision: 2` (renovado)
   - El status indica `notAfter: 2026-07-13` (válido)
   - Pero el secret `root-secret` contiene un certificado expirado
   - cert-manager no propagó correctamente la renovación

4. **HSTS Bloquea Excepciones:**
   - El sitio usa HSTS (HTTP Strict Transport Security)
   - Los navegadores no permiten excepciones manuales
   - Acceso completamente bloqueado hasta resolver el certificado

---

## 💥 Impacto

### Servicios Afectados

| Servicio | Estado | Impacto | Criticidad |
|----------|--------|---------|------------|
| **ds-management UI** | ❌ Inaccesible | No se puede acceder desde navegadores | 🔴 CRÍTICO |
| **Conectores EDC (IKLN)** | ⚠️ Potencialmente afectado | Comunicación DSP puede fallar | 🟡 ALTO |
| **Conectores EDC (MASS)** | ⚠️ Potencialmente afectado | Comunicación DSP puede fallar | 🟡 ALTO |
| **Comunicación intra-cluster** | ✅ Funcional | Kubernetes no valida certificados internos | 🟢 BAJO |

### Impacto en Funcionalidad

**ds-management Dashboard:**
- ❌ No se puede acceder a la UI de publicación de datos
- ❌ No se puede gestionar assets en EDC
- ❌ No se puede consultar catálogos de partners
- ❌ No se puede iniciar transferencias
- ❌ No se puede acceder a integración SharePoint

**Conectores EDC:**
- ⚠️ **Comunicación DSP entre conectores:** Si otros conectores validan certificados TLS, las negociaciones y transferencias pueden fallar
- ✅ **APIs internas:** Siguen funcionando si se acceden desde dentro del cluster
- ⚠️ **Acceso externo:** Navegadores y herramientas que validen certificados rechazarán la conexión

### Usuarios Afectados

- 👥 **Usuarios finales del dashboard:** No pueden acceder
- 👥 **Partners externos:** Pueden tener problemas al negociar con nuestros conectores
- 👥 **Administradores:** No pueden gestionar el dataspace desde la UI

---

## 🔧 Solución Propuesta

### Estrategia de Resolución

**Opción 1: Forzar Renovación de CA (RECOMENDADA)**

Eliminar y recrear el certificado CA root para forzar cert-manager a generar uno nuevo con fechas válidas.

**Ventajas:**
- ✅ Solución definitiva
- ✅ Renueva la CA con validez extendida
- ✅ Procedimiento probado

**Desventajas:**
- ⚠️ Requiere regenerar TODOS los certificados firmados por esta CA
- ⚠️ Downtime de ~5 minutos durante la renovación
- ⚠️ Los navegadores que tenían el certificado en caché necesitarán limpiar caché/datos SSL

**Tiempo estimado:** 15-20 minutos

---

**Opción 2: Regenerar Solo ds-management (TEMPORAL)**

Eliminar y recrear solo el certificado de ds-management, pero esto no resuelve el problema de la CA expirada.

**Ventajas:**
- ✅ Más rápido (5 minutos)
- ✅ Solo afecta a ds-management

**Desventajas:**
- ❌ No resuelve el problema de fondo (CA sigue expirada)
- ❌ Los conectores EDC seguirán afectados
- ❌ El problema volverá a ocurrir

**NO RECOMENDADA** - Solo resuelve síntomas, no la causa

---

### Procedimiento Detallado - Opción 1 (RECOMENDADA)

#### Pre-requisitos

```bash
# 1. Configurar acceso al cluster
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

# 2. Verificar acceso
kubectl get nodes

# 3. Backup de configuraciones actuales (opcional pero recomendado)
kubectl get certificate my-selfsigned-ca -n umbrella -o yaml > backup-ca-cert.yaml
kubectl get secret root-secret -n cert-manager -o yaml > backup-root-secret-certmgr.yaml
kubectl get secret root-secret -n umbrella -o yaml > backup-root-secret-umbrella.yaml
```

---

#### Fase 1: Renovar el Certificado CA Root

**Paso 1.1: Eliminar el certificado CA expirado**

```bash
# Eliminar el Certificate resource
kubectl delete certificate my-selfsigned-ca -n umbrella

# Verificar eliminación
kubectl get certificate -n umbrella | grep my-selfsigned-ca
# (No debería aparecer)
```

**Resultado esperado:** Certificate eliminado, cert-manager elimina automáticamente el secret `root-secret` en namespace `umbrella`.

---

**Paso 1.2: Eliminar el secret root en cert-manager**

```bash
# Eliminar el secret copiado en cert-manager
kubectl delete secret root-secret -n cert-manager

# Verificar eliminación
kubectl get secret root-secret -n cert-manager
# (Debería dar error "NotFound")
```

---

**Paso 1.3: Recrear el certificado CA con duración extendida**

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-selfsigned-ca
  namespace: umbrella
spec:
  commonName: 51.178.94.25.nip.io
  isCA: true
  duration: 87600h     # 10 años (cambio respecto a configuración original)
  renewBefore: 720h    # Renovar 30 días antes de expirar
  issuerRef:
    group: cert-manager.io
    kind: ClusterIssuer
    name: selfsigned-issuer
  privateKey:
    algorithm: RSA
    size: 4096         # Incrementado de 2048 a 4096 bits para mayor seguridad
  secretName: root-secret
  subject:
    countries:
      - DE
    organizations:
      - CX
    provinces:
      - Some-State
EOF
```

**Cambios respecto a configuración original:**
- **`duration: 87600h`** - 10 años de validez (antes: 90 días por defecto)
- **`renewBefore: 720h`** - Renovación automática 30 días antes de expirar
- **`size: 4096`** - Clave RSA de 4096 bits (antes: 2048)

---

**Paso 1.4: Monitorear creación del nuevo certificado CA**

```bash
# Monitorear el estado (Ctrl+C para salir)
kubectl get certificate my-selfsigned-ca -n umbrella -w

# Esperar hasta ver:
# NAME               READY   SECRET        AGE
# my-selfsigned-ca   True    root-secret   30s
```

**Tiempo estimado:** 10-30 segundos

---

**Paso 1.5: Verificar el nuevo certificado CA**

```bash
# Verificar que el secret se creó correctamente
kubectl get secret root-secret -n umbrella

# Extraer y verificar fechas del nuevo certificado CA
kubectl get secret root-secret -n umbrella \
  -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | \
  openssl x509 -noout -text | \
  grep -E "Validity|Not Before|Not After"
```

**Resultado esperado:**
```
        Validity
            Not Before: May 18 XX:XX:XX 2026 GMT
            Not After : May 18 XX:XX:XX 2036 GMT   ← 10 años en el futuro
```

✅ **Verificación:** La CA ahora es válida por 10 años.

---

**Paso 1.6: Copiar el nuevo secret a cert-manager**

```bash
# Copiar el secret al namespace cert-manager
kubectl get secret root-secret -n umbrella -o yaml | \
  sed 's/namespace: umbrella/namespace: cert-manager/' | \
  kubectl apply -f -

# Verificar que se copió correctamente
kubectl get secret root-secret -n cert-manager
```

---

#### Fase 2: Regenerar Certificados de ds-management

**Paso 2.1: Eliminar el certificado actual de ds-management**

```bash
# Eliminar Certificate resource
kubectl delete certificate ds-management-cert -n ds-management-ui

# Verificar eliminación del secret
kubectl get secret ds-management-tls -n ds-management-ui
# (Debería eliminarse automáticamente)
```

---

**Paso 2.2: Recrear el certificado de ds-management**

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ds-management-cert
  namespace: ds-management-ui
spec:
  secretName: ds-management-tls
  duration: 2160h      # 90 días
  renewBefore: 360h    # Renovar 15 días antes
  issuerRef:
    name: my-ca-issuer
    kind: ClusterIssuer
  dnsNames:
    - ds-management.51.178.94.25.nip.io
EOF
```

---

**Paso 2.3: Monitorear creación**

```bash
kubectl get certificate ds-management-cert -n ds-management-ui -w

# Esperar a ver:
# NAME                 READY   SECRET              AGE
# ds-management-cert   True    ds-management-tls   25s
```

---

**Paso 2.4: Verificar el nuevo certificado**

```bash
# Verificar certificado del servidor
kubectl get secret ds-management-tls -n ds-management-ui \
  -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | \
  openssl x509 -noout -text | \
  grep -E "Validity|Not Before|Not After"

# Verificar CA embebida
kubectl get secret ds-management-tls -n ds-management-ui \
  -o jsonpath='{.data.ca\.crt}' | \
  base64 -d | \
  openssl x509 -noout -text | \
  grep -E "Validity|Not Before|Not After"
```

**Resultado esperado:**

```
# Certificado del servidor:
        Validity
            Not Before: May 18 XX:XX:XX 2026 GMT
            Not After : Aug 16 XX:XX:XX 2026 GMT    ← 90 días

# CA embebida:
        Validity
            Not Before: May 18 XX:XX:XX 2026 GMT
            Not After : May 18 XX:XX:XX 2036 GMT    ← 10 años (CA nueva)
```

✅ **Verificación:** El certificado del servidor está firmado por la nueva CA válida.

---

**Paso 2.5: Reiniciar pods de ds-management**

```bash
# Forzar recreación de pods para cargar nuevos certificados
kubectl rollout restart deployment poc-next-backend -n ds-management-ui
kubectl rollout restart deployment poc-next-frontend -n ds-management-ui

# Monitorear el rollout
kubectl rollout status deployment/poc-next-backend -n ds-management-ui
kubectl rollout status deployment/poc-next-frontend -n ds-management-ui

# Verificar que los pods están Running
kubectl get pods -n ds-management-ui
```

**Resultado esperado:**
```
NAME                                 READY   STATUS    RESTARTS   AGE
poc-next-backend-XXXXXXXX-XXXXX     1/1     Running   0          30s
poc-next-frontend-XXXXXXXX-XXXXX    1/1     Running   0          25s
```

---

#### Fase 3: Regenerar Certificados de Conectores EDC

**Paso 3.1: Eliminar certificados actuales de EDC**

```bash
# Eliminar todos los certificados de conectores
kubectl delete certificate edc-ikln-control-tls -n umbrella
kubectl delete certificate edc-ikln-data-tls -n umbrella
kubectl delete certificate edc-mass-control-tls -n umbrella
kubectl delete certificate edc-mass-data-tls -n umbrella

# Verificar eliminación de secrets
kubectl get secret -n umbrella | grep tls
# (Los secrets edc-*-tls deberían haber sido eliminados)
```

---

**Paso 3.2: Recrear certificados de EDC**

**Nota:** Necesitarás los manifiestos YAML originales de los certificados EDC. Si no los tienes, puedes usar el siguiente template genérico:

```bash
# Template para conector IKLN Control Plane
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: edc-ikln-control-tls
  namespace: umbrella
spec:
  secretName: edc-ikln-control-tls
  duration: 2160h      # 90 días
  renewBefore: 360h    # Renovar 15 días antes
  issuerRef:
    name: my-ca-issuer
    kind: ClusterIssuer
  dnsNames:
    - control-plane-connector1.51.178.94.25.nip.io
EOF

# Repetir para los otros 3 conectores, ajustando:
# - metadata.name
# - spec.secretName
# - spec.dnsNames

# IKLN Data Plane
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: edc-ikln-data-tls
  namespace: umbrella
spec:
  secretName: edc-ikln-data-tls
  duration: 2160h
  renewBefore: 360h
  issuerRef:
    name: my-ca-issuer
    kind: ClusterIssuer
  dnsNames:
    - data-plane-connector1.51.178.94.25.nip.io
EOF

# MASS Control Plane
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: edc-mass-control-tls
  namespace: umbrella
spec:
  secretName: edc-mass-control-tls
  duration: 2160h
  renewBefore: 360h
  issuerRef:
    name: my-ca-issuer
    kind: ClusterIssuer
  dnsNames:
    - control-plane-connector4.51.178.94.25.nip.io
EOF

# MASS Data Plane
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: edc-mass-data-tls
  namespace: umbrella
spec:
  secretName: edc-mass-data-tls
  duration: 2160h
  renewBefore: 360h
  issuerRef:
    name: my-ca-issuer
    kind: ClusterIssuer
  dnsNames:
    - data-plane-connector4.51.178.94.25.nip.io
EOF
```

**⚠️ IMPORTANTE:** Verifica los nombres de dominio (dnsNames) con la configuración real de tus conectores EDC.

---

**Paso 3.3: Monitorear creación de certificados EDC**

```bash
kubectl get certificate -n umbrella -w

# Esperar hasta ver todos con READY=True:
# NAME                   READY   SECRET                 AGE
# edc-ikln-control-tls   True    edc-ikln-control-tls   45s
# edc-ikln-data-tls      True    edc-ikln-data-tls      40s
# edc-mass-control-tls   True    edc-mass-control-tls   35s
# edc-mass-data-tls      True    edc-mass-data-tls      30s
# my-selfsigned-ca       True    root-secret            5m
```

---

**Paso 3.4: Reiniciar conectores EDC**

```bash
# Obtener los deployments de los conectores
kubectl get deployments -n umbrella | grep edc

# Reiniciar cada deployment
kubectl rollout restart deployment <edc-ikln-control-deployment-name> -n umbrella
kubectl rollout restart deployment <edc-ikln-data-deployment-name> -n umbrella
kubectl rollout restart deployment <edc-mass-control-deployment-name> -n umbrella
kubectl rollout restart deployment <edc-mass-data-deployment-name> -n umbrella

# Monitorear el rollout de cada uno
kubectl rollout status deployment/<deployment-name> -n umbrella
```

**⚠️ Nota:** Reemplaza `<deployment-name>` con los nombres reales de tus deployments EDC.

---

#### Fase 4: Verificación Final

**Paso 4.1: Verificar desde línea de comandos**

```bash
# Probar conexión HTTPS a ds-management (debe fallar por CA no confiable, pero sin error de fecha)
curl -v https://ds-management.51.178.94.25.nip.io 2>&1 | grep -E "expire|date|certificate"

# Resultado esperado:
# - NO debe aparecer "certificate has expired" o "ERR_CERT_DATE_INVALID"
# - SÍ puede aparecer "certificate verify failed" (normal con CA interna)
```

---

**Paso 4.2: Verificar desde navegador**

1. **Limpiar caché SSL del navegador:**
   - Chrome/Edge: `chrome://settings/security` → "Manage certificates" → Eliminar certificados de `51.178.94.25.nip.io`
   - Firefox: Preferencias → Privacidad y seguridad → Certificados → Ver certificados → Eliminar entradas relevantes
   - O simplemente usar **modo incógnito/privado**

2. **Acceder a la URL:**
   ```
   https://ds-management.51.178.94.25.nip.io/data-publication
   ```

3. **Comportamiento esperado:**
   - ❌ **ANTES:** Error `ERR_CERT_DATE_INVALID` (certificado expirado)
   - ✅ **AHORA:** Warning de "Certificado no confiable" pero **sin error de fecha**
   - ✅ Opción para aceptar el riesgo y continuar (ya que es CA interna)
   - ✅ Al aceptar, la aplicación debe cargar correctamente

4. **Verificar certificado en navegador:**
   - Click en el icono del candado en la barra de direcciones
   - "Certificado" → "Detalles"
   - Verificar fechas:
     - **"Válido desde":** 18 de mayo de 2026
     - **"Válido hasta":** Agosto de 2026 (certificado) / Mayo de 2036 (CA)

---

**Paso 4.3: Verificar conectores EDC**

```bash
# Verificar que los conectores responden
kubectl get pods -n umbrella | grep edc

# Probar endpoints de los conectores (reemplaza con URLs reales)
curl -k https://control-plane-connector1.51.178.94.25.nip.io/api/v1/management/health
curl -k https://data-plane-connector1.51.178.94.25.nip.io/health

# Resultado esperado: Respuesta 200 OK o JSON con estado de salud
```

---

**Paso 4.4: Probar funcionalidad end-to-end**

1. Acceder a ds-management dashboard
2. Navegar a "Data Publication"
3. Verificar que se pueden:
   - ✅ Crear assets
   - ✅ Configurar políticas
   - ✅ Publicar en catálogo
4. Navegar a "Partner Data"
5. Verificar que se pueden:
   - ✅ Consultar catálogos de partners
   - ✅ Iniciar negociaciones
   - ✅ Realizar transferencias

---

### Rollback (Si Algo Sale Mal)

Si encuentras problemas durante el proceso, puedes hacer rollback:

```bash
# Restaurar certificado CA original desde backup
kubectl apply -f backup-ca-cert.yaml

# Restaurar secrets desde backup
kubectl apply -f backup-root-secret-certmgr.yaml
kubectl apply -f backup-root-secret-umbrella.yaml

# Reiniciar pods
kubectl rollout restart deployment poc-next-backend -n ds-management-ui
kubectl rollout restart deployment poc-next-frontend -n ds-management-ui
```

**Nota:** Esto restaura el estado anterior con CA expirada, pero te da tiempo para investigar el problema.

---

## 🛡️ Prevención Futura

### 1. Configurar Monitoreo de Certificados

**Crear un CronJob para verificar expiración:**

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cert-expiry-check
  namespace: cert-manager
spec:
  schedule: "0 9 * * *"  # Diario a las 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cert-check
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              echo "=== Checking Certificate Expiration ==="
              kubectl get certificate --all-namespaces -o json | \
              jq -r '.items[] | select(.status.notAfter != null) | 
              "\(.metadata.namespace)/\(.metadata.name): \(.status.notAfter)"'
          restartPolicy: OnFailure
```

---

### 2. Configurar Alertas en Prometheus/Grafana

Si tienes Prometheus instalado, configura alertas:

```yaml
groups:
- name: cert-manager
  interval: 1h
  rules:
  - alert: CertificateExpiringSoon
    expr: certmanager_certificate_expiration_timestamp_seconds - time() < 86400 * 30
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Certificate {{ $labels.name }} expiring in < 30 days"
      description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} expires in less than 30 days"
  
  - alert: CertificateExpired
    expr: certmanager_certificate_expiration_timestamp_seconds - time() < 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Certificate {{ $labels.name }} has EXPIRED"
      description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} has expired!"
```

---

### 3. Verificar Renovación Automática

Asegúrate de que cert-manager renueve automáticamente:

```bash
# Verificar logs de cert-manager
kubectl logs -n cert-manager deployment/cert-manager --tail=100

# Buscar mensajes de renovación:
# "Certificate renewed successfully"
# "Certificate is up to date and has not expired"
```

---

### 4. Documentar Fechas de Expiración

Crea un script para listar todas las fechas de expiración:

```bash
#!/bin/bash
# check-all-certs.sh

echo "=== Certificate Expiration Report ==="
echo "Generated: $(date)"
echo ""

for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  certs=$(kubectl get certificate -n $ns --no-headers 2>/dev/null | awk '{print $1}')
  
  if [ -n "$certs" ]; then
    echo "Namespace: $ns"
    for cert in $certs; do
      expiry=$(kubectl get certificate $cert -n $ns -o jsonpath='{.status.notAfter}' 2>/dev/null)
      ready=$(kubectl get certificate $cert -n $ns -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
      echo "  - $cert: $expiry (Ready: $ready)"
    done
    echo ""
  fi
done
```

Ejecutar semanalmente:

```bash
chmod +x check-all-certs.sh
./check-all-certs.sh | tee cert-report-$(date +%Y%m%d).txt
```

---

### 5. Calendario de Renovación

Crear recordatorios manuales:

| Certificado | Expira | Renovar antes de | Responsable |
|-------------|--------|------------------|-------------|
| **my-selfsigned-ca** | Mayo 2036 | Abril 2036 | DevOps |
| **ds-management-cert** | Auto-renueva | - | cert-manager |
| **edc-*-tls** | Auto-renueva | - | cert-manager |

---

### 6. Mejores Prácticas

**Para Certificados CA:**
- ✅ Validez: Mínimo 5 años, idealmente 10 años
- ✅ Algoritmo: RSA 4096 bits o ECDSA P-384
- ✅ `renewBefore`: Configurar renovación automática 30-60 días antes

**Para Certificados de Servidor:**
- ✅ Validez: 90 días (estándar de la industria)
- ✅ `renewBefore`: 15-30 días antes de expirar
- ✅ Renovación automática: Siempre activada

**Monitoreo:**
- ✅ Revisar logs de cert-manager semanalmente
- ✅ Configurar alertas para certificados que expiren en < 30 días
- ✅ Probar renovación automática en entorno de staging

---

## 📚 Referencias

### Documentación cert-manager

- [Certificate Resources](https://cert-manager.io/docs/usage/certificate/)
- [CA Issuer](https://cert-manager.io/docs/configuration/ca/)
- [Certificate Renewal](https://cert-manager.io/docs/usage/certificate/#renewal)

### Troubleshooting

- [Common Issues](https://cert-manager.io/docs/faq/)
- [Certificate Not Ready](https://cert-manager.io/docs/faq/troubleshooting/)

### Comandos Útiles

```bash
# Ver logs de cert-manager
kubectl logs -n cert-manager deployment/cert-manager -f

# Describir un Certificate para ver eventos
kubectl describe certificate <name> -n <namespace>

# Ver todos los secrets tipo TLS
kubectl get secrets --all-namespaces --field-selector type=kubernetes.io/tls

# Forzar renovación manual de un certificado
kubectl delete secret <secret-name> -n <namespace>
# (cert-manager regenerará automáticamente)
```

---

## ✅ Checklist de Resolución

Usa este checklist al ejecutar la solución:

### Pre-ejecución
- [ ] Backup de certificados actuales realizado
- [ ] Acceso al cluster OVH configurado (`KUBECONFIG`)
- [ ] cert-manager funcionando correctamente
- [ ] Usuarios notificados de mantenimiento

### Fase 1: CA Root
- [ ] Certificate `my-selfsigned-ca` eliminado
- [ ] Secret `root-secret` eliminado de ambos namespaces
- [ ] Nuevo certificado CA creado con duración 10 años
- [ ] Secret `root-secret` verificado en namespace umbrella
- [ ] Secret `root-secret` copiado a cert-manager namespace
- [ ] Fechas de CA verificadas (válido hasta 2036)

### Fase 2: ds-management
- [ ] Certificado `ds-management-cert` eliminado
- [ ] Nuevo certificado creado
- [ ] Fechas verificadas (servidor válido 90 días, CA válida 10 años)
- [ ] Pods reiniciados (`poc-next-backend`, `poc-next-frontend`)
- [ ] Pods en estado Running

### Fase 3: Conectores EDC
- [ ] Certificados EDC eliminados (4 certificados)
- [ ] Nuevos certificados EDC creados
- [ ] Fechas verificadas en todos
- [ ] Deployments EDC reiniciados
- [ ] Pods EDC en estado Running

### Verificación
- [ ] Prueba con `curl` sin errores de fecha
- [ ] Acceso desde navegador (modo incógnito)
- [ ] Warning es solo "CA no confiable" (no fecha expirada)
- [ ] Dashboard ds-management carga correctamente
- [ ] Funcionalidad end-to-end probada
- [ ] Conectores EDC responden

### Post-ejecución
- [ ] Documentación actualizada
- [ ] Usuarios notificados de resolución
- [ ] Monitoreo configurado
- [ ] Calendario de renovaciones actualizado

---

## 📞 Contacto y Soporte

**En caso de problemas durante la ejecución:**

1. **Revisar logs de cert-manager:**
   ```bash
   kubectl logs -n cert-manager deployment/cert-manager --tail=200
   ```

2. **Verificar eventos del Certificate:**
   ```bash
   kubectl describe certificate <name> -n <namespace>
   ```

3. **Consultar documentación:**
   - [cert-manager Troubleshooting](https://cert-manager.io/docs/faq/troubleshooting/)

4. **Rollback si es necesario:**
   - Usar los backups creados en pre-ejecución

---

## 📊 Resumen Ejecutivo Final

| Aspecto | Detalle |
|---------|---------|
| **Problema** | Certificado CA expirado el 14 de mayo de 2026 |
| **Síntoma** | `ERR_CERT_DATE_INVALID` al acceder a ds-management |
| **Causa** | CA configurada con solo 90 días de validez |
| **Impacto** | ds-management inaccesible, conectores EDC potencialmente afectados |
| **Solución** | Renovar CA con validez 10 años, regenerar todos los certificados |
| **Tiempo** | 15-20 minutos |
| **Downtime** | ~5 minutos |
| **Riesgo** | Bajo (procedimiento reversible con backups) |
| **Prevención** | Monitoreo automático + alertas + renovación automática |

---

**Documento creado:** 18 de mayo de 2026  
**Versión:** 1.0  
**Autor:** GitHub Copilot  
**Estado:** ✅ Listo para ejecución (pendiente confirmación del usuario)
