# Sistema de Autenticación Multi-Partner - iFlex Tractus-X

**Fecha**: 21 de mayo de 2026  
**Proyecto**: iFlex - Eclipse Tractus-X Data Space  
**Branch**: `feature/multiple-partners`

---

## 📋 Resumen de Cambios

Se ha implementado un sistema de autenticación multi-partner que permite a diferentes partners del espacio de datos Tractus-X acceder a sus respectivos conectores EDC a través de la aplicación `src/poc_next`.

### Antes

- La aplicación estaba hardcodeada para un único partner (Ikerlan - IKLN)
- Acceso directo a `https://ds-management.51.178.94.25.nip.io/partner-data`
- BPN y Management URL hardcodeados en el código

### Después

- Sistema de login multi-partner
- Lista de partners obtenida dinámicamente de la base de datos del portal
- Cada partner ve su propio BPN y Management URL
- Autenticación con email y password (password "1234" en esta iteración)

---

## 🏗️ Arquitectura de la Solución

### Backend (Python/FastAPI)

#### Nueva Ruta: `/api/partners`

**Archivo**: `src/poc_next/backend/api/routes/partners.py`

**Endpoints implementados**:

1. **GET `/api/partners/list`**
   - Obtiene lista de todos los partners registrados
   - Consulta la base de datos del portal (`portal.companies`, `portal.company_users`)
   - Retorna: email, nombre, BPN de cada partner

2. **POST `/api/partners/login`**
   - Valida credenciales del partner
   - Password hardcoded: `"1234"` (en esta iteración)
   - Retorna información del partner si login exitoso

3. **GET `/api/partners/{email}/details`**
   - Obtiene detalles completos del partner incluyendo conector
   - Incluye: BPN, Management URL, DSP URL
   - Convierte DSP URL a Management URL automáticamente

#### Conexión a Base de Datos del Portal

**Configuración**:
```python
PORTAL_DB_CONFIG = {
    "host": "portal-portal-backend-postgresql.portal.svc.cluster.local",
    "port": 5432,
    "database": "postgres",
    "user": "portal",
    "password": "dbpasswordportal"
}
```

**Esquema de Datos Utilizado**:
- `portal.companies` - Compañías con BPN
- `portal.connectors` - Conectores EDC con URLs
- `portal.identities` - Identidades de usuarios
- `portal.company_users` - Información de usuarios (email, nombre)

**Query SQL de Ejemplo**:
```sql
SELECT 
    cu.email,
    cu.firstname,
    cu.lastname,
    c.name as company_name,
    c.business_partner_number as bpn,
    con.connector_url as dsp_url
FROM portal.company_users cu
JOIN portal.identities i ON cu.id = i.id
JOIN portal.companies c ON i.company_id = c.id
LEFT JOIN portal.connectors con ON con.provider_id = c.id
WHERE LOWER(cu.email) = LOWER($1)
```

#### Nueva Dependencia

**Archivo**: `src/poc_next/backend/requirements.txt`

```python
# PostgreSQL async driver (for portal database connection)
asyncpg==0.30.0
```

---

### Frontend (Next.js/TypeScript)

#### Nueva Página: `/partner-login`

**Archivo**: `src/poc_next/frontend/app/partner-login/page.tsx`

**Funcionalidades**:
- Selector dropdown con lista de partners
- Campo de password
- Muestra información del partner seleccionado (BPN, compañía)
- Validación de credenciales
- Almacena partner autenticado en `sessionStorage`
- Redirección a `/partner-data` después del login exitoso

**Screenshot UI**:
```
┌─────────────────────────────────────────┐
│     [Logo Mondragon Assembly]          │
│        Partner Login                    │
│     Tractus-X Data Space               │
├─────────────────────────────────────────┤
│                                         │
│ 👤 Selecciona Partner                   │
│ ┌─────────────────────────────────────┐ │
│ │ dataspace@ikerlan.es (Ikerlan)    ▼│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Compañía: Ikerlan                      │
│ Nombre: Ikerlan S. Coop.               │
│ BPN: BPNL00000002IKLN                  │
│                                         │
│ 🔒 Contraseña                          │
│ ┌─────────────────────────────────────┐ │
│ │ ••••                                 │ │
│ └─────────────────────────────────────┘ │
│ Contraseña por defecto: 1234           │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │      Iniciar Sesión                  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### Página Actualizada: `/partner-data`

**Archivo**: `src/poc_next/frontend/app/partner-data/page.tsx`

**Cambios principales**:

1. **Verificación de Autenticación**:
   ```typescript
   const checkAuthentication = async () => {
     const partnerJson = sessionStorage.getItem('authenticated_partner');
     if (!partnerJson) {
       router.push('/partner-login'); // Redirige a login
       return;
     }
     // Fetch partner details...
   }
   ```

2. **Obtención de Detalles del Partner**:
   ```typescript
   const fetchPartnerDetails = async (email: string) => {
     const response = await fetch(
       `${apiUrl}/api/partners/${encodeURIComponent(email)}/details`
     );
     const details = await response.json();
     setPartnerDetails(details);
   }
   ```

3. **UI Personalizada**:
   - Muestra nombre y email del partner autenticado
   - Botón "Cerrar Sesión"
   - BPN dinámico del partner
   - Management URL dinámico del conector del partner

**Header Personalizado**:
```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo] Partner Data Access Dashboard                                 │
│        👤 Ikerlan S. Coop. (dataspace@ikerlan.es) [Cerrar Sesión]   │
│                                                                       │
│                   ┌──────────────────────────────────────────────┐   │
│                   │ Ikerlan Connector: BPNL00000002IKLN          │   │
│                   │ ● Conectado                                   │   │
│                   │ Management API: https://edc-ikln-control... │   │
│                   └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

