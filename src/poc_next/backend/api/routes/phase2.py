"""Phase 2 routes — Asset management."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List

from clients.edc import EdcManagementClient
from config import settings

router = APIRouter(prefix="/api/phase2", tags=["Phase 2 - Assets"])


def log_message(message: str) -> str:
    """Format a log message with timestamp."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"[{timestamp}] {message}"


class CreateAssetRequest(BaseModel):
    assetId: str
    url: str = None  # Optional URL, defaults to settings.pdf_url if not provided


class DeleteAssetRequest(BaseModel):
    assetId: str


@router.post("/create-asset")
async def create_asset(request: CreateAssetRequest) -> Dict[str, Any]:
    """Create a new asset in MASS connector."""
    logs: List[str] = []
    asset_id = request.assetId
    asset_url = request.url if request.url else settings.pdf_url

    logs.append(log_message(f"📦 Creando asset '{asset_id}'..."))
    logs.append(log_message(f"🔗 URL: {asset_url}"))

    # Determine content type based on URL extension
    content_type = "application/octet-stream"
    if asset_url.lower().endswith('.pdf'):
        content_type = "application/pdf"
    elif asset_url.lower().endswith('.csv'):
        content_type = "text/csv"
    elif asset_url.lower().endswith('.json'):
        content_type = "application/json"
    elif asset_url.lower().endswith('.xml'):
        content_type = "application/xml"

    # Build asset definition
    asset_data = {
        "@id": asset_id,
        "@type": "Asset",
        "properties": {
            "name": asset_id,
            "description": f"Asset publicado desde Data Publication UI - {asset_url}",
            "contenttype": content_type,
            "version": "1.0"
        },
        "privateProperties": {},
        "dataAddress": {
            "@type": "DataAddress",
            "type": "HttpData",
            "proxyPath": "true", 
            "proxyQueryParams": "true",
            "baseUrl": asset_url
        }
    }

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        result = await mass_client.create_asset(asset_data)

        if result.get("already_exists"):
            logs.append(log_message(f"⚠️  El asset '{asset_id}' ya existe"))
            return {
                "success": False,
                "logs": logs,
                "error": "ASSET_EXISTS"
            }

        logs.append(log_message("✅ Asset creado exitosamente"))
        logs.append(log_message(f"   ID: {asset_id}"))
        logs.append(log_message(f"   URL: {asset_url}"))
        logs.append(log_message(f"   Tipo: {content_type}"))

        return {
            "success": True,
            "logs": logs
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        return {
            "success": False,
            "logs": logs,
            "error": str(e)
        }
    finally:
        await mass_client.close()


@router.post("/list-assets")
async def list_assets() -> Dict[str, Any]:
    """List all assets in MASS connector."""
    logs: List[str] = []

    logs.append(log_message("📋 Consultando assets en MASS..."))

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        assets = await mass_client.list_assets()

        logs.append(log_message(f"✅ Encontrados {len(assets)} assets"))

        if assets:
            logs.append(log_message(""))
            for asset in assets:
                asset_id = asset.get("@id", "unknown")
                logs.append(log_message(f"📦 {asset_id}"))

        return {
            "success": True,
            "logs": logs,
            "assets": assets
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        return {
            "success": False,
            "logs": logs,
            "assets": []
        }
    finally:
        await mass_client.close()


@router.post("/delete-asset")
async def delete_asset(request: DeleteAssetRequest) -> Dict[str, Any]:
    """Delete an asset from MASS connector."""
    logs: List[str] = []
    asset_id = request.assetId

    logs.append(log_message(f"🗑️  Eliminando asset '{asset_id}'..."))

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        await mass_client.delete_asset(asset_id)

        logs.append(log_message(f"✅ Asset '{asset_id}' eliminado"))

        return {
            "success": True,
            "logs": logs
        }

    except Exception as e:
        error_msg = str(e)
        
        if "409" in error_msg:
            logs.append(log_message(f"❌ Error: Asset en uso"))
            logs.append(log_message("   El asset está vinculado a Contract Definitions"))
            logs.append(log_message("   Elimina primero los Contract Definitions"))
        else:
            logs.append(log_message(f"❌ Error: {error_msg}"))

        return {
            "success": False,
            "logs": logs,
            "error": error_msg
        }
    finally:
        await mass_client.close()
