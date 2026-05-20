"""SharePoint routes — Access to SharePoint files via Microsoft Graph API."""

import os
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header, Query, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import logging
from dotenv import load_dotenv

from sharepointGateway.SharePointGateway import SharePointGateway, SharePointFile
from sharepointGateway.SharePointAuth import SharePointAuthService

# Load environment variables before initializing auth service
load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sharepoint", tags=["SharePoint"])

# Global SharePoint Auth Service (uses Application Permissions)
auth_service = SharePointAuthService()


class FileItemResponse(BaseModel):
    """Response model for a file or folder item."""
    id: str
    name: str
    webUrl: str
    size: Optional[int] = None
    lastModified: Optional[str] = None
    isFolder: bool
    folder: Optional[Dict[str, int]] = None


class FilesListResponse(BaseModel):
    """Response model for list of files."""
    items: List[FileItemResponse]
    count: int
    drive_id: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None


class StatusResponse(BaseModel):
    """Response model for SharePoint connection status."""
    connected: bool
    application: Optional[str] = None
    error: Optional[str] = None


def get_gateway(authorization: Optional[str] = None) -> SharePointGateway:
    """
    Create SharePointGateway instance using Application Permissions.
    
    The authorization header is now OPTIONAL (for backward compatibility).
    If not provided, uses the global auth_service with Application Permissions.
    
    Args:
        authorization: Optional Authorization header (Bearer token) - deprecated
        
    Returns:
        SharePointGateway instance
        
    Raises:
        HTTPException: If authentication fails
    """
    # Try to use Application Permissions (Service Principal)
    if not authorization:
        logger.info("Using Application Permissions (Service Principal)")
        access_token = auth_service.get_access_token()
        
        if not access_token:
            raise HTTPException(
                status_code=500,
                detail="Failed to obtain access token using Application Permissions"
            )
    else:
        # Backward compatibility: accept token from frontend (deprecated)
        logger.warning("Using token from Authorization header (deprecated - should use Application Permissions)")
        
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization format. Expected: 'Bearer <token>'"
            )
        
        access_token = authorization.replace("Bearer ", "").strip()
        
        if not access_token:
            raise HTTPException(
                status_code=401,
                detail="Access token is empty"
            )
    
    # Get default drive ID from environment
    default_drive_id = os.getenv("SHAREPOINT_DRIVE_ID")
    
    return SharePointGateway(
        access_token=access_token,
        default_drive_id=default_drive_id
    )


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "sharepoint-gateway",
        "has_default_drive_id": bool(os.getenv("SHAREPOINT_DRIVE_ID"))
    }


@router.get("/status", response_model=StatusResponse)
async def connection_status():
    """
    Check SharePoint connection status using Application Permissions.
    
    This endpoint verifies that the backend can authenticate to SharePoint
    using Application Permissions (Service Principal), independently of
    any individual user authentication.
    
    Returns:
        StatusResponse with connection status
    """
    try:
        logger.info("Checking SharePoint connection status...")
        
        # Try to obtain access token using Application Permissions
        access_token = auth_service.get_access_token()
        
        if access_token:
            logger.info("✅ SharePoint connection successful (Application Permissions)")
            return StatusResponse(
                connected=True,
                application="Service Principal"
            )
        else:
            logger.error("❌ Failed to obtain access token")
            return StatusResponse(
                connected=False,
                error="Failed to obtain access token from Azure AD"
            )
            
    except Exception as e:
        logger.error(f"❌ Exception checking SharePoint status: {str(e)}")
        return StatusResponse(
            connected=False,
            error=f"Exception: {str(e)}"
        )


@router.get("/files", response_model=FilesListResponse)
async def list_files(
    authorization: Optional[str] = Header(None),
    drive_id: Optional[str] = Query(None, description="SharePoint drive ID"),
    folder_id: Optional[str] = Query(None, description="Folder ID to list (root if not provided)")
):
    """
    List files and folders from SharePoint drive.
    
    Args:
        authorization: Bearer token for Microsoft Graph API
        drive_id: Optional SharePoint drive ID (uses default if not provided)
        folder_id: Optional folder ID to list contents of specific folder
        
    Returns:
        List of files and folders
    """
    try:
        gateway = get_gateway(authorization)
        
        logger.info(f"Listing files from drive_id={drive_id}, folder_id={folder_id}")
        
        files = gateway.get_sharepoint_files(
            drive_id=drive_id,
            folder_id=folder_id
        )
        
        items = [
            FileItemResponse(
                id=f.id,
                name=f.name,
                webUrl=f.web_url,
                size=f.size,
                lastModified=f.last_modified,
                isFolder=f.is_folder,
                folder={'childCount': f.folder.child_count} if f.folder else None
            )
            for f in files
        ]
        
        return FilesListResponse(items=items, count=len(items))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list files: {str(e)}"
        )


