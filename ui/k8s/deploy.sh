#!/bin/bash

# Set namespace
NAMESPACE="edc-ui"

# Set image name and tags
IMAGE_NAME="xmendialdua/edc-mngmt-ui"
IMAGE_TAG_LATEST="latest"
IMAGE_TAG_VERSION="1105"

# Create namespace if it doesn't exist
echo "Checking if namespace $NAMESPACE exists..."
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
  echo "Namespace $NAMESPACE does not exist. Creating it..."
  kubectl create namespace $NAMESPACE
else
  echo "Namespace $NAMESPACE already exists."
fi

# Build the Docker image with both tags (DESACTIVADO - usamos imagen existente de Docker Hub)
# echo "Building Docker image with tags: ${IMAGE_NAME}:${IMAGE_TAG_LATEST} and ${IMAGE_NAME}:${IMAGE_TAG_VERSION}..."
# docker build -t ${IMAGE_NAME}:${IMAGE_TAG_LATEST} -t ${IMAGE_NAME}:${IMAGE_TAG_VERSION} -f Dockerfile.k8s .

# Push the images to Docker Hub (DESACTIVADO - usamos imagen existente de Docker Hub)
# echo "Pushing images to Docker Hub..."
# docker push ${IMAGE_NAME}:${IMAGE_TAG_LATEST}
# docker push ${IMAGE_NAME}:${IMAGE_TAG_VERSION}

echo "Using existing Docker Hub image: ${IMAGE_NAME}:${IMAGE_TAG_LATEST}"

# Check if we're running in a kind cluster (COMENTADO - desplegando en OVH)
# if kubectl cluster-info | grep -q "kind"; then
#   echo "Detected kind cluster, loading image directly..."
#   kind load docker-image ${IMAGE_NAME}:${IMAGE_TAG_LATEST}
# fi

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
kubectl apply -f k8s/rbac.yaml -n $NAMESPACE
kubectl apply -f k8s/configmap.yaml -n $NAMESPACE
kubectl apply -f k8s/deployment.yaml -n $NAMESPACE
kubectl apply -f k8s/service.yaml -n $NAMESPACE
kubectl apply -f k8s/ingress.yaml -n $NAMESPACE

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/edc-ui -n $NAMESPACE

# Get the Ingress URL
INGRESS_HOST=$(kubectl get ingress edc-ui -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')

echo ""
echo "==================================================================="
echo "EDC UI deployed successfully!"
echo "Access the UI at: http://$INGRESS_HOST"
echo "==================================================================="
echo ""
