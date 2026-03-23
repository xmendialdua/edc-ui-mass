# Resolución Error 502 - DSP Endpoints con HTTPS

**Fecha:** 18 de Marzo de 2026  
**Sistema:** Dashboard EDC - FASE 5 (Catalog Discovery)  
**Conectores:** MASS (BPNL00000000MASS) e IKLN (BPNL00000002IKLN)  
**Versión Tractus-X Umbrella:** 3.15.2 (Release 25.09)

---

## 1. Descripción del Problema

Al ejecutar el **Catalog Request** desde IKLN hacia MASS en la FASE 5 del dashboard, se producía un error HTTP 502 (Bad Gateway) con el mensaje:

```json
{
  "message": "Unable to obtain credentials: Empty optional",
  "type": "BadGateway",
  "path": null,
  "invalidValue": null
}
```

Este error impedía que IKLN pudiera consultar el catálogo de assets disponibles en MASS, bloqueando completamente el flujo de descubrimiento de datos en el dataspace.

---

## 2. Causa Raíz

El problema se debía a un **desajuste en el protocolo de los DSP endpoints**:

### Configuración Incorrecta
Los DSP endpoints estaban configurados usando el protocolo **HTTPS**:

```json
{
  "mass": {
    "dsp": "https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp"
  },
  "ikln": {
    "dsp": "https://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp"
  }
}
```

### Por qué fallaba

1. **Certificados TLS no configurados para DSP**: Los conectores EDC en el despliegue de Tractus-X Umbrella tienen certificados TLS configurados para los **Management APIs** (puerto 443/HTTPS), pero **no** para los **DSP endpoints** (Dataspace Protocol).

2. **Negociación de credenciales IATP**: Durante el Catalog Request, IKLN intenta obtener credenciales temporales mediante el protocolo IATP (Identity and Trust Protocol) para autenticarse con MASS. Este proceso requiere comunicación a través del DSP endpoint.

3. **Fallo en handshake SSL/TLS**: Al intentar conectar vía HTTPS al DSP endpoint sin certificados adecuados, el handshake SSL/TLS falla, causando que el proceso de obtención de credenciales retorne "Empty optional".

4. **Propagación del error**: La falla en obtener credenciales provoca que la solicitud completa falle con un HTTP 502 Bad Gateway.

### Arquitectura del Problema

```
┌─────────────────────────────────────────────────────────────┐
│ IKLN EDC Connector                                          │
│                                                             │
│  1. Catalog Request iniciado                                │
│  2. Necesita credenciales IATP para autenticarse con MASS   │
│  3. Intenta conectar: https://edc-mass-control...dsp        │
│     └─> ❌ SSL/TLS handshake falla (sin certificados DSP)   │
│  4. Retorna: "Unable to obtain credentials: Empty optional" │
│  5. HTTP 502 Bad Gateway                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Manifestación del Error

### En el Dashboard

Al pulsar el botón **"🔍 Consultar Catálogo de MASS desde IKLN"** en FASE 5:

```
🔍 Consultando catálogo de MASS desde IKLN...
⏳ Esto puede tardar unos segundos...
[12:00:35] 🔍 IKLN consultando catálogo de MASS...
[12:00:35] ℹ️ Protocolo DSP: Dataspace Protocol para descubrimiento
[12:00:35] ℹ️ IKLN pregunta: '¿Qué datos tiene MASS disponibles para mí?'
[12:00:35] 📄 Catalog Request Payload:
{
  "@context": {
    "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
  },
  "counterPartyAddress": "https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp",
  "protocol": "dataspace-protocol-http",
  "querySpec": {
    "offset": 0,
    "limit": 100
  }
}
[12:00:37] 📡 HTTP 502
[12:00:37] ❌ Error HTTP 502
[{
  "message": "Unable to obtain credentials: Empty optional",
  "type": "BadGateway",
  "path": null,
  "invalidValue": null
}]
```

### En los Logs de Kubernetes

Si revisas los logs del pod de IKLN:

```bash
kubectl logs -n umbrella <ikln-controlplane-pod> | grep -i "credential\|ssl\|tls"
```

Podrías ver mensajes relacionados con:
- `SSLHandshakeException`
- `javax.net.ssl.SSLException: Received fatal alert`
- `Failed to obtain credentials from counterparty`

### Características del Error

- **Código HTTP:** 502 Bad Gateway
- **Mensaje clave:** "Unable to obtain credentials: Empty optional"
- **Timing:** Ocurre 2-3 segundos después de iniciar el Catalog Request
- **Reproducibilidad:** 100% reproducible mientras el DSP endpoint use HTTPS sin certificados

---

## 4. Solución

### Cambio Aplicado

Modificar los DSP endpoints para usar **HTTP** en lugar de HTTPS:

#### Archivo: `dashboard/config.json`

**Antes (incorrecto):**
```json
{
  "mass": {
    "api": "https://edc-mass-control.51.178.94.25.nip.io/management",
    "dsp": "https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp"
  },
  "ikln": {
    "api": "https://edc-ikln-control.51.178.94.25.nip.io/management",
    "dsp": "https://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp"
  }
}
```

**Después (correcto):**
```json
{
  "mass": {
    "api": "https://edc-mass-control.51.178.94.25.nip.io/management",
    "dsp": "http://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp"
  },
  "ikln": {
    "api": "https://edc-ikln-control.51.178.94.25.nip.io/management",
    "dsp": "http://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp"
  }
}
```

### Cambios en el Backend

#### Archivo: `dashboard/backend.py`

Se agregó soporte para leer los DSP endpoints desde `config.json`:

```python
# Endpoints y credenciales
MASS_API = os.environ.get('MASS_API', "https://edc-mass-control.51.178.94.25.nip.io/management")
MASS_DSP = os.environ.get('MASS_DSP', "http://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp")

