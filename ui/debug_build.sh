#!/bin/bash

# Script para depurar la construcción de Next.js

echo "Limpiando directorios de construcción anteriores..."
rm -rf .next

echo "Instalando dependencias..."
npm install

echo "Construyendo la aplicación..."
npm run build

echo "Verificando el contenido del directorio .next..."
ls -la .next

echo "Verificando si existe el directorio standalone..."
if [ -d ".next/standalone" ]; then
  echo "El directorio standalone existe."
  ls -la .next/standalone
else
  echo "El directorio standalone NO existe."
fi

echo "Verificando si existe el directorio static..."
if [ -d ".next/static" ]; then
  echo "El directorio static existe."
  ls -la .next/static
else
  echo "El directorio static NO existe."
fi

echo "Depuración completa."