4. **Loading State**:
   - Muestra spinner mientras carga información del partner
   - Evita mostrar datos hasta que la autenticación esté verificada

---

## 📦 Archivos Modificados

### Backend

1. **`backend/api/routes/partners.py`** *(NUEVO)*
   - Lógica de autenticación y consulta de partners
   - Conexión a base de datos del portal
   - 3 endpoints REST

2. **`backend/api/routes/__init__.py`**
   - Exportación del nuevo `partners_router`

3. **`backend/main.py`**
   - Registro del router `partners_router` en la aplicación FastAPI

4. **`backend/requirements.txt`**
   - Añadida dependencia `asyncpg==0.30.0`

### Frontend

5. **`frontend/app/partner-login/page.tsx`** *(NUEVO)*
   - Página completa de login
   - ~350 líneas de código

6. **`frontend/app/partner-data/page.tsx`**
   - Añadida lógica de autenticación
   - UI personalizada por partner
   - Manejo de sesión con `sessionStorage`
   - Botón de logout

### Documentación

7. **`IMPLEMENTACION_MULTI_PARTNER.md`** *(ESTE ARCHIVO)*
   - Documentación completa de la implementación

---

## 🔑 Partners Registrados en el Portal

Actualmente hay 2 partners principales para testing:

| Partner | Email | BPN | Conector DSP | Management URL |
|---------|-------|-----|--------------|----------------|
| **Ikerlan** | `dataspace@ikerlan.es` | `BPNL00000002IKLN` | `https://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp` | `https://edc-ikln-control.51.178.94.25.nip.io/management` |
| **Mondragon Assembly (MASS)** | `dataspace@mondragon-assembly.com` | `BPNL00000000MASS` | `https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp` | `https://edc-mass-control.51.178.94.25.nip.io/management` |

**Credenciales de Login**:
- Email: Cualquiera de los emails arriba
- Password: `1234` (hardcoded en esta iteración)

---

## 🚀 Flujo de Usuario

### 1. Acceso a Partner Data

```
Usuario → https://ds-management.51.178.94.25.nip.io/partner-data
         ↓
    ¿Authenticated?
         ↓ NO
    Redirect → /partner-login
```

### 2. Login

```
/partner-login
    ↓
Fetch partners list ← GET /api/partners/list
    ↓
Usuario selecciona partner y introduce password
    ↓
POST /api/partners/login
    ↓
Backend valida (password === "1234")
    ↓
Retorna partner info
    ↓
Frontend almacena en sessionStorage
    ↓
Redirect → /partner-data
```

### 3. Partner Data Dashboard

```
/partner-data
    ↓
Verifica sessionStorage
    ↓
GET /api/partners/{email}/details
    ↓
Carga detalles completos (BPN, Management URL)
    ↓
Muestra UI personalizada con:
  - Nombre del partner
  - BPN del partner
  - URL del conector del partner
```

### 4. Logout

```
Usuario click "Cerrar Sesión"
    ↓
sessionStorage.removeItem('authenticated_partner')
    ↓
Redirect → /partner-login
```

---

## 🔧 Conversión DSP URL → Management URL

La base de datos del portal almacena las URLs DSP de los conectores. El backend convierte automáticamente:

```python
def convert_dsp_to_management_url(dsp_url: str) -> str:
    """
    Input:  https://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp
    Output: https://edc-ikln-control.51.178.94.25.nip.io/management
    """
    base_url = dsp_url.replace("/api/v1/dsp", "")
    return f"{base_url}/management"
```

---

## ⚠️ Limitaciones Actuales

### 1. Password Hardcoded

**Estado actual**: Todos los partners usan password `"1234"`

**Razón**: Primera iteración - simplificar implementación

**Mejora futura**: Integrar con Keycloak/IAM del portal para validación real

```python
# Ubicación: backend/api/routes/partners.py
PARTNERS_PASSWORD = "1234"
```

### 2. Lógica de Conectores No Dinámica

**Estado actual**: Los componentes Phase5Content, NegotiationsContent, etc. siguen usando las configuraciones hardcodeadas de `config.py` (IKLN/MASS)

