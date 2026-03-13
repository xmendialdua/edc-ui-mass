# Adecuaciones para Despliegue en OVH

> Documentación de las modificaciones realizadas para desplegar la aplicación EDC Management UI en el cluster Kubernetes de OVH.

**Fecha:** Marzo 2026  
**IP del Cluster:** 51.178.94.25  
**URL Principal:** http://edc-ui.51.178.94.25.nip.io

---

## 1. Estructura de Despliegue

### 1.1 Namespace
- **Namespace Kubernetes:** `edc-ui`
- Creado automáticamente por el script de despliegue

### 1.2 Conectores EDC
La aplicación gestiona dos conectores EDC desplegados en la misma infraestructura:
- **MondragonAssembly (MASS):** `BPNL00000000MASS`
- **Ikerlan (IKLN):** `BPNL00000000IKLN`

---

## 2. Script de Despliegue Específico OVH

### Archivo: `ui/k8s/deploy-ovh.sh`

```bash
#!/bin/bash

# Script de despliegue para EDC UI en OVH
# Uso: ./deploy-ovh.sh

export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

# Verificación de conectividad con el cluster
# Ejecución del script de despliegue principal
cd ~/projects/assembly/iflex/ui
bash k8s/deploy.sh
```

**Características:**
- Configura el path al archivo `kubeconfig.yaml` del cluster OVH
- Verifica conectividad antes de desplegar
- Delega el despliegue al script principal `deploy.sh`

---

## 3. Modificaciones en el Script Principal de Despliegue

### Archivo: `ui/k8s/deploy.sh`

#### 3.1 Uso de Imagen Pre-construida de Docker Hub

**Cambio realizado:**
```bash
# Build y Push DESACTIVADOS
# Ahora se usa imagen existente: xmendialdua/edc-mngmt-ui:latest
```

**Imagen utilizada:**
- Repositorio: `xmendialdua/edc-mngmt-ui`
- Tags: `latest` y `1105`

**Motivo:** Evitar construir la imagen en cada despliegue, usar imagen pre-validada.

#### 3.2 Desactivación de Kind Cluster

**Cambio realizado:**
```bash
# Check if we're running in a kind cluster (COMENTADO - desplegando en OVH)
# kind load docker-image ${IMAGE_NAME}:${IMAGE_TAG_LATEST}
```

**Motivo:** La detección y carga de imagen en kind cluster no es necesaria en OVH.

---

## 4. Configuración de Red e Ingress

### Archivo: `ui/k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: edc-ui
  namespace: edc-ui
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  ingressClassName: nginx
  rules:
  - host: edc-ui.51.178.94.25.nip.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: edc-ui
            port:
              number: 3000
```

**Características:**
- **Dominio:** `edc-ui.51.178.94.25.nip.io` (usando servicio nip.io para DNS wildcard)
- **Ingress Controller:** NGINX
- **Puerto interno:** 3000 (Next.js application)
- **SSL:** Deshabilitado (`ssl-redirect: "false"`)
- **Path rewrite:** Habilitado para evitar problemas de enrutamiento

---

## 5. Configuración de la Aplicación

### Archivo: `ui/edc-config.ts`

#### 5.1 Conectores por Defecto

```typescript
export const connectorDefaults = {
  provider: "https://edc-mass-control.51.178.94.25.nip.io/management", 
  consumer: "https://edc-ikln-control.51.178.94.25.nip.io/management", 
}
```

#### 5.2 Catálogo de Conectores

**MondragonAssembly Connector:**
```typescript
{
  name: "MondragonAssembly Connector",
  address: "https://edc-mass-control.51.178.94.25.nip.io/management",
  dspAddress: "http://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp",  // ⚠️ HTTP
  id: "BPNL00000000MASS",
  type: "provider" | "consumer",
  apiKey: "mass-api-key-change-in-production",
}
```

**Ikerlan Connector:**
```typescript
{
  name: "Ikerlan Connector",
  address: "https://edc-ikln-control.51.178.94.25.nip.io/management",
  dspAddress: "http://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp",  // ⚠️ HTTP
  id: "BPNL00000000IKLN",
  type: "provider" | "consumer",
  apiKey: "ikln-api-key-change-in-production",
}
```

**Nota importante:**
- Management API usa HTTPS
- DSP (Dataspace Protocol) usa HTTP (cambio realizado para compatibilidad)

#### 5.3 Federated Learning Habilitado

```typescript
export const appConfig = {
  flDataAppEnabled: true, // FL Data App habilitado por defecto
}
```

---

## 6. Configuración de Kubernetes

### 6.1 Deployment Configuration

**Archivo:** `ui/k8s/deployment.yaml`

```yaml
spec:
  replicas: 1
  containers:
  - name: edc-ui
    image: xmendialdua/edc-mngmt-ui:latest
    ports:
    - containerPort: 3000
    env:
    - name: NODE_TLS_REJECT_UNAUTHORIZED
      value: "0"  # ⚠️ Desactiva validación SSL
