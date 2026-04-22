"""Phase 6 routes — Catalog, negotiations, and transfers."""

import asyncio
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import httpx
import json

from clients.edc import EdcManagementClient
from config import settings
from api.routes.phase6_edr_monitor import monitor_transfer_for_edr, get_cached_edr

# Configure logger
logger = logging.getLogger(__name__)

# EDC Transfer Process State Codes (based on TransferProcessStates.java)
STATE_CODES = {
    "INITIAL": 100,
    "PROVISIONING": 200,
    "PROVISIONED": 300,
    "REQUESTING": 400,
    "REQUESTED": 500,
    "STARTING": 550,
    "STARTED": 600,
    "SUSPENDING": 650,
    "SUSPENDED": 700,
    "RESUMING": 720,
    "COMPLETING": 750,
    "COMPLETED": 800,
    "TERMINATING": 825,
    "TERMINATED": 850,
    "DEPROVISIONING": 900,
    "DEPROVISIONED": 1000,
}

def get_state_code(state: str) -> int:
    """Get numeric code for transfer state."""
    return STATE_CODES.get(state, 0)

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
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
    
    logs: List[str] = []

    logger.info(f"\n{'='*80}")
    logger.info(f"🚀 Iniciando transferencia desde IKLN hacia MASS")
    logger.info(f"   Timestamp: {timestamp}")
    logger.info(f"   Contract Agreement ID: {request.contractAgreementId}")
    logger.info(f"   Asset ID: {request.assetId}")
    logger.info(f"   Counter Party (MASS): {settings.mass_bpn}")
    logger.info(f"   DSP Endpoint: {settings.mass_dsp}")
    
    # FORCE OUTPUT - print to stdout directly
    print(f"\n{'='*80}", flush=True)
    print(f"{timestamp} | INFO     | 🚀 Iniciando transferencia desde IKLN hacia MASS", flush=True)
    print(f"{timestamp} | INFO     |    Contract: {request.contractAgreementId}", flush=True)
    print(f"{timestamp} | INFO     |    Asset: {request.assetId}", flush=True)
    print(f"{timestamp} | INFO     |    MASS BPN: {settings.mass_bpn}", flush=True)
    
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
        logger.info(f"📤 Enviando TransferRequest al conector IKLN...")
        print(f"{timestamp} | INFO     | 📤 Enviando TransferRequest al conector IKLN...", flush=True)
        
        result = await ikln_client.initiate_transfer(transfer_data)

        transfer_id = result.get("@id")
        transfer_state = result.get("state", "UNKNOWN")
        
        logger.info(f"✅ Respuesta del conector MASS recibida:")
        logger.info(f"   Transfer ID: {transfer_id}")
        logger.info(f"   Estado inicial: {transfer_state}")
        logger.info(f"   Response completa: {json.dumps(result, indent=2)[:500]}...")
        logger.info(f"{'='*80}\n")
        
        print(f"{timestamp} | INFO     | ✅ Transferencia iniciada: {transfer_id}", flush=True)
        print(f"{timestamp} | INFO     |    Estado: {transfer_state}", flush=True)
        print(f"{'='*80}\n", flush=True)
        
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
    """List all transfer processes - optimized to return immediately without waiting for EDR queries."""
    import time
    from datetime import datetime
    start_time = time.time()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
    
    logger.info(f"\n{'~'*80}")
    logger.info(f"📋 Listando todas las transferencias")
    logger.info(f"   Timestamp: {timestamp}")
    
    print(f"\n{'~'*80}", flush=True)
    print(f"{timestamp} | INFO     | 📋 Listando transferencias", flush=True)
    
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        # Get all transfers
        t0 = time.time()
        transfers_raw = await ikln_client.list_transfers()
        query_time = time.time() - t0
        
        logger.info(f"📦 Respuesta del conector MASS:")
        logger.info(f"   Número de transferencias: {len(transfers_raw)}")
        logger.info(f"   Tiempo de consulta: {query_time:.2f}s")
        
        print(f"{timestamp} | INFO     | 📦 Transferencias: {len(transfers_raw)} total", flush=True)

        # Process transfers and use ONLY cached/embedded EDR data
        # Skip expensive EDR queries - the background monitor will populate the cache
        transfers_info = []
        
        for idx, transfer in enumerate(transfers_raw):
            transfer_id = transfer.get("@id")
            state = transfer.get("state")
            state_code = get_state_code(state)
            data_address = transfer.get("dataAddress")
            
            # Log primeras 3 transferencias con detalle
            if idx < 3:
                logger.info(f"   [{idx+1}] Transfer ID: {transfer_id}")
                logger.info(f"       Estado: {state} (código: {state_code})")
                logger.info(f"       Asset: {transfer.get('assetId', 'unknown')}")
                logger.info(f"       Tiene dataAddress: {bool(data_address)}")
            
            # Initialize EDR data
            edr_available = False
            edr_endpoint = None
            edr_token = None
            
            # Check cached EDR first (from background monitoring)
            cached_edr = get_cached_edr(transfer_id)
            if cached_edr:
                edr_available = True
                edr_endpoint = cached_edr.get("endpoint")
                edr_token = cached_edr.get("authorization")
            # Check if EDR is embedded in dataAddress
            elif data_address:
                edr_endpoint = data_address.get("endpoint") or data_address.get("baseUrl")
                edr_token = data_address.get("authCode") or data_address.get("authorization") or data_address.get("authKey")
                if edr_endpoint:
                    edr_available = True
            
            # Get timestamps
            created_at = transfer.get("createdAt") or transfer.get("createdTimestamp")
            state_timestamp = transfer.get("stateTimestamp") or transfer.get("updatedAt")
            
            transfers_info.append({
                "id": transfer_id,
                "state": state,
                "stateCode": get_state_code(state),
                "rawState": state,  # Estado original sin transformar del EDC
                "assetId": transfer.get("assetId", "unknown"),
                "contractId": transfer.get("contractId"),
                "contractAgreementId": transfer.get("contractId"),  # Alias para consistencia con negociaciones
                "counterPartyId": transfer.get("counterPartyId"),
                "edrAvailable": edr_available,
                "edrEndpoint": edr_endpoint,
                "edrToken": edr_token,
                "createdAt": created_at,
                "stateTimestamp": state_timestamp,
            })

        elapsed = time.time() - start_time
        logger.info(f"✅ list_transfers completado en {elapsed:.2f}s")
        logger.info(f"   Transferencias procesadas: {len(transfers_info)}")
        logger.info(f"   Con EDR disponible: {sum(1 for t in transfers_info if t['edrAvailable'])}")
        logger.info(f"   Sin EDR disponible: {sum(1 for t in transfers_info if not t['edrAvailable'])}")
        logger.info(f"{'~'*80}\n")

        return {
            "success": True,
            "transfers": transfers_info
        }

    except Exception as e:
        print(f"❌ Error in list_transfers: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "transfers": []
        }
    finally:
        await ikln_client.close()


