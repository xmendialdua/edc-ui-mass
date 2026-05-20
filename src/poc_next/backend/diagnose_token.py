"""
Script de diagnóstico para verificar permisos del token de Azure AD
"""
import os
import jwt
import json
from sharepointGateway.SharePointAuth import SharePointAuthService

# Obtener credenciales del entorno
client_id = os.getenv("SHAREPOINT_PROXY_CLIENT_ID")
client_secret = os.getenv("SHAREPOINT_PROXY_CLIENT_SECRET")
tenant_id = os.getenv("SHAREPOINT_PROXY_TENANT_ID")

print("=" * 80)
print("DIAGNÓSTICO DE TOKEN DE AZURE AD")
print("=" * 80)
print()

print("📋 CONFIGURACIÓN:")
print(f"   CLIENT_ID: {client_id}")
print(f"   TENANT_ID: {tenant_id}")
print(f"   CLIENT_SECRET: {'***' if client_secret else 'NOT SET'}")
print()

# Obtener token
print("🔐 Obteniendo access token...")
auth_service = SharePointAuthService(
    client_id=client_id,
    client_secret=client_secret,
    tenant_id=tenant_id
)

token = auth_service.get_access_token()

if not token:
    print("❌ ERROR: No se pudo obtener el token")
    exit(1)

print(f"✅ Token obtenido: {token[:50]}...")
print()

# Decodificar token (sin verificar firma)
print("🔍 DECODIFICANDO TOKEN (sin verificación de firma)...")
try:
    decoded = jwt.decode(token, options={"verify_signature": False})
    
    print("📄 CONTENIDO DEL TOKEN:")
    print(json.dumps(decoded, indent=2))
    print()
    
    print("🔑 INFORMACIÓN CLAVE:")
    print(f"   App ID (aud): {decoded.get('aud', 'N/A')}")
    print(f"   Issuer (iss): {decoded.get('iss', 'N/A')}")
    print(f"   Tenant ID (tid): {decoded.get('tid', 'N/A')}")
    print(f"   Token Type: {decoded.get('token_type', 'N/A')}")
    print()
    
    # Verificar roles (Application permissions)
    roles = decoded.get('roles', [])
    print("🎭 ROLES (Application Permissions):")
    if roles:
        for role in roles:
            print(f"   ✓ {role}")
    else:
        print("   ❌ NO HAY ROLES - El Service Principal NO tiene Application permissions")
    print()
    
    # Verificar scopes (Delegated permissions)
    scp = decoded.get('scp', '')
    print("🔓 SCOPES (Delegated Permissions):")
    if scp:
        scopes = scp.split(' ')
        for scope in scopes:
            print(f"   • {scope}")
    else:
        print("   (Ninguno)")
    print()
    
    # Diagnóstico
    print("=" * 80)
    print("📊 DIAGNÓSTICO:")
    print("=" * 80)
    
    if not roles:
        print("❌ PROBLEMA ENCONTRADO:")
        print("   El token NO contiene 'roles', lo que significa que el Service Principal")
        print("   NO tiene Application permissions configurados.")
        print()
        print("🔧 SOLUCIÓN:")
        print("   1. Ve al Azure Portal: https://portal.azure.com")
        print("   2. Azure Active Directory → App registrations")
        print(f"   3. Busca tu app: {client_id}")
        print("   4. API permissions → Add a permission")
        print("   5. Microsoft Graph → Application permissions")
        print("   6. Añade: Files.Read.All, Sites.Read.All")
        print("   7. ⚠️  IMPORTANTE: Grant admin consent")
        print()
    else:
        required_roles = {'Files.Read.All', 'Sites.Read.All'}
        has_required = required_roles.intersection(set(roles))
        
        if has_required:
            print("✅ El token tiene los roles necesarios")
        else:
            print("⚠️  El token tiene roles, pero faltan permisos de SharePoint:")
            print(f"   Necesarios: {', '.join(required_roles)}")
            print(f"   Actuales: {', '.join(roles)}")
    
except Exception as e:
    print(f"❌ Error decodificando token: {e}")
    import traceback
    traceback.print_exc()