**Impacto**: La UI muestra el BPN y Management URL correctos del partner autenticado, pero las operaciones de catálogo/negociación/transferencias todavía usan el conector IKLN por defecto

**Razón**: Evitar refactorización masiva de componentes existentes en esta primera iteración

**Mejora futura**: Pasar BPN y Management URL del partner autenticado como props a los componentes y actualizar las llamadas API para usar el conector dinámico

### 3. Almacenamiento en sessionStorage

**Estado actual**: Información del partner se almacena en `sessionStorage`

**Impacto**: Se pierde al cerrar el navegador (comportamiento esperado)

**Alternativa considerada**: `localStorage` (persiste entre sesiones)

**Decisión**: sessionStorage es apropiado para seguridad - requiere re-autenticación en cada sesión del navegador

---

## 🧪 Testing

### Manual Testing - Localhost

1. **Iniciar Backend**:
   ```bash
   cd src/poc_next/backend
   pip install -r requirements.txt  # Instala asyncpg
   python -m uvicorn main:app --reload --port 5001
   ```

2. **Iniciar Frontend**:
   ```bash
   cd src/poc_next/frontend
   npm install
   npm run dev
   ```

3. **Probar Login**:
   - Navegar a `http://localhost:3020/partner-login`
   - Seleccionar partner: `dataspace@ikerlan.es`
   - Password: `1234`
   - Click "Iniciar Sesión"
   - Verificar redirección a `/partner-data`
   - Verificar que muestra BPN: `BPNL00000002IKLN`

4. **Probar Logout**:
   - Click "Cerrar Sesión"
   - Verificar redirección a `/partner-login`

5. **Probar Segundo Partner**:
   - Login con `dataspace@mondragon-assembly.com`
   - Password: `1234`
   - Verificar BPN: `BPNL00000000MASS`

### Endpoints Testing

```bash
# 1. Lista de partners
curl http://localhost:5001/api/partners/list

# 2. Login
curl -X POST http://localhost:5001/api/partners/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dataspace@ikerlan.es", "password": "1234"}'

# 3. Detalles de partner
curl http://localhost:5001/api/partners/dataspace@ikerlan.es/details
```

---

## 📝 Próximos Pasos (Mejoras Futuras)

### Iteración 2: Autenticación Real con Keycloak

- [ ] Integrar con Keycloak del portal
- [ ] Validar passwords reales (eliminar hardcoded "1234")
- [ ] Obtener tokens JWT
- [ ] Implementar refresh tokens

### Iteración 3: Conectores Dinámicos

- [ ] Refactorizar componentes Phase5Content, Phase6Content, etc.
- [ ] Pasar `partnerBpn` y `managementUrl` como props
- [ ] Actualizar cliente EDC para usar conector dinámico
- [ ] Permitir que cada partner opere con su propio conector

### Iteración 4: Roles y Permisos

- [ ] Implementar roles (admin, viewer, operator)
- [ ] Restricciones basadas en roles
- [ ] Auditoría de acciones por partner

### Iteración 5: UI Mejorada

- [ ] Selector de partner en header (cambiar sin logout)
- [ ] Dashboard multi-conector (ver varios conectores a la vez)
- [ ] Histórico de operaciones por partner

---

## 🔐 Seguridad

### Aspectos Implementados

✅ **sessionStorage**: Datos no persisten al cerrar navegador  
✅ **Verificación en cada carga**: Redirección a login si no autenticado  
✅ **CORS configurado**: Solo origins permitidos pueden acceder al backend  
✅ **Base de datos del portal**: Lectura directa de source of truth

### Aspectos Pendientes

⚠️ **Password hardcoded**: Debe integrarse con Keycloak  
⚠️ **Sin JWT**: No hay token de autenticación  
⚠️ **Sin rate limiting**: API de login sin protección contra ataques de fuerza bruta  
⚠️ **Conexión DB sin pool**: Cada request crea nueva conexión (asyncpg connection, no pool)

---

## 📊 Estadísticas del Código

| Métrica | Valor |
|---------|-------|
| **Archivos nuevos** | 2 |
| **Archivos modificados** | 4 |
| **Líneas añadidas (backend)** | ~300 |
| **Líneas añadidas (frontend)** | ~550 |
| **Endpoints nuevos** | 3 |
| **Componentes UI nuevos** | 1 (PartnerLoginPage) |

---

## 🤝 Contribuciones

**Autor**: GitHub Copilot + xmendialdua  
**Fecha**: 21 de mayo de 2026  
**Branch**: `feature/multiple-partners`  
**Base**: `main` (después de implementación HTTPS)

---

## 📚 Referencias

- [Tractus-X Portal Database Schema](https://github.com/eclipse-tractusx/portal-backend)
- [Eclipse Dataspace Connector (EDC) Management API](https://eclipse-edc.github.io/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [asyncpg - PostgreSQL for Python](https://magicstack.github.io/asyncpg/)

---

**Estado**: ✅ Implementación completada  
**Próximo deploy**: Pendiente de testing en OVH
