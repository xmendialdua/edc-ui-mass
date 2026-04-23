# POC Next - Despliegue en Kubernetes (OVH)

Este directorio contiene los manifiestos de Kubernetes y scripts de despliegue para la aplicación POC Next en OVH.

## Arquitectura

La aplicación POC Next se compone de dos servicios:

- **Backend**: API FastAPI (Python) que expone endpoints para gestionar el flujo de publicación de datos en Tractus-X
- **Frontend**: Aplicación Next.js que proporciona las interfaces de usuario (`/data-publication` y `/partner-data`)

## Estructura de Archivos

```
k8s/
├── configmap.yaml      # Configuración de variables de entorno
├── rbac.yaml          # Service Account y permisos
├── deployment.yaml    # Deployments de backend y frontend
├── service.yaml       # Services de Kubernetes
├── ingress.yaml       # Ingress para acceso externo
├── deploy.sh          # Script de despliegue
├── cleanup.sh         # Script de limpieza
└── README.md          # Esta documentación
```

## Pre-requisitos

1. **Docker Hub**: Cuenta configurada con acceso a push
2. **kubectl**: Configurado con acceso al cluster de OVH
3. **Imágenes Docker**: Construidas y publicadas en Docker Hub

## Construcción de Imágenes Docker

### Backend

```bash
cd ../backend
docker build -t xmendialdua/poc-next-backend:latest .
docker push xmendialdua/poc-next-backend:latest
```

### Frontend

```bash
cd ../frontend
docker build -t xmendialdua/poc-next-frontend:latest .
docker push xmendialdua/poc-next-frontend:latest
```

### Usando el script de build

Puedes usar el script de build que construye y publica ambas imágenes:

```bash
cd ..
./build.sh
```

## Despliegue

### Despliegue automático

Ejecuta el script de despliegue desde el directorio `k8s`:

```bash
cd k8s
chmod +x deploy.sh
./deploy.sh
```

Este script:
1. Crea el namespace `poc-next` si no existe
2. Aplica los manifiestos de Kubernetes en orden
3. Espera a que los deployments estén listos
4. Muestra la URL de acceso

### Despliegue manual

Si prefieres desplegar manualmente:

```bash
# Crear namespace
kubectl create namespace poc-next

# Aplicar manifiestos
kubectl apply -f rbac.yaml -n poc-next
kubectl apply -f configmap.yaml -n poc-next
kubectl apply -f deployment.yaml -n poc-next
kubectl apply -f service.yaml -n poc-next
kubectl apply -f ingress.yaml -n poc-next

# Verificar estado
kubectl get pods -n poc-next
kubectl rollout status deployment/poc-next-backend -n poc-next
kubectl rollout status deployment/poc-next-frontend -n poc-next
```

## Acceso a la Aplicación

Después del despliegue, la aplicación estará disponible en:

- **URL Frontend**: http://poc-next.51.178.94.25.nip.io
- **Interfaces de Usuario**:
  - Publicación de datos: http://poc-next.51.178.94.25.nip.io/data-publication
  - Datos de partners: http://poc-next.51.178.94.25.nip.io/partner-data

El backend está disponible internamente en el cluster en:
- **Backend API**: http://poc-next-backend:5001

## Configuración

### Variables de Entorno

Las variables de entorno se configuran en `configmap.yaml` y `secrets`:

**ConfigMap** (`poc-next-config`):
- URLs de conectores MASS e IKLN
- BPNs de las organizaciones
- URLs de endpoints DSP
- Configuración de la aplicación

**Secrets** (`poc-next-secrets`):
- `MASS_API_KEY`: API key para el conector MASS
- `IKLN_API_KEY`: API key para el conector IKLN

### Modificar Configuración

1. Edita `configmap.yaml` o crea/edita secrets
2. Aplica los cambios:
   ```bash
   kubectl apply -f configmap.yaml -n poc-next
   ```
3. Reinicia los deployments para que carguen la nueva configuración:
   ```bash
   kubectl rollout restart deployment/poc-next-backend -n poc-next
   kubectl rollout restart deployment/poc-next-frontend -n poc-next
   ```

## Logs y Debugging

### Ver logs del backend

```bash
kubectl logs -f deployment/poc-next-backend -n poc-next
```

### Ver logs del frontend

```bash
kubectl logs -f deployment/poc-next-frontend -n poc-next
```

### Ver estado de los pods

```bash
kubectl get pods -n poc-next
kubectl describe pod <pod-name> -n poc-next
```

### Ejecutar comandos en un pod

```bash
# Backend
kubectl exec -it deployment/poc-next-backend -n poc-next -- /bin/bash

# Frontend
kubectl exec -it deployment/poc-next-frontend -n poc-next -- /bin/sh
```

## Actualización de la Aplicación

Para actualizar la aplicación con nuevos cambios:

1. Construye y publica las nuevas imágenes:
   ```bash
   cd ..
   ./build.sh
   ```

2. Actualiza el deployment:
   ```bash
   kubectl rollout restart deployment/poc-next-backend -n poc-next
   kubectl rollout restart deployment/poc-next-frontend -n poc-next
   ```

O ejecuta de nuevo el script de despliegue completo:
```bash
./deploy.sh
```

## Limpieza

Para eliminar completamente el despliegue:

```bash
chmod +x cleanup.sh
./cleanup.sh
```

Este script eliminará todos los recursos de Kubernetes asociados y opcionalmente el namespace.

## Troubleshooting

### El pod no arranca

1. Verifica el estado del pod:
   ```bash
   kubectl describe pod <pod-name> -n poc-next
   ```

2. Verifica los logs:
   ```bash
   kubectl logs <pod-name> -n poc-next
   ```

3. Verifica que las imágenes Docker existan en Docker Hub

### Error de conexión entre frontend y backend

1. Verifica que ambos servicios están corriendo:
   ```bash
   kubectl get svc -n poc-next
   ```

2. Verifica la configuración de `NEXT_PUBLIC_API_URL` en el frontend
3. Prueba la conectividad desde el frontend al backend:
   ```bash
   kubectl exec -it deployment/poc-next-frontend -n poc-next -- wget -O- http://poc-next-backend:5001/health
   ```

### Ingress no funciona

1. Verifica que el Ingress Controller está corriendo
2. Verifica la configuración del Ingress:
   ```bash
   kubectl describe ingress poc-next-frontend -n poc-next
   ```

3. Verifica los logs del Ingress Controller:
   ```bash
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
   ```

## Recursos

- **Recursos del Backend**:
  - Requests: 100m CPU, 256Mi memoria
  - Limits: 500m CPU, 512Mi memoria

- **Recursos del Frontend**:
  - Requests: 100m CPU, 256Mi memoria
  - Limits: 500m CPU, 512Mi memoria

Ajusta estos valores en `deployment.yaml` según las necesidades de tu cluster.