@router.get("/transfer-edr/{transfer_id}")
async def get_transfer_edr(transfer_id: str) -> Dict[str, Any]:
    """Get the EDR for a specific transfer on-demand (if not cached)."""
    # First, check cache
    edr = get_cached_edr(transfer_id)
    
    if edr:
        return {
            "success": True,
            "edr": edr,
            "cached": True
        }
    
    # If not cached, fetch from EDC
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        print(f"🔍 Fetching EDR on-demand for transfer {transfer_id}")
        edr_data = await ikln_client.get_edr_for_transfer(transfer_id)
        
        if edr_data:
            return {
                "success": True,
                "edr": edr_data,
                "cached": False
            }
        else:
            return {
                "success": False,
                "error": "EDR not found for this transfer",
                "cached": False
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "cached": False
        }
    finally:
        await ikln_client.close()


@router.get("/transfer-status/{transfer_id}")
async def get_transfer_status(transfer_id: str) -> Dict[str, Any]:
    """Get the current state of a specific transfer process."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
    
    logger.info(f"\n{'-'*80}")
    logger.info(f"🔍 Consultando estado de transferencia")
    logger.info(f"   Timestamp: {timestamp}")
    logger.info(f"   Transfer ID: {transfer_id}")
    
    print(f"\n{'-'*80}", flush=True)
    print(f"{timestamp} | INFO     | 🔍 Consultando estado: {transfer_id}", flush=True)
    
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        transfer = await ikln_client.get_transfer(transfer_id)
        state = transfer.get("state")
        state_code = get_state_code(state)
        data_address = transfer.get("dataAddress")
        
        logger.info(f"📊 Respuesta del conector MASS:")
        logger.info(f"   Estado: {state}")
        logger.info(f"   Código estado: {state_code}")
        logger.info(f"   Tiene dataAddress: {bool(data_address)}")
        logger.info(f"   Transfer completo: {json.dumps(transfer, indent=2)[:800]}...")
        logger.info(f"{'-'*80}\n")
        
        print(f"{timestamp} | INFO     | 📊 Estado: {state} (código: {state_code})", flush=True)
        print(f"{'-'*80}\n", flush=True)
        
        # Check for EDR availability
        edr_available = False
        edr_endpoint = None
        edr_token = None
        
        # Check cached EDR first
        cached_edr = get_cached_edr(transfer_id)
        if cached_edr:
            edr_available = True
            edr_endpoint = cached_edr.get("endpoint")
            edr_token = cached_edr.get("authorization")
        # Check embedded in dataAddress
        elif data_address:
            edr_endpoint = data_address.get("endpoint") or data_address.get("baseUrl")
            edr_token = data_address.get("authCode") or data_address.get("authorization") or data_address.get("authKey")
            if edr_endpoint:
                edr_available = True
        
        # Get timestamps
        created_at = transfer.get("createdAt") or transfer.get("createdTimestamp")
        state_timestamp = transfer.get("stateTimestamp") or transfer.get("updatedAt")
        
        return {
            "success": True,
            "transfer": {
                "id": transfer_id,
                "state": state,
                "stateCode": get_state_code(state),
                "rawState": state,  # Estado original sin transformar del EDC
                "assetId": transfer.get("assetId", "unknown"),
                "contractId": transfer.get("contractId"),
                "contractAgreementId": transfer.get("contractId"),  # Alias para consistencia con negociaciones
                "counterPartyId": transfer.get("counterPartyId"),
                "edrAvailable": edr_available,
                "edrEndpoint": edr_endpoint,
                "edrToken": edr_token,
                "createdAt": created_at,
                "stateTimestamp": state_timestamp,
            }
        }
    except Exception as e:
        logger.error(f"Error getting transfer status: {str(e)}")
        return {
            "success": False,
            "error": str(e)
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
