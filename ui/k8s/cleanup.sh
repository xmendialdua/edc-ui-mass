#!/bin/bash

# Set namespace
NAMESPACE="iflex-provider"

echo "Cleaning up EDC UI deployment in namespace $NAMESPACE..."

# Delete all resources
echo "Deleting service..."
kubectl delete service edc-ui -n $NAMESPACE --ignore-not-found

echo "Deleting deployment..."
kubectl delete deployment edc-ui -n $NAMESPACE --ignore-not-found

echo "Deleting configmap..."
kubectl delete configmap edc-ui-config -n $NAMESPACE --ignore-not-found

echo "Deleting RBAC resources..."
kubectl delete serviceaccount edc-ui-sa -n $NAMESPACE --ignore-not-found
kubectl delete clusterrolebinding edc-ui-pod-reader --ignore-not-found
# Note: We're not deleting the ClusterRole as it might be used by other deployments

# Ask if the namespace should be deleted
read -p "Do you want to delete the namespace $NAMESPACE as well? (y/n): " DELETE_NAMESPACE

if [[ "$DELETE_NAMESPACE" =~ ^[Yy]$ ]]; then
  echo "Deleting namespace $NAMESPACE..."
  kubectl delete namespace $NAMESPACE
  echo "Namespace $NAMESPACE deleted."
else
  echo "Namespace $NAMESPACE preserved."
fi

echo "Cleanup completed."
