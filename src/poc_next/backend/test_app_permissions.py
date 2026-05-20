"""
Script de diagnóstico para verificar Application Permissions
(Client Credentials Flow con Service Principal)
"""
import os
import msal
import jwt
import json
import requests
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("SHAREPOINT_PROXY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SHAREPOINT_PROXY_CLIENT_SECRET")
TENANT_ID = os.getenv("SHAREPOINT_PROXY_TENANT_ID")

print("=" * 80)
print("🔐 DIAGNÓSTICO: APPLICATION PERMISSIONS (CLIENT CREDENTIALS)")
print("=" * 80)
print()

print("📋 CONFIGURACIÓN:")
print(f"   CLIENT_ID: {CLIENT_ID}")
print(f"   TENANT_ID: {TENANT_ID}")
print(f"   CLIENT_SECRET: {'*' * len(CLIENT_SECRET) if CLIENT_SECRET else 'NOT SET'}")
print()

if not all([CLIENT_ID, CLIENT_SECRET, TENANT_ID]):
    print("❌ ERROR: Faltan credenciales")
    exit(1)

print("🔧 Creando ConfidentialClientApplication...")
authority = f"https://login.microsoftonline.com/{TENANT_ID}"
app = msal.ConfidentialClientApplication(
    CLIENT_ID,
    authority=authority,
    client_credential=CLIENT_SECRET
)
print(f"✅ Aplicación creada")
print()

scopes = ["https://graph.microsoft.com/.default"]

print("🔐 Autenticando con Client Credentials...")
try:
    result = app.acquire_token_for_client(scopes=scopes)
    
    if "access_token" in result:
        print("✅ ¡AUTENTICACIÓN EXITOSA!")
        print()
        
        token = result["access_token"]
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        print("🎭 ROLES (Application Permissions):")
        roles = decoded.get('roles', [])
        if roles:
            for role in roles:
                icon = "✅" if role in ['Sites.Read.All', 'Files.Read.All'] else "•"
                print(f"   {icon} {role}")
        else:
            print("   ⚠️  NO HAY ROLES")
        print()
        
        # Test SharePoint
        SITE_URL = "https://ikerlan.sharepoint.com/sites/IKDataSpace"
        GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"
        
        site_parts = SITE_URL.replace("https://", "").split("/")
        hostname = site_parts[0]
        site_path = "/" + "/".join(site_parts[1:])
        site_url_encoded = f"{hostname}:{site_path}"
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{GRAPH_API_BASE}/sites/{site_url_encoded}",
            headers=headers
        )
        
        print(f"🌐 TEST SHAREPOINT: Status {response.status_code}")
        if response.status_code == 200:
            site_info = response.json()
            print(f"✅ Sitio: {site_info.get('displayName')}")
            site_id = site_info.get('id')
            
            # Test drives
            response = requests.get(
                f"{GRAPH_API_BASE}/sites/{site_id}/drives",
                headers=headers
            )
            if response.status_code == 200:
                drives = response.json().get('value', [])
                print(f"✅ Drives: {len(drives)} encontrados")
                
                if drives:
                    drive_id = drives[0].get('id')
                    response = requests.get(
                        f"{GRAPH_API_BASE}/drives/{drive_id}/root/children",
                        headers=headers
                    )
                    if response.status_code == 200:
                        items = response.json().get('value', [])
                        print(f"✅ Archivos: {len(items)} encontrados")
                        print()
                        print("=" * 80)
                        print("✅ APPLICATION PERMISSIONS FUNCIONAN CORRECTAMENTE")
                        print("=" * 80)
                        print()
                        print("🎉 El backend puede acceder a SharePoint sin usuario")
                        print("   Puedes proceder con la implementación")
                        exit(0)
        
        print(f"❌ Error accediendo a SharePoint: {response.status_code}")
        print(response.text)
        exit(1)
        
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
