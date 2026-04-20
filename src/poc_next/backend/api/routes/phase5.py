"""Phase 5 routes — Catalog requests."""

from fastapi import APIRouter
from typing import Dict, Any, List

from clients.edc import EdcManagementClient
from config import settings

router = APIRouter(prefix="/api/phase5", tags=["Phase 5 - Catalog"])


def log_message(message: str) -> str:
    """Format a log message with timestamp."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"[{timestamp}] {message}"


@router.post("/catalog-request")
async def catalog_request() -> Dict[str, Any]:
    """Request catalog from MASS connector via IKLN connector."""
    logs: List[str] = []

    logs.append(log_message("🔍 Consultando catálogo de MASS desde IKLN..."))
    logs.append(log_message(f"   Counter Party: {settings.mass_bpn}"))
    logs.append(log_message(f"   DSP URL: {settings.mass_dsp}"))

    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        catalog = await ikln_client.request_catalog(
            counter_party_url=settings.mass_dsp,
            counter_party_id=settings.mass_bpn
        )

        # Extract datasets
        datasets = []
        
        # Handle different catalog formats
        if "dcat:dataset" in catalog:
            dataset_data = catalog["dcat:dataset"]
            if isinstance(dataset_data, list):
                datasets = dataset_data
            elif isinstance(dataset_data, dict):
                datasets = [dataset_data]
        elif "datasets" in catalog:
            datasets = catalog["datasets"]
        elif isinstance(catalog, list):
            datasets = catalog

        logs.append(log_message(f"✅ Catálogo recibido"))
        logs.append(log_message(f"   Datasets encontrados: {len(datasets)}"))

        if datasets:
            logs.append(log_message(""))
            for dataset in datasets:
                dataset_id = dataset.get("@id", "unknown")
                logs.append(log_message(f"📦 {dataset_id}"))

        return {
            "success": True,
            "logs": logs,
            "datasets": datasets
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        return {
            "success": False,
            "logs": logs,
            "datasets": []
        }
    finally:
        await ikln_client.close()