@router.get("/files/by-site-url", response_model=FilesListResponse)
async def list_files_by_site_url(
    authorization: Optional[str] = Header(None),
    site_url: str = Query(..., description="SharePoint site URL"),
    folder_id: Optional[str] = Query(None, description="Folder item ID for navigation")
):
    """
    List files from SharePoint by site URL.
    
    Args:
        authorization: Bearer token for Microsoft Graph API
        site_url: SharePoint site URL (e.g., https://company.sharepoint.com/sites/sitename)
        folder_id: Optional folder item ID to list contents of specific folder
        
    Returns:
        List of files and folders
    """
    try:
        gateway = get_gateway(authorization)
        
        logger.info(f"[SharePoint API] Listing files from site_url={site_url}, folder_id={folder_id}")
        
        if folder_id:
            # Navigate into specific folder using item_id
            # Parse composite ID if present (drive_id|item_id)
            item_id = folder_id
            drive_id = None
            if '|' in folder_id:
                drive_id, item_id = folder_id.split('|', 1)
                logger.info(f"[SharePoint API] Parsed composite ID: drive_id={drive_id[:20]}..., item_id={item_id[:20]}...")
            else:
                logger.warning(f"[SharePoint API] folder_id does NOT contain '|' separator: {folder_id[:50]}... - will use /me/drive")
            
            # List files in the specific folder
            logger.info(f"[SharePoint API] Calling gateway.get_sharepoint_files(drive_id={drive_id[:20] if drive_id else 'None'}..., item_id={item_id[:20]}...)")
            files = gateway.get_sharepoint_files(
                drive_id=drive_id,
                item_id=item_id
            )
            
            # Ensure all IDs include drive_id prefix
            if drive_id:
                items = [
                    FileItemResponse(
                        id=f.id if '|' in f.id else f"{drive_id}|{f.id}",
                        name=f.name,
                        webUrl=f.web_url,
                        size=f.size,
                        lastModified=f.last_modified,
                        isFolder=f.is_folder,
                        folder={'childCount': f.folder.child_count} if f.folder else None
                    )
                    for f in files
                ]
            else:
                items = [
                    FileItemResponse(
                        id=f.id,
                        name=f.name,
                        webUrl=f.web_url,
                        size=f.size,
                        lastModified=f.last_modified,
                        isFolder=f.is_folder,
                        folder={'childCount': f.folder.child_count} if f.folder else None
                    )
                    for f in files
                ]
        else:
            # List root folder
            files = gateway.get_sharepoint_files_by_site_url(
                site_url=site_url
            )
            
            # Extract drive_id from the first file (all files have the same drive_id)
            drive_id = None
            if files and '|' in files[0].id:
                drive_id = files[0].id.split('|')[0]
            
            items = [
                FileItemResponse(
                    id=f.id,
                    name=f.name,
                    webUrl=f.web_url,
                    size=f.size,
                    lastModified=f.last_modified,
                    isFolder=f.is_folder,
                    folder={'childCount': f.folder.child_count} if f.folder else None
                )
                for f in files
            ]
        
        return FilesListResponse(items=items, count=len(items), drive_id=drive_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing files by site URL: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list files: {str(e)}"
        )


