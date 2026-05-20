"""
Script de diagnóstico para verificar autenticación ROPC
(Resource Owner Password Credentials)

Este script verifica si el usuario ikdataspaceuser1 puede autenticarse
sin MFA usando username + password.
"""
import os
import msal
import jwt
import json
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Obtener credenciales
CLIENT_ID = os.getenv("SHAREPOINT_PROXY_CLIENT_ID")
TENANT_ID = os.getenv("SHAREPOINT_PROXY_TENANT_ID")
USERNAME = os.getenv("SHAREPOINT_USER")
PASSWORD = os.getenv("SHAREPOINT_PASSWORD")

print("=" * 80)
print("🔐 DIAGNÓSTICO: AUTENTICACIÓN ROPC CON USUARIO GENÉRICO")
print("=" * 80)
print()

print("📋 CONFIGURACIÓN:")
print(f"   CLIENT_ID: {CLIENT_ID}")
print(f"   TENANT_ID: {TENANT_ID}")
print(f"   USERNAME: {USERNAME}")
print(f"   PASSWORD: {'*' * len(PASSWORD) if PASSWORD else 'NOT SET'}")
print()

# Verificar que todas las credenciales estén presentes
if not all([CLIENT_ID, TENANT_ID, USERNAME, PASSWORD]):
    print("❌ ERROR: Faltan credenciales en el archivo .env")
    print("   Verifica que estén configuradas:")
    print("   - SHAREPOINT_PROXY_CLIENT_ID")
    print("   - SHAREPOINT_PROXY_TENANT_ID")
    print("   - SHAREPOINT_USER")
    print("   - SHAREPOINT_PASSWORD")
    exit(1)

# Crear aplicación MSAL pública (para ROPC)
print("🔧 Creando PublicClientApplication...")
authority = f"https://login.microsoftonline.com/{TENANT_ID}"
app = msal.PublicClientApplication(
    CLIENT_ID,
    authority=authority
)
print(f"✅ Aplicación MSAL creada (authority: {authority})")
print()

# Definir scopes necesarios para SharePoint
scopes = [
    "https://graph.microsoft.com/Files.Read.All",
    "https://graph.microsoft.com/Sites.Read.All",
    "https://graph.microsoft.com/User.Read"
]

print("🔐 Intentando autenticación ROPC...")
print(f"   Scopes solicitados:")
for scope in scopes:
    print(f"     • {scope}")
print()

