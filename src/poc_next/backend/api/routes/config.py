"""Configuration endpoints for frontend."""

from fastapi import APIRouter
from pydantic import BaseModel
from config import settings

router = APIRouter(prefix="/api/config", tags=["Configuration"])


class SharePointConfig(BaseModel):
    """SharePoint configuration model."""
    allowed_folder: str
    site_url: str


@router.get("/sharepoint", response_model=SharePointConfig)
async def get_sharepoint_config():
    """
    Get SharePoint configuration for frontend.
    
    Returns configuration values that control SharePoint navigation and selection behavior.
    
    Returns:
        SharePointConfig: Configuration including allowed folder name and site URL
    """
    return SharePointConfig(
        allowed_folder=settings.sharepoint_allowed_folder,
        site_url=settings.sharepoint_site_url
    )