@router.get("/files/by-folder", response_model=FilesListResponse)
async def list_files_by_folder(
    authorization: Optional[str] = Header(None),
    folder_id: str = Query(..., description="Folder ID (can be in format drive_id|item_id)"),
    drive_id: Optional[str] = Query(None, description="SharePoint drive ID")
):
    """
    List files inside a specific folder.
    
    Args:
        authorization: Bearer token for Microsoft Graph API
        folder_id: Folder ID, can be in format "drive_id|item_id" or just "item_id"
        drive_id: Optional SharePoint drive ID (parsed from folder_id if not provided)
        
    Returns:
        List of files and folders inside the specified folder
    """
    try:
        gateway = get_gateway(authorization)
        
        # Parse composite folder_id if it contains drive_id|item_id format
        if '|' in folder_id:
            parsed_drive_id, item_id = folder_id.split('|', 1)
            # Use parsed drive_id if explicit drive_id not provided
            if not drive_id:
                drive_id = parsed_drive_id
            folder_id = item_id
            logger.info(f"Parsed composite ID: drive_id={drive_id}, item_id={item_id}")
        else:
            item_id = folder_id
        
        logger.info(f"Listing files from folder_id={item_id}, drive_id={drive_id}")
        
        # Get files from the folder
        files = gateway.get_sharepoint_files(
            drive_id=drive_id,
            item_id=item_id
        )
        
        items = [
            FileItemResponse(
                id=f"{drive_id}|{f.id}",  # Include drive_id in the response
                name=f.name,
                webUrl=f.web_url,
                size=f.size,
                lastModified=f.last_modified,
                isFolder=f.is_folder,
                folder={'childCount': f.folder.child_count} if f.folder else None
            )
            for f in files
        ]
        
        return FilesListResponse(items=items, count=len(items), drive_id=drive_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing files by folder: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list files: {str(e)}"
        )


@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    authorization: Optional[str] = Header(None),
    drive_id: Optional[str] = Query(None, description="SharePoint drive ID")
):
    """
    Download a file from SharePoint.
    
    Args:
        file_id: ID of the file to download, can be in format "drive_id|item_id" or just "item_id"
        authorization: Bearer token for Microsoft Graph API
        drive_id: Optional SharePoint drive ID (uses default if not provided)
        
    Returns:
        File content as streaming response
    """
    try:
        gateway = get_gateway(authorization)
        
        # Parse composite file_id if it contains drive_id|item_id format
        if '|' in file_id:
            parsed_drive_id, item_id = file_id.split('|', 1)
            # Use parsed drive_id if explicit drive_id not provided
            if not drive_id:
                drive_id = parsed_drive_id
            file_id = item_id
            logger.info(f"Parsed composite ID: drive_id={drive_id}, item_id={item_id}")
        else:
            item_id = file_id
        
        logger.info(f"Downloading file_id={item_id}, drive_id={drive_id}")
        
        file_content, filename = gateway.download_file(
            drive_id=drive_id,
            item_id=item_id
        )
        
        return StreamingResponse(
            iter([file_content]),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download file: {str(e)}"
        )


