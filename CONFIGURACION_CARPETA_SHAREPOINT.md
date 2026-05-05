# Configuración de Carpeta Permitida en SharePoint

## Descripción

Esta funcionalidad permite restringir qué carpetas y archivos pueden ser seleccionados al crear assets desde SharePoint. La navegación funciona de la siguiente manera:

### Jerarquía de Navegación

1. **Nivel Raíz (0)**: 
   - Muestra carpetas de proyectos/clientes
   - Solo permite navegación (no selección)

2. **Nivel 1 (Proyecto/Cliente)**:
   - Muestra ÚNICAMENTE la carpeta configurada (por defecto: "05.Dataspace")
   - Solo permite navegación a esta carpeta

3. **Nivel 2+ (Dentro de carpeta permitida)**:
   - Muestra todo el contenido
   - Permite seleccionar archivos y carpetas

### Comportamiento

- ✅ **Archivos dentro de carpeta permitida**: Seleccionables
- ✅ **Carpetas dentro de carpeta permitida**: Seleccionables  
- ❌ **Archivos fuera de carpeta permitida**: No accesibles
- ❌ **Carpetas de proyectos**: Solo navegación
- ⚠️ **Carpetas distintas a la permitida**: No se muestran en nivel 1

---

## Configuración

### Opción 1: Variable de Entorno (Recomendado)

Configura la variable de entorno `SHAREPOINT_ALLOWED_FOLDER` en el backend:

```bash
# En el archivo .env del backend
SHAREPOINT_ALLOWED_FOLDER=05.Dataspace
```

**Ventajas**:
- Fácil de cambiar
- No requiere modificar código
- Solo necesita reiniciar el backend

**Pasos para cambiar**:
1. Editar archivo `.env` en `src/poc_next/backend/.env`
2. Cambiar el valor de `SHAREPOINT_ALLOWED_FOLDER`
3. Reiniciar el backend:
   ```bash
   cd src/poc_next/backend
   # Detener proceso actual (Ctrl+C)
   python main.py
   ```

### Opción 2: Variable de Entorno del Sistema

```bash
# Linux/Mac
export SHAREPOINT_ALLOWED_FOLDER="05.Dataspace"

# Windows (PowerShell)
$env:SHAREPOINT_ALLOWED_FOLDER="05.Dataspace"

# Windows (CMD)
set SHAREPOINT_ALLOWED_FOLDER=05.Dataspace
```

### Opción 3: Kubernetes ConfigMap/Secret

Para entornos en producción (Kubernetes):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: poc-next-config
  namespace: ds-management-ui
data:
  SHAREPOINT_ALLOWED_FOLDER: "05.Dataspace"
```

Luego referenciar en el Deployment:

```yaml
env:
  - name: SHAREPOINT_ALLOWED_FOLDER
    valueFrom:
      configMapKeyRef:
        name: poc-next-config
        key: SHAREPOINT_ALLOWED_FOLDER
```

---

## Ejemplos de Valores

### Ejemplo 1: Carpeta de Dataspace
```bash
SHAREPOINT_ALLOWED_FOLDER=05.Dataspace
```

### Ejemplo 2: Carpeta de Documentos Compartidos
```bash
SHAREPOINT_ALLOWED_FOLDER=Shared Documents
```

### Ejemplo 3: Carpeta Privada
```bash
SHAREPOINT_ALLOWED_FOLDER=Private
```

### Ejemplo 4: Carpeta con Espacios
```bash
# No requiere comillas en .env
SHAREPOINT_ALLOWED_FOLDER=Mi Carpeta Compartida
```

---

## Verificación

Para verificar que la configuración está activa:

### 1. Verificar en Backend

Consultar el endpoint de configuración:

```bash
curl http://localhost:5001/api/config/sharepoint
```

Respuesta esperada:
```json
{
  "allowed_folder": "05.Dataspace",
  "site_url": "https://ikerlan.sharepoint.com/sites/IKDataSpace"
}
```

### 2. Verificar en Frontend

Al abrir el selector de SharePoint:
- Verás un mensaje amarillo informativo: "Solo se pueden seleccionar archivos dentro de la carpeta '05.Dataspace'"
- En nivel 1 (proyecto), solo verás la carpeta configurada
- El botón "Seleccionar" solo aparece dentro de la carpeta permitida

### 3. Verificar en Logs del Backend

Al iniciar el backend, verás en los logs:

```
INFO | uvicorn.access | GET /api/config/sharepoint HTTP/1.1 200 OK
```

---

## Troubleshooting

### Problema: El frontend muestra la carpeta antigua

**Solución**: Refrescar el navegador (F5 o Ctrl+R)
- El frontend carga la configuración al iniciar
- Si cambias el backend mientras el frontend está abierto, debes refrescar

### Problema: No se muestra ninguna carpeta en nivel 1

**Causas posibles**:
1. El nombre de la carpeta no coincide exactamente
2. La carpeta no existe en el proyecto seleccionado

**Solución**: 
- Verifica que el nombre es exactamente igual (case-sensitive)
- Verifica que la carpeta existe en SharePoint

### Problema: El cambio no surte efecto

**Checklist**:
1. ✅ ¿Editaste el archivo `.env` correcto? (`src/poc_next/backend/.env`)
2. ✅ ¿Reiniciaste el backend después del cambio?
3. ✅ ¿Refrescaste el navegador?
4. ✅ ¿El endpoint `/api/config/sharepoint` devuelve el valor nuevo?

---

## Arquitectura Técnica

### Backend

**Archivo**: `src/poc_next/backend/config.py`
```python
sharepoint_allowed_folder: str = "05.Dataspace"
```

**Endpoint**: `src/poc_next/backend/api/routes/config.py`
```python
@router.get("/sharepoint")
async def get_sharepoint_config():
    return SharePointConfig(
        allowed_folder=settings.sharepoint_allowed_folder
    )
```

### Frontend

**Archivo**: `src/poc_next/frontend/components/phases/phase2-content.tsx`

**Estados**:
- `sharePointAllowedFolder`: Nombre de la carpeta permitida (cargado desde backend)
- `sharePointInsideAllowedFolder`: Boolean que indica si estamos dentro

**Lógica**:
```typescript
// Nivel 0: Solo carpetas (proyectos)
if (navigationLevel === 0) {
  filteredFiles = items.filter(f => f.isFolder);
}
// Nivel 1: Solo carpeta permitida
else if (navigationLevel === 1) {
  filteredFiles = items.filter(f => 
    f.isFolder && f.name === sharePointAllowedFolder
  );
}
// Nivel 2+: Todo el contenido
else {
  filteredFiles = items;
  setSharePointInsideAllowedFolder(true);
}
```

---

## Notas Importantes

1. **Case-Sensitive**: El nombre de la carpeta distingue mayúsculas/minúsculas
2. **Caracteres Especiales**: Permitidos (espacios, tildes, números, etc.)
3. **Sin Redespliegue**: Solo requiere reinicio del backend
4. **Scope**: Aplica a todos los usuarios y sesiones
5. **Validación**: El backend NO valida que la carpeta existe

---

## Roadmap / Mejoras Futuras

Posibles mejoras para considerar:

- [ ] Configuración por usuario/rol
- [ ] Múltiples carpetas permitidas
- [ ] Configuración desde interfaz web (admin panel)
- [ ] Validación de existencia de carpeta en SharePoint
- [ ] Carpetas permitidas dinámicas según proyecto
- [ ] Logs de auditoría de accesos
