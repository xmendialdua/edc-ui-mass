# Implementación Proxy SharePoint para EDC

**Fecha:** 28 de abril de 2026  
**Proyecto:** iFlex - POC Next  
**Estado:** ✅ Implementado y Listo para Configurar

---

## 📋 Resumen Ejecutivo

Se ha implementado un **proxy intermedio** que permite al EDC DataPlane descargar archivos de SharePoint sin necesidad de modificar los conectores EDC. El proxy resuelve el problema de autenticación OAuth 2.0 que el DataPlane no puede manejar nativamente.

### Problema Resuelto

Cuando se crea un asset con la **URL original de SharePoint**:
- ❌ El DataPlane intenta descargar directamente de SharePoint
- ❌ SharePoint requiere autenticación OAuth 2.0 (Bearer Token)
- ❌ El DataPlane NO tiene credenciales configuradas
- ❌ Resultado: HTTP 401/403 → El DataPlane devuelve HTTP 500

### Solución Implementada

```
┌─────────────────────────────────────────────────────────┐
│  EDC Consumer (IKLN)                                     │
│  └─ Solicita descarga                                   │
└─────────────────────────────────────────────────────────┘
                    ↓ EDR Token
┌─────────────────────────────────────────────────────────┐
│  EDC Provider DataPlane (MASS)                           │
│  └─ Descarga desde URL del asset                        │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  🆕 PROXY (Backend FastAPI - Puerto 5001)               │
│  ├─ Recibe petición del DataPlane                       │
│  ├─ Autentica con Azure AD (Service Principal)          │
│  ├─ Descarga de SharePoint con Bearer Token             │
│  └─ Sirve el archivo al DataPlane                       │
└─────────────────────────────────────────────────────────┘
                    ↓ OAuth 2.0
┌─────────────────────────────────────────────────────────┐
│  SharePoint Online                                       │
│  └─ Archivo real                                        │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Componentes Implementados

### 1. Backend - Módulo de Autenticación

**Archivo:** `src/poc_next/backend/sharepointGateway/SharePointAuth.py`

Gestiona la autenticación con Azure AD usando **Service Principal** (Client Credentials Flow):
- ✅ No requiere interacción de usuario
- ✅ Utiliza credenciales de aplicación (Client ID + Secret)
- ✅ Cache automático de tokens (MSAL)
- ✅ Renovación automática cuando expiran

**Características:**
- Autenticación OAuth 2.0 con Azure AD
- Flujo "Client Credentials" para acceso sin usuario
- Permisos de aplicación: `Files.Read.All`, `Sites.Read.All`
- Logging detallado para debugging

### 2. Backend - Router del Proxy

**Archivo:** `src/poc_next/backend/api/routes/sharepoint_proxy.py`

Endpoints REST que actúan como proxy:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/sharepoint-proxy/download/{encoded_file_info}` | GET | Descarga archivo de SharePoint |
| `/api/sharepoint-proxy/health` | GET | Health check del servicio |
| `/api/sharepoint-proxy/info` | GET | Información de configuración |

**Flujo de descarga:**
1. Recibe petición con `encoded_file_info` (base64 de `drive_id\|item_id`)
2. Decodifica y valida el identificador del archivo
3. Obtiene access token de Azure AD
4. Descarga el archivo desde SharePoint con el token
5. Obtiene metadatos (nombre, mime type, tamaño)
6. Sirve el archivo al cliente (DataPlane)

**Características:**
- Decodificación segura de identificadores
- Manejo robusto de errores
- Logging detallado de operaciones
- Headers HTTP apropiados (Content-Disposition, Content-Type, Content-Length)
- Singleton para el servicio de autenticación (eficiencia)

### 3. Backend - Registro en Main

**Archivo:** `src/poc_next/backend/main.py`

Router registrado con prefijo `/api`:
```python
from api.routes import sharepoint_proxy

app.include_router(sharepoint_proxy.router, prefix="/api")
```

