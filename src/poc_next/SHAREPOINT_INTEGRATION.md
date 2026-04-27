# Integración SharePoint Gateway

Este documento describe cómo usar la integración de SharePoint Gateway en el proyecto POC Next.

## Descripción

Se ha integrado un gateway completo para acceder a SharePoint a través de la Microsoft Graph API. Esta integración permite:

- Listar archivos y carpetas de SharePoint
- Navegar por la estructura de directorios
- Descargar archivos
- Acceder tanto por Drive ID como por URL del site

## Arquitectura

```
Frontend (Next.js) → Backend (FastAPI) → SharePointGateway → Microsoft Graph API
```

### Componentes

#### Backend (`/backend`)

1. **`sharepointGateway/SharePointGateway.py`**: Clase principal que encapsula la lógica de Microsoft Graph API
2. **`api/routes/sharepoint.py`**: Router de FastAPI con endpoints REST
3. **`main.py`**: Actualizado para incluir el router de SharePoint

#### Frontend (`/frontend`)

1. **`lib/api.ts`**: Extendido con funciones cliente para SharePoint
2. **`app/sharepoint_data/page.tsx`**: Nueva página para explorar archivos de SharePoint

## Configuración

### 1. Obtener credenciales de Azure AD

Para usar esta funcionalidad, necesitas:

1. **Registrar una aplicación en Azure AD**:
   - Ve a [Azure Portal](https://portal.azure.com)
   - Navega a "Azure Active Directory" > "App registrations" > "New registration"
   - Registra tu aplicación

2. **Configurar permisos de API**:
   - En tu aplicación, ve a "API permissions"
   - Añade permisos de Microsoft Graph:
     - `Sites.Read.All` (para acceder a sites de SharePoint)
     - `Files.Read.All` (para leer archivos)
   - Solicita consentimiento de administrador

3. **Obtener un Access Token**:
   ```bash
   # Método 1: Usando Azure CLI
   az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv
   
   # Método 2: OAuth 2.0 Flow (recomendado para producción)
   # Implementa el flujo OAuth 2.0 en tu aplicación
   ```

### 2. Variables de entorno (Backend)

Edita el archivo `.env` en `/backend`:

```bash
# SharePoint Configuration (opcional)
SHAREPOINT_DRIVE_ID=your-sharepoint-drive-id-here
```

**Nota**: El `SHAREPOINT_DRIVE_ID` es opcional. Si se configura, se usará como default. También puedes acceder por URL del site directamente desde la UI.

### 3. Obtener el Drive ID (opcional)

Si quieres usar un Drive ID específico:

```bash
# Usando Microsoft Graph Explorer o cURL
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://graph.microsoft.com/v1.0/sites/YOUR_SITE_ID/drives"
```

## Uso

### 1. Iniciar los servicios

```bash
# Backend
cd src/poc_next/backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 5001

# Frontend (en otra terminal)
cd src/poc_next/frontend
npm install
npm run dev
```

### 2. Acceder a la interfaz

Navega a: `http://localhost:3001/sharepoint_data`

### 3. Configurar acceso

1. **Introduce tu Access Token**: Pega el token de Azure AD que obtuviste
2. **SharePoint Site URL (opcional)**: 
   - Formato: `https://your-company.sharepoint.com/sites/your-site`
   - Si no se especifica, usa el `SHAREPOINT_DRIVE_ID` del backend
3. Click en **"Verificar Conexión"** para testear
4. Click en **"Guardar Credenciales"** para guardar en localStorage
5. Click en **"Cargar Archivos"** para listar los documentos

### 4. Navegar y descargar

- **Carpetas**: Click en una fila de carpeta para abrirla
- **Archivos**: Click en el botón "Descargar" para descargar el archivo
- **Breadcrumb**: Usa el botón "← Volver" para subir un nivel

## API Endpoints

### Backend (FastAPI)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/sharepoint/health` | Health check del servicio |
| GET | `/api/sharepoint/files` | Listar archivos por Drive ID |
| GET | `/api/sharepoint/files/by-site-url` | Listar archivos por URL del site |
| GET | `/api/sharepoint/download/{file_id}` | Descargar archivo |
| GET | `/api/sharepoint/file/{file_id}/metadata` | Obtener metadatos |

**Autenticación**: Todos los endpoints requieren el header:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Frontend (TypeScript/React)

```typescript
import { api } from '@/lib/api';

// Listar archivos
const response = await api.sharepoint.listFiles(accessToken, driveId?, folderId?);

// Listar por URL del site
const response = await api.sharepoint.listFilesBySiteUrl(accessToken, siteUrl, folderPath?);

// Descargar archivo
const { blob, filename } = await api.sharepoint.downloadFile(accessToken, fileId, driveId?);
```

## Características

✅ **Navegación de carpetas**: Explora la estructura completa de directorios  
✅ **Descarga de archivos**: Descarga directa desde SharePoint  
✅ **Múltiples métodos de acceso**: Por Drive ID o Site URL  
✅ **Persistencia de credenciales**: Guarda el token en localStorage  
✅ **Estado de conexión**: Indicadores visuales del estado  
✅ **Manejo de errores**: Mensajes claros de error  
✅ **Formato de archivos**: Muestra tamaño y fecha de modificación  

## Próximos pasos

En futuras iteraciones, se integrará esta funcionalidad con el módulo de `data-publication` para:

- Publicar archivos de SharePoint como assets en EDC
- Crear contratos automáticos para documentos
- Sincronización bidireccional de metadatos

## Seguridad

⚠️ **Importante**: 
- Los tokens de acceso tienen tiempo de expiración (típicamente 1 hora)
- No compartas tokens en repositorios públicos
- En producción, implementa un flujo OAuth completo
- Considera usar Azure Key Vault para almacenar secretos

## Troubleshooting

### Error: "Authorization header is required"
- Asegúrate de introducir un token válido en la UI

### Error: "Failed to list files"
- Verifica que el token tenga los permisos correctos
- Comprueba que el token no haya expirado
- Revisa que el `SHAREPOINT_DRIVE_ID` sea correcto (si lo usas)

### Error: "Invalid authorization format"
- El backend espera el formato: `Bearer TOKEN`
- La UI añade el prefijo automáticamente

### Los archivos no se muestran
- Verifica la conexión con el botón "Verificar Conexión"
- Comprueba los logs del backend en la terminal
- Asegúrate de tener permisos de lectura en SharePoint

## Referencias

- [Microsoft Graph API - SharePoint](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint)
- [Microsoft Graph API - Files](https://learn.microsoft.com/en-us/graph/api/resources/onedrive)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
