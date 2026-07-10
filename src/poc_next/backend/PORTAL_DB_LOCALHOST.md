# Configuración de Desarrollo Local - Portal Database

## Problema

Cuando la aplicación corre en **localhost**, no puede conectarse directamente a la base de datos del portal porque el hostname:

```
portal-portal-backend-postgresql.portal.svc.cluster.local
```

Solo es accesible **dentro del cluster de Kubernetes**.

## Solución: Port-Forward

### 1. Iniciar Port-Forward

Ejecutar en una terminal (debe quedar abierta):

```bash
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

kubectl port-forward -n portal svc/portal-portal-backend-postgresql 5433:5432
```

**Output esperado**:
```
Forwarding from 127.0.0.1:5433 -> 5432
Forwarding from [::1]:5433 -> 5432
```

### 2. Configurar Variables de Entorno

El archivo `backend/.env` ya está configurado para desarrollo local:

```bash
# Portal Database Configuration
PORTAL_DB_HOST=localhost
PORTAL_DB_PORT=5433
PORTAL_DB_NAME=postgres
PORTAL_DB_USER=portal
PORTAL_DB_PASSWORD=dbpasswordportal
```

### 3. Reiniciar la Aplicación

```bash
cd ~/projects/assembly/iflex/src/poc_next
./stop.sh
./start.sh
```

## Verificación

1. Acceder a http://localhost:3020/partner-login
2. Debe mostrar lista de partners (IKLN, MASS)
3. Login con cualquier email y password "1234"

## Para Producción (Kubernetes)

Cuando se despliega en Kubernetes, actualizar ConfigMap con:

```yaml
PORTAL_DB_HOST: portal-portal-backend-postgresql.portal.svc.cluster.local
PORTAL_DB_PORT: "5432"
PORTAL_DB_NAME: postgres
PORTAL_DB_USER: portal
PORTAL_DB_PASSWORD: dbpasswordportal
```

## Troubleshooting

### Error: "Name or service not known"

**Causa**: Port-forward no está activo o configuración incorrecta

**Solución**:
```bash
# Verificar si port-forward está corriendo
ps aux | grep "kubectl port-forward"

# Si no está, iniciarlo de nuevo
kubectl port-forward -n portal svc/portal-portal-backend-postgresql 5433:5432
```

### Error: "Connection refused"

**Causa**: Puerto 5433 ya en uso

**Solución**:
```bash
# Verificar puerto
lsof -i :5433

# Usar otro puerto si es necesario
kubectl port-forward -n portal svc/portal-portal-backend-postgresql 5434:5432

# Actualizar backend/.env
PORTAL_DB_PORT=5434
```

### Matar Port-Forward

```bash
# Encontrar PID
ps aux | grep "kubectl port-forward.*portal-portal"

# Matar proceso
kill <PID>
```

## Script Automatizado

Crear archivo `start-portal-db.sh`:

```bash
#!/bin/bash
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml
kubectl port-forward -n portal svc/portal-portal-backend-postgresql 5433:5432
```

Ejecutar:
```bash
chmod +x start-portal-db.sh
./start-portal-db.sh
```