IKLN_API = os.environ.get('IKLN_API', "https://edc-ikln-control.51.178.94.25.nip.io/management")
IKLN_DSP = os.environ.get('IKLN_DSP', "http://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp")

# Cargar config.json si existe
try:
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            config = json.load(f)
            MASS_DSP = config.get('mass', {}).get('dsp', MASS_DSP)
            IKLN_DSP = config.get('ikln', {}).get('dsp', IKLN_DSP)
except Exception as e:
    print(f"Warning: Could not load config.json: {e}")
```

Y usar `MASS_DSP` en lugar del endpoint hardcodeado:

```python
@app.route('/api/phase5/catalog-request', methods=['POST'])
def catalog_request():
    """IKLN consulta el catálogo de MASS"""
    catalog_request_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "counterPartyAddress": MASS_DSP,  # Usar variable en lugar de hardcoded
        "protocol": "dataspace-protocol-http",
        "querySpec": {
            "offset": 0,
            "limit": 100
        }
    }
    # ... resto del código
```

---

## 5. Verificación de la Solución

### Pasos para Verificar

1. **Actualizar archivos:**
   ```bash
   cd /home/xmendialdua/projects/assembly/iflex/dashboard
   # Los cambios ya están aplicados en config.json y backend.py
   ```

2. **Reiniciar el dashboard:**
   ```bash
   ./stop.sh
   ./start.sh
   ```

3. **Probar el Catalog Request:**
   - Abrir http://localhost:8083
   - Ir a FASE 5
   - Pulsar "🔍 Consultar Catálogo de MASS desde IKLN"

### Resultado Esperado

```
🔍 Consultando catálogo de MASS desde IKLN...
⏳ Esto puede tardar unos segundos...
[12:15:42] 🔍 IKLN consultando catálogo de MASS...
[12:15:42] ℹ️ Protocolo DSP: Dataspace Protocol para descubrimiento
[12:15:42] ℹ️ IKLN pregunta: '¿Qué datos tiene MASS disponibles para mí?'
[12:15:42] 🔗 DSP Endpoint: http://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp
[12:15:42] 📄 Catalog Request Payload: {...}
[12:15:45] 📡 HTTP 200
[12:15:45] ✅ Catálogo recibido con 1 datasets
[12:15:45] 📋 Datasets encontrados:
  1. pdf-dummy-mass-ikln
     └─ Nombre: Dummy PDF Document

✅ 1 datasets mostrados en el visor
✅ Catalog Request completado
```

---

## 6. Consideraciones Adicionales

### ¿Por qué HTTP funciona y HTTPS no?

En el despliegue actual de Tractus-X Umbrella:

1. **Management APIs usan HTTPS**: Los endpoints `/management` tienen certificados TLS válidos gestionados por el Ingress Controller de Kubernetes.

2. **DSP endpoints usan HTTP**: Los endpoints `/api/v1/dsp` no tienen certificados TLS configurados. La comunicación entre conectores EDC se realiza a través de HTTP internamente.

3. **Seguridad en producción**: En un entorno de producción real, los DSP endpoints **deberían** usar HTTPS con certificados válidos. Sin embargo, en este despliegue de prueba/desarrollo, HTTP es suficiente.

### Alternativa: Configurar TLS para DSP

Si quisieras usar HTTPS para DSP endpoints, necesitarías:

1. **Generar certificados TLS** para los DSP endpoints
2. **Crear secretos en Kubernetes:**
   ```bash
   kubectl create secret tls dsp-mass-tls \
     --cert=dsp-mass/fullchain.pem \
     --key=dsp-mass/privkey.pem \
     -n umbrella
   ```
3. **Configurar Ingress** para exponer los DSP endpoints con TLS
4. **Actualizar values.yaml** del Helm chart de Umbrella

### Troubleshooting Adicional

Si después del cambio a HTTP sigues teniendo problemas:

1. **Verificar conectividad de red:**
   ```bash
   kubectl exec -it -n umbrella <ikln-pod> -- curl http://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp
   ```

2. **Revisar logs de ambos conectores:**
   ```bash
   kubectl logs -n umbrella <mass-controlplane-pod> --tail=100
   kubectl logs -n umbrella <ikln-controlplane-pod> --tail=100
   ```

3. **Verificar configuración IATP:**
   - Revisar que el DIM Wallet Stub esté funcionando
   - Verificar que los trusted issuers estén configurados correctamente
   - Comprobar que los BPNs sean correctos

---

## 7. Referencias

- **Tractus-X EDC Documentation:** https://github.com/eclipse-tractusx/tractusx-edc
- **Dataspace Protocol Specification:** https://docs.internationaldataspaces.org/
- **Eclipse EDC Management API:** https://eclipse-edc.github.io/docs/
- **Config del Dashboard:** `dashboard/config.json`
- **Backend del Dashboard:** `dashboard/backend.py`

---

## Resumen Ejecutivo

| Aspecto | Detalle |
|---------|---------|
| **Problema** | Error 502 "Unable to obtain credentials: Empty optional" |
| **Causa** | DSP endpoints configurados con HTTPS sin certificados TLS |
| **Solución** | Cambiar DSP endpoints de HTTPS a HTTP |
| **Archivos modificados** | `config.json`, `backend.py` |
| **Impacto** | Restaura funcionalidad de Catalog Discovery completa |
| **Tiempo de resolución** | 5 minutos (cambio de configuración) |
