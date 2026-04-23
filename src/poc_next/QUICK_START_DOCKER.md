# Guía Rápida - Prueba Local con Docker

## 🚀 Inicio Rápido

### 1. Probar la aplicación dockerizada (SIN publicar en Docker Hub)

```bash
./test-docker.sh
```

Esto construye las imágenes localmente y las ejecuta. Luego abre tu navegador en:
- http://localhost:3001/data-publication
- http://localhost:3001/partner-data

### 2. Verificar que todo funciona

```bash
./verify-docker.sh
```

Este script verifica:
- ✅ Contenedores corriendo
- ✅ Health checks
- ✅ Respuestas HTTP correctas
- ✅ Errores en logs
- ✅ Uso de recursos

### 3. Ver logs en tiempo real

```bash
# Todos los logs
docker compose logs -f

# Solo backend
docker compose logs -f backend

# Solo frontend
docker compose logs -f frontend
```

### 4. Detener y limpiar

```bash
./stop-docker.sh
```

## ✅ Flujo Completo de Validación

```bash
# Paso 1: Probar localmente con Docker
./test-docker.sh

# Paso 2: Verificar automáticamente
./verify-docker.sh

# Paso 3: Probar manualmente en el navegador
# - http://localhost:3001/data-publication
# - http://localhost:3001/partner-data
# - Crear assets, políticas, etc.

# Paso 4: Si todo OK, detener
./stop-docker.sh

# Paso 5: Construir y publicar en Docker Hub
./build.sh
# Responde 'y' cuando pregunte si quieres hacer push

# Paso 6: Desplegar en OVH
cd k8s
./deploy.sh
```

## 🔧 Comandos Útiles

### Ver estado

```bash
docker compose ps
```

### Ver uso de recursos

```bash
docker stats
```

### Reiniciar un servicio

```bash
docker compose restart backend
docker compose restart frontend
```

### Reconstruir después de cambios en el código

```bash
docker compose up -d --build
```

### Ver últimas 100 líneas de logs

```bash
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

### Acceder a un contenedor (debugging)

```bash
# Backend (bash)
docker compose exec backend /bin/bash

# Frontend (sh - Alpine)
docker compose exec frontend /bin/sh
```

### Probar conectividad backend desde frontend

```bash
docker compose exec frontend wget -O- http://backend:5001/health
```

## 🐛 Troubleshooting

### Los contenedores no arrancan

```bash
# Ver logs detallados
docker compose logs

# Ver eventos de Docker
docker events
```

### Puerto en uso

```bash
# Ver qué está usando los puertos
lsof -i :3001
lsof -i :5001

# Detener servicios locales
./stop.sh  # Para los servicios con start.sh
```

### Reconstruir desde cero

```bash
# Eliminar todo
docker compose down -v
docker rmi poc-next-backend poc-next-frontend

# Reconstruir
docker compose build --no-cache
docker compose up -d
```

## 📚 Diferencias entre entornos

| Comando | Descripción | Cuándo usar |
|---------|-------------|-------------|
| `./start.sh` | Desarrollo local (Python + Next.js dev) | Desarrollo diario |
| `./test-docker.sh` | Docker local | Validar antes de desplegar |
| `./build.sh` + `k8s/deploy.sh` | Despliegue OVH | Producción |

## 📖 Más información

- [DOCKER_COMPOSE.md](DOCKER_COMPOSE.md) - Documentación completa de Docker Compose
- [DEPLOY.md](DEPLOY.md) - Guía completa de despliegue en OVH
- [k8s/README.md](k8s/README.md) - Documentación de Kubernetes

## 🎯 Checklist antes de desplegar en OVH

- [ ] Ejecutar `./test-docker.sh` exitosamente
- [ ] Ejecutar `./verify-docker.sh` sin errores
- [ ] Probar manualmente todas las interfaces:
  - [ ] Página principal (http://localhost:3001)
  - [ ] Publicación de datos (http://localhost:3001/data-publication)
  - [ ] Datos de partners (http://localhost:3001/partner-data)
- [ ] Probar funcionalidad:
  - [ ] Crear un asset
  - [ ] Crear una política
  - [ ] Ver catálogo
  - [ ] Iniciar transferencia
- [ ] Verificar logs sin errores críticos
- [ ] Detener contenedores locales: `./stop-docker.sh`
- [ ] Publicar imágenes: `./build.sh` (responder 'y')
- [ ] Desplegar en OVH: `cd k8s && ./deploy.sh`
