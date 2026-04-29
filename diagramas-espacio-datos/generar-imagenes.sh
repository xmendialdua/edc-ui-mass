#!/bin/bash

# Script para generar imágenes PNG de los diagramas Mermaid
# Requiere: @mermaid-js/mermaid-cli (mmdc)

echo "🎨 Generando imágenes PNG de los diagramas..."

# Verificar si mermaid-cli está instalado
if ! command -v mmdc &> /dev/null; then
    echo "⚠️  mermaid-cli no está instalado."
    echo "📦 Instalando @mermaid-js/mermaid-cli..."
    npm install -g @mermaid-js/mermaid-cli
fi

# Configuración de calidad
CONFIG='{
  "theme": "default",
  "themeVariables": {
    "fontSize": "18px",
    "fontFamily": "Segoe UI, Arial, sans-serif"
  },
  "flowchart": {
    "useMaxWidth": true,
    "htmlLabels": true,
    "curve": "basis"
  }
}'

# Crear archivo de configuración temporal
echo "$CONFIG" > mermaid-config.json

# Directorio de salida
mkdir -p imagenes-png

# Convertir cada diagrama
echo "📊 Convirtiendo diagramas..."

mmdc -i 01-arquitectura-tractus-x.mmd -o imagenes-png/01-arquitectura-tractus-x.png -w 2400 -H 1800 -b transparent -c mermaid-config.json
mmdc -i 02-flujo-intercambio-datos.mmd -o imagenes-png/02-flujo-intercambio-datos.png -w 2400 -H 2000 -b white -c mermaid-config.json
mmdc -i 03-implementacion-iflex.mmd -o imagenes-png/03-implementacion-iflex.png -w 2800 -H 1800 -b transparent -c mermaid-config.json
mmdc -i 04-concepto-valor.mmd -o imagenes-png/04-concepto-valor.png -w 2400 -H 2000 -b transparent -c mermaid-config.json
mmdc -i 05-arquitectura-despliegue-ovh.mmd -o imagenes-png/05-arquitectura-despliegue-ovh.png -w 3200 -H 2400 -b white -c mermaid-config.json

# Limpiar archivo temporal
rm mermaid-config.json

echo "✅ ¡Imágenes generadas exitosamente en la carpeta 'imagenes-png'!"
echo ""
echo "Archivos creados:"
echo "  - 01-arquitectura-tractus-x.png (2400x1800px)"
echo "  - 02-flujo-intercambio-datos.png (2400x2000px)"
echo "  - 03-implementacion-iflex.png (2800x1800px)"
echo "  - 04-concepto-valor.png (2400x2000px)"
echo "  - 05-arquitectura-despliegue-ovh.png (3200x2400px)"
echo "  - 03-implementacion-iflex.png (2800x1800px)"
echo "  - 04-concepto-valor.png (2400x2000px)"
