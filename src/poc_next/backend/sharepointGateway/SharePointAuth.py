"""
SharePoint Authentication using Service Principal (Client Credentials Flow)
No requiere interacción de usuario - usa credenciales de aplicación

Este módulo gestiona la autenticación con SharePoint/Microsoft Graph usando
un Service Principal de Azure AD, lo cual permite acceso automatizado sin
intervención del usuario.

Uso:
    auth_service = SharePointAuthService()
    token = auth_service.get_access_token()
    
    # Usar token con SharePointGateway
    gateway = SharePointGateway(access_token=token, default_drive_id=...)
"""
import os
import msal
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class SharePointAuthService:
    """
    Gestiona autenticación con SharePoint usando Service Principal.
    
    Utiliza el flujo "Client Credentials" de OAuth 2.0, que permite
    a una aplicación autenticarse con su propia identidad (sin usuario).
    
    Requisitos previos en Azure AD:
    - App Registration con Client ID, Client Secret y Tenant ID
    - Application permissions (NO Delegated):
      * Files.Read.All
      * Sites.Read.All
    - Admin Consent otorgado
    
    Variables de entorno requeridas:
    - SHAREPOINT_PROXY_CLIENT_ID: Application (client) ID
    - SHAREPOINT_PROXY_CLIENT_SECRET: Client secret value
    - SHAREPOINT_PROXY_TENANT_ID: Directory (tenant) ID
    """
    
    def __init__(self, client_id: str = None, client_secret: str = None, tenant_id: str = None):
        """
        Inicializa el servicio de autenticación.
        
        Args:
            client_id: Azure AD Application (client) ID
            client_secret: Azure AD Client secret value
            tenant_id: Azure AD Directory (tenant) ID
            
        Si no se proporcionan, intenta leerlos de variables de entorno (fallback).
        
        Raises:
            ValueError: Si faltan credenciales requeridas
        """
        self.client_id = client_id or os.getenv('SHAREPOINT_PROXY_CLIENT_ID')
        self.client_secret = client_secret or os.getenv('SHAREPOINT_PROXY_CLIENT_SECRET')
        self.tenant_id = tenant_id or os.getenv('SHAREPOINT_PROXY_TENANT_ID')
        
        if not all([self.client_id, self.client_secret, self.tenant_id]):
            raise ValueError(
                "Missing SharePoint proxy credentials. Check .env file:\n"
                "  - SHAREPOINT_PROXY_CLIENT_ID\n"
                "  - SHAREPOINT_PROXY_CLIENT_SECRET\n"
                "  - SHAREPOINT_PROXY_TENANT_ID"
            )
        
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        # Scope .default solicita todos los permisos configurados en Azure AD
        self.scopes = ["https://graph.microsoft.com/.default"]
        
        # Crear MSAL Confidential Client Application
        # Este tipo de aplicación puede mantener secretos de forma segura
        self.app = msal.ConfidentialClientApplication(
            self.client_id,
            authority=self.authority,
            client_credential=self.client_secret
        )
        
        logger.info(f"✅ SharePoint Auth Service initialized for tenant: {self.tenant_id[:8]}...")
    
    def get_access_token(self) -> Optional[str]:
        """
        Obtiene un access token usando client credentials flow.
        
        El token se cachea automáticamente por MSAL y se reutiliza
        mientras sea válido (típicamente 1 hora). Cuando expira,
        MSAL solicita automáticamente uno nuevo.
        
        Returns:
            str: Access token válido para Microsoft Graph API
            None: Si falla la autenticación
            
        Notes:
            - El token incluye todos los permisos configurados en Azure AD
            - Es válido para cualquier operación de Microsoft Graph
            - El cache es thread-safe
        """
        try:
            # Paso 1: Intentar obtener token del cache
            # El cache de MSAL es automático y thread-safe
            result = self.app.acquire_token_silent(self.scopes, account=None)
            
            if not result:
                # Paso 2: No hay token en cache, solicitar uno nuevo
                logger.info("📝 No cached token found, requesting new token from Azure AD...")
                result = self.app.acquire_token_for_client(scopes=self.scopes)
            else:
                logger.info("♻️  Using cached access token")
            
            # Paso 3: Verificar resultado
            if "access_token" in result:
                token_preview = result["access_token"][:20] + "..."
                logger.info(f"✅ Access token obtained successfully: {token_preview}")
                return result["access_token"]
            else:
                # Error en autenticación
                error = result.get("error", "Unknown error")
                error_desc = result.get("error_description", "No description")
                logger.error(f"❌ Failed to obtain token:")
                logger.error(f"   Error: {error}")
                logger.error(f"   Description: {error_desc}")
                
                # Log adicional para errores comunes
                if "AADSTS" in str(error_desc):
                    logger.error("   💡 Tip: Verify Azure AD configuration:")
                    logger.error("      - Client ID and Secret are correct")
                    logger.error("      - Admin Consent has been granted")
                    logger.error("      - Application permissions (not Delegated) are set")
                
                return None
                
        except Exception as e:
            logger.error(f"❌ Exception obtaining access token: {e}")
            logger.exception("Full exception details:")
            return None
    
    def verify_token(self, token: str) -> bool:
        """
        Verifica si un token es válido haciendo una llamada de prueba.
        
        Args:
            token: Access token a verificar
            
        Returns:
            bool: True si el token es válido, False en caso contrario
            
        Notes:
            Hace una llamada GET a /me endpoint de Graph API.
            Solo para propósitos de debugging/testing.
        """
        import requests
        
        try:
            response = requests.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info("✅ Token is valid")
                return True
            else:
                logger.warning(f"⚠️  Token verification failed: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error verifying token: {e}")
            return False