```

**Variables de entorno clave:**
- `NEXT_PUBLIC_KUBERNETES_ENABLED: "true"`
- `NODE_TLS_REJECT_UNAUTHORIZED: "0"` - Desactiva verificación de certificados SSL

**Recursos asignados:**
- CPU Requests: 100m
- CPU Limits: 500m
- Memory Requests: 256Mi
- Memory Limits: 512Mi

**Health Checks:**
- Liveness Probe: HTTP GET en `/` cada 10s (delay inicial 30s)
- Readiness Probe: HTTP GET en `/` cada 5s (delay inicial 5s)

### 6.2 Service Configuration

**Archivo:** `ui/k8s/service.yaml`

```yaml
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
```

### 6.3 ConfigMap

**Archivo:** `ui/k8s/configmap.yaml`

```yaml
data:
  NEXT_PUBLIC_API_URL: "http://provider-qna/cp/api/management"
  NEXT_PUBLIC_KUBERNETES_ENABLED: "true"
```

---

## 7. Dockerfile para Kubernetes

### Archivo: `ui/Dockerfile.k8s`

**Características destacables:**
- **Base:** Node 18 Alpine (multi-stage build)
- **Package Manager:** pnpm
- **Optimizaciones:**
  - Multi-stage build para reducir tamaño
  - Usuario no-root (nodejs/nextjs)
  - Telemetría de Next.js desactivada
  - Variables de entorno pre-configuradas en build

**Stages:**
1. **deps:** Instalación de dependencias
2. **builder:** Compilación de la aplicación Next.js
3. **runner:** Imagen final de producción

---

## 8. URLs y Endpoints

### 8.1 Aplicación UI
- **URL Principal:** http://edc-ui.51.178.94.25.nip.io
- **Provider Page:** http://edc-ui.51.178.94.25.nip.io/edc-provider
- **Consumer Page:** http://edc-ui.51.178.94.25.nip.io/edc-consumer

### 8.2 Conectores EDC Backend

#### MondragonAssembly (MASS)
- **Management API:** https://edc-mass-control.51.178.94.25.nip.io/management
- **DSP Protocol:** http://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp

#### Ikerlan (IKLN)
- **Management API:** https://edc-ikln-control.51.178.94.25.nip.io/management
- **DSP Protocol:** http://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp

---

## 9. Proceso de Despliegue

### Paso a Paso

```bash
# 1. Navegar al directorio del proyecto
cd ~/projects/assembly/iflex/ui/k8s