try:
    # Intentar autenticación con username/password
    result = app.acquire_token_by_username_password(
        username=USERNAME,
        password=PASSWORD,
        scopes=scopes
    )
    
    print("📥 RESPUESTA DE AZURE AD:")
    print("-" * 80)
    
    # Verificar si hay token en la respuesta
    if "access_token" in result:
        print("✅ ¡AUTENTICACIÓN EXITOSA!")
        print()
        
        token = result["access_token"]
        print(f"🎫 Token obtenido: {token[:60]}...")
        print(f"   Longitud: {len(token)} caracteres")
        print()
        
        # Información adicional del resultado
        if "expires_in" in result:
            print(f"⏱️  Expira en: {result['expires_in']} segundos ({result['expires_in']//60} minutos)")
        if "token_type" in result:
            print(f"🏷️  Tipo de token: {result['token_type']}")
        if "scope" in result:
            print(f"🔓 Scopes otorgados: {result['scope']}")
        print()
        
        # Decodificar token (sin verificar firma)
        print("🔍 DECODIFICANDO TOKEN...")
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        print()
        print("👤 INFORMACIÓN DEL USUARIO:")
        print(f"   UPN: {decoded.get('upn', 'N/A')}")
        print(f"   Name: {decoded.get('name', 'N/A')}")
        print(f"   Unique Name: {decoded.get('unique_name', 'N/A')}")
        print(f"   OID (Object ID): {decoded.get('oid', 'N/A')}")
        print()
        
        print("🔑 INFORMACIÓN DEL TOKEN:")
        print(f"   Audience (aud): {decoded.get('aud', 'N/A')}")
        print(f"   Issuer (iss): {decoded.get('iss', 'N/A')}")
        print(f"   Tenant ID (tid): {decoded.get('tid', 'N/A')}")
        print()
        
        # Verificar scopes delegados
        scp = decoded.get('scp', '')
        print("🔓 SCOPES DELEGADOS (Delegated Permissions):")
        if scp:
            scopes_list = scp.split(' ')
            for scope in scopes_list:
                print(f"   ✓ {scope}")
        else:
            print("   ⚠️  No hay scopes en el token")
        print()
        
        # Mostrar token completo (para debug)
        print("📄 TOKEN DECODIFICADO COMPLETO:")
        print(json.dumps(decoded, indent=2))
        print()
        
        print("=" * 80)
        print("✅ RESULTADO: ROPC FUNCIONA CORRECTAMENTE")
        print("=" * 80)
        print()
        print("✓ El usuario ikdataspaceuser1 NO tiene MFA habilitado")
        print("✓ El flujo ROPC está permitido en Azure AD")
        print("✓ Las credenciales son correctas")
        print("✓ Puedes proceder con la implementación")
        print()
        
        # Guardar token en archivo para el siguiente test
        with open("/tmp/ropc_token.txt", "w") as f:
            f.write(token)
        print("💾 Token guardado en /tmp/ropc_token.txt para test de SharePoint")
        
    elif "error" in result:
        print("❌ ERROR EN AUTENTICACIÓN")
        print()
        print(f"   Error: {result.get('error', 'Unknown')}")
        print(f"   Descripción: {result.get('error_description', 'N/A')}")
        print()
        
        # Diagnóstico específico según el error
        error_code = result.get('error', '')
        
        if error_code == 'invalid_grant':
            print("🔍 DIAGNÓSTICO:")
            print("   Este error puede significar:")
            print("   1. ❌ Credenciales incorrectas (username o password)")
            print("   2. ❌ El usuario tiene MFA habilitado")
            print("   3. ❌ La cuenta está bloqueada o deshabilitada")
            print()
            print("🔧 SOLUCIONES:")
            print("   • Verifica el username y password en .env")
            print("   • Desactiva MFA para ikdataspaceuser1 en Azure AD")
            print("   • Verifica que la cuenta esté activa")
            
        elif error_code == 'unauthorized_client':
            print("🔍 DIAGNÓSTICO:")
            print("   El flujo ROPC NO está permitido para esta aplicación")
            print()
            print("🔧 SOLUCIÓN:")
            print("   1. Ve a Azure Portal: https://portal.azure.com")
            print("   2. Azure Active Directory → App registrations")
            print(f"   3. Busca tu app: {CLIENT_ID}")
            print("   4. Authentication → Advanced settings")
            print("   5. Allow public client flows → YES")
            print("   6. Guarda los cambios")
            
        elif 'AADSTS50076' in result.get('error_description', ''):
            print("🔍 DIAGNÓSTICO:")
            print("   ❌ MFA (Multi-Factor Authentication) ESTÁ HABILITADO")
            print("   El flujo ROPC NO funciona con MFA")
            print()
            print("🔧 SOLUCIONES:")
            print("   Opción A (Recomendada): Deshabilitar MFA para ikdataspaceuser1")
            print("   Opción B: Usar Application Permissions en lugar de ROPC")
            
        else:
            print("🔍 DIAGNÓSTICO:")
            print("   Error no reconocido. Detalles completos:")
            print()
            print(json.dumps(result, indent=2))
        
        print()
        exit(1)
    
    else:
        print("❌ RESPUESTA INESPERADA")
        print(json.dumps(result, indent=2))
        exit(1)

except Exception as e:
    print("❌ EXCEPCIÓN DURANTE LA AUTENTICACIÓN")
    print()
    print(f"Tipo: {type(e).__name__}")
    print(f"Mensaje: {str(e)}")
    print()
    import traceback
    traceback.print_exc()
    exit(1)