### 4. Backend - Configuración

**Archivo:** `src/poc_next/backend/config.py`

Variables añadidas al modelo Settings:
```python
sharepoint_proxy_client_id: str | None = None
sharepoint_proxy_client_secret: str | None = None  
sharepoint_proxy_tenant_id: str | None = None
sharepoint_proxy_base_url: str = "http://localhost:5001"
```

### 5. Frontend - Generación de URL del Proxy

**Archivo:** `src/poc_next/frontend/components/phases/phase2-content.tsx`

Cuando el usuario crea un asset con SharePoint y **NO marca** el checkbox de link temporal:

```typescript
// Extraer drive_id e item_id
const [driveId, itemId] = item.id.split('|');

// Codificar en base64 URL-safe
const fileInfo = `${driveId}|${itemId}`;
const encoded = btoa(fileInfo);

// Generar URL del proxy
const proxyUrl = `${apiUrl}/api/sharepoint-proxy/download/${encoded}`;

// Usar esta URL como baseUrl del asset
setSharePointUrl(proxyUrl);
```

**Resultado:** El asset se crea con `baseUrl` apuntando al proxy, no a SharePoint directamente.

---

## 🔧 Configuración Requerida

### Paso 1: Configurar Azure AD Service Principal

#### 1.1. Crear App Registration

