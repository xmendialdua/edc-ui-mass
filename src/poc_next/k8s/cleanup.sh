#!/bin/bash

# Cleanup script for POC Next Kubernetes deployment

NAMESPACE="poc-next"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   🧹 Cleaning up POC Next deployment                 ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""

# Delete resources
echo -e "${YELLOW}Deleting Kubernetes resources...${NC}"

kubectl delete ingress poc-next-frontend -n $NAMESPACE 2>/dev/null && echo -e "${GREEN}✓ Ingress deleted${NC}" || echo -e "${RED}✗ Ingress not found${NC}"
kubectl delete service poc-next-backend poc-next-frontend -n $NAMESPACE 2>/dev/null && echo -e "${GREEN}✓ Services deleted${NC}" || echo -e "${RED}✗ Services not found${NC}"
kubectl delete deployment poc-next-backend poc-next-frontend -n $NAMESPACE 2>/dev/null && echo -e "${GREEN}✓ Deployments deleted${NC}" || echo -e "${RED}✗ Deployments not found${NC}"
kubectl delete configmap poc-next-config -n $NAMESPACE 2>/dev/null && echo -e "${GREEN}✓ ConfigMap deleted${NC}" || echo -e "${RED}✗ ConfigMap not found${NC}"
kubectl delete secret poc-next-secrets -n $NAMESPACE 2>/dev/null && echo -e "${GREEN}✓ Secrets deleted${NC}" || echo -e "${RED}✗ Secrets not found${NC}"
kubectl delete serviceaccount poc-next-sa -n $NAMESPACE 2>/dev/null && echo -e "${GREEN}✓ ServiceAccount deleted${NC}" || echo -e "${RED}✗ ServiceAccount not found${NC}"
kubectl delete clusterrolebinding poc-next-pod-reader-binding 2>/dev/null && echo -e "${GREEN}✓ ClusterRoleBinding deleted${NC}" || echo -e "${RED}✗ ClusterRoleBinding not found${NC}"
kubectl delete clusterrole poc-next-pod-reader 2>/dev/null && echo -e "${GREEN}✓ ClusterRole deleted${NC}" || echo -e "${RED}✗ ClusterRole not found${NC}"

echo ""
echo -e "${YELLOW}Delete namespace? [y/N]${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    kubectl delete namespace $NAMESPACE && echo -e "${GREEN}✓ Namespace deleted${NC}"
else
    echo -e "${YELLOW}Namespace preserved${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Cleanup completed                                ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
