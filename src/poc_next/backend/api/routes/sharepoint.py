"""SharePoint routes — Access to SharePoint files via Microsoft Graph API."""

import os
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Header, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import logging

from config import settings
from sharepointGateway.SharePointGateway import SharePointGateway, SharePointFile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sharepoint", tags=["SharePoint"])


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


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None


def get_gateway(authorization: Optional[str] = None) -> SharePointGateway:
    """
    Create SharePointGateway instance from authorization header.
    
    Args:
        authorization: Authorization header (Bearer token)
        
    Returns:
        SharePointGateway instance
        
    Raises:
        HTTPException: If authorization is missing or invalid
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required. Format: 'Bearer <token>'"
        )
    
    # Extract token from "Bearer <token>" format
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
    
    # Get default drive ID from settings
    default_drive_id = settings.sharepoint_drive_id
    
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
        "has_default_drive_id": bool(settings.sharepoint_drive_id)
    }


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
            item_id=folder_id  # Note: item_id is the parameter name in SharePointGateway
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
    folder_id: Optional[str] = Query(None, description="Folder ID to list (root if not provided)")
):
    """
    List files from SharePoint by site URL.
    
    Args:
        authorization: Bearer token for Microsoft Graph API
        site_url: SharePoint site URL (e.g., https://company.sharepoint.com/sites/sitename)
        folder_id: Optional folder ID to list contents of specific folder
        
    Returns:
        List of files and folders
    """
    try:
        gateway = get_gateway(authorization)
        
        logger.info(f"Listing files from site_url={site_url}, folder_id={folder_id}")
        
        files = gateway.get_sharepoint_files_by_site_url(
            site_url=site_url,
            item_id=folder_id
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
        logger.error(f"Error listing files by site URL: {str(e)}")
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
        file_id: ID of the file to download (can be composite format: drive_id|item_id)
        authorization: Bearer token for Microsoft Graph API
        drive_id: Optional SharePoint drive ID (uses default if not provided)
        
    Returns:
        File content as streaming response
    """
    try:
        gateway = get_gateway(authorization)
        
        logger.info(f"Downloading file_id={file_id}, drive_id={drive_id}")
        
        # Parse composite file_id if present (format: drive_id|item_id)
        if '|' in file_id:
            parsed_drive_id, item_id = file_id.split('|', 1)
            actual_drive_id = parsed_drive_id
        else:
            # Use provided drive_id or fall back to default
            actual_drive_id = drive_id or gateway.default_drive_id
            item_id = file_id
        
        file_content, filename = gateway.download_file(
            drive_id=actual_drive_id,
            item_id=item_id
        )
        
        # Encode filename for Content-Disposition header (RFC 5987)
        from urllib.parse import quote
        encoded_filename = quote(filename)
        
        return StreamingResponse(
            iter([file_content]),
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{encoded_filename}"
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


@router.get("/debug/drives")
async def debug_list_drives(
    authorization: Optional[str] = Header(None)
):
    """
    Debug endpoint: List all drives accessible to the user.
    
    Args:
        authorization: Bearer token for Microsoft Graph API
        
    Returns:
        List of available drives with their IDs
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail="Authorization header required"
            )
        
        access_token = authorization.replace("Bearer ", "").strip()
        
        import requests
        response = requests.get(
            "https://graph.microsoft.com/v1.0/me/drives",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        response.raise_for_status()
        
        drives_data = response.json()
        drives = []
        for drive in drives_data.get("value", []):
            drives.append({
                "id": drive.get("id"),
                "name": drive.get("name"),
                "driveType": drive.get("driveType"),
                "webUrl": drive.get("webUrl"),
                "owner": drive.get("owner", {}).get("user", {}).get("displayName", "Unknown")
            })
        
        return {
            "drives": drives,
            "count": len(drives),
            "configured_drive_id": settings.sharepoint_drive_id
        }
        
    except Exception as e:
        logger.error(f"Error listing drives: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list drives: {str(e)}"
        )