1. [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
2. Configuración:
   - **Name:** `EDC SharePoint Proxy Service`
   - **Supported account types:** Single tenant
   - **Redirect URI:** Dejar vacío
3. Click **Register**

#### 1.2. Anotar Credenciales

En la página Overview:
- **Application (client) ID:** Copiar
- **Directory (tenant) ID:** Copiar

#### 1.3. Crear Client Secret

1. **Certificates & secrets** → **New client secret**
2. **Description:** `EDC Proxy Secret`
3. **Expires:** 24 months (o máximo permitido)
4. Click **Add**
5. **⚠️ IMPORTANTE:** Copiar el **Value** inmediatamente (no se vuelve a mostrar)

#### 1.4. Configurar Permisos

1. **API permissions** → **Add a permission** → **Microsoft Graph**
2. Seleccionar **Application permissions** (NO Delegated)
3. Buscar y añadir:
   - `Files.Read.All` - Read files in all site collections
   - `Sites.Read.All` - Read items in all site collections
4. Click **Add permissions**

#### 1.5. Solicitar Admin Consent

**⚠️ CRÍTICO:** Los permisos de aplicación requieren consentimiento de administrador

1. En **API permissions**, click **Grant admin consent for [Tu Organización]**
2. Confirmar
3. Verificar check verde ✅ en columna "Status"

### Paso 2: Configurar Variables de Entorno

Editar `/src/poc_next/backend/.env`:

```bash
# --- SharePoint Proxy Configuration (for EDC Downloads) ---
SHAREPOINT_PROXY_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SHAREPOINT_PROXY_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxx
SHAREPOINT_PROXY_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SHAREPOINT_PROXY_BASE_URL=http://localhost:5001
```

**Reemplazar con:**
- Tu Application (client) ID
- Tu Client secret value
- Tu Directory (tenant) ID

### Paso 3: Instalar Dependencias

La dependencia `msal` ya está instalada. Si necesitas reinstalar:

```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next/backend
source venv/bin/activate
pip install msal
```

### Paso 4: Verificar Configuración

```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next/backend
source venv/bin/activate

# Test de importación
python -c "from api.routes import sharepoint_proxy; print('✅ OK')"

# Iniciar backend
python main.py
```

### Paso 5: Health Check

```bash
curl http://localhost:5001/api/sharepoint-proxy/health
```

**Respuesta esperada (si está configurado):**
```json
{
  "status": "healthy",
  "service": "SharePoint Proxy",
  "authentication": "OK",
  "message": "Service is operational",
  "version": "1.0.0"
}
```

**Respuesta si falta configuración:**
```json
{
  "status": "degraded",
  "service": "SharePoint Proxy",
  "authentication": "FAILED",
  "message": "Cannot obtain access token. Check Azure AD configuration.",
  "version": "1.0.0"
}
```

---

## 🚀 Uso del Proxy

### Crear Asset con Proxy

1. Abrir frontend: `http://localhost:3020`
2. Navegar a **FASE 2: Publicación del Asset**
3. Click **Crear Nuevo Asset**
4. Configuración:
   - **Nombre del Asset:** `ee-sharepoint-document`
   - **Tipo de Archivo:** `Documento de SharePoint`
   - **Archivo:** Seleccionar archivo desde SharePoint
   - **❌ DESMARCAR checkbox:** "Generar link temporal de descarga"
5. Click **Crear Asset**

**Resultado:**
- El asset se crea con `baseUrl` apuntando al proxy:
  ```
  http://localhost:5001/api/sharepoint-proxy/download/YjEhWHl6MTIz...
  ```
- Esta URL es **persistente** (no expira)

### Flujo de Transferencia EDC

1. **IKLN** solicita catálogo a **MASS**
2. **IKLN** inicia negociación para el asset
3. Negociación completada → Contract Agreement
4. **IKLN** inicia transferencia
5. **MASS DataPlane** descarga desde la URL del asset:
   - URL apunta al proxy: `http://localhost:5001/api/sharepoint-proxy/download/...`
   - Proxy autentica con Azure AD
   - Proxy descarga de SharePoint
   - Proxy sirve el archivo al DataPlane
6. **DataPlane** entrega el archivo a **IKLN**
7. ✅ Descarga exitosa

---

## 🔍 Verificación y Debugging

### Logs del Proxy

Al descargar un archivo, verás en los logs del backend:

```
📥 Proxy download request:
   Drive ID: b!Xyz123...
   Item ID: 01ABCDEF...
🔐 Obtaining access token from Azure AD...
✅ Access token obtained successfully
📥 Downloading file from SharePoint...
✅ File downloaded successfully:
   Filename: Document.docx
   Size: 45,678 bytes (44.6 KB)
   MIME type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

### Errores Comunes

#### 1. "Failed to authenticate with SharePoint"

**Causa:** Credenciales incorrectas o Admin Consent no otorgado

**Solución:**
- Verificar `SHAREPOINT_PROXY_CLIENT_ID`, `SHAREPOINT_PROXY_CLIENT_SECRET`, `SHAREPOINT_PROXY_TENANT_ID`
- Verificar Admin Consent en Azure AD
- Verificar permisos: `Files.Read.All`, `Sites.Read.All` (Application)

#### 2. "Invalid file identifier format"

**Causa:** El `encoded_file_info` no es válido

**Solución:**
- Recrear el asset desde el frontend
- Verificar que el formato es `drive_id|item_id` codificado en base64

#### 3. HTTP 500 en transferencia EDC

**Causa:** El DataPlane no puede alcanzar el proxy

**Solución:**
- Verificar que `SHAREPOINT_PROXY_BASE_URL` es accesible desde el DataPlane
- En desarrollo: `http://localhost:5001`
- En producción: URL pública accesible desde el cluster Kubernetes

#### 4. "Token may have expired or lacks permissions"

**Causa:** El Service Principal no tiene permisos suficientes

**Solución:**
- Verificar que los permisos son **Application** (no Delegated)
- Verificar Admin Consent otorgado
- Esperar hasta 5 minutos para propagación de permisos

---

## 📊 Comparativa de Soluciones

| Característica | Link Temporal | URL Original (Proxy) |
|----------------|---------------|----------------------|
| **Expira** | ✅ Sí (1 hora) | ❌ No |
| **Válido producción** | ❌ No | ✅ Sí |
| **Requiere proxy** | ❌ No | ✅ Sí |
| **Autenticación** | Pre-autenticado en URL | Service Principal |
| **Complejidad** | Baja | Media |
| **Mantenimiento** | Recrear assets periódicamente | Una vez configurado |
| **Seguridad** | Token embebido en URL | Credenciales centralizadas |
| **Rendimiento** | Directo a SharePoint | A través del proxy |

---

## 🏗️ Despliegue en Producción

### Kubernetes - Exponer Proxy

El proxy debe ser accesible desde los pods del EDC DataPlane.

#### Opción A: Ingress (Recomendado)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sharepoint-proxy-ingress
  namespace: umbrella
spec:
  rules:
    - host: sharepoint-proxy.51.178.94.25.nip.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend-service
                port:
                  number: 5001
```

#### Opción B: NodePort (Desarrollo)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: sharepoint-proxy
  namespace: umbrella
spec:
  type: NodePort
  ports:
    - port: 5001
      targetPort: 5001
      nodePort: 30501
  selector:
    app: backend-app
```

### Actualizar Variable de Entorno

En producción:
```bash
SHAREPOINT_PROXY_BASE_URL=https://sharepoint-proxy.51.178.94.25.nip.io
```

### Test desde DataPlane Pod

```bash
kubectl exec -it <edc-dataplane-pod> -n umbrella -- \
  curl http://sharepoint-proxy:5001/api/sharepoint-proxy/health
```

---

## 📝 Archivos Modificados/Creados

### Creados

1. `src/poc_next/backend/sharepointGateway/SharePointAuth.py` - Módulo de autenticación
2. `src/poc_next/backend/api/routes/sharepoint_proxy.py` - Router del proxy
3. `PROXY_SHAREPOINT_IMPLEMENTACION.md` - Esta documentación

### Modificados

1. `src/poc_next/backend/main.py` - Registro del router
2. `src/poc_next/backend/config.py` - Variables de configuración
3. `src/poc_next/backend/.env` - Variables de entorno
4. `src/poc_next/backend/.env.example` - Template de variables
5. `src/poc_next/frontend/components/phases/phase2-content.tsx` - Generación de URL del proxy

---

## 🔐 Consideraciones de Seguridad

1. **Client Secret:**
   - ⚠️ Mantener seguro, no commitear en Git
   - Usar secret management en producción (Azure Key Vault, Kubernetes Secrets)

2. **Permisos mínimos:**
   - El Service Principal solo tiene permisos de lectura
   - No puede modificar ni eliminar archivos

3. **Rate limiting:**
   - Considerar implementar en producción para evitar abuso

4. **Logging:**
   - Los logs no incluyen tokens completos (solo previews)
   - No se registran credenciales

5. **HTTPS:**
   - Usar HTTPS en producción
   - Configurar certificados TLS en Ingress

---

## ✅ Próximos Pasos

1. **Configurar Azure AD:**
   - [ ] Crear App Registration
   - [ ] Generar Client Secret
   - [ ] Configurar permisos de aplicación
   - [ ] Solicitar Admin Consent

2. **Configurar Backend:**
   - [ ] Actualizar variables en `.env`
   - [ ] Verificar health check del proxy

3. **Testing:**
   - [ ] Crear asset con proxy (checkbox desmarcado)
   - [ ] Iniciar transferencia EDC desde IKLN
   - [ ] Verificar descarga exitosa
   - [ ] Revisar logs del proxy

4. **Producción:**
   - [ ] Configurar Ingress para exponer proxy
   - [ ] Actualizar `SHAREPOINT_PROXY_BASE_URL`
   - [ ] Configurar secrets en Kubernetes
   - [ ] Implementar monitoring y alertas

---

## 📞 Soporte

Para problemas o preguntas:
- Revisar logs del backend: `tail -f src/poc_next/backend/logs.txt`
- Health check: `curl http://localhost:5001/api/sharepoint-proxy/health`
- Info: `curl http://localhost:5001/api/sharepoint-proxy/info`

---

**Implementado:** 28 de abril de 2026  
**Versión:** 1.0.0  
**Estado:** ✅ Listo para Configurar y Usar
