#!/bin/bash
###############################################################
# Script de REDESPLIEGUE de conectores con configuración IATP CORREGIDA
# Fecha: 2026-03-18
# 
# CAMBIOS APLICADOS:
# - DID apunta al DSP endpoint del conector (no al wallet)
# - EDC_IAM_DID_WEB_USE_HTTPS: true (forzar HTTPS)
###############################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

NAMESPACE="umbrella"
CHART_PATH="../documentos_utilizados_en_despliegue_conectores/dataspace-connector-bundle"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}REDESPLIEGUE DE CONECTORES - IATP FIX${NC}"
echo -e "${GREEN}============================================${NC}"

# Configurar kubeconfig
export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml

echo -e "\n${YELLOW}Verificando conectores actuales...${NC}"
kubectl get pods -n ${NAMESPACE} | grep -E "mass-edc|ikln-edc"

echo -e "\n${RED}⚠️  ATENCIÓN: Se van a redesplegar los conectores con los nuevos values${NC}"
echo -e "${YELLOW}Esto aplicará los siguientes cambios críticos:${NC}"
echo -e "  1. DIDs apuntarán a los DSP endpoints de los conectores"
echo -e "  2. EDC_IAM_DID_WEB_USE_HTTPS: true (resolución HTTPS)"
echo -e "\n${YELLOW}¿Continuar? (yes/no): ${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Cancelado por el usuario${NC}"
    exit 1
fi

# Redesplegar MASS
echo -e "\n${GREEN}[1/2] Redesplegando MASS connector...${NC}"
helm upgrade --install mass-edc ${CHART_PATH} \
  --namespace ${NAMESPACE} \
  --values ./values-mass-connector-fixed.yaml \
  --timeout 15m \
  --wait

# Redesplegar IKLN
echo -e "\n${GREEN}[2/2] Redesplegando IKLN connector...${NC}"
helm upgrade --install ikln-edc ${CHART_PATH} \
  --namespace ${NAMESPACE} \
  --values ./values-ikln-connector-fixed.yaml \
  --timeout 15m \
  --wait

# Verificar despliegue
echo -e "\n${YELLOW}Verificando redespliegue...${NC}"
echo -e "\n${GREEN}=== Pods ===${NC}"
kubectl get pods -n ${NAMESPACE} | grep -E "mass-edc|ikln-edc"

echo -e "\n${YELLOW}Esperando a que los pods estén listos...${NC}"
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=mass-edc -n ${NAMESPACE} --timeout=300s
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=ikln-edc -n ${NAMESPACE} --timeout=300s

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Redespliegue completado${NC}"
echo -e "${GREEN}============================================${NC}"

echo -e "\n${YELLOW}Verificando configuración DID en pods:${NC}"
IKLN_POD=$(kubectl get pod -n ${NAMESPACE} -l app.kubernetes.io/instance=ikln-edc,app.kubernetes.io/component=controlplane -o jsonpath='{.items[0].metadata.name}')
MASS_POD=$(kubectl get pod -n ${NAMESPACE} -l app.kubernetes.io/instance=mass-edc,app.kubernetes.io/component=controlplane -o jsonpath='{.items[0].metadata.name}')

echo -e "\n${GREEN}IKLN - Variables DID:${NC}"
kubectl exec -n ${NAMESPACE} ${IKLN_POD} -- env | grep -E "EDC_PARTICIPANT_ID|EDC_IAM_DID_WEB_USE_HTTPS"

echo -e "\n${GREEN}MASS - Variables DID:${NC}"
kubectl exec -n ${NAMESPACE} ${MASS_POD} -- env | grep -E "EDC_PARTICIPANT_ID|EDC_IAM_DID_WEB_USE_HTTPS"

echo -e "\n${YELLOW}Testing DID resolution:${NC}"
echo -e "curl -k https://edc-mass-control.51.178.94.25.nip.io/.well-known/did.json"
echo -e "curl -k https://edc-ikln-control.51.178.94.25.nip.io/.well-known/did.json"

echo -e "\n${GREEN}Puedes probar el catálogo ahora desde el dashboard${NC}"
