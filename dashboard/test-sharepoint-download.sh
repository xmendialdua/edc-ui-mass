#!/bin/bash

# Script para diagnosticar problemas de descarga de SharePoint en EDC
# Uso: ./test-sharepoint-download.sh "URL_DEL_ASSET"

URL="$1"

if [ -z "$URL" ]; then
    echo "❌ Error: Proporciona la URL del asset como parámetro"
    echo "Uso: $0 \"https://ikerlan.sharepoint.com/...\""
    exit 1
fi

echo "🔍 Diagnóstico de descarga de SharePoint"
echo "========================================="
echo ""
echo "URL a probar: $URL"
echo ""

# Test 1: Verificar si la URL es accesible sin autenticación
echo "📋 Test 1: Intento de descarga sin autenticación..."
HTTP_CODE=$(curl -L -s -o /dev/null -w "%{http_code}" "$URL" --max-time 10)

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ URL accesible sin autenticación (HTTP 200)"
    echo "   → El archivo es público o tiene token embebido en la URL"
    echo "   → La transferencia EDC debería funcionar"
elif [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "403" ]; then
    echo "❌ Error de autenticación (HTTP $HTTP_CODE)"
    echo "   → La URL requiere autenticación OAuth"
    echo "   → Problema: El DataPlane de EDC no tiene credenciales"
    echo ""
    echo "   Soluciones:"
    echo "   1. Usa el link temporal de Microsoft Graph (checkbox marcado)"
    echo "   2. Configura un proxy con autenticación"
    echo "   3. Usa un archivo público para pruebas"
elif [ "$HTTP_CODE" == "302" ] || [ "$HTTP_CODE" == "301" ]; then
    echo "⚠️  Redirección detectada (HTTP $HTTP_CODE)"
    echo "   → Siguiendo redirecciones..."
    curl -L -I "$URL" --max-time 10
elif [ "$HTTP_CODE" == "404" ]; then
    echo "❌ Archivo no encontrado (HTTP 404)"
    echo "   → Verifica que la URL es correcta"
    echo "   → El archivo puede haber sido movido o eliminado"
elif [ "$HTTP_CODE" == "000" ]; then
    echo "❌ Timeout o error de conexión"
    echo "   → El servidor no responde"
    echo "   → Verifica la conectividad de red"
else
    echo "⚠️  Código HTTP inesperado: $HTTP_CODE"
fi

echo ""
echo "📋 Test 2: Verificar headers de respuesta..."
curl -I "$URL" --max-time 10 2>&1 | head -20

echo ""
echo "========================================="
echo "Diagnóstico completado"
