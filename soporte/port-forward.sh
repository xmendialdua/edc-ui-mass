export KUBECONFIG=/home/xmendialdua/projects/assembly/tractus-x-umbrella/kubeconfig.yaml
kubectl port-forward -n portal svc/portal-portal-backend-postgresql 5433:5432
