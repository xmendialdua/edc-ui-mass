"""
Script de diagnóstico para verificar Application Permissions
y mostrar estructura de carpetas y archivos en SharePoint

IMPORTANTE: Este script NO usa credenciales de usuario (Delegated Permissions).
Solo usa Application Permissions (Client Credentials Flow).
"""
import os
import msal
import jwt
import json
import requests
from dotenv import load_dotenv

load_dotenv()

# SOLO credenciales de aplicación (NO de usuario)
CLIENT_ID = os.getenv("SHAREPOINT_PROXY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SHAREPOINT_PROXY_CLIENT_SECRET")
TENANT_ID = os.getenv("SHAREPOINT_PROXY_TENANT_ID")

print("=" * 80)
print("🔐 DIAGNÓSTICO: APPLICATION PERMISSIONS + EXPLORACIÓN DE CARPETAS")
print("=" * 80)
print()

print("📋 CONFIGURACIÓN:")
print(f"   CLIENT_ID: {CLIENT_ID}")
print(f"   TENANT_ID: {TENANT_ID}")
print(f"   CLIENT_SECRET: {'*' * len(CLIENT_SECRET) if CLIENT_SECRET else 'NOT SET'}")
print()
print("⚠️  NO SE USAN CREDENCIALES DE USUARIO")
print("   (Este script usa SOLO Application Permissions, no Delegated)")
print()

if not all([CLIENT_ID, CLIENT_SECRET, TENANT_ID]):
    print("❌ ERROR: Faltan credenciales de aplicación")
    exit(1)

# Crear aplicación MSAL CONFIDENCIAL (Application Permissions)
print("🔧 Creando ConfidentialClientApplication...")
authority = f"https://login.microsoftonline.com/{TENANT_ID}"
app = msal.ConfidentialClientApplication(
    CLIENT_ID,
    authority=authority,
    client_credential=CLIENT_SECRET
)
print(f"✅ Aplicación creada")
print()

# Scope para Application Permissions
scopes = ["https://graph.microsoft.com/.default"]

print("🔐 Autenticando con Client Credentials Flow...")
print("   (Service Principal, NO usuario)")
print()

