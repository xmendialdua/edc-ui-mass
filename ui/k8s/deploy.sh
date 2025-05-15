#!/bin/bash

# Set namespace
NAMESPACE="iflex-ui"

# Set image name and tags
IMAGE_NAME="jalvaro8/iflex-ui"
IMAGE_TAG_LATEST="latest"

# Create namespace if it doesn't exist
echo "Checking if namespace $NAMESPACE exists..."
if ! microk8s kubectl get namespace $NAMESPACE &> /dev/null; then
  echo "Namespace $NAMESPACE does not exist. Creating it..."
  microk8s kubectl create namespace $NAMESPACE
else
  echo "Namespace $NAMESPACE already exists."
fi

# Check if we're running in a kind cluster
if microk8s kubectl cluster-info | grep -q "kind"; then
  echo "Detected kind cluster, loading image directly..."
  kind load docker-image ${IMAGE_NAME}:${IMAGE_TAG_LATEST}
fi

# Update the deployment.yaml file to use the new image
sed -i "s|image:.*|image: ${IMAGE_NAME}:${IMAGE_TAG_LATEST}|g" k8s/deployment.yaml

# Update namespace in all YAML files
for file in k8s/*.yaml; do
  # Skip if the file doesn't exist
  [ -e "$file" ] || continue
  
  # Check if the file already has a namespace defined
  if grep -q "namespace:" "$file"; then
    # Replace existing namespace
    sed -i "s|namespace:.*|namespace: ${NAMESPACE}|g" "$file"
  else
    # For files without namespace, we need to be more careful
    # Only add namespace to metadata sections
    sed -i "/metadata:/,/labels:/s/name: $$.*$$/name: \1\n  namespace: ${NAMESPACE}/" "$file"
  fi
done

# Apply Kubernetes configurations
echo "Applying Kubernetes configurations..."
microk8s kubectl apply -f rbac.yaml -n $NAMESPACE
microk8s kubectl apply -f configmap.yaml -n $NAMESPACE
microk8s kubectl apply -f deployment.yaml -n $NAMESPACE
microk8s kubectl apply -f service.yaml -n $NAMESPACE

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
microk8s kubectl rollout status deployment/edc-ui -n $NAMESPACE

# Get the NodePort URL
NODE_IP=$(microk8s kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
NODE_PORT=$(microk8s kubectl get svc edc-ui -n $NAMESPACE -o jsonpath='{.spec.ports[0].nodePort}')

echo ""
echo "EDC UI is now available at: http://$NODE_IP:$NODE_PORT"
echo ""
