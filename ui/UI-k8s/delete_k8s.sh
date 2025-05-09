#!/bin/bash

# Namespace
NAMESPACE="iflex-provider"

# Eliminar recursos en Kubernetes
kubectl delete -f k8s/rbac.yaml -n $NAMESPACE
kubectl delete -f k8s/configmap.yaml -n $NAMESPACE
kubectl delete -f k8s/deployment.yaml -n $NAMESPACE
kubectl delete -f k8s/service.yaml -n $NAMESPACE

# Eliminar el namespace si ya no tiene recursos asociados
kubectl get ns $NAMESPACE &> /dev/null
if [ $? -eq 0 ]; then
    echo "Eliminando namespace $NAMESPACE..."
    kubectl delete namespace $NAMESPACE
else
    echo "El namespace $NAMESPACE no existe."
fi
