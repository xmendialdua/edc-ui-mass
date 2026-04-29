# Configuración Proxy SharePoint - Usando Mismo Client ID

**Fecha:** 28 de abril de 2026  
**Método:** Reutilizar Client ID existente del frontend  
**Complejidad:** ⭐ Baja (más simple)

---

## 🎯 Objetivo

Configurar el proxy de SharePoint para EDC reutilizando el **mismo Client ID** que ya usas en el frontend. Esto simplifica la configuración y gestión.

**Tu Client ID actual:** `a1fc2076-f046-4a0f-90e7-4601aeb5b856`

---

## ✅ Ventajas de Esta Configuración

- 🔹 **Una sola aplicación** en Azure AD que gestionar
- 🔹 Ya tienes **Admin Consent** parcial (permisos Delegated)
- 🔹 **Menos complejidad** de configuración
- 🔹 Ideal para **desarrollo y POC**

---

## 📋 Pasos de Configuración (5 minutos)

### Paso 1: Añadir Client Secret en Azure AD

Tu aplicación actual es de tipo **SPA** (Single Page Application) y no tiene Client Secret. Necesitas añadir uno:

1. **Azure Portal**: https://portal.azure.com
2. **Azure Active Directory** → **App registrations**
3. Buscar tu aplicación: `a1fc2076-f046-4a0f-90e7-4601aeb5b856`
4. Click en la aplicación para abrir detalles

5. **Certificates & secrets** (menú lateral izquierdo)
6. Tab **Client secrets** → Click **+ New client secret**

7. Configurar:
   - **Description:** `Backend Proxy Secret`
   - **Expires:** `24 months` (o el máximo disponible)

8. Click **Add**

9. **⚠️ MUY IMPORTANTE:** 
   - Aparecerá el **Value** del secret
   - **COPIA ESTE VALOR INMEDIATAMENTE**
   - No se volverá a mostrar
   - Guárdalo de forma segura (usarás en `.env`)

---

### Paso 2: Añadir Permisos de Application

Tu app actualmente tiene permisos **Delegated** (para usuarios). Necesitas añadir permisos **Application** (para el proxy):

1. En la misma aplicación, ir a **API permissions** (menú lateral)

2. Click **+ Add a permission**

3. Seleccionar **Microsoft Graph**

4. Seleccionar **Application permissions** (NO Delegated)
   - ⚠️ Asegúrate de estar en tab "Application permissions"

5. Buscar y marcar:
   - ✅ `Files.Read.All` - Read files in all site collections
   - ✅ `Sites.Read.All` - Read items in all site collections

6. Click **Add permissions**

7. **⚠️ CRÍTICO - Grant Admin Consent:**
   - Verás las nuevas permissions en la lista
   - Click **"Grant admin consent for [Tu Organización]"** (botón azul arriba)
   - Confirmar en el popup
   - **Esperar** a que aparezca check verde ✅ en columna "Status"

**Estado final esperado en API permissions:**

| API / Permissions name | Type | Status |
|------------------------|------|--------|
| Microsoft Graph - Files.Read.All | Delegated | ✅ Granted |
| Microsoft Graph - Sites.Read.All | Delegated | ✅ Granted |
| Microsoft Graph - User.Read | Delegated | ✅ Granted |
| **Microsoft Graph - Files.Read.All** | **Application** | ✅ **Granted** |
| **Microsoft Graph - Sites.Read.All** | **Application** | ✅ **Granted** |

---

### Paso 3: Actualizar Variables en Backend

Editar archivo: `src/poc_next/backend/.env`

```bash
# --- SharePoint Proxy Configuration (for EDC Downloads) ---
SHAREPOINT_PROXY_CLIENT_ID=a1fc2076-f046-4a0f-90e7-4601aeb5b856
SHAREPOINT_PROXY_CLIENT_SECRET=<pegar-el-secret-copiado-en-paso-1>
SHAREPOINT_PROXY_TENANT_ID=910ac815-f855-4a08-bf29-90b46552cf11
SHAREPOINT_PROXY_BASE_URL=http://localhost:5001
```

**Reemplazar:**
- `SHAREPOINT_PROXY_CLIENT_SECRET`: Pegar el Value del secret que copiaste

**Ya están configurados:**
- ✅ `CLIENT_ID`: Ya está el mismo del frontend
- ✅ `TENANT_ID`: Ya está el mismo del frontend
- ✅ `BASE_URL`: Por defecto localhost:5001

---

### Paso 4: Verificar Configuración

```bash
cd /home/xmendialdua/projects/assembly/iflex/src/poc_next/backend
source venv/bin/activate
python main.py
```

**Logs esperados al iniciar:**
```
✅ SharePoint Auth Service initialized for tenant: 910ac815...
🚀 POC Next Backend API started
```

**En otra terminal, hacer health check:**
```bash
curl http://localhost:5001/api/sharepoint-proxy/health
```

**Respuesta esperada (si configuración es correcta):**
```json
{
  "status": "healthy",
  "service": "SharePoint Proxy",
  "authentication": "OK",
  "message": "Service is operational",
  "version": "1.0.0"
}
```

**Si respuesta es "degraded":**
```json
{
  "status": "degraded",
  "authentication": "FAILED",
  "message": "Cannot obtain access token. Check Azure AD configuration."
}
```

