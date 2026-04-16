"""Phase 6 routes — Catalog, negotiations, and transfers."""

import asyncio
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import httpx
import json

from poc.clients.edc import EdcManagementClient
from poc.config import settings
from poc.api.routes.phase6_edr_monitor import monitor_transfer_for_edr, get_cached_edr

# Configure logger
logger = logging.getLogger(__name__)

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
    
    # Log the received policy for debugging
    logs.append(log_message(f"📄 Policy recibida:"))
    logs.append(json.dumps(request.policy, indent=2))

    # Añadir campos obligatorios a la policy si no están presentes
    # (siguiendo el mismo patrón que edc-consumer y dashboard)
    # IMPORTANTE: Usar nombres SIN prefijo "odrl:" para compatibilidad con el contexto JSON-LD
    policy_with_required_fields = dict(request.policy)
    
    # Añadir target (assetId) si no existe
    if "odrl:target" not in policy_with_required_fields and "target" not in policy_with_required_fields:
        policy_with_required_fields["target"] = request.assetId
        logs.append(log_message(f"➕ Añadido target = {request.assetId}"))
    
    # Añadir assigner (counterPartyId) si no existe
    if "odrl:assigner" not in policy_with_required_fields and "assigner" not in policy_with_required_fields:
        policy_with_required_fields["assigner"] = settings.mass_bpn
        logs.append(log_message(f"➕ Añadido assigner = {settings.mass_bpn}"))

    # Build negotiation request - using the correct format that works in edc-consumer
    # IMPORTANT: Pass the policy as-is, don't reconstruct it
    negotiation_data = {
        "@type": "ContractRequest",
        "counterPartyAddress": settings.mass_dsp,
        "counterPartyId": settings.mass_bpn,
        "protocol": "dataspace-protocol-http",
        "policy": policy_with_required_fields,
        "callbackAddresses": []
    }
    
    logs.append(log_message(f"📤 Negotiation payload:"))
    logs.append(json.dumps(negotiation_data, indent=2))

    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        result = await ikln_client.initiate_negotiation(negotiation_data)

        negotiation_id = result.get("@id")
        logs.append(log_message(f"✅ Negociación iniciada"))
        logs.append(log_message(f"   Negotiation ID: {negotiation_id}"))
        logs.append(log_message(f"   Estado: Procesando..."))

        from datetime import datetime
        
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
                "createdAt": datetime.now().isoformat()
            }
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        
        # Try to extract more details from HTTPStatusError if available
        if hasattr(e, 'response'):
            try:
                error_body = e.response.text
                logs.append(log_message(f"📋 Error details: {error_body}"))
            except:
                pass
        
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
            # Try to get timestamp with fallback options
            created_at = nego.get("createdAt") or nego.get("createdTimestamp")
            state_timestamp = nego.get("stateTimestamp") or nego.get("updatedAt")
            
            negotiations.append({
                "id": nego.get("@id"),
                "state": nego.get("state"),
                "assetId": nego.get("assetId", "unknown"),
                "contractAgreementId": nego.get("contractAgreementId"),
                "counterPartyAddress": nego.get("counterPartyAddress"),
                "counterPartyId": nego.get("counterPartyId"),
                "createdAt": created_at,
                "stateTimestamp": state_timestamp,
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
async def initiate_transfer_for_contract(
    request: InitiateTransferRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """Initiate a data transfer for a negotiated contract."""
    logs: List[str] = []

    logs.append(log_message(f"📥 Iniciando transferencia..."))
    logs.append(log_message(f"   Contract Agreement: {request.contractAgreementId}"))
    logs.append(log_message(f"   Asset: {request.assetId}"))

    # Build transfer request - using the format that works in dashboard and edc-consumer
    transfer_data = {
        "@type": "TransferRequest",
        "assetId": request.assetId,
        "contractId": request.contractAgreementId,
        "counterPartyAddress": settings.mass_dsp,
        "counterPartyId": settings.mass_bpn,
        "connectorId": settings.mass_bpn,
        "protocol": "dataspace-protocol-http",
        "transferType": "HttpData-PULL",
        "dataDestination": {
            "@type": "DataAddress",  # Include @type as per dashboard
            "type": "HttpProxy"
        },
        "privateProperties": {},
        "callbackAddresses": []  # Add callback addresses
    }
    
    logs.append(log_message(f"📤 Transfer payload:"))
    logs.append(json.dumps(transfer_data, indent=2))

    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        result = await ikln_client.initiate_transfer(transfer_data)

        transfer_id = result.get("@id")
        logs.append(log_message(f"✅ Transferencia iniciada"))
        logs.append(log_message(f"   Transfer ID: {transfer_id}"))
        logs.append(log_message(f"🔍 Monitoreando EDR en background..."))
        
        # Start monitoring for EDR in background
        background_tasks.add_task(monitor_transfer_for_edr, transfer_id)

        from datetime import datetime
        
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
                "createdAt": datetime.now().isoformat()
            }
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        
        # Try to extract more details from HTTPStatusError if available
        if hasattr(e, 'response'):
            try:
                error_body = e.response.text
                logs.append(log_message(f"📋 Error details: {error_body}"))
            except:
                pass
        
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

            # First, check if we have a cached EDR from monitoring
            cached_edr = get_cached_edr(transfer_id)
            if cached_edr:
                edr_available = True
                edr_endpoint = cached_edr.get("endpoint")
                edr_token = cached_edr.get("authorization")
                print(f"✅ Using cached EDR for transfer {transfer_id}")
            # Second, check if EDR is embedded in the transfer's dataAddress field
            else:
                data_address = transfer.get("dataAddress")
                if data_address:
                    edr_endpoint = data_address.get("endpoint") or data_address.get("baseUrl")
                    edr_token = data_address.get("authCode") or data_address.get("authorization") or data_address.get("authKey")
                    if edr_endpoint:
                        edr_data = data_address
                        edr_available = True
                        print(f"✅ EDR found in dataAddress for transfer {transfer_id}")

                # If not embedded, query the EDRs endpoint for completed transfers
                if not edr_data and not edr_available and state in ["STARTED", "COMPLETED", "TERMINATED"]:
                    print(f"🔍 Querying EDRs endpoint for transfer {transfer_id} in state {state}")
                    edr_data = await ikln_client.get_edr_for_transfer(transfer_id)
                    if edr_data:
                        edr_available = True
                        edr_endpoint = edr_data.get("endpoint")
                        edr_token = edr_data.get("authorization")
                        print(f"✅ EDR retrieved from EDRs endpoint for transfer {transfer_id}")
                    else:
                        print(f"⚠️ No EDR found for transfer {transfer_id} (state: {state})")

            # Try to get timestamp with fallback options (different EDC versions use different field names)
            created_at = transfer.get("createdAt") or transfer.get("createdTimestamp")
            state_timestamp = transfer.get("stateTimestamp") or transfer.get("updatedAt")
            
            transfers.append({
                "id": transfer_id,
                "state": state,
                "assetId": transfer.get("assetId", "unknown"),
                "contractId": transfer.get("contractId"),
                "counterPartyId": transfer.get("counterPartyId"),
                "edrAvailable": edr_available,
                "edrEndpoint": edr_endpoint,
                "edrToken": edr_token,
                "createdAt": created_at,
                "stateTimestamp": state_timestamp,
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


@router.get("/transfer-edr/{transfer_id}")
async def get_transfer_edr(transfer_id: str) -> Dict[str, Any]:
    """Get the cached EDR for a specific transfer."""
    edr = get_cached_edr(transfer_id)
    
    if edr:
        return {
            "success": True,
            "edr": edr,
            "cached": True
        }
    else:
        return {
            "success": False,
            "message": "EDR not found in cache. It may not have been captured yet or the transfer may not have reached STARTED state.",
            "cached": False
        }


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

        # Log request details for debugging
        logger.info(f"🔍 Downloading from endpoint: {endpoint}")
        logger.info(f"🔍 Using token: {token[:50]}..." if len(token) > 50 else f"🔍 Using token: {token}")
        print(f"🔍 Download request - Endpoint: {endpoint}")
        print(f"🔍 Download request - Token length: {len(token)} chars")

        # Make request to data plane
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
        error_detail = f"Data plane error: Status {e.response.status_code}, Body: {e.response.text}, URL: {endpoint}"
        logger.error(f"❌ Download HTTPStatusError: {error_detail}")
        print(f"❌ Download error details:")
        print(f"   Status: {e.response.status_code}")
        print(f"   URL: {endpoint}")
        print(f"   Response body: {e.response.text}")
        print(f"   Response headers: {dict(e.response.headers)}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=error_detail
        )
    except Exception as e:
        logger.error(f"❌ Download general exception: {str(e)}")
        print(f"❌ Download exception: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())
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
        
        # Check if dataAddress exists
        data_address = transfer.get("dataAddress")
        if data_address:
            logs.append(log_message(f"✅ dataAddress field found in transfer"))
            logs.append(log_message(f"   Fields: {list(data_address.keys())}"))
            
            endpoint = data_address.get("endpoint") or data_address.get("baseUrl")
            auth = data_address.get("authCode") or data_address.get("authorization") or data_address.get("authKey")
            
            if endpoint:
                logs.append(log_message(f"✅ Endpoint: {endpoint}"))
            else:
                logs.append(log_message(f"❌ No endpoint in dataAddress"))
            
            if auth:
                logs.append(log_message(f"✅ Authorization token present"))
            else:
                logs.append(log_message(f"❌ No authorization token in dataAddress"))
        else:
            logs.append(log_message(f"❌ No dataAddress field in transfer"))

        # Try to get EDR from EDRs endpoint
        logs.append(log_message(f""))
        logs.append(log_message(f"🔍 Checking EDRs endpoint..."))
        edr_data = await ikln_client.get_edr_for_transfer(transfer_id)

        if edr_data:
            logs.append(log_message("✅ EDR disponible desde EDRs endpoint"))
            logs.append(log_message(f"   Endpoint: {edr_data.get('endpoint')}"))
            logs.append(log_message(f"   Token presente: {'Sí' if edr_data.get('authorization') else 'No'}"))
        else:
            logs.append(log_message("❌ EDR no disponible desde EDRs endpoint"))
            logs.append(log_message(""))
            logs.append(log_message("📋 Transfer completo (raw):"))
            logs.append(json.dumps(transfer, indent=2)[:2000])  # Limit to 2000 chars

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
