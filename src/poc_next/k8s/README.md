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
1. Crea el namespace `ds-management-ui` si no existe
2. Aplica los manifiestos de Kubernetes en orden
3. Espera a que los deployments estén listos
4. Muestra la URL de acceso

### Despliegue manual

Si prefieres desplegar manualmente:

```bash
# Crear namespace
kubectl create namespace ds-management-ui

# Aplicar manifiestos
kubectl apply -f rbac.yaml -n ds-management-ui
kubectl apply -f configmap.yaml -n ds-management-ui
kubectl apply -f deployment.yaml -n ds-management-ui
kubectl apply -f service.yaml -n ds-management-ui
kubectl apply -f ingress.yaml -n ds-management-ui

# Verificar estado
kubectl get pods -n ds-management-ui
kubectl rollout status deployment/poc-next-backend -n ds-management-ui
kubectl rollout status deployment/poc-next-frontend -n ds-management-ui
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

## SharePoint Proxy - Configuración de Secretos

El **SharePoint Proxy** permite al EDC DataPlane descargar archivos de SharePoint mediante autenticación OAuth 2.0 con Azure AD Service Principal.

### Pre-requisitos

1. **Azure AD App Registration** con:
   - Application permissions: `Files.Read.All`, `Sites.Read.All`
   - Admin consent otorgado
   - Client Secret generado

### Crear el Secret

**No versiones el archivo con credenciales reales**. En su lugar, usa el template:

1. **Copia el template**:
   ```bash
   cp sharepoint-proxy-secret.yaml.template sharepoint-proxy-secret.yaml
   ```

2. **Edita el archivo** y reemplaza los placeholders con tus credenciales reales:
   ```yaml
   stringData:
     client-id: "your-client-id-guid"
     client-secret: "your-client-secret-value"
     tenant-id: "your-tenant-id-guid"
   ```

3. **Aplica el secret al cluster**:
   ```bash
   kubectl apply -f sharepoint-proxy-secret.yaml -n ds-management-ui
   ```

4. **Verifica que se creó**:
   ```bash
   kubectl get secret sharepoint-proxy-credentials -n ds-management-ui
   ```

### Desplegar SharePoint Proxy

Una vez creado el secret, despliega el proxy:

```bash
kubectl apply -f sharepoint-proxy-deployment.yaml -n ds-management-ui
kubectl apply -f sharepoint-proxy-service.yaml -n ds-management-ui
```

### Verificar el Proxy

```bash
# Ver estado del pod
kubectl get pods -n ds-management-ui | grep sharepoint-proxy

# Ver logs
kubectl logs -f deployment/sharepoint-proxy -n ds-management-ui

# Probar health check desde dentro del cluster
kubectl run test-curl --image=curlimages/curl:latest --rm -i --restart=Never -n ds-management-ui -- \
  curl -s http://sharepoint-proxy.ds-management-ui.svc.cluster.local:5001/health
```

### URL del Proxy para Assets

Al crear assets en EDC que apunten a SharePoint, usa:
```
http://sharepoint-proxy.ds-management-ui.svc.cluster.local:5001/api/sharepoint-proxy/download/{base64_encoded_url}
```

Donde `{base64_encoded_url}` es la codificación base64 URL-safe de `drive_id|item_id`.

### Seguridad

⚠️ **IMPORTANTE**: 
- El archivo `sharepoint-proxy-secret.yaml` está en `.gitignore` y **NO debe versionarse**
- Solo versiona `sharepoint-proxy-secret.yaml.template`
- Las credenciales solo existen en el cluster de Kubernetes

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
