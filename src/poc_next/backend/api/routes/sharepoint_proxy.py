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
- GET /api/sharepoint-proxy/download/{encoded_file_info}: Descarga archivo individual
- GET /api/sharepoint-proxy/download-folder/{encoded_folder_info}: Descarga carpeta como ZIP
- GET /api/sharepoint-proxy/health: Health check del servicio
"""
import os
import base64
import logging
import mimetypes
from fastapi import APIRouter, HTTPException, Response, Header
from fastapi.responses import StreamingResponse
from typing import Optional
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
            # Añadir padding si es necesario (el frontend lo elimina)
            # Base64 requiere que la longitud sea múltiplo de 4
            padding = '=' * (4 - len(encoded_file_info) % 4) if len(encoded_file_info) % 4 != 0 else ''
            padded_encoded = encoded_file_info + padding
            
            # Decodificar base64 URL-safe
            decoded_bytes = base64.urlsafe_b64decode(padded_encoded.encode())
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

@router.get("/sharepoint-proxy/download-folder/{encoded_folder_info}")
async def download_sharepoint_folder(encoded_folder_info: str):
    """
    Endpoint proxy para descargar carpetas de SharePoint como ZIP.
    
    Este endpoint es llamado por el EDC DataPlane cuando intenta descargar
    un asset de tipo carpeta. El proxy gestiona la autenticación OAuth y descarga 
    todo el contenido de la carpeta recursivamente, empaquetándolo como ZIP.
    
    Args:
        encoded_folder_info: Base64 URL-safe encoding de "drive_id|folder_id"
                            Ejemplo: "YjEhWHl6MTIzfDAxQUJDREVG"
    
    Returns:
        Response: Archivo ZIP con contenido de la carpeta
        
    Raises:
        HTTPException 400: Si encoded_folder_info no es válido
        HTTPException 503: Si falla la autenticación con Azure AD
        HTTPException 500: Si falla la descarga desde SharePoint
        
    Headers de respuesta:
        - Content-Disposition: attachment con nombre de la carpeta + .zip
        - Content-Type: application/zip
        - Content-Length: Tamaño del archivo ZIP en bytes
        
    Ejemplo de uso:
        GET /api/sharepoint-proxy/download-folder/YjEhWHl6MTIzfDAxQUJDREVG
        
        Respuesta:
        HTTP/1.1 200 OK
        Content-Type: application/zip
        Content-Disposition: attachment; filename="MyFolder.zip"
        Content-Length: 1234567
        
        <binary ZIP file content>
    """
    try:
        # PASO 1: Decodificar información de la carpeta
        # El frontend codifica "drive_id|folder_id" en base64 URL-safe
        try:
            # Añadir padding si es necesario
            padding = '=' * (4 - len(encoded_folder_info) % 4) if len(encoded_folder_info) % 4 != 0 else ''
            padded_encoded = encoded_folder_info + padding
            
            # Decodificar base64 URL-safe
            decoded_bytes = base64.urlsafe_b64decode(padded_encoded.encode())
            decoded_str = decoded_bytes.decode('utf-8')
            
            # Separar drive_id y folder_id
            parts = decoded_str.split('|', 1)
            if len(parts) != 2:
                raise ValueError("Invalid format: expected 'drive_id|folder_id'")
            
            drive_id, folder_id = parts
            
            # Validar que no estén vacíos
            if not drive_id or not folder_id:
                raise ValueError("drive_id and folder_id cannot be empty")
                
        except Exception as e:
            logger.error(f"❌ Error decoding folder info: {e}")
            logger.error(f"   Received: {encoded_folder_info}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid folder identifier format: {str(e)}"
            )
        
        # Log de la petición
        drive_preview = drive_id[:8] + "..." if len(drive_id) > 8 else drive_id
        folder_preview = folder_id[:8] + "..." if len(folder_id) > 8 else folder_id
        logger.info(f"📦 Proxy download-folder request:")
        logger.info(f"   Drive ID: {drive_preview}")
        logger.info(f"   Folder ID: {folder_preview}")
        
        # PASO 2: Obtener access token de Azure AD
        logger.info("🔐 Obtaining access token from Azure AD...")
        auth = get_auth_service()
        access_token = auth.get_access_token()
        
        if not access_token:
            logger.error("❌ Failed to obtain access token from Azure AD")
            raise HTTPException(
                status_code=503, 
                detail="Failed to authenticate with SharePoint. Check server logs."
            )
        
        logger.info("✅ Access token obtained successfully")
        
        # PASO 3: Descargar carpeta desde SharePoint como ZIP
        logger.info("📦 Downloading folder from SharePoint and creating ZIP...")
        gateway = SharePointGateway(access_token=access_token, default_drive_id=drive_id)
        
        try:
            # Descargar contenido de la carpeta empaquetado como ZIP
            # Devuelve tupla: (zip_content, zip_filename)
            zip_content, zip_filename = gateway.download_folder_as_zip(
                drive_id=drive_id, 
                folder_id=folder_id
            )
            
            zip_size = len(zip_content)
            logger.info(f"✅ Folder downloaded and zipped successfully:")
            logger.info(f"   ZIP filename: {zip_filename}")
            logger.info(f"   ZIP size: {zip_size:,} bytes ({zip_size / (1024*1024):.2f} MB)")
            
            # PASO 4: Retornar ZIP como HTTP response
            return Response(
                content=zip_content,
                media_type='application/zip',
                headers={
                    # Indica al navegador que descargue el archivo
                    'Content-Disposition': f'attachment; filename="{zip_filename}"',
                    # Tamaño total del ZIP
                    'Content-Length': str(zip_size),
                    # Permitir CORS (si es necesario)
                    'Access-Control-Allow-Origin': '*',
                    # Cache control
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                }
            )
            
        except Exception as e:
            logger.error(f"❌ Error downloading folder from SharePoint: {e}")
            logger.exception("Full exception details:")
            
            # Errores comunes y sus soluciones
            error_tips = {
                "401": "Unauthorized - Token may have expired or lacks permissions",
                "403": "Forbidden - Service Principal lacks Files.Read.All permission",
                "404": "Folder not found - Item may have been deleted or moved",
                "429": "Rate limited - Too many requests to SharePoint"
            }
            
            error_msg = str(e)
            for code, tip in error_tips.items():
                if code in error_msg:
                    logger.error(f"   💡 Tip: {tip}")
                    break
            
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to download folder from SharePoint: {str(e)}"
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
                "download_file": "/api/sharepoint-proxy/download/{encoded_file_info}",
                "download_folder": "/api/sharepoint-proxy/download-folder/{encoded_folder_info}",
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

@router.get("/sharepoint-proxy/download-with-user-token/{encoded_file_info}")
async def download_with_user_token(
    encoded_file_info: str,
    authorization: Optional[str] = Header(None)
):
    """
    Endpoint de prueba: Descarga usando el token OAuth del usuario.
    
    A diferencia del endpoint principal que usa Service Principal (Application permissions),
    este endpoint usa el token del usuario autenticado (Delegated permissions).
    
    Útil para:
    - Probar el proxy sin necesitar permisos de Application
    - Debugging de permisos
    - Desarrollo y testing
    
    Args:
        encoded_file_info: Base64 URL-safe encoding de "drive_id|item_id"
        authorization: Header "Bearer {token}" con el token del usuario
    
    Returns:
        Response: Archivo binario con headers apropiados
        
    Raises:
        HTTPException 401: Si no se proporciona token
        HTTPException 400: Si encoded_file_info no es válido
        HTTPException 500: Si falla la descarga
    """
    try:
        # PASO 1: Validar que se proporciona token
        if not authorization or not authorization.startswith("Bearer "):
            logger.error("❌ No authorization header provided")
            raise HTTPException(
                status_code=401,
                detail="Authorization header with Bearer token is required"
            )
        
        # Extraer token del header
        user_token = authorization.replace("Bearer ", "").strip()
        logger.info("🔑 Using user-provided token for authentication")
        
        # PASO 2: Decodificar información del archivo
        try:
            # Añadir padding si es necesario (el frontend lo elimina)
            padding = '=' * (4 - len(encoded_file_info) % 4) if len(encoded_file_info) % 4 != 0 else ''
            padded_encoded = encoded_file_info + padding
            
            decoded_bytes = base64.urlsafe_b64decode(padded_encoded.encode())
            decoded_str = decoded_bytes.decode('utf-8')
            # Usar split con maxsplit=1 para manejar item_ids que contienen '|'
            drive_id, item_id = decoded_str.split('|', 1)
            
            logger.info(f"📄 Decoded - Drive: {drive_id[:20]}..., Item: {item_id[:20]}...")
        except Exception as e:
            logger.error(f"❌ Error decoding file info: {e}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid encoded_file_info format: {str(e)}"
            )
        
        # PASO 3: Usar SharePointGateway con el token del usuario
        logger.info("📥 Checking item type (file or folder)...")
        
        # Crear gateway con el token del usuario
        gateway = SharePointGateway(access_token=user_token)
        
        # Obtener metadatos del item para determinar si es carpeta
        try:
            metadata = gateway.get_file_metadata(drive_id=drive_id, item_id=item_id)
            is_folder = 'folder' in metadata
            item_name = metadata.get('name', 'item')
            
            logger.info(f"📋 Item metadata retrieved: {item_name} (folder={is_folder})")
        except Exception as e:
            logger.warning(f"⚠️  Could not get item metadata, assuming file: {e}")
            is_folder = False
            item_name = "item"
        
        # Descargar según el tipo
        if is_folder:
            logger.info(f"📦 Downloading folder as ZIP: {item_name}")
            file_content, filename = gateway.download_folder_as_zip(drive_id=drive_id, folder_id=item_id)
            mime_type = 'application/zip'
            logger.info(f"✅ Folder downloaded successfully as ZIP: {filename}")
        else:
            logger.info(f"📄 Downloading file: {item_name}")
            file_content, filename = gateway.download_file(drive_id=drive_id, item_id=item_id)
            # Detectar tipo MIME del archivo
            mime_type, _ = mimetypes.guess_type(filename)
            if not mime_type:
                mime_type = 'application/octet-stream'
            logger.info(f"✅ File downloaded successfully: {filename}")
        
        # PASO 4: Preparar respuesta
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Type': mime_type,
            'Content-Length': str(len(file_content))
        }
        
        logger.info(f"📤 Sending {('folder (ZIP)' if is_folder else 'file')}: {filename} ({len(file_content)} bytes, {mime_type})")
        
        return Response(
            content=file_content,
            headers=headers,
            media_type=mime_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error downloading with user token: {e}")
        logger.exception("Full exception details:")
        
        # Proveer tips de debugging
        error_str = str(e).lower()
        if "401" in error_str or "unauthorized" in error_str:
            tip = "Token may be invalid, expired, or lack required permissions (Files.Read.All, Sites.Read.All)"
        elif "403" in error_str or "forbidden" in error_str:
            tip = "User may not have access to this specific file or site"
        elif "404" in error_str or "not found" in error_str:
            tip = "File or drive not found - check drive_id and item_id"
        else:
            tip = "Check logs for more details"
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download file: {str(e)}. Tip: {tip}"
        )
