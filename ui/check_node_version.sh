#!/bin/bash

# Verificar la versión de Node.js
NODE_VERSION=$(node -v)
echo "Versión de Node.js detectada: $NODE_VERSION"

# Extraer el número de versión principal
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1 | tr -d 'v')

# Verificar si la versión es compatible
if [ "$MAJOR_VERSION" -lt 18 ]; then
  echo "ERROR: Se requiere Node.js 18 o superior para construir esta aplicación."
  echo "Por favor, actualiza Node.js o usa Docker para la construcción."
  exit 1
else
  echo "✅ Versión de Node.js compatible detectada."
  echo "Puedes proceder con la construcción de la aplicación."
fi
