# Configuración de URLs y Paths en OVH

## 📍 URLs de Acceso

La aplicación POC Next se despliega en OVH bajo el dominio `ds-management.51.178.94.25.nip.io` con las siguientes rutas:

- **Data Publication**: http://ds-management.51.178.94.25.nip.io/data-publication
- **Partner Data**: http://ds-management.51.178.94.25.nip.io/partner-data
- **Backend API**: http://ds-management.51.178.94.25.nip.io/api (uso interno)

## 🏗️ Arquitectura de Routing

```
                                    Internet
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │   Nginx Ingress     │
                            │  ds-management...   │
                            └──────────┬──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
         /data-publication    /partner-data           /api
                    │                  │                  │
                    │                  │                  │
         ┌──────────┴──────────────────┘                  │
         │                                                │
         ▼                                                ▼
┌─────────────────────┐                        ┌──────────────────┐
│  Frontend Service   │                        │ Backend Service  │
│  (Next.js:3001)     │                        │  (FastAPI:5001)  │
└─────────────────────┘                        └──────────────────┘
```

## 🔧 Configuración Requerida

### 1. Ingress Configuration

El archivo [k8s/ingress.yaml](k8s/ingress.yaml) está configurado con:

```yaml
spec:
  rules:
  - host: ds-management.51.178.94.25.nip.io
    http:
      paths:
      # Backend API
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: poc-next-backend
            port: 5001
      
      # Frontend pages
      - path: /data-publication
        pathType: Prefix
        backend:
          service:
            name: poc-next-frontend
            port: 3001
      
      - path: /partner-data
        pathType: Prefix
        backend:
          service:
            name: poc-next-frontend
            port: 3001
      
      # Next.js assets
      - path: /_next
        pathType: Prefix
        backend:
          service:
            name: poc-next-frontend
            port: 3001
```

**Características clave**:
- ✅ **Sin rewrite-target**: Las rutas se pasan tal cual a Next.js
- ✅ **Múltiples paths**: Cada ruta apunta al servicio correcto
- ✅ **Assets estáticos**: `/_next` se rutea al frontend para assets de Next.js

### 2. Frontend Configuration

#### ConfigMap (k8s/configmap.yaml)

```yaml
NEXT_PUBLIC_API_URL: "http://ds-management.51.178.94.25.nip.io"
```

**Por qué esta URL**:
- El navegador necesita llamar al backend a través de una URL pública
- El Ingress recibe las llamadas a `/api/*` y las rutea al backend
- No se usa `basePath` en Next.js porque las páginas ya están en `/data-publication` y `/partner-data`

#### Build Arguments (Dockerfile)

El [frontend/Dockerfile](../frontend/Dockerfile) acepta `NEXT_PUBLIC_API_URL` como build argument:

```dockerfile
ARG NEXT_PUBLIC_API_URL=http://localhost:5001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
```

### 3. Backend Configuration

El backend no requiere cambios especiales. Solo debe:
- ✅ Responder en las rutas `/api/phase1/*`, `/api/phase2/*`, etc.
- ✅ Tener CORS configurado para aceptar peticiones del dominio público

## 🚀 Proceso de Despliegue

### Paso 1: Build con URL de Producción

Usa el script específico para Kubernetes:

```bash
./build-k8s.sh
```

Este script:
- Construye el backend sin cambios
- Construye el frontend con `NEXT_PUBLIC_API_URL=http://ds-management.51.178.94.25.nip.io`
- Publica ambas imágenes a Docker Hub
- Las imágenes estarán listas para K8s

**Diferencia con `build.sh`**:
- `build.sh` → Construye con `http://localhost:5001` (para pruebas locales)
- `build-k8s.sh` → Construye con `http://ds-management.51.178.94.25.nip.io` (para OVH)

### Paso 2: Deploy en Kubernetes

```bash
cd k8s
./deploy.sh
```

