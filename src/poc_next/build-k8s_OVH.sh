#!/bin/bash

# Build script for POC Next Docker images for Kubernetes deployment
# This script builds with production URLs for OVH deployment

# Image configuration
DOCKER_USERNAME="xmendialdua"
BACKEND_IMAGE="${DOCKER_USERNAME}/poc-next-backend"
FRONTEND_IMAGE="${DOCKER_USERNAME}/poc-next-frontend"
VERSION="v1.0.0"

# Production URL for Kubernetes
PRODUCTION_API_URL="http://ds-management.51.178.94.25.nip.io"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🐳 Building POC Next for Kubernetes (OVH)           ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: This script must be run from the src/poc_next directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Using production API URL: ${PRODUCTION_API_URL}${NC}"
echo ""

# Build backend
echo -e "${BLUE}📦 Building backend image...${NC}"
cd backend
if docker build -t ${BACKEND_IMAGE}:latest -t ${BACKEND_IMAGE}:${VERSION} .; then
    echo -e "${GREEN}✓ Backend image built successfully${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi
cd ..
echo ""

# Build frontend with production URL
echo -e "${BLUE}📦 Building frontend image for Kubernetes...${NC}"
cd frontend
if docker build \
    --build-arg NEXT_PUBLIC_API_URL="${PRODUCTION_API_URL}" \
    -t ${FRONTEND_IMAGE}:latest \
    -t ${FRONTEND_IMAGE}:${VERSION} .; then
    echo -e "${GREEN}✓ Frontend image built successfully${NC}"
    echo -e "${GREEN}  API URL: ${PRODUCTION_API_URL}${NC}"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi
cd ..
echo ""

# Ask if we should push to Docker Hub
echo -e "${YELLOW}Push images to Docker Hub? [y/N]${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo -e "${BLUE}📤 Pushing images to Docker Hub...${NC}"
    
    echo -e "${YELLOW}Pushing backend image...${NC}"
    docker push ${BACKEND_IMAGE}:latest
    docker push ${BACKEND_IMAGE}:${VERSION}
    echo -e "${GREEN}✓ Backend image pushed${NC}"
    
    echo -e "${YELLOW}Pushing frontend image...${NC}"
    docker push ${FRONTEND_IMAGE}:latest
    docker push ${FRONTEND_IMAGE}:${VERSION}
    echo -e "${GREEN}✓ Frontend image pushed${NC}"
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ Images built and pushed for Kubernetes!         ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Images:${NC}"
    echo -e "  - ${BACKEND_IMAGE}:latest"
    echo -e "  - ${BACKEND_IMAGE}:${VERSION}"
    echo -e "  - ${FRONTEND_IMAGE}:latest (API: ${PRODUCTION_API_URL})"
    echo -e "  - ${FRONTEND_IMAGE}:${VERSION} (API: ${PRODUCTION_API_URL})"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  cd k8s && ./deploy.sh"
    echo ""
    echo -e "${BLUE}Access URLs after deployment:${NC}"
    echo -e "  ${GREEN}http://ds-management.51.178.94.25.nip.io/data-publication${NC}"
    echo -e "  ${GREEN}http://ds-management.51.178.94.25.nip.io/partner-data${NC}"
else
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ Images built locally                            ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Images are built but not pushed to Docker Hub${NC}"
    echo -e "${BLUE}To push manually later:${NC}"
    echo -e "  docker push ${BACKEND_IMAGE}:latest"
    echo -e "  docker push ${FRONTEND_IMAGE}:latest"
fi
