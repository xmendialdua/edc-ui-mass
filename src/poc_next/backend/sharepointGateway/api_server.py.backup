"""
FastAPI Server for SharePoint Gateway

This API server provides REST endpoints to access SharePoint files and folders
using the SharePointGateway class. The frontend (Next.js) can call these endpoints
instead of directly calling Microsoft Graph API.

Architecture:
    Frontend (Next.js/React) → FastAPI Server → SharePointGateway → Microsoft Graph API

Features:
    - CORS enabled for Next.js frontend
    - OAuth token handling via request headers
    - RESTful endpoints for file operations
    - Error handling and logging
    - OpenAPI documentation (Swagger UI)

Installation:
    pip install fastapi uvicorn python-multipart

Run server:
    uvicorn api_server:app --reload --port 8000

API Documentation:
    http://localhost:8000/docs (Swagger UI)
    http://localhost:8000/redoc (ReDoc)
"""

import os
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Header, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
import logging

from poc_next.backend.sharepointGateway.SharePointGateway import SharePointGateway, SharePointFile

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SharePoint Gateway API",
    description="REST API for accessing SharePoint files and folders via Microsoft Graph API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3020",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3020",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type"],  # Allow frontend to read these headers
)


# Pydantic models for request/response
class FileResponse(BaseModel):
    """Response model for a file or folder"""
    id: str
    name: str
    webUrl: str = Field(alias="webUrl")
    size: Optional[int] = None
    lastModified: Optional[str] = None
    isFolder: bool
    folder: Optional[dict] = None

    class Config:
        populate_by_name = True


class FilesListResponse(BaseModel):
    """Response model for list of files"""
    items: List[FileResponse]
    count: int


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: Optional[str] = None


# Helper function to get gateway instance
def get_gateway(authorization: str, default_drive_id: Optional[str] = None) -> SharePointGateway:
    """
    Create SharePointGateway instance from authorization header
    
    Args:
        authorization: Authorization header (Bearer token)
        default_drive_id: Optional default drive ID to use
        
    Returns:
        SharePointGateway instance
        
    Raises:
        HTTPException: If authorization header is missing or invalid
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required"
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header must start with 'Bearer '"
        )
    
    access_token = authorization.replace("Bearer ", "")
    
    try:
        return SharePointGateway(
            access_token=access_token,
            default_drive_id=default_drive_id
        )
    except Exception as e:
        logger.error(f"Error creating gateway: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error initializing SharePoint gateway: {str(e)}"
        )


# API Endpoints

@app.get("/", tags=["Health"])
async def root():
    """
    Health check endpoint
    """
    return {
        "service": "SharePoint Gateway API",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Detailed health check
    """
    return {
        "status": "healthy",
        "service": "sharepoint-gateway-api",
        "timestamp": os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip()
    }


@app.get("/api/debug/token", tags=["Debug"])
async def debug_token(authorization: str = Header(None)):
    """
    Debug endpoint to test token validity with Microsoft Graph
    """
    import requests
    
    if not authorization or not authorization.startswith("Bearer "):
        return {"error": "Invalid or missing authorization header"}
    
    token = authorization.replace("Bearer ", "")
    
    # Test token with a simple Graph API call
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    
    try:
        # Test 1: Get user profile (should always work with User.Read)
        response = requests.get("https://graph.microsoft.com/v1.0/me", headers=headers)
        user_info = response.json() if response.ok else {"error": response.text}
        
        # Test 2: Try to list drives
        drives_response = requests.get("https://graph.microsoft.com/v1.0/me/drives", headers=headers)
        drives_info = drives_response.json() if drives_response.ok else {"error": drives_response.text}
        
        return {
            "token_length": len(token),
            "token_preview": f"{token[:20]}...{token[-20:]}",
            "user_profile_test": {
                "status": response.status_code,
                "data": user_info
            },
            "drives_test": {
                "status": drives_response.status_code,
                "data": drives_info
            }
        }
    except Exception as e:
        return {"error": str(e)}