# 2. Ejecutar script de despliegue OVH
./deploy-ovh.sh
```

**El script automáticamente:**
1. Configura KUBECONFIG para cluster OVH
2. Verifica conectividad con el cluster
3. Crea namespace `edc-ui` si no existe
4. Actualiza referencias de namespace en archivos YAML
5. Aplica configuraciones de Kubernetes:
   - RBAC (Service Account, Roles, RoleBindings)
   - ConfigMap
   - Deployment
   - Service
   - Ingress
6. Espera a que el deployment esté listo
7. Muestra la URL de acceso

---

## 10. Seguridad y Consideración de Producción

### ⚠️ Aspectos a Revisar en Producción

1. **API Keys Hard-coded:**
   ```typescript
   apiKey: "mass-api-key-change-in-production"
   apiKey: "ikln-api-key-change-in-production"
   ```
   **Recomendación:** Usar Kubernetes Secrets

2. **SSL/TLS:**
   - `NODE_TLS_REJECT_UNAUTHORIZED: "0"` - Desactiva validación SSL
   - DSP Protocol usa HTTP en lugar de HTTPS
   **Recomendación:** Implementar certificados válidos

3. **Ingress sin HTTPS:**
   - `ssl-redirect: "false"`
   **Recomendación:** Configurar cert-manager + Let's Encrypt

4. **Secrets Management:**
   - Las claves API deberían estar en Kubernetes Secrets o un servicio de gestión de secretos (HashiCorp Vault, etc.)

---

## 11. Conectores Comentados (No Desplegados)

En el archivo `edc-config.ts` existen conectores comentados que no están en uso:

- **Ikerlan Connector Black** - Dataspace Ikerlan
- **Provider FL** - Federated Learning services
- **Provider ML** - Machine Learning services
- **Consumer Default** - Default consumer
- **Ikerlan Connector Green** - Ikerlan Dataspace provider

Estos conectores pueden activarse descomentando las secciones correspondientes.

---

## 12. Resumen de Cambios Clave

| Componente | Cambio | Motivo |
|------------|--------|--------|
| **deploy-ovh.sh** | Nuevo script específico para OVH | Configurar kubeconfig correcto |
| **deploy.sh** | Desactivar build/push de imagen | Usar imagen pre-construida |
| **deploy.sh** | Comentar detección de kind cluster | No aplicable en OVH |
| **ingress.yaml** | Host: `edc-ui.51.178.94.25.nip.io` | URL pública del servicio |
| **ingress.yaml** | `ssl-redirect: "false"` | Funcionar sin certificados SSL |
| **edc-config.ts** | URLs con IP 51.178.94.25 | Apuntar a conectores en OVH |
| **edc-config.ts** | dspAddress con HTTP | Compatibilidad protocolo DSP |
| **deployment.yaml** | `NODE_TLS_REJECT_UNAUTHORIZED: "0"` | Ignorar errores SSL |
| **Imagen Docker** | `xmendialdua/edc-mngmt-ui:latest` | Imagen pre-construida en Docker Hub |

---

## 13. Comandos Útiles

```bash
# Ver estado del deployment
kubectl get pods -n edc-ui
kubectl get svc -n edc-ui
kubectl get ingress -n edc-ui

# Ver logs de la aplicación
kubectl logs -n edc-ui deployment/edc-ui -f

# Reiniciar deployment
kubectl rollout restart deployment/edc-ui -n edc-ui

# Eliminar todo el despliegue
kubectl delete namespace edc-ui

# Acceder al pod
kubectl exec -it -n edc-ui deployment/edc-ui -- /bin/sh
```

---

## 14. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────┐
│         OVH Kubernetes Cluster (51.178.94.25)       │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │   NGINX Ingress Controller                 │   │
│  │   *.51.178.94.25.nip.io                    │   │
│  └──────────────┬─────────────────────────────┘   │
│                 │                                   │
│  ┌──────────────▼──────────────────────────────┐  │
│  │   edc-ui namespace                          │  │
│  │                                              │  │
│  │  ┌─────────────────────────────────────┐   │  │
│  │  │  EDC Management UI                  │   │  │
│  │  │  (Next.js App - Port 3000)          │   │  │
│  │  │  Pod: edc-ui                        │   │  │
│  │  └─────────────────────────────────────┘   │  │
│  │                                              │  │
│  │  ConfigMap: edc-ui-config                   │  │
│  │  Service: edc-ui (ClusterIP)                │  │
│  │  ServiceAccount: edc-ui-sa                  │  │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  External Connectors:                              │
│  - edc-mass-control.51.178.94.25.nip.io           │
│  - edc-ikln-control.51.178.94.25.nip.io           │
│                                                     │
└─────────────────────────────────────────────────────┘

           │
           ▼
    http://edc-ui.51.178.94.25.nip.io
```

---

## Notas Finales

Este despliegue está configurado para un entorno de desarrollo/testing en OVH. Para producción se recomienda:

1. Implementar HTTPS con certificados válidos
2. Utilizar Kubernetes Secrets para API keys
3. Habilitar validación SSL/TLS
4. Configurar políticas de red (NetworkPolicies)
5. Implementar monitorización y logging centralizado
6. Configurar backups de configuración
7. Revisar y ajustar límites de recursos según carga real
