"""Phase 6 routes — Catalog, negotiations, and transfers."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import httpx

from poc.clients.edc import EdcManagementClient
from poc.config import settings

router = APIRouter(prefix="/api/phase6", tags=["Phase 6 - Discovery & Transfer"])


def log_message(message: str) -> str:
    """Format a log message with timestamp."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"[{timestamp}] {message}"


class NegotiateAssetRequest(BaseModel):
    assetId: str
    policy: Dict[str, Any]


class InitiateTransferRequest(BaseModel):
    contractAgreementId: str
    assetId: str


class DownloadFileRequest(BaseModel):
    transferId: str
    endpoint: str
    token: str


@router.post("/catalog-request")
async def catalog_request() -> Dict[str, Any]:
    """Request catalog from MASS connector."""
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


@router.post("/negotiate-asset")
async def negotiate_asset(request: NegotiateAssetRequest) -> Dict[str, Any]:
    """Initiate contract negotiation for an asset."""
    logs: List[str] = []

    logs.append(log_message(f"🤝 Iniciando negociación para asset: {request.assetId}"))
    logs.append(log_message(f"   Counter Party: {settings.mass_bpn}"))

    # Build negotiation request
    negotiation_data = {
        "@type": "NegotiationInitiateRequestDto",
        "counterPartyAddress": settings.mass_dsp,
        "counterPartyId": settings.mass_bpn,
        "protocol": "dataspace-protocol-http",
        "policy": {
            "@type": "Offer",
            "@id": request.policy.get("@id"),
            "target": request.assetId,
            "assigner": settings.mass_bpn,
            "permission": request.policy.get("permission", []),
            "prohibition": request.policy.get("prohibition", []),
            "obligation": request.policy.get("obligation", [])
        }
    }

    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        result = await ikln_client.initiate_negotiation(negotiation_data)

        negotiation_id = result.get("@id")
        logs.append(log_message(f"✅ Negociación iniciada"))
        logs.append(log_message(f"   Negotiation ID: {negotiation_id}"))
        logs.append(log_message(f"   Estado: Procesando..."))

        return {
            "success": True,
            "logs": logs,
            "negotiation": {
                "id": negotiation_id,
                "state": "REQUESTED",
                "assetId": request.assetId,
                "contractAgreementId": None,
                "counterPartyAddress": settings.mass_dsp,
                "counterPartyId": settings.mass_bpn,
                "createdAt": None
            }
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        return {
            "success": False,
            "logs": logs,
            "negotiation": {
                "id": f"failed-{request.assetId}",
                "state": "FAILED",
                "assetId": request.assetId,
                "errorDetail": str(e),
                "createdAt": None
            }
        }
    finally:
        await ikln_client.close()


@router.get("/list-negotiations")
async def list_negotiations() -> Dict[str, Any]:
    """List all contract negotiations."""
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        negotiations_raw = await ikln_client.list_negotiations()

        # Transform to simplified format
        negotiations = []
        for nego in negotiations_raw:
            negotiations.append({
                "id": nego.get("@id"),
                "state": nego.get("state"),
                "assetId": nego.get("assetId", "unknown"),
                "contractAgreementId": nego.get("contractAgreementId"),
                "counterPartyAddress": nego.get("counterPartyAddress"),
                "counterPartyId": nego.get("counterPartyId"),
                "createdAt": nego.get("createdAt"),
            })

        return {
            "success": True,
            "negotiations": negotiations
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "negotiations": []
        }
    finally:
        await ikln_client.close()


@router.post("/initiate-transfer-for-contract")
async def initiate_transfer_for_contract(request: InitiateTransferRequest) -> Dict[str, Any]:
    """Initiate a data transfer for a negotiated contract."""
    logs: List[str] = []

    logs.append(log_message(f"📥 Iniciando transferencia..."))
    logs.append(log_message(f"   Contract Agreement: {request.contractAgreementId}"))
    logs.append(log_message(f"   Asset: {request.assetId}"))

    # Build transfer request
    transfer_data = {
        "@type": "TransferRequestDto",
        "counterPartyAddress": settings.mass_dsp,
        "counterPartyId": settings.mass_bpn,
        "contractId": request.contractAgreementId,
        "assetId": request.assetId,
        "protocol": "dataspace-protocol-http",
        "dataDestination": {
            "@type": "DataAddress",
            "type": "HttpProxy"
        },
        "privateProperties": {},
        "managedResources": False
    }

    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        result = await ikln_client.initiate_transfer(transfer_data)

        transfer_id = result.get("@id")
        logs.append(log_message(f"✅ Transferencia iniciada"))
        logs.append(log_message(f"   Transfer ID: {transfer_id}"))

        return {
            "success": True,
            "logs": logs,
            "transfer": {
                "id": transfer_id,
                "state": "REQUESTED",
                "assetId": request.assetId,
                "contractId": request.contractAgreementId,
                "counterPartyId": settings.mass_bpn,
                "edrAvailable": False,
                "edrEndpoint": None,
                "edrToken": None,
                "createdAt": None
            }
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        return {
            "success": False,
            "logs": logs,
            "error": str(e)
        }
    finally:
        await ikln_client.close()


@router.get("/list-transfers")
async def list_transfers() -> Dict[str, Any]:
    """List all transfer processes and check for EDRs."""
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        transfers_raw = await ikln_client.list_transfers()

        # Transform to simplified format and check for EDRs
        transfers = []
        for transfer in transfers_raw:
            transfer_id = transfer.get("@id")
            state = transfer.get("state")

            # Try to get EDR if transfer is in a completed state
            edr_data = None
            edr_available = False
            edr_endpoint = None
            edr_token = None

            if state in ["STARTED", "COMPLETED", "TERMINATED"]:
                edr_data = await ikln_client.get_edr_for_transfer(transfer_id)
                if edr_data:
                    edr_available = True
                    edr_endpoint = edr_data.get("endpoint")
                    edr_token = edr_data.get("authorization")

            transfers.append({
                "id": transfer_id,
                "state": state,
                "assetId": transfer.get("assetId", "unknown"),
                "contractId": transfer.get("contractId"),
                "counterPartyId": transfer.get("counterPartyId"),
                "edrAvailable": edr_available,
                "edrEndpoint": edr_endpoint,
                "edrToken": edr_token,
                "createdAt": transfer.get("createdAt"),
            })

        return {
            "success": True,
            "transfers": transfers
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "transfers": []
        }
    finally:
        await ikln_client.close()


@router.get("/get-fresh-token/{transfer_id}")
async def get_fresh_token(transfer_id: str) -> Dict[str, Any]:
    """Get a fresh EDR token for a transfer."""
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        edr_data = await ikln_client.get_edr_for_transfer(transfer_id)

        if not edr_data:
            return {
                "success": False,
                "error": "EDR not available yet"
            }

        return {
            "success": True,
            "token": edr_data.get("authorization"),
            "endpoint": edr_data.get("endpoint")
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        await ikln_client.close()


@router.post("/download-file")
async def download_file(request: DownloadFileRequest):
    """Download file from EDR endpoint (acts as proxy to avoid CORS)."""
    try:
        # If token is expired or missing, try to get a fresh one
        token = request.token
        endpoint = request.endpoint

        if not token:
            ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
            try:
                edr_data = await ikln_client.get_edr_for_transfer(request.transferId)
                if edr_data:
                    token = edr_data.get("authorization")
                    endpoint = edr_data.get("endpoint")
            finally:
                await ikln_client.close()

        if not token or not endpoint:
            raise HTTPException(status_code=400, detail="Token or endpoint not available")

        # Make request to data plane (disable SSL verification for dev environments)
        async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
            response = await client.get(
                endpoint,
                headers={
                    "Authorization": token
                }
            )
            response.raise_for_status()

            # Return the file content
            from fastapi.responses import Response
            return Response(
                content=response.content,
                media_type=response.headers.get("content-type", "application/octet-stream"),
                headers={
                    "Content-Disposition": response.headers.get("content-disposition", "attachment; filename=data.dat")
                }
            )

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Data plane error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug-transfer/{transfer_id}")
async def debug_transfer(transfer_id: str) -> Dict[str, Any]:
    """Debug a transfer to see why EDR might not be available."""
    logs: List[str] = []

    logs.append(log_message(f"🔍 Analizando transfer: {transfer_id}"))

    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        # Get transfer details
        transfer = await ikln_client.get_transfer(transfer_id)
        
        logs.append(log_message(f"   Estado: {transfer.get('state')}"))
        logs.append(log_message(f"   Asset: {transfer.get('assetId')}"))

        # Try to get EDR
        edr_data = await ikln_client.get_edr_for_transfer(transfer_id)

        if edr_data:
            logs.append(log_message("✅ EDR disponible"))
            logs.append(log_message(f"   Endpoint: {edr_data.get('endpoint')}"))
            logs.append(log_message(f"   Token presente: {'Sí' if edr_data.get('authorization') else 'No'}"))
        else:
            logs.append(log_message("❌ EDR no disponible"))
            logs.append(log_message("   Posibles causas:"))
            logs.append(log_message("   • El transfer aún no ha llegado al estado correcto"))
            logs.append(log_message("   • Estados válidos: STARTED, COMPLETED, TERMINATED"))
            logs.append(log_message("   • El EDC puede tardar unos segundos en generar el EDR"))

        return {
            "success": True,
            "logs": logs,
            "transfer": transfer,
            "edr": edr_data
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        return {
            "success": False,
            "logs": logs,
            "error": str(e)
        }
    finally:
        await ikln_client.close()