Este script:
1. Crea el namespace `ds-management-ui`
2. Aplica RBAC, ConfigMap y Secrets
3. Despliega backend y frontend
4. Configura el Ingress con las rutas correctas
5. Espera a que todo esté listo

### Paso 3: Verificar Deployment

```bash
# Ver pods
kubectl get pods -n ds-management-ui

# Ver ingress
kubectl get ingress -n ds-management-ui

# Ver logs
kubectl logs -f deployment/poc-next-frontend -n ds-management-ui
kubectl logs -f deployment/poc-next-backend -n ds-management-ui
```

## 🔍 Troubleshooting

### Frontend muestra 404

**Causa**: El Ingress no está ruteando correctamente

**Solución**:
```bash
# Verificar configuración del Ingress
kubectl describe ingress poc-next-frontend -n ds-management-ui

# Verificar que los paths estén configurados
kubectl get ingress poc-next-frontend -n ds-management-ui -o yaml
```

### Frontend no puede llamar al backend

**Causa**: El navegador intenta llamar al backend pero la URL no es correcta

**Solución**:
```bash
# 1. Verificar variable de entorno en el pod
kubectl exec -n ds-management-ui deployment/poc-next-frontend -- env | grep NEXT_PUBLIC_API_URL

# 2. Debería mostrar: NEXT_PUBLIC_API_URL=http://ds-management.51.178.94.25.nip.io

# 3. Si no es correcta, reconstruir y redesplegar:
./build-k8s.sh
cd k8s && kubectl delete deployment poc-next-frontend -n ds-management-ui
./deploy.sh
```

### Assets estáticos no cargan (CSS, JS)

**Causa**: El Ingress no rutea `/_next` al frontend

**Solución**: Verificar que el Ingress tenga la ruta `/_next` configurada:

```bash
kubectl get ingress poc-next-frontend -n ds-management-ui -o yaml | grep -A 5 "_next"
```

## 📊 Comparación de Entornos

| Aspecto | Local (Docker Compose) | Kubernetes (OVH) |
|---------|----------------------|------------------|
| **Dominio** | localhost | ds-management.51.178.94.25.nip.io |
| **Frontend URLs** | http://localhost:3001/data-publication<br>http://localhost:3001/partner-data | http://ds-management.51.178.94.25.nip.io/data-publication<br>http://ds-management.51.178.94.25.nip.io/partner-data |
| **Backend API** | http://localhost:5001 | http://ds-management.51.178.94.25.nip.io/api |
| **Build Script** | `./build.sh` o `./test-docker.sh` | `./build-k8s.sh` |
| **Deploy Script** | `docker-compose up -d` | `cd k8s && ./deploy.sh` |
| **API_URL en Frontend** | http://localhost:5001 | http://ds-management.51.178.94.25.nip.io |

## 🎯 Checklist de Configuración

Antes de desplegar en OVH, verifica:

- [ ] `k8s/ingress.yaml` tiene host: `ds-management.51.178.94.25.nip.io`
- [ ] `k8s/ingress.yaml` tiene paths: `/api`, `/data-publication`, `/partner-data`, `/_next`
- [ ] `k8s/configmap.yaml` tiene `NEXT_PUBLIC_API_URL: "http://ds-management.51.178.94.25.nip.io"`
- [ ] Has ejecutado `./build-k8s.sh` (no `./build.sh`)
- [ ] Las imágenes están publicadas en Docker Hub
- [ ] El Ingress Controller está instalado en el cluster
- [ ] El DNS `ds-management.51.178.94.25.nip.io` resuelve correctamente

## 📚 Referencias

- [Ingress YAML](k8s/ingress.yaml)
- [ConfigMap YAML](k8s/configmap.yaml)
- [Deployment YAML](k8s/deployment.yaml)
- [Build Script for K8s](../build-k8s.sh)
- [Deploy Script](k8s/deploy.sh)
