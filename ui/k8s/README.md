# Despliegue de EDC-UI en Kubernetes

Este directorio contiene los archivos necesarios para desplegar la aplicación EDC-UI en un cluster de Kubernetes.

## Requisitos previos

- Un cluster de Kubernetes funcionando
- kubectl configurado para acceder al cluster
- Docker instalado (para construir la imagen)

## Archivos incluidos

- `deployment.yaml`: Define el Deployment de Kubernetes para la aplicación
- `service.yaml`: Define el Service para exponer la aplicación externamente
- `rbac.yaml`: Define los permisos necesarios para que la aplicación pueda acceder a los recursos del cluster
- `configmap.yaml`: Define las variables de entorno para la aplicación
- `deploy.sh`: Script para facilitar el despliegue

## Pasos para el despliegue

1. Construir la imagen Docker:
   \`\`\`bash
   docker build -t edc-ui:latest -f Dockerfile.k8s .
   \`\`\`

2. Si estás usando kind, carga la imagen en el cluster:
   \`\`\`bash
   kind load docker-image edc-ui:latest
   \`\`\`

3. Aplicar las configuraciones de Kubernetes:
   \`\`\`bash
   kubectl apply -f k8s/rbac.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   \`\`\`

4. Verificar que el despliegue esté funcionando:
   \`\`\`bash
   kubectl get pods -l app=edc-ui
   \`\`\`

5. Obtener la URL para acceder a la aplicación:
   \`\`\`bash
   NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
   NODE_PORT=$(kubectl get svc edc-ui -o jsonpath='{.spec.ports[0].nodePort}')
   echo "EDC UI is now available at: http://$NODE_IP:$NODE_PORT"
   \`\`\`

Alternativamente, puedes usar el script `deploy.sh` para realizar todos estos pasos automáticamente:
\`\`\`bash
chmod +x k8s/deploy.sh
./k8s/deploy.sh
\`\`\`

## Acceso a la aplicación

La aplicación estará disponible en el puerto 30000 de cualquier nodo del cluster. Si estás usando minikube, puedes acceder a la aplicación con:
\`\`\`bash
minikube service edc-ui
\`\`\`

## Configuración

Si necesitas modificar la configuración de la aplicación, puedes editar el archivo `configmap.yaml` y volver a aplicarlo:
\`\`\`bash
kubectl apply -f k8s/configmap.yaml
kubectl rollout restart deployment/edc-ui
