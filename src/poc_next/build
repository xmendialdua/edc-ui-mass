#!/bin/bash

# Build script for POC Next Docker images
# This script builds both backend and frontend Docker images and pushes them to Docker Hub

# Image configuration
DOCKER_USERNAME="xmendialdua"
BACKEND_IMAGE="${DOCKER_USERNAME}/poc-next-backend"
FRONTEND_IMAGE="${DOCKER_USERNAME}/poc-next-frontend"
VERSION="v1.0.0"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🐳 Building POC Next Docker Images                  ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: This script must be run from the src/poc_next directory${NC}"
    exit 1
fi

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

# Build frontend
echo -e "${BLUE}📦 Building frontend image...${NC}"
cd frontend
if docker build -t ${FRONTEND_IMAGE}:latest -t ${FRONTEND_IMAGE}:${VERSION} .; then
    echo -e "${GREEN}✓ Frontend image built successfully${NC}"
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
    echo -e "${GREEN}   ✅ All images built and pushed successfully!       ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Images:${NC}"
    echo -e "  - ${BACKEND_IMAGE}:latest"
    echo -e "  - ${BACKEND_IMAGE}:${VERSION}"
    echo -e "  - ${FRONTEND_IMAGE}:latest"
    echo -e "  - ${FRONTEND_IMAGE}:${VERSION}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  cd k8s && ./deploy.sh"
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
