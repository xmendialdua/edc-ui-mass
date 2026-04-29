"""
SharePoint Proxy Router

Este router actúa como intermediario (proxy) entre el EDC DataPlane y SharePoint.
Resuelve el problema de autenticación OAuth 2.0 que el DataPlane no puede manejar.

Flujo de descarga:
1. EDC Consumer (IKLN) solicita asset a EDC Provider (MASS)
2. EDC Provider DataPlane intenta descargar desde baseUrl del asset
3. baseUrl apunta a este proxy: /api/sharepoint-proxy/download/{encoded}
4. Proxy autentica con Azure AD y descarga de SharePoint
5. Proxy sirve el archivo al DataPlane
6. DataPlane entrega el archivo al Consumer

Endpoints:
- GET /api/sharepoint-proxy/download/{encoded_file_info}: Descarga archivo
- GET /api/sharepoint-proxy/health: Health check del servicio
"""
import os
import base64
import logging
import mimetypes
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from sharepointGateway.SharePointAuth import SharePointAuthService
from sharepointGateway.SharePointGateway import SharePointGateway
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Singleton para el servicio de autenticación
# Se inicializa una sola vez y se reutiliza (más eficiente)
_auth_service = None

def get_auth_service() -> SharePointAuthService:
    """
    Lazy initialization del servicio de autenticación.
    
    Patrón Singleton: crea la instancia solo cuando se necesita
    y la reutiliza en llamadas posteriores.
    
    Lee las credenciales desde config.settings (Pydantic Settings).
    
    Returns:
        SharePointAuthService: Instancia del servicio de autenticación
    """
    global _auth_service
    if _auth_service is None:
        logger.info("🔧 Initializing SharePoint Auth Service...")
        _auth_service = SharePointAuthService(
            client_id=settings.sharepoint_proxy_client_id,
            client_secret=settings.sharepoint_proxy_client_secret,
            tenant_id=settings.sharepoint_proxy_tenant_id
        )
    return _auth_service

@router.get("/sharepoint-proxy/download/{encoded_file_info}")
async def download_sharepoint_file(encoded_file_info: str):
    """
    Endpoint proxy para descargar archivos de SharePoint.
    
    Este endpoint es llamado por el EDC DataPlane cuando intenta descargar
    un asset. El proxy gestiona la autenticación OAuth y descarga el archivo
    real de SharePoint.
    
    Args:
        encoded_file_info: Base64 URL-safe encoding de "drive_id|item_id"
                          Ejemplo: "YjEhWHl6MTIzfDAxQUJDREVG"
    
    Returns:
        Response: Archivo binario con headers apropiados
        
    Raises:
        HTTPException 400: Si encoded_file_info no es válido
        HTTPException 503: Si falla la autenticación con Azure AD
        HTTPException 500: Si falla la descarga desde SharePoint
        
    Headers de respuesta:
        - Content-Disposition: attachment con nombre del archivo
        - Content-Type: MIME type del archivo
        - Content-Length: Tamaño del archivo en bytes
        
    Ejemplo de uso:
        GET /api/sharepoint-proxy/download/YjEhWHl6MTIzfDAxQUJDREVG
        
        Respuesta:
        HTTP/1.1 200 OK
        Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
        Content-Disposition: attachment; filename="Document.docx"
        Content-Length: 45678
        
        <binary file content>
    """
    try:
        # PASO 1: Decodificar información del archivo
        # El frontend codifica "drive_id|item_id" en base64 URL-safe
        try:
            # Decodificar base64 URL-safe
            decoded_bytes = base64.urlsafe_b64decode(encoded_file_info.encode())
            decoded_str = decoded_bytes.decode('utf-8')
            
            # Separar drive_id e item_id
            parts = decoded_str.split('|', 1)
            if len(parts) != 2:
                raise ValueError("Invalid format: expected 'drive_id|item_id'")
            
            drive_id, item_id = parts
            
            # Validar que no estén vacíos
            if not drive_id or not item_id:
                raise ValueError("drive_id and item_id cannot be empty")
                
        except Exception as e:
            logger.error(f"❌ Error decoding file info: {e}")
            logger.error(f"   Received: {encoded_file_info}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file identifier format: {str(e)}"
            )
        
        # Log de la petición (con IDs truncados por seguridad)
        drive_preview = drive_id[:8] + "..." if len(drive_id) > 8 else drive_id
        item_preview = item_id[:8] + "..." if len(item_id) > 8 else item_id
        logger.info(f"📥 Proxy download request:")
        logger.info(f"   Drive ID: {drive_preview}")
        logger.info(f"   Item ID: {item_preview}")
        
        # PASO 2: Obtener access token de Azure AD
        logger.info("🔐 Obtaining access token from Azure AD...")
        auth = get_auth_service()
        access_token = auth.get_access_token()
        
        if not access_token:
            logger.error("❌ Failed to obtain access token from Azure AD")
            logger.error("   Check Azure AD configuration:")
            logger.error("   - SHAREPOINT_PROXY_CLIENT_ID")
            logger.error("   - SHAREPOINT_PROXY_CLIENT_SECRET")
            logger.error("   - SHAREPOINT_PROXY_TENANT_ID")
            logger.error("   - Admin Consent granted")
            raise HTTPException(
                status_code=503, 
                detail="Failed to authenticate with SharePoint. Check server logs."
            )
        
        logger.info("✅ Access token obtained successfully")
        
        # PASO 3: Descargar archivo desde SharePoint
        logger.info("📥 Downloading file from SharePoint...")
        gateway = SharePointGateway(access_token=access_token, default_drive_id=drive_id)
        
        try:
            # Descargar contenido del archivo (devuelve tupla: content, filename)
            file_content, filename = gateway.download_file(drive_id=drive_id, item_id=item_id)
            
            # Inferir MIME type del nombre del archivo
            mime_type, _ = mimetypes.guess_type(filename)
            if mime_type is None:
                mime_type = 'application/octet-stream'  # Fallback genérico
            
            file_size = len(file_content)
            logger.info(f"✅ File downloaded successfully:")
            logger.info(f"   Filename: {filename}")
            logger.info(f"   Size: {file_size:,} bytes ({file_size / 1024:.1f} KB)")
            logger.info(f"   MIME type: {mime_type}")
            
            # PASO 4: Retornar archivo como HTTP response
            # Usamos Response en lugar de StreamingResponse porque ya
            # tenemos todo el contenido en memoria (file_content)
            return Response(
                content=file_content,
                media_type=mime_type,
                headers={
                    # Indica al navegador que descargue el archivo
                    'Content-Disposition': f'attachment; filename="{filename}"',
                    # Tamaño total del archivo
                    'Content-Length': str(file_size),
                    # Permitir CORS (si es necesario)
                    'Access-Control-Allow-Origin': '*',
                    # Cache control (los archivos pueden cambiar en SharePoint)
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                }
            )
            
        except Exception as e:
            logger.error(f"❌ Error downloading from SharePoint: {e}")
            logger.exception("Full exception details:")
            
            # Errores comunes y sus soluciones
            error_tips = {
                "401": "Unauthorized - Token may have expired or lacks permissions",
                "403": "Forbidden - Service Principal lacks Files.Read.All permission",
                "404": "File not found - Item may have been deleted or moved",
                "429": "Rate limited - Too many requests to SharePoint"
            }
            
            error_msg = str(e)
            for code, tip in error_tips.items():
                if code in error_msg:
                    logger.error(f"   💡 Tip: {tip}")
                    break
            
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to download file from SharePoint: {str(e)}"
            )
            
    except HTTPException:
        # Re-raise HTTP exceptions (ya están formateadas)
        raise
    except Exception as e:
        # Capturar cualquier otro error inesperado
        logger.error(f"❌ Unexpected error in proxy: {e}")
        logger.exception("Full exception details:")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/sharepoint-proxy/health")
