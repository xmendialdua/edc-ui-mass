#!/bin/bash

set -e  # Detiene la ejecución si hay algún error

# Destruir el despliegue actual
echo "Destruyendo el despliegue con Terraform..."
terraform destroy --auto-approve

# Construir y subir la imagen Docker
echo "Construyendo la imagen Docker..."
cd modelApi/
docker build -t jalvaro8/fl-api:prov .
echo "Pushing la imagen Docker al repositorio..."
docker push jalvaro8/fl-api:prov
cd ..

# Aplicar la configuración de Terraform
echo "Aplicando la configuración con Terraform..."
terraform apply --auto-approve

echo "Despliegue completado."