@router.get("/download-folder/{folder_id}")
async def download_folder(
    folder_id: str,
    authorization: Optional[str] = Header(None),
    drive_id: Optional[str] = Query(None, description="SharePoint drive ID")
):
    """
    Download a folder from SharePoint as a ZIP file.
    
    Args:
        folder_id: ID of the folder to download, can be in format "drive_id|item_id" or just "item_id"
        authorization: Bearer token for Microsoft Graph API
        drive_id: Optional SharePoint drive ID (uses default if not provided)
        
    Returns:
        ZIP file containing all folder contents
    """
    try:
        gateway = get_gateway(authorization)
        
        # Parse composite folder_id if it contains drive_id|item_id format
        if '|' in folder_id:
            parsed_drive_id, item_id = folder_id.split('|', 1)
            # Use parsed drive_id if explicit drive_id not provided
            if not drive_id:
                drive_id = parsed_drive_id
            folder_id = item_id
            logger.info(f"Parsed composite ID: drive_id={drive_id}, item_id={item_id}")
        else:
            item_id = folder_id
        
        logger.info(f"Downloading folder_id={item_id}, drive_id={drive_id}")
        
        zip_content, zip_filename = gateway.download_folder_as_zip(
            drive_id=drive_id,
            folder_id=item_id
        )
        
        return StreamingResponse(
            iter([zip_content]),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{zip_filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading folder: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download folder: {str(e)}"
        )


@router.get("/file/{file_id}/metadata")
async def get_file_metadata(
    file_id: str,
    authorization: Optional[str] = Header(None),
    drive_id: Optional[str] = Query(None, description="SharePoint drive ID")
):
    """
    Get metadata for a specific file.
    
    Args:
        file_id: ID of the file
        authorization: Bearer token for Microsoft Graph API
        drive_id: Optional SharePoint drive ID (uses default if not provided)
        
    Returns:
        File metadata
    """
    try:
        gateway = get_gateway(authorization)
        
        logger.info(f"Getting metadata for file_id={file_id}, drive_id={drive_id}")
        
        file_info = gateway.get_file_metadata(
            file_id=file_id,
            drive_id=drive_id
        )
        
        return FileItemResponse(
            id=file_info.id,
            name=file_info.name,
            webUrl=file_info.web_url,
            size=file_info.size,
            lastModified=file_info.last_modified,
            isFolder=file_info.is_folder,
            folder={'childCount': file_info.folder.child_count} if file_info.folder else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file metadata: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get file metadata: {str(e)}"
        )


# --- New endpoints for sharing links ---

class GetDownloadUrlRequest(BaseModel):
    """Request model for get-download-url endpoint."""
    drive_id: str
    item_id: str


class GetDownloadUrlResponse(BaseModel):
    """Response model for get-download-url endpoint."""
    success: bool
    download_url: str


class CreateSharingLinkRequest(BaseModel):
    """Request model for create-sharing-link endpoint."""
    drive_id: str
    item_id: str
    expiration_days: int = 365


class CreateSharingLinkResponse(BaseModel):
    """Response model for create-sharing-link endpoint."""
    success: bool
    download_url: str
    message: Optional[str] = None


@router.post("/get-download-url", response_model=GetDownloadUrlResponse)
async def get_download_url(
    request: GetDownloadUrlRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Get pre-authenticated temporary download URL for a SharePoint file.
    
    This URL is valid for ~1 hour and can be accessed without authentication.
    Useful for quick testing but NOT recommended for production.
    
    Args:
        request: Request with drive_id and item_id
        authorization: Bearer token for Microsoft Graph API
        
    Returns:
        Temporary download URL (valid ~1 hour)
    """
    try:
        gateway = get_gateway(authorization)
        
        logger.info(f"Getting temporary download URL for drive={request.drive_id[:8]}..., item={request.item_id[:8]}...")
        
        download_url = gateway.get_download_url(
            drive_id=request.drive_id,
            item_id=request.item_id
        )
        
        logger.info(f"✅ Temporary download URL obtained (valid ~1 hour)")
        
        return GetDownloadUrlResponse(
            success=True,
            download_url=download_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting download URL: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get download URL: {str(e)}"
        )


@router.post("/create-sharing-link", response_model=CreateSharingLinkResponse)
async def create_sharing_link(
    request: CreateSharingLinkRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Create a public sharing link with direct download capability.
    
    This creates a permanent (or long-lived) public link that:
    - Does NOT require authentication
    - Can be used directly by EDC DataPlane
    - Downloads file content directly (binary)
    - Is valid for specified expiration period (default: 365 days)
    
    The link is public - anyone with the URL can download the file.
    
    Args:
        request: Request with drive_id, item_id, and expiration_days
        authorization: Bearer token for Microsoft Graph API
        
    Returns:
        Public download URL (valid for expiration_days)
        
    Note:
        Requires Sites.ReadWrite.All permission in Azure AD
    """
    try:
        gateway = get_gateway(authorization)
        
        logger.info(f"Creating public sharing link for drive={request.drive_id[:8]}..., item={request.item_id[:8]}...")
        logger.info(f"Expiration: {request.expiration_days} days")
        
        download_url = gateway.create_public_download_link(
            drive_id=request.drive_id,
            item_id=request.item_id,
            expiration_days=request.expiration_days
        )
        
        logger.info(f"✅ Public sharing link created successfully")
        logger.info(f"   URL: {download_url[:80]}...")
        
        return CreateSharingLinkResponse(
            success=True,
            download_url=download_url,
            message=f"Public link created (expires in {request.expiration_days} days)"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating sharing link: {str(e)}")
        
        # Check for permission error
        if "AccessDenied" in str(e) or "Forbidden" in str(e):
            raise HTTPException(
                status_code=403,
                detail="Failed to create sharing link. Ensure Azure AD app has Sites.ReadWrite.All permission with Admin Consent."
            )
        
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create sharing link: {str(e)}"
        )
