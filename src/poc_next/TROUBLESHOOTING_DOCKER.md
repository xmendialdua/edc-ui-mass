# Resolución de Problema: No se muestran datos en Docker

## 🐛 Problema

Al ejecutar la aplicación con `./test-docker.sh`:
- ✅ La interfaz de usuario carga correctamente
- ✅ El icono de conexión muestra "conectado"  
- ❌ No se muestran datos (assets, contratos, catálogos, negociaciones, transferencias)
- ❌ Los paneles están vacíos

## 🔍 Causa Raíz

Había **dos problemas críticos** en la configuración de `docker-compose.yml`:

### 1. Verificación SSL no deshabilitada

El backend Python necesita deshabilitar la verificación SSL para conectarse a los conectores EDC que usan certificados auto-firmados o nip.io:

```yaml
# ❌ ANTES (sin configuración SSL)
environment:
  APP_HOST: "0.0.0.0"
  MASS_MANAGEMENT_URL: "https://edc-mass-control.51.178.94.25.nip.io/management"

# ✅ DESPUÉS (con configuración SSL)
environment:
  APP_HOST: "0.0.0.0"
  PYTHONHTTPSVERIFY: "0"           # Python SSL
  CURL_CA_BUNDLE: ""                # CURL SSL
  REQUESTS_CA_BUNDLE: ""            # Requests library
  SSL_CERT_FILE: ""                 # OpenSSL
  MASS_MANAGEMENT_URL: "https://edc-mass-control.51.178.94.25.nip.io/management"
```

### 2. URL del Backend incorrecta para el Frontend

**El problema más común**: El frontend está en el **navegador del host**, NO en el contenedor Docker. Por tanto, debe llamar a `localhost:5001`, no a `backend:5001`.

Además, Next.js "bake" las variables `NEXT_PUBLIC_*` durante el **build time**, no en runtime. Esto significa que:

1. Las variables de entorno en `docker-compose.yml` solo afectan al runtime
2. Para que Next.js use la URL correcta, debe pasarse como **build argument**

```yaml
# ❌ ANTES (URL incorrecta en build time)
frontend:
  build:
    context: ./frontend
  environment:
    NEXT_PUBLIC_API_URL: "http://localhost:5001"  # Esto NO funciona en build time

# ✅ DESPUÉS (URL correcta como build arg)
frontend:
  build:
    context: ./frontend
    args:
      NEXT_PUBLIC_API_URL: "http://localhost:5001"  # Esto SÍ funciona
  environment:
    NEXT_PUBLIC_API_URL: "http://localhost:5001"  # Para runtime
```

Y en el Dockerfile:

```dockerfile
# ❌ ANTES
ENV NEXT_PUBLIC_API_URL=http://backend:5001

# ✅ DESPUÉS  
ARG NEXT_PUBLIC_API_URL=http://localhost:5001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
```

**¿Cómo saber si tienes este problema?**

Abre DevTools (F12) → Console y verás:
```
net::ERR_NAME_NOT_RESOLVED poc-next-backend:5001
Failed to fetch
```

**Solución**: Reconstruir el frontend:
```bash
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

O usa el script:
```bash
./stop-docker.sh && ./test-docker.sh
```

## ✅ Solución Aplicada

He corregido ambos problemas en `docker-compose.yml`. Ahora necesitas:

### 1. Detener los contenedores actuales

```bash
./stop-docker.sh
```

O manualmente:
```bash
docker-compose down
```

### 2. Reconstruir con la nueva configuración

```bash
./test-docker.sh
```

Esto reconstruirá las imágenes con la configuración correcta.

### 3. Diagnosticar

Una vez que los contenedores estén corriendo:

```bash
./diagnose-docker.sh
```

Este script verificará:
- ✅ Contenedores corriendo
- ✅ Backend API responde
- ✅ Frontend carga
- ✅ Backend puede conectarse a EDC
- ✅ Frontend puede llamar al backend
- ✅ Endpoints devuelven datos

## 🧪 Pruebas Manuales

### 1. Verificar Backend

```bash
# Health check
curl http://localhost:5001/health