async def proxy_health():
    """
    Health check endpoint para el servicio de proxy.
    
    Verifica:
    - El servicio está respondiendo
    - La autenticación con Azure AD funciona
    - Las credenciales están configuradas
    
    Returns:
        dict: Estado del servicio
        
    Ejemplo de respuesta (healthy):
        {
            "status": "healthy",
            "service": "SharePoint Proxy",
            "authentication": "OK",
            "message": "Service is operational"
        }
        
    Ejemplo de respuesta (degraded):
        {
            "status": "degraded",
            "service": "SharePoint Proxy",
            "authentication": "FAILED",
            "message": "Cannot obtain access token"
        }
    """
    try:
        logger.info("🏥 Health check requested")
        
        # Intentar obtener un token
        auth = get_auth_service()
        token = auth.get_access_token()
        
        if token:
            logger.info("✅ Health check: OK")
            return {
                "status": "healthy",
                "service": "SharePoint Proxy",
                "authentication": "OK",
                "message": "Service is operational",
                "version": "1.0.0"
            }
        else:
            logger.warning("⚠️  Health check: Authentication failed")
            return {
                "status": "degraded",
                "service": "SharePoint Proxy",
                "authentication": "FAILED",
                "message": "Cannot obtain access token. Check Azure AD configuration.",
                "version": "1.0.0"
            }
            
    except Exception as e:
        logger.error(f"❌ Health check error: {e}")
        return {
            "status": "unhealthy",
            "service": "SharePoint Proxy",
            "error": str(e),
            "message": "Service encountered an error",
            "version": "1.0.0"
        }

@router.get("/sharepoint-proxy/info")
async def proxy_info():
    """
    Información sobre la configuración del proxy.
    
    Útil para debugging. NO expone información sensible.
    
    Returns:
        dict: Información de configuración
    """
    try:
        auth = get_auth_service()
        
        return {
            "service": "SharePoint Proxy",
            "version": "1.0.0",
            "description": "Proxy for EDC to download SharePoint files with OAuth authentication",
            "configuration": {
                "tenant_id": auth.tenant_id[:8] + "..." if auth.tenant_id else "NOT_SET",
                "client_id": auth.client_id[:8] + "..." if auth.client_id else "NOT_SET",
                "client_secret": "***" if auth.client_secret else "NOT_SET",
                "authority": auth.authority,
                "scopes": auth.scopes
            },
            "endpoints": {
                "download": "/api/sharepoint-proxy/download/{encoded_file_info}",
                "health": "/api/sharepoint-proxy/health",
                "info": "/api/sharepoint-proxy/info"
            }
        }
    except Exception as e:
        return {
            "service": "SharePoint Proxy",
            "error": str(e),
            "message": "Service not properly configured"
        }