try:
    result = app.acquire_token_for_client(scopes=scopes)
    
    if "access_token" in result:
        print("✅ ¡AUTENTICACIÓN EXITOSA!")
        print()
        
        token = result["access_token"]
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Verificar que NO hay información de usuario
        print("🔍 VERIFICANDO TIPO DE TOKEN:")
        print("-" * 80)
        has_user_info = any(key in decoded for key in ['upn', 'unique_name', 'preferred_username'])
        
        if has_user_info:
            print("❌ ERROR: El token contiene información de usuario")
            print("   Esto significa que estás usando Delegated Permissions, no Application Permissions")
            exit(1)
        else:
            print("✅ Token NO contiene información de usuario")
            print("   Confirmado: Usando Application Permissions (Service Principal)")
        print()
        
        # Mostrar roles
        print("🎭 ROLES (Application Permissions):")
        roles = decoded.get('roles', [])
        if roles:
            for role in roles:
                icon = "✅" if role in ['Sites.Read.All', 'Files.Read.All'] else "•"
                print(f"   {icon} {role}")
        else:
            print("   ⚠️  NO HAY ROLES")
            exit(1)
        print()
        
        # Configuración del sitio SharePoint
        SITE_URL = "https://ikerlan.sharepoint.com/sites/IKDataSpace"
        GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
        
        print("=" * 80)
        print("🌐 ACCEDIENDO A SHAREPOINT")
        print("=" * 80)
        print(f"   Site URL: {SITE_URL}")
        print()
        
        # Obtener información del sitio
        site_parts = SITE_URL.replace("https://", "").split("/")
        hostname = site_parts[0]
        site_path = "/" + "/".join(site_parts[1:])
        site_url_encoded = f"{hostname}:{site_path}"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{GRAPH_API_BASE}/sites/{site_url_encoded}",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"❌ Error accediendo al sitio: {response.status_code}")
            print(response.text)
            exit(1)
        
        site_info = response.json()
        print(f"✅ Sitio encontrado: {site_info.get('displayName')}")
        print(f"   Site ID: {site_info.get('id')}")
        print()
        site_id = site_info.get('id')
        
        # Obtener drives del sitio
        response = requests.get(
            f"{GRAPH_API_BASE}/sites/{site_id}/drives",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"❌ Error obteniendo drives: {response.status_code}")
            exit(1)
        
        drives = response.json().get('value', [])
        print(f"📁 DRIVES ENCONTRADOS: {len(drives)}")
        print()
        
        for drive in drives:
            print(f"   Drive: {drive.get('name', 'N/A')}")
            print(f"   ID: {drive.get('id')}")
            print(f"   Type: {drive.get('driveType', 'N/A')}")
            print()
        
        if not drives:
            print("⚠️  No se encontraron drives")
            exit(0)
        
        # Usar el primer drive
        drive_id = drives[0].get('id')
        drive_name = drives[0].get('name', 'N/A')
        
        print("=" * 80)
        print(f"📂 EXPLORANDO ESTRUCTURA DE CARPETAS Y ARCHIVOS")
        print("=" * 80)
        print(f"   Drive: {drive_name}")
        print()
        
        def list_folder_contents(drive_id, folder_path="/root", indent=0):
            """Lista recursivamente el contenido de una carpeta"""
            endpoint = f"{GRAPH_API_BASE}/drives/{drive_id}{folder_path}/children"
            response = requests.get(endpoint, headers=headers)
            
            if response.status_code != 200:
                print(f"{'  ' * indent}❌ Error: {response.status_code}")
                return
            
            items = response.json().get('value', [])
            
            for item in items:
                name = item.get('name', 'N/A')
                is_folder = 'folder' in item
                
                if is_folder:
                    child_count = item['folder'].get('childCount', 0)
                    print(f"{'  ' * indent}📁 {name}/ ({child_count} items)")
                    
                    # Recursivamente listar contenido de subcarpetas
                    item_id = item.get('id')
                    if child_count > 0 and indent < 3:  # Limitar profundidad a 3 niveles
                        list_folder_contents(drive_id, f"/items/{item_id}", indent + 1)
                else:
                    size = item.get('size', 0)
                    size_kb = size / 1024
                    size_mb = size_kb / 1024
                    
                    if size_mb >= 1:
                        size_str = f"{size_mb:.2f} MB"
                    else:
                        size_str = f"{size_kb:.2f} KB"
                    
                    extension = name.split('.')[-1] if '.' in name else ''
                    
                    if extension.lower() in ['pdf']:
                        icon = "📄"
                    elif extension.lower() in ['xlsx', 'xls', 'csv']:
                        icon = "📊"
                    elif extension.lower() in ['docx', 'doc']:
                        icon = "📝"
                    elif extension.lower() in ['jpg', 'jpeg', 'png', 'gif']:
                        icon = "🖼️"
                    else:
                        icon = "📄"
                    
                    print(f"{'  ' * indent}{icon} {name} ({size_str})")
        
        # Listar contenido raíz
        list_folder_contents(drive_id)
        
        print()
        print("=" * 80)
        print("✅ EXPLORACIÓN COMPLETADA CON APPLICATION PERMISSIONS")
        print("=" * 80)
        print()
        print("✓ Autenticación como Service Principal: OK")
        print("✓ NO se usaron credenciales de usuario")
        print("✓ Acceso a SharePoint con Application Permissions: OK")
        print("✓ Estructura de carpetas y archivos listada correctamente")
        print()
        print("🎉 El backend puede acceder a SharePoint de forma independiente")
        print("   sin necesidad de autenticación de usuario individual")
        
    elif "error" in result:
        print("❌ ERROR EN AUTENTICACIÓN")
        print(f"   Error: {result.get('error')}")
        print(f"   Descripción: {result.get('error_description')}")
        exit(1)

except Exception as e:
    print(f"❌ EXCEPCIÓN: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
