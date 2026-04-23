# Docker Compose - Prueba Local

Este archivo permite probar la aplicación POC Next dockerizada en tu máquina local antes de desplegarla en OVH.

## 🎯 Propósito

- Validar que las imágenes Docker se construyen correctamente
- Probar la comunicación entre backend y frontend
- Verificar la funcionalidad completa antes de publicar en Docker Hub
- Detectar problemas de configuración antes del despliegue en producción

## 📋 Arquitectura

```
┌─────────────────────────────┐
│   Tu Navegador              │
│   http://localhost:3001     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Frontend Container         │
│  poc-next-frontend          │
│  Puerto: 3001               │
└──────────┬──────────────────┘
           │
           │ HTTP (red interna)
           │
           ▼
┌─────────────────────────────┐
│  Backend Container          │
│  poc-next-backend           │
│  Puerto: 5001               │
└─────────────────────────────┘
```

## 🚀 Uso Rápido

```bash
# Iniciar todo (construcción + ejecución)
./test-docker.sh

# Detener y limpiar
./stop-docker.sh
```

## 📝 Uso Manual

### Iniciar servicios

```bash
docker compose up -d
```

### Ver logs

```bash
# Todos los servicios
docker compose logs -f

# Solo un servicio
docker compose logs -f backend
docker compose logs -f frontend
```

### Ver estado

```bash
docker compose ps
```

### Detener servicios

```bash
docker compose down
```

### Reconstruir imágenes

Si haces cambios en el código:

```bash
docker compose build
docker compose up -d
```

O en un solo comando:

```bash
docker compose up -d --build
```

## 🔧 Configuración

### Variables de Entorno

Todas las variables están definidas en el `docker-compose.yml`:

#### Backend
- URLs de conectores MASS e IKLN
- API keys (mismas que en producción)
- BPNs y endpoints DSP

#### Frontend
- `NEXT_PUBLIC_API_URL`: apunta a `http://backend:5001` (nombre del servicio)
- Configuración de la aplicación

### Red

Los servicios se comunican a través de una red bridge llamada `poc-next-network`. El frontend accede al backend usando el nombre del servicio: `backend`.

### Health Checks

Ambos servicios tienen health checks configurados:

**Backend**: 
- Endpoint: `http://localhost:5001/health`
- Intervalo: 30s
- Start period: 5s

**Frontend**:
- Endpoint: `http://localhost:3001`
- Intervalo: 30s  
- Start period: 10s
- Depende de: backend (espera a que backend esté healthy)

## 🧪 Pruebas

### 1. Verificar que los servicios están corriendo

```bash
docker compose ps
```

Deberías ver:

```
NAME                   STATUS                    PORTS
poc-next-backend       Up (healthy)              0.0.0.0:5001->5001/tcp
poc-next-frontend      Up (healthy)              0.0.0.0:3001->3001/tcp
```

### 2. Probar el backend

```bash
# Health check
curl http://localhost:5001/health

# API root
curl http://localhost:5001/

# API documentation (en el navegador)
open http://localhost:5001/docs
```

### 3. Probar el frontend

Abre en el navegador:
- http://localhost:3001
- http://localhost:3001/data-publication
- http://localhost:3001/partner-data

### 4. Probar la comunicación backend-frontend

Desde el frontend, intenta crear un asset o ver el catálogo. Los logs del backend deberían mostrar las peticiones:

```bash
docker compose logs -f backend
```

## 🐛 Troubleshooting

### Los contenedores no arrancan

```bash
# Ver logs detallados
docker compose logs

# Ver logs de un servicio específico
docker compose logs backend
docker compose logs frontend
```

### Error de puerto en uso

Si el puerto 3001 o 5001 ya está en uso:

```bash
# Ver qué está usando el puerto
lsof -i :3001
lsof -i :5001

# Detener el servicio conflictivo o cambiar el puerto en docker-compose.yml
```

### Frontend no se conecta al backend

1. Verifica que el backend está corriendo:
   ```bash
   docker compose ps
   curl http://localhost:5001/health
   ```

2. Verifica la variable de entorno del frontend:
   ```bash
   docker compose exec frontend env | grep NEXT_PUBLIC_API_URL
   ```

3. Prueba la conectividad desde el frontend:
   ```bash
   docker compose exec frontend wget -O- http://backend:5001/health
   ```

### Reconstruir completamente

Si tienes problemas persistentes:

```bash
# Detener todo y eliminar volúmenes
docker compose down -v

# Eliminar imágenes antiguas
docker rmi poc-next-backend poc-next-frontend

# Limpiar cache de Docker
docker system prune -f

# Reconstruir desde cero
docker compose build --no-cache
docker compose up -d
```

## 📊 Monitoreo

### Ver uso de recursos

```bash
# Uso de CPU y memoria en tiempo real
docker stats

# Inspeccionar un contenedor
docker inspect poc-next-backend
docker inspect poc-next-frontend
```

### Ver la red

```bash
# Listar redes
docker network ls

# Inspeccionar la red
docker network inspect poc-next_poc-next-network
```

## 🔄 Workflow de Desarrollo Recomendado

1. **Desarrollo diario**: Usa `./start.sh` (hot reload, más rápido)

2. **Validación pre-despliegue**: Usa `./test-docker.sh`
   - Construye las imágenes Docker
   - Prueba en entorno similar a producción
   - Valida que todo funciona

3. **Publicación**: Usa `./build.sh`
   - Construye las imágenes
   - Publica a Docker Hub

4. **Despliegue**: Usa `cd k8s && ./deploy.sh`
   - Despliega en OVH

## 🔗 Diferencias con Producción (OVH)

| Aspecto | Docker Compose Local | Kubernetes OVH |
|---------|---------------------|----------------|
| **Orquestación** | Docker Compose | Kubernetes |
| **Acceso** | localhost:3001 | poc-next.51.178.94.25.nip.io |
| **Backend URL** | http://backend:5001 | http://poc-next-backend:5001 |
| **Secretos** | En docker-compose.yml | ConfigMap + Secrets K8s |
| **Escalabilidad** | 1 réplica | Múltiples réplicas |
| **Persistencia** | Local | Cluster storage |
| **Alta disponibilidad** | No | Sí |
| **Balanceo de carga** | No | Sí (Ingress) |

## 📚 Recursos

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Networking](https://docs.docker.com/network/)
- [Docker Health Checks](https://docs.docker.com/engine/reference/builder/#healthcheck)