# Listar assets
curl http://localhost:5001/api/phase1/assets

# Ver API docs
open http://localhost:5001/docs
```

### 2. Verificar Frontend

Abre en el navegador:
- http://localhost:3001/data-publication
- http://localhost:3001/partner-data

**Abre las DevTools del navegador (F12)**:
- **Console**: Verifica que no haya errores de CORS o red
- **Network**: Verifica que las llamadas a `localhost:5001` devuelvan datos

### 3. Verificar Logs

```bash
# Backend
docker-compose logs -f backend

# Frontend  
docker-compose logs -f frontend

# Ambos
docker-compose logs -f
```

Busca:
- Llamadas exitosas a los conectores EDC
- Respuestas con datos (assets, policies, etc.)
- Errores de SSL (no deberían aparecer ahora)
- Errores de conexión

## 📊 Qué Esperar Ahora

### Backend Logs - ANTES (con error)

```
ERROR: SSL verification failed
httpx.ConnectError: SSL: CERTIFICATE_VERIFY_FAILED
```

### Backend Logs - DESPUÉS (correcto)

```
INFO: Assets retrieved: 5 items
INFO: Policies retrieved: 3 items
DEBUG: EdcManagementClient initialized (SSL verification disabled)
```

### Frontend DevTools Console - ANTES (con error)

```
GET http://backend:5001/api/phase1/assets net::ERR_NAME_NOT_RESOLVED
```

### Frontend DevTools Console - DESPUÉS (correcto)

```
GET http://localhost:5001/api/phase1/assets 200 OK
Response: [...array with data...]
```

## 🔧 Troubleshooting Adicional

### Si sigue sin mostrar datos:

1. **Verifica las API keys**:
   ```bash
   docker exec poc-next-backend env | grep API_KEY
   ```
   
   Las API keys en `docker-compose.yml` deben coincidir con las configuradas en los conectores EDC.

2. **Prueba conectividad directa a EDC**:
   ```bash
   curl -X POST https://edc-mass-control.51.178.94.25.nip.io/management/v3/assets/request \
     -H "Content-Type: application/json" \
     -H "X-Api-Key: mass-api-key-change-in-production" \
     -d '{"@context": {}, "@type": "QuerySpec"}' \
     --insecure
   ```

3. **Verifica CORS en el navegador**:
   - Abre DevTools (F12)
   - Pestaña Network
   - Busca errores CORS en las llamadas a `localhost:5001`

4. **Reconstruye desde cero**:
   ```bash
   docker-compose down -v
   docker rmi poc-next-backend poc-next-frontend
   ./test-docker.sh
   ```

## 📝 Diferencia con Desarrollo Local (start.sh)

| Aspecto | start.sh | docker-compose.yml |
|---------|----------|-------------------|
| **Backend → EDC** | Lee `.env` | Variables en docker-compose.yml |
| **Frontend → Backend** | `http://localhost:5001` | `http://localhost:5001` ✅ |
| **SSL Verification** | Controlado por código Python | Variables de entorno ✅ |

## 🎯 Checklist de Validación

- [ ] Contenedores reconstruidos con nueva configuración
- [ ] `./diagnose-docker.sh` ejecutado sin errores
- [ ] Backend conecta a EDC correctamente
- [ ] Frontend llama a `localhost:5001` (ver en DevTools)
- [ ] Se muestran assets en /data-publication
- [ ] Se muestran catálogos en /partner-data
- [ ] No hay errores en logs ni en consola del navegador

## 📚 Referencias

- [docker-compose.yml](docker-compose.yml) - Configuración corregida
- [diagnose-docker.sh](diagnose-docker.sh) - Script de diagnóstico
- [DOCKER_COMPOSE.md](DOCKER_COMPOSE.md) - Documentación completa

## 🚀 Siguiente Paso

Una vez que todo funcione localmente:

```bash
# Detener pruebas locales
./stop-docker.sh

# Construir y publicar a Docker Hub
./build.sh

# Desplegar en OVH
cd k8s && ./deploy.sh
```