@app.get(
    "/api/files",
    response_model=FilesListResponse,
    tags=["Files"],
    summary="List files and folders",
    description="Get list of files and folders from SharePoint drive"
)
async def list_files(
    authorization: str = Header(None),
    drive_id: Optional[str] = Query(None, description="SharePoint drive ID"),
    item_id: Optional[str] = Query(None, description="Folder item ID for navigation")
):
    """
    List files and folders from a SharePoint drive
    
    - **drive_id**: Optional SharePoint drive ID (uses env var if not provided)
    - **item_id**: Optional folder ID to navigate (uses root if not provided)
    - **Authorization**: Required Bearer token in header
    """
    try:
        gateway = get_gateway(authorization, default_drive_id=drive_id)
        
        # Get files
        files = gateway.get_sharepoint_files(
            drive_id=drive_id,
            item_id=item_id
        )
        
        # Convert to response model
        file_responses = [
            FileResponse(
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
        
        logger.info(f"Listed {len(file_responses)} files/folders")
        
        return FilesListResponse(
            items=file_responses,
            count=len(file_responses)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing files: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error listing files: {str(e)}"
        )


@app.get(
    "/api/files/by-site",
    response_model=FilesListResponse,
    tags=["Files"],
    summary="List files by site URL",
    description="Get files from a SharePoint site by URL"
)
async def list_files_by_site(
    authorization: str = Header(None),
    site_url: str = Query(..., description="SharePoint site URL (e.g., yourcompany.sharepoint.com:/sites/yoursite)"),
    item_id: Optional[str] = Query(None, description="Folder item ID for navigation")
):
    """
    List files from a SharePoint site by URL
    
    - **site_url**: Required SharePoint site URL
    - **item_id**: Optional folder ID to navigate
    - **Authorization**: Required Bearer token in header
    """
    try:
        gateway = get_gateway(authorization)
        
        # Get files by site URL
        files = gateway.get_sharepoint_files_by_site_url(
            site_url=site_url,
            item_id=item_id
        )
        
        # Convert to response model
        file_responses = [
            FileResponse(
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
        
        logger.info(f"Listed {len(file_responses)} files/folders from site {site_url}")
        
        return FilesListResponse(
            items=file_responses,
            count=len(file_responses)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing files by site: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error listing files by site: {str(e)}"
        )


@app.get(
    "/api/files/{drive_id}/{item_id}/metadata",
    response_model=FileResponse,
    tags=["Files"],
    summary="Get file metadata",
    description="Get metadata for a specific file or folder"
)
async def get_file_metadata(
    drive_id: str,
    item_id: str,
    authorization: str = Header(None)
):
    """
    Get metadata for a specific file or folder
    
    - **drive_id**: SharePoint drive ID
    - **item_id**: File or folder item ID
    - **Authorization**: Required Bearer token in header
    """
    try:
        gateway = get_gateway(authorization)
        
        # Get metadata
        file_metadata = gateway.get_file_metadata(
            drive_id=drive_id,
            item_id=item_id
        )
        
        logger.info(f"Retrieved metadata for item {item_id}")
        
        return FileResponse(
            id=file_metadata.id,
            name=file_metadata.name,
            webUrl=file_metadata.web_url,
            size=file_metadata.size,
            lastModified=file_metadata.last_modified,
            isFolder=file_metadata.is_folder,
            folder={'childCount': file_metadata.folder.child_count} if file_metadata.folder else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file metadata: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error getting file metadata: {str(e)}"
        )


@app.get(
    "/api/files/{drive_id}/{item_id}/download",
    tags=["Files"],
    summary="Download file",
    description="Download a file from SharePoint"
)
async def download_file(
    drive_id: str,
    item_id: str,
    authorization: str = Header(None)
):
    """
    Download a file from SharePoint
    
    - **drive_id**: SharePoint drive ID
    - **item_id**: File item ID
    - **Authorization**: Required Bearer token in header
    
    Returns the file as a binary stream
    """
    try:
        gateway = get_gateway(authorization)
        
        # Download file (now returns content and filename)
        file_content, filename = gateway.download_file(
            drive_id=drive_id,
            item_id=item_id
        )
        
        logger.info(f"Downloaded file {filename}")
        
        # Encode filename for Content-Disposition header (RFC 5987)
        from urllib.parse import quote
        encoded_filename = quote(filename)
        
        # Return as streaming response
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
        logger.error(f"Error downloading file: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error downloading file: {str(e)}"
        )


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            detail=str(exc.detail) if exc.detail else None
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            detail=str(exc)
        ).dict()
    )


# Main entry point for running with uvicorn
if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting SharePoint Gateway API server on {host}:{port}")
    logger.info(f"API documentation available at http://{host}:{port}/docs")
    
    uvicorn.run(
        "api_server:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
