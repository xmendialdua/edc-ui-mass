#!/bin/bash

# Set namespace
NAMESPACE="poc-next"

# Set image names and tags
BACKEND_IMAGE="xmendialdua/poc-next-backend"
FRONTEND_IMAGE="xmendialdua/poc-next-frontend"
IMAGE_TAG_LATEST="latest"
IMAGE_TAG_VERSION="v1.0.0"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🚀 Deploying POC Next to OVH Kubernetes             ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Create namespace if it doesn't exist
echo -e "${YELLOW}Checking if namespace $NAMESPACE exists...${NC}"
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
  echo -e "${YELLOW}Namespace $NAMESPACE does not exist. Creating it...${NC}"
  kubectl create namespace $NAMESPACE
  echo -e "${GREEN}✓ Namespace created${NC}"
else
  echo -e "${GREEN}✓ Namespace $NAMESPACE already exists${NC}"
fi
echo ""

# Build the Docker images (DESACTIVADO - usamos imágenes existentes de Docker Hub)
# echo -e "${BLUE}Building Docker images...${NC}"
# echo -e "${YELLOW}Building backend image...${NC}"
# docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG_LATEST} -t ${BACKEND_IMAGE}:${IMAGE_TAG_VERSION} -f ../backend/Dockerfile ../backend
# echo -e "${YELLOW}Building frontend image...${NC}"
# docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG_LATEST} -t ${FRONTEND_IMAGE}:${IMAGE_TAG_VERSION} -f ../frontend/Dockerfile ../frontend

# Push the images to Docker Hub (DESACTIVADO - usamos imágenes existentes de Docker Hub)
# echo -e "${BLUE}Pushing images to Docker Hub...${NC}"
# docker push ${BACKEND_IMAGE}:${IMAGE_TAG_LATEST}
# docker push ${BACKEND_IMAGE}:${IMAGE_TAG_VERSION}
# docker push ${FRONTEND_IMAGE}:${IMAGE_TAG_LATEST}
# docker push ${FRONTEND_IMAGE}:${IMAGE_TAG_VERSION}

echo -e "${BLUE}Using existing Docker Hub images:${NC}"
echo -e "  - ${BACKEND_IMAGE}:${IMAGE_TAG_LATEST}"
echo -e "  - ${FRONTEND_IMAGE}:${IMAGE_TAG_LATEST}"
echo ""

# Update the deployment.yaml file to use the new images
sed -i "s|image: xmendialdua/poc-next-backend:.*|image: ${BACKEND_IMAGE}:${IMAGE_TAG_LATEST}|g" deployment.yaml
sed -i "s|image: xmendialdua/poc-next-frontend:.*|image: ${FRONTEND_IMAGE}:${IMAGE_TAG_LATEST}|g" deployment.yaml

# Apply Kubernetes configurations
echo -e "${BLUE}Applying Kubernetes configurations...${NC}"
kubectl apply -f rbac.yaml -n $NAMESPACE
echo -e "${GREEN}✓ RBAC applied${NC}"

kubectl apply -f configmap.yaml -n $NAMESPACE
echo -e "${GREEN}✓ ConfigMap and Secrets applied${NC}"

kubectl apply -f deployment.yaml -n $NAMESPACE
echo -e "${GREEN}✓ Deployments applied${NC}"

kubectl apply -f service.yaml -n $NAMESPACE
echo -e "${GREEN}✓ Services applied${NC}"

kubectl apply -f ingress.yaml -n $NAMESPACE
echo -e "${GREEN}✓ Ingress applied${NC}"

echo ""

# Wait for deployments to be ready
echo -e "${BLUE}Waiting for deployments to be ready...${NC}"
kubectl rollout status deployment/poc-next-backend -n $NAMESPACE
echo -e "${GREEN}✓ Backend deployment ready${NC}"

kubectl rollout status deployment/poc-next-frontend -n $NAMESPACE
echo -e "${GREEN}✓ Frontend deployment ready${NC}"

echo ""

# Get the Ingress URL
INGRESS_HOST=$(kubectl get ingress poc-next-frontend -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}')

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ POC Next deployed successfully!                  ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Access the application at:${NC}"
echo -e "  Data Publication: ${GREEN}http://ds-management.51.178.94.25.nip.io/data-publication${NC}"
echo -e "  Partner Data:     ${GREEN}http://ds-management.51.178.94.25.nip.io/partner-data${NC}"
echo -e "  Backend API:      ${GREEN}http://ds-management.51.178.94.25.nip.io/api${NC}"
echo ""
echo -e "${BLUE}Check status with:${NC}"
echo -e "  kubectl get pods -n $NAMESPACE"
echo -e "  kubectl logs -f deployment/poc-next-backend -n $NAMESPACE"
echo -e "  kubectl logs -f deployment/poc-next-frontend -n $NAMESPACE"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