**→ Verificar:**
- Client Secret correcto en `.env`
- Admin Consent otorgado (check verde ✅)
- Permisos Application configurados (no solo Delegated)

---

### Paso 5: Crear Asset con Proxy

1. Abrir frontend: http://localhost:3020

2. **FASE 2: Publicación del Asset**

3. Click **"Crear Nuevo Asset"**

4. Configurar:
   - **Nombre:** `test-sharepoint-proxy`
   - **Tipo de Archivo:** `Documento de SharePoint`
   - Seleccionar un archivo de SharePoint
   - **❌ DESMARCAR checkbox:** "Generar link temporal de descarga"
     - Esto hará que use el proxy en lugar del link temporal

5. Click **"Crear Asset"**

**Logs esperados en el navegador (consola):**
```
🔗 Generando URL de proxy para: Document.docx
📍 Drive ID: b!Xyz123...
📍 Item ID: 01ABCDEF...
📍 URL proxy: http://localhost:5001/api/sharepoint-proxy/download/YjEh...
✅ URL del proxy configurada (persistente para producción)
```

**Verificación:**
- El asset debe crearse correctamente
- La URL base debe ser del proxy: `http://localhost:5001/api/sharepoint-proxy/download/...`
- NO debe ser de SharePoint directo

---

### Paso 6: Probar Transferencia EDC

1. **IKLN** → Listar catálogo de **MASS**

2. Seleccionar el asset `test-sharepoint-proxy`

3. Iniciar **negociación**

4. Esperar a que complete (Status: FINALIZED)

5. Iniciar **transferencia**

6. Click **"Descargar Archivo"**

**Logs esperados en backend:**
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

**Resultado:**
- ✅ Archivo descargado exitosamente
- ✅ Sin errores HTTP 500
- ✅ El proxy funcionó correctamente

---

## 🔍 Troubleshooting

### Error: "Failed to authenticate with SharePoint"

**Causa:** Client Secret incorrecto o permisos faltantes

**Solución:**
1. Verificar que el secret en `.env` es correcto
2. Generar un nuevo secret si es necesario
3. Verificar permisos **Application** (no Delegated)
4. Verificar Admin Consent otorgado

### Error: "Cannot obtain access token"

**Causa:** Admin Consent no otorgado para permisos Application

**Solución:**
1. Azure Portal → Tu app → API permissions
2. Verificar checks verdes ✅ en permisos Application
3. Si no están verdes, click "Grant admin consent"
4. Esperar 5 minutos para propagación

### Error: "Missing SharePoint proxy credentials"

**Causa:** Variables no configuradas en `.env`

**Solución:**
1. Verificar que `.env` tiene las 3 variables
2. Reiniciar backend: `Ctrl+C` y `python main.py`

### Error: HTTP 401/403 al descargar

**Causa:** El Service Principal no tiene acceso al archivo

**Solución:**
1. Verificar permisos Application: Files.Read.All, Sites.Read.All
2. Verificar Admin Consent
3. Esperar propagación (hasta 5 minutos)

---

## 📊 Resumen de Tu Configuración

```
┌─────────────────────────────────────────────────────────┐
│ APLICACIÓN AZURE AD (Una sola para ambos)              │
├─────────────────────────────────────────────────────────┤
│ Client ID: a1fc2076-f046-4a0f-90e7-4601aeb5b856        │
│ Tenant ID: 910ac815-f855-4a08-bf29-90b46552cf11        │
│ Client Secret: [Generado en Paso 1]                    │
│                                                         │
│ Permisos Delegated (para Frontend):                    │
│   ✅ User.Read                                          │
│   ✅ Files.Read.All                                     │
│   ✅ Sites.Read.All                                     │
│                                                         │
│ Permisos Application (para Proxy):                     │
│   ✅ Files.Read.All                                     │
│   ✅ Sites.Read.All                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ USO                                                     │
├─────────────────────────────────────────────────────────┤
│ Frontend (Usuario navega SharePoint):                  │
│   → Usa permisos Delegated                             │
│   → Login con popup                                     │
│   → Token del usuario                                   │
│                                                         │
│ Backend Proxy (EDC descarga automático):               │
│   → Usa permisos Application                           │
│   → Sin usuario (Service Principal)                    │
│   → Token de aplicación                                │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Configuración

- [ ] **Paso 1:** Client Secret generado en Azure AD
- [ ] **Paso 2:** Permisos Application añadidos (Files.Read.All, Sites.Read.All)
- [ ] **Paso 2:** Admin Consent otorgado (checks verdes ✅)
- [ ] **Paso 3:** Variables actualizadas en `backend/.env`
- [ ] **Paso 4:** Health check exitoso (`"status": "healthy"`)
- [ ] **Paso 5:** Asset creado con URL del proxy
- [ ] **Paso 6:** Transferencia EDC completada sin errores

---

## 🎉 Resultado Final

**Checkbox MARCADO** (Link Temporal):
```
Asset URL → https://graph.microsoft.com/v1.0/drives/.../content?...
           (Expira en 1 hora, solo para pruebas)
```

**Checkbox DESMARCADO** (Proxy):
```
Asset URL → http://localhost:5001/api/sharepoint-proxy/download/YjEh...
           (Persistente, válido para producción)
```

**Ambos usan la misma aplicación de Azure AD** ✅

---

**Configuración completada:** 28 de abril de 2026  
**Estado:** ✅ Listo para usar

