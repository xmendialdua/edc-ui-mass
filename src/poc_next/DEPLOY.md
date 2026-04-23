# POC Next - Guía de Despliegue en OVH

Esta guía describe cómo desplegar la aplicación POC Next en el cluster de Kubernetes de OVH.

## 📋 Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Pre-requisitos](#pre-requisitos)
- [Arquitectura](#arquitectura)
- [Despliegue Rápido](#despliegue-rápido)
- [Despliegue Paso a Paso](#despliegue-paso-a-paso)
- [Acceso a la Aplicación](#acceso-a-la-aplicación)
- [Gestión del Despliegue](#gestión-del-despliegue)
- [Troubleshooting](#troubleshooting)

## Descripción General

POC Next es una aplicación web para gestionar el flujo de publicación de datos en el ecosistema Tractus-X. Consiste en:

- **Backend**: API FastAPI (Python) en el puerto 5001
- **Frontend**: Aplicación Next.js en el puerto 3001

## Pre-requisitos

### Software necesario

- [Docker](https://docs.docker.com/get-docker/) (para construcción de imágenes)
- [kubectl](https://kubernetes.io/docs/tasks/tools/) (configurado con acceso al cluster OVH)
- Cuenta en [Docker Hub](https://hub.docker.com/) con acceso a push

### Verificar Pre-requisitos

```bash
# Verificar Docker
docker --version

# Verificar kubectl
kubectl version --client

# Verificar acceso al cluster
kubectl cluster-info

# Verificar login en Docker Hub
docker login
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Ingress (nginx)    │
              │  poc-next.51...io    │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Frontend Service    │
              │    (ClusterIP)       │
              └──────────┬───────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│ Frontend Pod     │          │  Backend Pod     │
│  Next.js:3001    │◄────────►│ FastAPI:5001     │
└──────────────────┘          └──────────────────┘
          │                             │
          └─────────┬──────────────────┘
                    ▼
          ┌──────────────────┐
          │ Backend Service  │
          │   (ClusterIP)    │
          └──────────────────┘
```

## Prueba Local con Docker (Recomendado)

**Antes de desplegar en OVH, es muy recomendable probar localmente la aplicación dockerizada:**

```bash
# Probar la aplicación con Docker Compose
./test-docker.sh
```

Este script:
- Construye las imágenes Docker localmente (sin publicar)
- Inicia los contenedores backend y frontend
- Verifica que ambos servicios estén funcionando correctamente
- Muestra las URLs de acceso local

Prueba la aplicación en:
- Frontend: http://localhost:3001
- Publicación de datos: http://localhost:3001/data-publication  
- Datos de partners: http://localhost:3001/partner-data

Cuando termines de probar:
```bash
# Detener los contenedores
./stop-docker.sh
```

## Despliegue Rápido en OVH

Una vez validada la aplicación localmente, despliega en OVH:

```bash
# 1. Construir y publicar imágenes Docker
./build.sh

# 2. Desplegar en Kubernetes
cd k8s
./deploy.sh
```

## Pruebas Locales Detalladas

### Probar con Docker Compose

Antes de publicar las imágenes en Docker Hub y desplegar en OVH, puedes probar todo localmente:

#### 1. Construir y ejecutar localmente

```bash
# Usar el script automatizado
./test-docker.sh
```

Este script realiza:
- ✅ Build de las imágenes Docker localmente
- ✅ Inicia contenedores con docker-compose
- ✅ Verifica que los health checks pasen
- ✅ Muestra las URLs de acceso

#### 2. Acceder a la aplicación

Una vez que los contenedores estén corriendo:

```bash
# Abrir en el navegador
open http://localhost:3001/data-publication
open http://localhost:3001/partner-data
```

O visitar manualmente:
- **Frontend**: http://localhost:3001
- **Backend Health**: http://localhost:5001/health
- **Backend API Docs**: http://localhost:5001/docs

#### 3. Ver logs en tiempo real

```bash
# Ver todos los logs
docker compose logs -f

# Solo backend
docker compose logs -f backend

# Solo frontend
docker compose logs -f frontend
```

#### 4. Verificar estado

```bash
# Ver estado de los contenedores
docker compose ps

# Ver uso de recursos
docker stats
```

#### 5. Probar funcionalidad

Prueba los flujos completos:
- ✅ Crear un nuevo asset en "Publicación de datos"
- ✅ Crear una política
- ✅ Verificar en "Datos de partners" que se puede ver el catálogo
- ✅ Iniciar una transferencia de datos

#### 6. Detener las pruebas

Cuando termines de probar:

```bash
# Detener y limpiar
./stop-docker.sh
```

Esto detendrá los contenedores pero mantendrá las imágenes para reutilización.

### Comandos Docker Compose Manuales

Si prefieres control manual:

```bash
# Construir imágenes
docker compose build

# Iniciar servicios
docker compose up -d

# Ver logs
docker compose logs -f

# Detener servicios
docker compose down

# Reconstruir y reiniciar
docker compose up -d --build

# Eliminar todo (incluyendo volúmenes)
docker compose down -v
```

### Diferencias con el entorno de desarrollo (start.sh)

| Aspecto | start.sh (Dev) | docker-compose (Prueba Docker) |
|---------|----------------|-------------------------------|
| **Backend** | Python virtual env | Contenedor Docker |
| **Frontend** | Next.js dev server | Contenedor Docker (producción) |
| **Hot reload** | ✅ Sí | ❌ No (rebuild necesario) |
| **Build time** | Rápido | Lento (primera vez) |
| **Fidelidad a producción** | Baja | Alta |
| **Uso de recursos** | Bajo | Medio |

**Recomendación**: Usa `start.sh` para desarrollo diario y `docker-compose` para validar antes de desplegar.

## Despliegue Paso a Paso en OVH

### 1. Construcción de Imágenes Docker

#### Opción A: Usando el script de build (Recomendado)

```bash
cd src/poc_next
chmod +x build.sh
./build.sh
```

El script te preguntará si quieres publicar las imágenes en Docker Hub. Responde `y` para publicarlas.

#### Opción B: Build manual

```bash
# Backend
cd backend
docker build -t xmendialdua/poc-next-backend:latest .
docker push xmendialdua/poc-next-backend:latest

# Frontend
cd ../frontend
docker build -t xmendialdua/poc-next-frontend:latest .
docker push xmendialdua/poc-next-frontend:latest
```

### 2. Configuración

Antes de desplegar, verifica la configuración en [k8s/configmap.yaml](k8s/configmap.yaml):

```yaml
# URLs de conectores
MASS_MANAGEMENT_URL: "https://edc-mass-control.51.178.94.25.nip.io/management"
IKLN_MANAGEMENT_URL: "https://edc-ikln-control.51.178.94.25.nip.io/management"

# BPNs
MASS_BPN: "BPNL00000000MASS"
IKLN_BPN: "BPNL00000002IKLN"
```

También verifica las API keys en los secrets (si es necesario cambiarlas):

```yaml
# k8s/configmap.yaml - sección Secret
MASS_API_KEY: "mass-api-key-change-in-production"
IKLN_API_KEY: "ikln-api-key-change-in-production"
```

### 3. Despliegue en Kubernetes

```bash
cd k8s
chmod +x deploy.sh
./deploy.sh
```

El script realizará las siguientes acciones:
1. Crear el namespace `poc-next`
2. Aplicar RBAC (Service Account, Roles)
3. Aplicar ConfigMap y Secrets
4. Desplegar Backend y Frontend
5. Crear Services
6. Configurar Ingress
7. Esperar a que los deployments estén listos
8. Mostrar la URL de acceso

### 4. Verificar el Despliegue

```bash
# Ver todos los recursos
kubectl get all -n poc-next

# Ver estado de los pods
kubectl get pods -n poc-next

# Ver logs del backend
kubectl logs -f deployment/poc-next-backend -n poc-next

# Ver logs del frontend
kubectl logs -f deployment/poc-next-frontend -n poc-next
```

## Acceso a la Aplicación

Una vez desplegada, la aplicación estará disponible en:

**URL Base**: http://poc-next.51.178.94.25.nip.io

**Interfaces de Usuario**:
- 📝 Publicación de datos: http://poc-next.51.178.94.25.nip.io/data-publication
- 📊 Datos de partners: http://poc-next.51.178.94.25.nip.io/partner-data

**API Backend** (interno al cluster):
- Health check: http://poc-next-backend:5001/health
- API docs: http://poc-next-backend:5001/docs

## Gestión del Despliegue

### Actualizar la Aplicación

Cuando hagas cambios en el código:

```bash
# 1. Reconstruir y publicar imágenes
./build.sh

# 2. Reiniciar los deployments para usar las nuevas imágenes
kubectl rollout restart deployment/poc-next-backend -n poc-next
kubectl rollout restart deployment/poc-next-frontend -n poc-next

# 3. Verificar el estado
kubectl rollout status deployment/poc-next-backend -n poc-next
kubectl rollout status deployment/poc-next-frontend -n poc-next
```

### Ver Logs

```bash
# Logs del backend (tiempo real)
kubectl logs -f deployment/poc-next-backend -n poc-next

# Logs del frontend (tiempo real)
kubectl logs -f deployment/poc-next-frontend -n poc-next

# Logs de un pod específico
kubectl logs <pod-name> -n poc-next

# Últimas 100 líneas
kubectl logs --tail=100 deployment/poc-next-backend -n poc-next
```

### Escalar la Aplicación

```bash
# Escalar el backend
kubectl scale deployment/poc-next-backend --replicas=3 -n poc-next

# Escalar el frontend
kubectl scale deployment/poc-next-frontend --replicas=2 -n poc-next
```

### Acceder a un Pod

```bash
# Backend (bash)
kubectl exec -it deployment/poc-next-backend -n poc-next -- /bin/bash

# Frontend (sh - Alpine Linux)
kubectl exec -it deployment/poc-next-frontend -n poc-next -- /bin/sh
```

### Eliminar el Despliegue

```bash
cd k8s
chmod +x cleanup.sh
./cleanup.sh
```

El script eliminará todos los recursos y te preguntará si quieres eliminar también el namespace.

## Troubleshooting

### Problemas Comunes

#### 1. Pod no arranca (CrashLoopBackOff)

```bash
# Ver detalles del pod
kubectl describe pod <pod-name> -n poc-next

# Ver logs completos
kubectl logs <pod-name> -n poc-next --previous
```

**Posibles causas**:
- Error en la configuración (variables de entorno)
- Falta la imagen en Docker Hub
- Problemas de permisos

#### 2. Imagen no encontrada (ImagePullBackOff)

```bash
# Verificar que la imagen existe en Docker Hub
docker pull xmendialdua/poc-next-backend:latest
docker pull xmendialdua/poc-next-frontend:latest
```

**Solución**:
- Construir y publicar las imágenes: `./build.sh`
- Verificar que Docker Hub está accesible desde el cluster

#### 3. Frontend no se conecta al Backend

```bash
# Verificar que el servicio del backend existe
kubectl get svc poc-next-backend -n poc-next

# Probar conectividad desde el frontend
kubectl exec -it deployment/poc-next-frontend -n poc-next -- wget -O- http://poc-next-backend:5001/health
```

**Solución**:
- Verificar que `NEXT_PUBLIC_API_URL` apunta a `http://poc-next-backend:5001`
- Verificar que el backend está corriendo: `kubectl get pods -n poc-next`

#### 4. Ingress no funciona

```bash
# Verificar el estado del Ingress
kubectl describe ingress poc-next-frontend -n poc-next

# Verificar que el Ingress Controller está corriendo
kubectl get pods -n ingress-nginx
```

**Solución**:
- Verificar que el host en `ingress.yaml` es correcto
- Verificar DNS: `nslookup poc-next.51.178.94.25.nip.io`

#### 5. Problemas de permisos (RBAC)

```bash
# Verificar Service Account
kubectl get sa poc-next-sa -n poc-next

# Verificar ClusterRole y ClusterRoleBinding
kubectl get clusterrole poc-next-pod-reader
kubectl get clusterrolebinding poc-next-pod-reader-binding
```

### Comandos Útiles de Debugging

```bash
# Ver todos los eventos del namespace
kubectl get events -n poc-next --sort-by='.lastTimestamp'

# Ver configuración completa de un deployment
kubectl get deployment poc-next-backend -n poc-next -o yaml

# Ver variables de entorno de un pod
kubectl exec deployment/poc-next-backend -n poc-next -- env

# Ver uso de recursos
kubectl top pods -n poc-next

# Verificar conectividad de red
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://poc-next-backend:5001/health
```

### Logs del Ingress Controller

Si tienes problemas de acceso desde internet:

```bash
# Ver logs del Ingress Controller
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=100
```

## Diferencias con el Desarrollo Local

| Aspecto | Local (`start.sh`) | Kubernetes (OVH) |
|---------|-------------------|------------------|
| **Backend URL** | http://localhost:5001 | http://poc-next-backend:5001 |
| **Frontend URL** | http://localhost:3001 | http://poc-next.51.178.94.25.nip.io |
| **Variables de entorno** | `.env` files | ConfigMap + Secrets |
| **Logs** | Terminal + archivos .log | `kubectl logs` |
| **Escalabilidad** | 1 instancia | Múltiples réplicas |

## Recursos Adicionales

- [Documentación de Kubernetes](https://kubernetes.io/docs/home/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Tractus-X Documentation](https://eclipse-tractusx.github.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## Contacto y Soporte

Para problemas o preguntas sobre el despliegue:
1. Revisa esta documentación
2. Consulta los logs de los pods
3. Verifica la configuración en `k8s/configmap.yaml`
