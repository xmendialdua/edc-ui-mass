"""Phase 6 routes — Catalog, negotiations, and transfers."""

import asyncio
import base64
import logging
import re
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import httpx
import json

from clients.edc import EdcManagementClient
from config import settings
from api.routes.phase6_edr_monitor import monitor_transfer_for_edr, get_cached_edr, is_monitoring

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
    from datetime import datetime, timedelta
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"[{timestamp}] {message}"


def describe_exception(error: Exception) -> Dict[str, Any]:
    """Build a frontend-friendly error payload with HTTP details when available."""
    detail: Dict[str, Any] = {
        "type": type(error).__name__,
        "message": str(error),
    }

    if isinstance(error, httpx.HTTPStatusError):
        response = error.response
        detail.update(
            {
                "status": response.status_code,
                "url": str(response.request.url) if response.request else None,
                "reason": response.reason_phrase,
                "body": response.text[:2000] if response.text else "",
            }
        )
    elif isinstance(error, ValueError):
        detail["category"] = "configuration"

    return detail


def append_error_logs(logs: List[str], detail: Dict[str, Any]) -> None:
    """Append normalized, readable error diagnostics to operation logs."""
    logs.append(log_message(f"❌ Error: {detail.get('message', 'unknown error')}"))
    logs.append(log_message(f"   Tipo: {detail.get('type', 'unknown')}"))

    if detail.get("url"):
        logs.append(log_message(f"   URL: {detail['url']}"))
    if detail.get("status") is not None:
        logs.append(log_message(f"   HTTP status: {detail['status']} {detail.get('reason', '')}".strip()))
    if detail.get("category"):
        logs.append(log_message(f"   Categoría: {detail['category']}"))
    if detail.get("body"):
        logs.append(log_message(f"   Response body: {detail['body']}"))


def get_consumer_api_key(management_url: str) -> str:
    """Get API key for a given management URL.

    Returns the appropriate API key based on known connectors.
    Raises an explicit error for PRTA if its API key is not configured,
    instead of silently falling back to IKLN and triggering 401 responses.
    """
    normalized_url = (management_url or "").rstrip("/")

    if normalized_url == settings.ikln_management_url.rstrip("/"):
        return settings.ikln_api_key

    if normalized_url == settings.mass_management_url.rstrip("/"):
        return settings.mass_api_key

    if normalized_url == settings.prta_management_url.rstrip("/"):
        prta_api_key = (settings.prta_api_key or "").strip()
        if not prta_api_key or prta_api_key.endswith("change-in-production"):
            raise ValueError(
                "PRTA API key no configurada. Define PRTA_API_KEY en el backend antes de usar este conector."
            )
        return prta_api_key

    raise ValueError(
        f"No hay API key configurada para el management_url '{management_url}'. "
        "Añade una clave explícita en la configuración del backend."
    )


def resolve_consumer_context(
    logs: List[str],
    consumer_bpn: Optional[str],
    consumer_management_url: Optional[str],
) -> tuple[str, str, str]:
    """Resolve consumer connector context.

    If an authenticated consumer BPN is provided but management URL is missing,
    return an explicit error instead of silently falling back to IKLN.
    """
    bpn = (consumer_bpn or "").strip()
    mgmt = (consumer_management_url or "").strip()

    if bpn and not mgmt:
        error = (
            f"Partner autenticado ({bpn}) sin management_url configurada. "
            "No se aplicará fallback a IKLN. "
            "Configura el connector_url del partner en portal.connectors."
        )
        logs.append(log_message(f"❌ {error}"))
        raise ValueError(error)

    # Backwards compatibility for legacy non-partner flows.
    consumer_mgmt = mgmt or settings.ikln_management_url
    consumer_bpn_val = bpn or settings.ikln_bpn
    consumer_api_key = get_consumer_api_key(consumer_mgmt)
    return consumer_mgmt, consumer_bpn_val, consumer_api_key


def _decode_jwt_segment(segment: str) -> Dict[str, Any]:
    """Decode a JWT segment as JSON without verifying signature."""
    padding = "=" * ((4 - len(segment) % 4) % 4)
    raw = base64.urlsafe_b64decode((segment + padding).encode("ascii"))
    return json.loads(raw.decode("utf-8"))


def _analyze_jwt_timing(token: Optional[str]) -> Dict[str, Any]:
    """Return lightweight timing diagnostics for a JWT token."""
    if not token:
        return {
            "present": False,
            "validFormat": False,
            "error": "token_missing",
        }

    parts = token.split(".")
    if len(parts) < 2:
        return {
            "present": True,
            "validFormat": False,
            "error": "not_jwt",
            "tokenLength": len(token),
        }

    now_ts = int(datetime.now(timezone.utc).timestamp())

    try:
        header = _decode_jwt_segment(parts[0])
        payload = _decode_jwt_segment(parts[1])
    except Exception as e:
        return {
            "present": True,
            "validFormat": False,
            "error": f"decode_error: {type(e).__name__}",
            "tokenLength": len(token),
        }

    exp = payload.get("exp")
    iat = payload.get("iat")
    nbf = payload.get("nbf")

    seconds_to_exp = None
    expired = None
    if isinstance(exp, (int, float)):
        seconds_to_exp = int(exp) - now_ts
        expired = seconds_to_exp <= 0

    valid_window_seconds = None
    if isinstance(exp, (int, float)) and isinstance(iat, (int, float)):
        valid_window_seconds = int(exp) - int(iat)

    return {
        "present": True,
        "validFormat": True,
        "tokenLength": len(token),
        "tokenPreview": f"{token[:20]}...{token[-10:]}" if len(token) > 35 else token,
        "header": {
            "alg": header.get("alg"),
            "kid": header.get("kid"),
            "typ": header.get("typ"),
        },
        "claims": {
            "iss": payload.get("iss"),
            "aud": payload.get("aud"),
            "sub": payload.get("sub"),
            "jti": payload.get("jti"),
            "iat": iat,
            "exp": exp,
            "nbf": nbf,
        },
        "timing": {
            "nowTs": now_ts,
            "nowUtc": datetime.fromtimestamp(now_ts, tz=timezone.utc).isoformat(),
            "iatUtc": datetime.fromtimestamp(int(iat), tz=timezone.utc).isoformat() if isinstance(iat, (int, float)) else None,
            "expUtc": datetime.fromtimestamp(int(exp), tz=timezone.utc).isoformat() if isinstance(exp, (int, float)) else None,
            "nbfUtc": datetime.fromtimestamp(int(nbf), tz=timezone.utc).isoformat() if isinstance(nbf, (int, float)) else None,
            "secondsToExpiration": seconds_to_exp,
            "expired": expired,
            "validWindowSeconds": valid_window_seconds,
        },
    }


def _parse_transfer_timestamp(value: Any) -> Optional[datetime]:
    """Parse transfer timestamps from ISO strings or epoch values."""
    if value is None:
        return None

    # Numeric epoch seconds/milliseconds
    if isinstance(value, (int, float)):
        ts = float(value)
        # Heuristic: values bigger than 1e12 are usually milliseconds.
        if ts > 1e12:
            ts = ts / 1000.0
        return datetime.fromtimestamp(ts, tz=timezone.utc)

    # Strings: ISO or numeric text
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None

        if raw.isdigit():
            ts = float(raw)
            if ts > 1e12:
                ts = ts / 1000.0
            return datetime.fromtimestamp(ts, tz=timezone.utc)

        normalized = raw.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    return None


class NegotiateAssetRequest(BaseModel):
    assetId: str
    policy: Dict[str, Any]
    consumerBpn: Optional[str] = None  # BPN del consumer (partner autenticado)
    consumerManagementUrl: Optional[str] = None  # Management URL del consumer


class InitiateTransferRequest(BaseModel):
    contractAgreementId: str
    assetId: str
    consumerBpn: Optional[str] = None  # BPN del consumer (partner autenticado)
    consumerManagementUrl: Optional[str] = None  # Management URL del consumer


class DownloadFileRequest(BaseModel):
    transferId: str
    endpoint: str
    token: str


@router.post("/catalog-request")
async def catalog_request(
    consumer_bpn: Optional[str] = None,
    consumer_management_url: Optional[str] = None
) -> Dict[str, Any]:
    """Request catalog from MASS (provider).
    
    Consumer params should be provided from authenticated partner.
    If not provided, defaults to IKLN for backwards compatibility.
    Provider is always MASS.
    """
    logs: List[str] = []

    try:
        consumer_mgmt, consumer_bpn_val, consumer_api_key = resolve_consumer_context(
            logs,
            consumer_bpn,
            consumer_management_url,
        )
    except ValueError as e:
        return {
            "success": False,
            "logs": logs,
            "error": str(e),
            "datasets": [],
        }
    
    # Provider is always MASS
    provider_bpn_val = settings.mass_bpn
    provider_dsp = settings.mass_dsp
    
    logs.append(log_message(f"🔍 Consultando catálogo de MASS..."))
    logs.append(log_message(f"   Consumer: {consumer_bpn_val}"))
    logs.append(log_message(f"   Provider: {provider_bpn_val}"))
    logs.append(log_message(f"   DSP URL: {provider_dsp}"))

    consumer_client = EdcManagementClient(consumer_mgmt, consumer_api_key)
    try:
        catalog = await consumer_client.request_catalog(
            counter_party_url=provider_dsp,
            counter_party_id=provider_bpn_val
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
        detail = describe_exception(e)
        append_error_logs(logs, detail)
        return {
            "success": False,
            "logs": logs,
            "error": detail.get("message"),
            "error_detail": detail,
            "datasets": []
        }
    finally:
        await consumer_client.close()


@router.post("/negotiate-asset")
async def negotiate_asset(request: NegotiateAssetRequest) -> Dict[str, Any]:
    """Initiate contract negotiation for an asset.
    
    Consumer params should be provided from authenticated partner.
    If not provided, defaults to IKLN for backwards compatibility.
    Provider is always MASS.
    """
    logs: List[str] = []

    try:
        consumer_mgmt, consumer_bpn_val, consumer_api_key = resolve_consumer_context(
            logs,
            request.consumerBpn,
            request.consumerManagementUrl,
        )
    except ValueError as e:
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
    
    # Provider is always MASS
    provider_bpn_val = settings.mass_bpn
    provider_dsp = settings.mass_dsp
    
    logs.append(log_message(f"🤝 Iniciando negociación para asset: {request.assetId}"))
    logs.append(log_message(f"   Consumer: {consumer_bpn_val}"))
    logs.append(log_message(f"   Provider: {provider_bpn_val}"))
    
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
        policy_with_required_fields["assigner"] = provider_bpn_val
        logs.append(log_message(f"➕ Añadido assigner = {provider_bpn_val}"))

    # Build negotiation request - using the correct format that works in edc-consumer
    # IMPORTANT: Pass the policy as-is, don't reconstruct it
    negotiation_data = {
        "@type": "ContractRequest",
        "counterPartyAddress": provider_dsp,
        "counterPartyId": provider_bpn_val,
        "protocol": "dataspace-protocol-http",
        "policy": policy_with_required_fields,
        "callbackAddresses": []
    }
    
    logs.append(log_message(f"📤 Negotiation payload:"))
    logs.append(json.dumps(negotiation_data, indent=2))

    consumer_client = EdcManagementClient(consumer_mgmt, consumer_api_key)
    try:
        result = await consumer_client.initiate_negotiation(negotiation_data)

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
                "counterPartyAddress": provider_dsp,
                "counterPartyId": provider_bpn_val,
                "createdAt": datetime.now().isoformat()
            }
        }

    except Exception as e:
        detail = describe_exception(e)
        append_error_logs(logs, detail)
        
        return {
            "success": False,
            "logs": logs,
            "negotiation": {
                "id": f"failed-{request.assetId}",
                "state": "FAILED",
                "assetId": request.assetId,
                "errorDetail": detail.get("message"),
                "errorMetadata": detail,
                "createdAt": None
            }
        }
    finally:
        await consumer_client.close()


@router.get("/list-negotiations")
async def list_negotiations(
    consumer_management_url: Optional[str] = None,
    negotiation_type: Optional[str] = "consumer"
) -> Dict[str, Any]:
    """List contract negotiations from consumer connector.
    
    Args:
        consumer_management_url: Management URL of the consumer connector
        negotiation_type: Filter by type - 'consumer' (initiated by this connector), 
                         'provider' (initiated by others), or 'all' (no filter)
    
    Consumer defaults to IKLN if not provided.
    Type defaults to 'consumer' (only negotiations initiated by this connector).
    """
    logs: List[str] = []
    consumer_mgmt = consumer_management_url or settings.ikln_management_url

    try:
        consumer_api_key = get_consumer_api_key(consumer_mgmt)
    except Exception as e:
        detail = describe_exception(e)
        append_error_logs(logs, detail)
        return {
            "success": False,
            "error": detail.get("message"),
            "error_detail": detail,
            "logs": logs,
            "negotiations": [],
        }
    
    consumer_client = EdcManagementClient(consumer_mgmt, consumer_api_key)
    try:
        negotiations_raw = await consumer_client.list_negotiations()

        # Transform to simplified format and filter by type
        negotiations = []
        for nego in negotiations_raw:
            nego_type = nego.get("type", "").upper()
            
            # Filter by negotiation type
            if negotiation_type and negotiation_type.lower() != "all":
                if nego_type != negotiation_type.upper():
                    continue
            
            # Try to get timestamp with fallback options
            created_at = nego.get("createdAt") or nego.get("createdTimestamp")
            state_timestamp = nego.get("stateTimestamp") or nego.get("updatedAt")
            
            negotiations.append({
                "id": nego.get("@id"),
                "state": nego.get("state"),
                "type": nego_type,
                "assetId": nego.get("assetId", "unknown"),
                "contractAgreementId": nego.get("contractAgreementId"),
                "counterPartyAddress": nego.get("counterPartyAddress"),
                "counterPartyId": nego.get("counterPartyId"),
                "createdAt": created_at,
                "stateTimestamp": state_timestamp,
            })

        return {
            "success": True,
            "negotiations": negotiations,
            "logs": logs,
            "filter": {
                "type": negotiation_type,
                "total_filtered": len(negotiations)
            }
        }

    except Exception as e:
        detail = describe_exception(e)
        append_error_logs(logs, detail)
        return {
            "success": False,
            "error": detail.get("message"),
            "error_detail": detail,
            "logs": logs,
            "negotiations": []
        }
    finally:
        await consumer_client.close()


@router.post("/initiate-transfer-for-contract")
async def initiate_transfer_for_contract(
    request: InitiateTransferRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """Initiate a data transfer for a negotiated contract.
    
    Consumer defaults to IKLN if not provided.
    Provider is always MASS.
    """
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
    
    logs: List[str] = []
    
    try:
        consumer_mgmt, consumer_bpn_val, consumer_api_key = resolve_consumer_context(
            logs,
            request.consumerBpn,
            request.consumerManagementUrl,
        )
    except ValueError as e:
        return {
            "success": False,
            "logs": logs,
            "error": str(e),
        }
    
    # Provider is always MASS
    provider_bpn_val = settings.mass_bpn
    provider_dsp = settings.mass_dsp
    
    logger.info(f"\n{'='*80}")
    logger.info(f"🚀 Iniciando transferencia de {consumer_bpn_val} hacia MASS")
    logger.info(f"   Timestamp: {timestamp}")
    logger.info(f"   Contract Agreement ID: {request.contractAgreementId}")
    logger.info(f"   Asset ID: {request.assetId}")
    logger.info(f"   Consumer: {consumer_bpn_val}")
    logger.info(f"   Provider (MASS): {provider_bpn_val}")
    logger.info(f"   DSP Endpoint: {provider_dsp}")
    
    # FORCE OUTPUT - print to stdout directly
    print(f"\n{'='*80}", flush=True)
    print(f"{timestamp} | INFO     | 🚀 Iniciando transferencia de {consumer_bpn_val} hacia MASS", flush=True)
    print(f"{timestamp} | INFO     |    Contract: {request.contractAgreementId}", flush=True)
    print(f"{timestamp} | INFO     |    Asset: {request.assetId}", flush=True)
    print(f"{timestamp} | INFO     |    MASS BPN: {provider_bpn_val}", flush=True)
    
    logs.append(log_message(f"📥 Iniciando transferencia..."))
    logs.append(log_message(f"   Contract Agreement: {request.contractAgreementId}"))
    logs.append(log_message(f"   Asset: {request.assetId}"))

    # Build transfer request - using the format that works in dashboard and edc-consumer
    transfer_data = {
        "@type": "TransferRequest",
        "assetId": request.assetId,
        "contractId": request.contractAgreementId,
        "counterPartyAddress": provider_dsp,
        "counterPartyId": provider_bpn_val,
        "connectorId": provider_bpn_val,
        "protocol": "dataspace-protocol-http",
        "transferType": "HttpData-PULL",
        "dataDestination": {
            "@type": "DataAddress",
            "type": "HttpProxy"
        },
        "privateProperties": {},
        "callbackAddresses": []
    }
    
    logs.append(log_message(f"📤 Transfer payload:"))
    logs.append(json.dumps(transfer_data, indent=2))

    consumer_client = EdcManagementClient(consumer_mgmt, consumer_api_key)
    try:
        logger.info(f"📤 Enviando TransferRequest al conector {consumer_bpn_val}...")
        print(f"{timestamp} | INFO     | 📤 Enviando TransferRequest al conector {consumer_bpn_val}...", flush=True)
        
        result = await consumer_client.initiate_transfer(transfer_data)

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
        detail = describe_exception(e)
        append_error_logs(logs, detail)
        
        return {
            "success": False,
            "logs": logs,
            "error": detail.get("message"),
            "error_detail": detail,
        }
    finally:
        await consumer_client.close()


@router.get("/list-transfers")
async def list_transfers(
    consumer_management_url: Optional[str] = None,
    transfer_type: Optional[str] = "consumer"
) -> Dict[str, Any]:
    """List transfer processes from consumer connector.
    
    Args:
        consumer_management_url: Management URL of the consumer connector
        transfer_type: Filter by type - 'consumer' (initiated by this connector),
                      'provider' (initiated by others), or 'all' (no filter)
    
    Consumer defaults to IKLN if not provided.
    Type defaults to 'consumer' (only transfers initiated by this connector).
    Optimized to return immediately without waiting for EDR queries.
    """
    import time
    from datetime import datetime
    start_time = time.time()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
    
    # Use provided consumer or default to IKLN
    logs: List[str] = []
    consumer_mgmt = consumer_management_url or settings.ikln_management_url
    try:
        consumer_api_key = get_consumer_api_key(consumer_mgmt)
    except Exception as e:
        detail = describe_exception(e)
        append_error_logs(logs, detail)
        return {
            "success": False,
            "error": detail.get("message"),
            "error_detail": detail,
            "logs": logs,
            "transfers": []
        }
    
    logger.info(f"\n{'~'*80}")
    logger.info(f"📋 Listando todas las transferencias")
    logger.info(f"   Timestamp: {timestamp}")
    logger.info(f"   Consumer Management: {consumer_mgmt}")
    
    consumer_client = EdcManagementClient(consumer_mgmt, consumer_api_key)
    try:
        # Get all transfers
        t0 = time.time()
        transfers_raw = await consumer_client.list_transfers()
        query_time = time.time() - t0
        
        logger.info(f"📦 Respuesta del conector:")
        logger.info(f"   Número de transferencias: {len(transfers_raw)}")
        logger.info(f"   Tiempo de consulta: {query_time:.2f}s")
        
        # Process transfers and use ONLY cached/embedded EDR data
        # Skip expensive EDR queries - the background monitor will populate the cache
        transfers_info = []
        filtered_count = 0
        
        for idx, transfer in enumerate(transfers_raw):
            transfer_id = transfer.get("@id")
            state = transfer.get("state")
            state_code = get_state_code(state)
            data_address = transfer.get("dataAddress")
            transfer_type_value = transfer.get("type", "").upper()
            created_at = transfer.get("createdAt") or transfer.get("createdTimestamp")
            state_timestamp = transfer.get("stateTimestamp") or transfer.get("updatedAt")
            
            # Filter by transfer type
            if transfer_type and transfer_type.lower() != "all":
                if transfer_type_value != transfer_type.upper():
                    filtered_count += 1
                    continue
            
            # Log primeras 3 transferencias con detalle
            if idx < 3:
                logger.info(f"   [{idx+1}] Transfer ID: {transfer_id}")
                logger.info(f"       Estado: {state} (código: {state_code})")
                logger.info(f"       Asset: {transfer.get('assetId', 'unknown')}")
                logger.info(f"       dataAddress embebido: {bool(data_address)}")
            
            # Initialize EDR data
            edr_available = False
            edr_endpoint = None
            edr_token = None
            edr_source = None
            edr_error = None
            edr_expires_at = None
            edr_expires_at_source = None
            edr_id = transfer_id
            
            # Check cached EDR first (from background monitoring)
            cached_edr = get_cached_edr(transfer_id)
            if cached_edr:
                if cached_edr.get("error"):
                    # Failure sentinel stored by monitor
                    edr_error = cached_edr.get("error")
                    if idx < 3:
                        logger.info(f"       ❌ EDR en caché con error: {edr_error}")
                else:
                    edr_available = True
                    edr_endpoint = cached_edr.get("endpoint")
                    edr_token = cached_edr.get("authorization")
                    edr_source = "cache"
                    raw_edr = cached_edr.get("raw") if isinstance(cached_edr, dict) else None
                    if isinstance(raw_edr, dict):
                        edr_id = raw_edr.get("@id") or transfer_id
                    if idx < 3:
                        logger.info(f"       ✅ EDR obtenido de: CACHÉ (monitor background)")
            # Check if EDR is embedded in dataAddress
            elif data_address:
                edr_endpoint = data_address.get("endpoint") or data_address.get("baseUrl")
                edr_token = data_address.get("authCode") or data_address.get("authorization") or data_address.get("authKey")
                if edr_endpoint:
                    edr_available = True
                    edr_source = "embedded"
                    if idx < 3:
                        logger.info(f"       ✅ EDR obtenido de: EMBEBIDO (dataAddress)")
            else:
                if idx < 3:
                    logger.info(f"       ⚠️ EDR: No disponible (ni en caché ni embebido)")

            # Compute EDR expiration when token is present.
            if edr_token:
                token_diag = _analyze_jwt_timing(edr_token)
                edr_expires_at = token_diag.get("timing", {}).get("expUtc")
                edr_expires_at_source = "token"
            # If token is missing but we have a cached refresh error containing
            # "Invalid token -> <jwt>", extract expiration from that rejected token.
            elif cached_edr and cached_edr.get("message"):
                message_text = cached_edr.get("message") or ""
                token_match = re.search(r"Invalid token\s*->\s*([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)", message_text)
                if token_match:
                    rejected_diag = _analyze_jwt_timing(token_match.group(1))
                    edr_expires_at = rejected_diag.get("timing", {}).get("expUtc")
                    edr_expires_at_source = "rejected_token"

            # Last fallback: estimate expiration as 5 minutes after transfer timestamp.
            # This is approximate and only used when exact token-derived expiration is unavailable.
            if not edr_expires_at:
                ref_ts = state_timestamp or created_at
                if ref_ts:
                    try:
                        parsed_ref = _parse_transfer_timestamp(ref_ts)
                        if parsed_ref:
                            edr_expires_at = (parsed_ref + timedelta(minutes=5)).isoformat()
                            edr_expires_at_source = "estimated_from_transfer_timestamp"
                        else:
                            edr_expires_at = None
                            edr_expires_at_source = None
                    except Exception:
                        edr_expires_at = None
                        edr_expires_at_source = None
            
            transfers_info.append({
                "id": transfer_id,
                "state": state,
                "stateCode": get_state_code(state),
                "rawState": state,  # Estado original sin transformar del EDC
                "type": transfer_type_value,
                "assetId": transfer.get("assetId", "unknown"),
                "contractId": transfer.get("contractId"),
                "contractAgreementId": transfer.get("contractId"),  # Alias para consistencia con negociaciones
                "counterPartyId": transfer.get("counterPartyId"),
                "edrId": edr_id,
                "edrAvailable": edr_available,
                "edrEndpoint": edr_endpoint,
                "edrToken": edr_token,
                "edrSource": edr_source,  # cache, embedded, or None
                "edrError": edr_error,  # set when monitor gave up (refresh_failed / config_error)
                "edrExpiresAt": edr_expires_at,
                "edrExpiresAtSource": edr_expires_at_source,
                "createdAt": created_at,
                "stateTimestamp": state_timestamp,
            })
            
            # Auto-monitor transfers in STARTED state without EDR.
            # Skip if already failed — the failure sentinel in cache prevents infinite loops.
            if state == "STARTED" and not edr_available and not edr_error:
                # Check if already being monitored to prevent duplicates
                if not is_monitoring(transfer_id):
                    if idx < 3:
                        logger.info(f"       🔄 Auto-iniciando monitor EDR para transfer sin EDR")
                    # Launch monitor in background (fire-and-forget)
                    asyncio.create_task(monitor_transfer_for_edr(transfer_id))
                else:
                    if idx < 3:
                        logger.info(f"       ⏭️ Monitor ya activo para esta transfer, skip")

        elapsed = time.time() - start_time
        
        # Count EDR sources and auto-monitoring
        edr_from_cache = sum(1 for t in transfers_info if t.get('edrSource') == 'cache')
        edr_from_embedded = sum(1 for t in transfers_info if t.get('edrSource') == 'embedded')
        edr_not_available = sum(1 for t in transfers_info if not t['edrAvailable'])
        auto_monitored = sum(1 for t in transfers_info if t.get('state') == 'STARTED' and not t.get('edrAvailable'))
        
        logger.info(f"✅ list_transfers completado en {elapsed:.2f}s")
        logger.info(f"   Transferencias totales: {len(transfers_raw)}")
        logger.info(f"   Filtradas (tipo != {transfer_type}): {filtered_count}")
        logger.info(f"   Transferencias procesadas: {len(transfers_info)}")
        logger.info(f"   EDR disponible: {len(transfers_info) - edr_not_available}")
        if edr_from_cache > 0:
            logger.info(f"      • Desde caché: {edr_from_cache}")
        if edr_from_embedded > 0:
            logger.info(f"      • Embebido en transfer: {edr_from_embedded}")
        if auto_monitored > 0:
            logger.info(f"   🔄 Auto-monitoreando EDR: {auto_monitored} transfer(s)")
        if edr_not_available > 0:
            logger.info(f"   EDR no disponible: {edr_not_available}")
        logger.info(f"{'~'*80}\n")

        return {
            "success": True,
            "transfers": transfers_info,
            "filter": {
                "type": transfer_type,
                "total_filtered": len(transfers_info),
                "total_raw": len(transfers_raw)
            }
        }

    except Exception as e:
        print(f"❌ Error in list_transfers: {str(e)}")
        import traceback
        traceback.print_exc()
        detail = describe_exception(e)
        append_error_logs(logs, detail)
        return {
            "success": False,
            "error": detail.get("message"),
            "error_detail": detail,
            "logs": logs,
            "transfers": []
        }
    finally:
        await consumer_client.close()


@router.get("/transfer-edr/{transfer_id}")
async def get_transfer_edr(transfer_id: str) -> Dict[str, Any]:
    """Get the EDR for a specific transfer on-demand (if not cached)."""
    # First, check cache
    edr = get_cached_edr(transfer_id)
    
    if edr:
        # Monitor may store a failure sentinel in cache (no usable token/endpoint).
        if isinstance(edr, dict) and edr.get("error"):
            return {
                "success": False,
                "error": f"cached_error:{edr.get('error')}",
                "message": edr.get("message"),
                "cached": True
            }

        if not (edr.get("endpoint") and edr.get("authorization")):
            return {
                "success": False,
                "error": "cached_edr_incomplete",
                "message": "Cached EDR exists but endpoint/token is missing",
                "cached": True
            }

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
        
        if edr_data and isinstance(edr_data, dict) and edr_data.get("error"):
            return {
                "success": False,
                "error": f"connector_error:{edr_data.get('error')}",
                "message": edr_data.get("message"),
                "cached": False
            }

        if edr_data:
            if not (edr_data.get("endpoint") and edr_data.get("authorization")):
                return {
                    "success": False,
                    "error": "connector_edr_incomplete",
                    "message": "Connector returned EDR without endpoint or token",
                    "cached": False
                }

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


@router.get("/edr-diagnostics/{transfer_id}")
async def get_edr_diagnostics(transfer_id: str, force_refresh: bool = False) -> Dict[str, Any]:
    """Detailed diagnostics for transfer/EDR status and JWT timing."""
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    now_utc = datetime.now(timezone.utc).isoformat()

    try:
        transfer = await ikln_client.get_transfer(transfer_id)
        state = transfer.get("state")
        data_address = transfer.get("dataAddress") or {}

        cached_edr = get_cached_edr(transfer_id)

        current_endpoint = None
        current_token = None
        current_source = None
        current_error = None
        current_captured_at = None
        current_failed_at = None

        if cached_edr:
            if cached_edr.get("error"):
                current_error = cached_edr.get("error")
                current_failed_at = cached_edr.get("failedAt")
            else:
                current_endpoint = cached_edr.get("endpoint")
                current_token = cached_edr.get("authorization")
                current_source = "cache"
                current_captured_at = cached_edr.get("capturedAt")

        if not current_endpoint and not current_token:
            embedded_endpoint = data_address.get("endpoint") or data_address.get("baseUrl")
            embedded_token = data_address.get("authCode") or data_address.get("authorization") or data_address.get("authKey")
            if embedded_endpoint or embedded_token:
                current_endpoint = embedded_endpoint
                current_token = embedded_token
                current_source = "embedded_dataAddress"

        refresh_result: Dict[str, Any] = {
            "requested": force_refresh,
            "success": False,
            "error": None,
            "message": None,
            "source": None,
            "endpoint": None,
            "tokenTiming": _analyze_jwt_timing(None),
            "rejectedTokenTiming": None,
        }

        if force_refresh:
            refreshed = await ikln_client.get_edr_for_transfer(
                transfer_id,
                force_dataaddress_refresh=True,
            )

            if refreshed and isinstance(refreshed, dict) and refreshed.get("error"):
                refresh_result["error"] = refreshed.get("error")
                refresh_result["message"] = refreshed.get("message")

                # If STS reports "Invalid token -> <jwt>", decode it to expose exp/iat.
                message_text = refreshed.get("message") or ""
                token_match = re.search(r"Invalid token\s*->\s*([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)", message_text)
                if token_match:
                    rejected_token = token_match.group(1)
                    refresh_result["rejectedTokenTiming"] = _analyze_jwt_timing(rejected_token)
            elif refreshed:
                refresh_result["success"] = True
                refresh_result["source"] = "forced_dataaddress"
                refresh_result["endpoint"] = refreshed.get("endpoint")
                refresh_result["tokenTiming"] = _analyze_jwt_timing(refreshed.get("authorization"))
            else:
                refresh_result["error"] = "unavailable"
                refresh_result["message"] = "No EDR returned by connector"

        return {
            "success": True,
            "serverTimeUtc": now_utc,
            "transfer": {
                "id": transfer_id,
                "state": state,
                "stateCode": get_state_code(state),
                "assetId": transfer.get("assetId"),
                "contractId": transfer.get("contractId"),
            },
            "currentEdr": {
                "available": bool(current_endpoint and current_token),
                "source": current_source,
                "error": current_error,
                "capturedAt": current_captured_at,
                "failedAt": current_failed_at,
                "endpoint": current_endpoint,
                "tokenTiming": _analyze_jwt_timing(current_token),
            },
            "refreshAttempt": refresh_result,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "serverTimeUtc": now_utc,
        }
    finally:
        await ikln_client.close()


@router.get("/transfer-status/{transfer_id}")
async def get_transfer_status(transfer_id: str) -> Dict[str, Any]:
    """Get the current state of a specific transfer process."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
    
    logger.info(f"\n{'-'*80}")
    logger.info(f"🔍 Consultando estado de transferencia {transfer_id}")
    
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
async def get_fresh_token(transfer_id: str, force_refresh: bool = False) -> Dict[str, Any]:
    """Get a fresh EDR token for a transfer (bypass cache)."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
    
    logger.info(f"\n{'='*80}")
    logger.info(f"🔄 Solicitando token FRESCO (sin caché)")
    logger.info(f"   Timestamp: {timestamp}")
    logger.info(f"   Transfer ID: {transfer_id}")
    logger.info(f"   Management URL: {settings.ikln_management_url}")
    
    print(f"\n{'='*80}", flush=True)
    print(f"{timestamp} | INFO     | 🔄 Renovando token para: {transfer_id}", flush=True)
    print(f"{timestamp} | INFO     |    Management URL: {settings.ikln_management_url}", flush=True)
    
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        logger.info(f"🔍 Llamando a get_edr_for_transfer... force_refresh={force_refresh}")
        print(f"{timestamp} | INFO     | 🔍 Consultando EDR para transfer {transfer_id}", flush=True)
        
        edr_data = await ikln_client.get_edr_for_transfer(
            transfer_id,
            force_dataaddress_refresh=force_refresh,
        )

        if edr_data and isinstance(edr_data, dict) and edr_data.get("error"):
            error_code = edr_data.get("error")
            error_message = edr_data.get("message", "Unknown refresh error")
            logger.error(f"❌ Error obteniendo token fresco ({error_code}): {error_message}")
            return {
                "success": False,
                "error": f"{error_code}: {error_message}",
                "tokenDiagnostics": _analyze_jwt_timing(None),
            }

        if not edr_data:
            logger.warning(f"⚠️ EDR no disponible para transferencia {transfer_id}")
            logger.warning(f"   Posibles causas: EDR expirado, transferencia no encontrada, o error en listado")
            print(f"{timestamp} | WARNING  | ⚠️ EDR no disponible", flush=True)
            print(f"{timestamp} | WARNING  |    Transfer ID solicitado: {transfer_id}", flush=True)
            return {
                "success": False,
                "error": "EDR not available yet"
            }

        token = edr_data.get("authorization")
        endpoint = edr_data.get("endpoint")
        
        if not token:
            logger.error(f"❌ EDR encontrado pero sin token de autorización")
            logger.error(f"   EDR data keys: {list(edr_data.keys())}")
            print(f"{timestamp} | ERROR    | ❌ EDR sin token", flush=True)
            return {
                "success": False,
                "error": "EDR found but no authorization token"
            }
        
        if not endpoint:
            logger.error(f"❌ EDR encontrado pero sin endpoint")
            logger.error(f"   EDR data keys: {list(edr_data.keys())}")
            print(f"{timestamp} | ERROR    | ❌ EDR sin endpoint", flush=True)
            return {
                "success": False,
                "error": "EDR found but no endpoint"
            }
        
        logger.info(f"✅ Token fresco obtenido exitosamente")
        logger.info(f"   Endpoint: {endpoint}")
        logger.info(f"   Token length: {len(token) if token else 0} chars")
        logger.info(f"   Token preview: {token[:50]}..." if len(token) > 50 else f"   Token: {token}")
        logger.info(f"{'='*80}\n")
        
        print(f"{timestamp} | INFO     | ✅ Token renovado exitosamente", flush=True)
        print(f"{timestamp} | INFO     |    Endpoint: {endpoint}", flush=True)
        print(f"{timestamp} | INFO     |    Token length: {len(token)} chars", flush=True)
        print(f"{'='*80}\n", flush=True)

        return {
            "success": True,
            "token": token,
            "endpoint": endpoint,
            "tokenDiagnostics": _analyze_jwt_timing(token),
        }

    except Exception as e:
        import traceback
        logger.error(f"❌ Error al obtener token fresco: {str(e)}")
        logger.error(f"   Traceback: {traceback.format_exc()}")
        print(f"{timestamp} | ERROR    | ❌ Error renovación: {str(e)}", flush=True)
        print(f"{timestamp} | ERROR    | {traceback.format_exc()}", flush=True)
        print(f"{'='*80}\n", flush=True)
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

        ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
        mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
        
        logger.info(f"{'='*80}\n")
        logger.info(f"🔍 Requested: download-file")

        try:
            if not token:
                edr_data = await ikln_client.get_edr_for_transfer(request.transferId)
                if edr_data:
                    token = edr_data.get("authorization")
                    endpoint = edr_data.get("endpoint")

            if not token or not endpoint:
                raise HTTPException(status_code=400, detail="Token or endpoint not available")

            # Get transfer to extract asset_id
            transfer = await ikln_client.get_transfer(request.transferId)
            asset_id = transfer.get("assetId", "")

            # Log request details
            logger.info(f"🔍 Downloading from EDR endpoint: {endpoint}")
            logger.info(f"🔍 Asset ID: {asset_id}")

            logger.info(f"    Making request to Consumer DataPlane: {endpoint}")

            # Make request to Consumer DataPlane
            async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
                response = await client.get(
                    endpoint,
                    headers={
                        "Authorization": token
                    }
                )

                # For 401/403, force EDR refresh and retry once.
                # Some connector responses (e.g. parser/auth errors) do not include
                # "token expired" text but still require a refreshed token.
                if response.status_code in (401, 403):
                    response_text = (response.text or "").lower()
                    logger.warning(
                        "⚠️ DataPlane returned %s for transfer %s, attempting forced EDR refresh. Body: %s",
                        response.status_code,
                        request.transferId,
                        response_text[:200],
                    )

                    logger.info(f"    Trying to get the EDR for transfer {request.transferId} with forced refresh")
                    fresh_edr = await ikln_client.get_edr_for_transfer(
                        request.transferId,
                        force_dataaddress_refresh=True,
                    )

                    if fresh_edr:
                        refresh_error = fresh_edr.get("error")
                        if refresh_error:
                            refresh_message = fresh_edr.get("message", "Unknown refresh error")
                            if refresh_error == "config_error":
                                logger.error("❌ Token refresh configuration error for transfer %s: %s", request.transferId, refresh_message)
                                raise HTTPException(
                                    status_code=502,
                                    detail=f"EDR token refresh failed due to connector configuration: {refresh_message}"
                                )

                            logger.error(
                                "❌ Token refresh failed for transfer %s with error '%s': %s",
                                request.transferId,
                                refresh_error,
                                refresh_message,
                            )
                            raise HTTPException(
                                status_code=503,
                                detail=f"EDR token refresh failed ({refresh_error}): {refresh_message}",
                            )

                        fresh_token = fresh_edr.get("authorization")
                        fresh_endpoint = fresh_edr.get("endpoint") or endpoint

                        if fresh_token and fresh_endpoint:
                            token = fresh_token
                            endpoint = fresh_endpoint
                            logger.info("✅ Successfully refreshed EDR token for transfer %s", request.transferId)
                            logger.info("🔄 Retrying download with refreshed EDR token for transfer %s", request.transferId)
                            response = await client.get(
                                endpoint,
                                headers={
                                    "Authorization": token
                                }
                            )
                        else:
                            logger.error(
                                "❌ Refreshed EDR for transfer %s did not include token/endpoint: %s",
                                request.transferId,
                                fresh_edr,
                            )
                            raise HTTPException(
                                status_code=502,
                                detail="EDR refresh returned incomplete data (missing endpoint or token)",
                            )
                    else:
                        logger.error("❌ Failed to refresh EDR token for transfer %s after receiving %s", request.transferId, response.status_code)
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=f"Initial request failed with {response.status_code} and token refresh also failed"
                        )


                response.raise_for_status()

                # Check if Content-Disposition comes from DataPlane
                content_disposition = response.headers.get("content-disposition")
                
                if content_disposition and "filename" in content_disposition.lower():
                    # DataPlane propagated the header correctly (ideal case)
                    logger.info(f"✅ Using Content-Disposition from DataPlane: {content_disposition}")
                else:
                    # DataPlane didn't propagate header (EDC limitation)
                    # Extract filename intelligently based on asset type
                    logger.warning("⚠️ No Content-Disposition from DataPlane, extracting from asset")
                    
                    filename = None
                    try:
                        # Get asset to check if it's SharePoint
                        asset = await mass_client.get_asset(asset_id)
                        if asset:
                            base_url = asset.get("dataAddress", {}).get("baseUrl", "")
                            
                            # Check if it's a SharePoint proxy asset
                            if base_url and "/api/sharepoint-proxy/download" in base_url:
                                logger.info(f"📁 SharePoint asset detected")
                                
                                # Extract and decode the filename from SharePoint
                                import re, base64
                                match = re.search(r'/api/sharepoint-proxy/download(?:-folder)?/([^?]+)', base_url)
                                if match:
                                    encoded = match.group(1)
                                    padding = '=' * (4 - len(encoded) % 4) if len(encoded) % 4 != 0 else ''
                                    decoded = base64.urlsafe_b64decode((encoded + padding).encode()).decode('utf-8')
                                    
                                    parts = decoded.split('|', 1)
                                    if len(parts) == 2:
                                        drive_id, item_id = parts
                                        
                                        # Get real filename from SharePoint
                                        from sharepoint_gateway.sharepoint_auth import SharePointAuthService
                                        from sharepoint_gateway.sharepoint_gateway import SharePointGateway
                                        
                                        auth_service = SharePointAuthService()
                                        sp_token = auth_service.get_access_token()
                                        
                                        if sp_token:
                                            gateway = SharePointGateway(access_token=sp_token)
                                            metadata = gateway.get_file_metadata(drive_id=drive_id, item_id=item_id)
                                            
                                            # Use real filename from SharePoint
                                            filename = f"{metadata.name}.zip" if metadata.is_folder else metadata.name
                                            logger.info(f"✅ Extracted from SharePoint: {filename}")
                            else:
                                # Non-SharePoint: try to extract from URL
                                from urllib.parse import urlparse, unquote
                                path = unquote(urlparse(base_url).path)
                                if path:
                                    url_filename = path.split("/")[-1]
                                    if url_filename and "." in url_filename:
                                        filename = url_filename
                                        logger.info(f"✅ Extracted from URL: {filename}")
                    except Exception as e:
                        logger.warning(f"⚠️ Could not extract filename: {str(e)}")
                    
                    # Final fallback
                    if not filename:
                        filename = f"{asset_id}.dat" if asset_id else "data.dat"
                        logger.info(f"📄 Using fallback: {filename}")
                    
                    content_disposition = f'attachment; filename="{filename}"'
                
                print(f"📄 Final Content-Disposition: {content_disposition}")

                # Return the file content
                from fastapi.responses import Response
                return Response(
                    content=response.content,
                    media_type=response.headers.get("content-type", "application/octet-stream"),
                    headers={
                        "Content-Disposition": content_disposition
                    }
                )
        finally:
            await ikln_client.close()
            await mass_client.close()

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
    except HTTPException:
        raise
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


@router.get("/sharepoint-info/{transfer_id}")
async def get_sharepoint_info(transfer_id: str) -> Dict[str, Any]:
    """
    Extract SharePoint information from an asset if it's a SharePoint proxy URL.
    
    This endpoint:
    1. Gets the transfer to extract the assetId
    2. Gets the asset from the provider to extract the baseUrl
    3. If baseUrl is a SharePoint proxy URL, extracts drive_id|item_id
    4. Returns the information needed for frontend to download with user token
    
    Returns:
        - is_sharepoint: bool - whether this is a SharePoint asset
        - drive_id: str - SharePoint drive ID (if SharePoint)
        - item_id: str - SharePoint item ID (if SharePoint)
        - error: str - error message if any
    """
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    
    try:
        # Get transfer to extract assetId
        logger.info(f"📥 Getting transfer {transfer_id} to extract assetId...")
        transfer = await ikln_client.get_transfer(transfer_id)
        asset_id = transfer.get("assetId", "")
        
        if not asset_id:
            return {
                "success": False,
                "is_sharepoint": False,
                "error": "No assetId found in transfer"
            }
        
        logger.info(f"📄 Asset ID: {asset_id}")
        
        # Get asset from provider (MASS) to extract baseUrl
        logger.info(f"🔍 Getting asset from provider...")
        asset = await mass_client.get_asset(asset_id)
        
        if not asset:
            return {
                "success": False,
                "is_sharepoint": False,
                "error": "Asset not found in provider"
            }
        
        # Extract baseUrl from dataAddress
        data_address = asset.get("dataAddress", {})
        base_url = data_address.get("baseUrl", "")
        
        logger.info(f"🔗 Base URL: {base_url[:100]}...")
        
        # Check if it's a SharePoint proxy URL (file or folder)
        if not base_url or "/api/sharepoint-proxy/download" not in base_url:
            return {
                "success": True,
                "is_sharepoint": False,
                "message": "Not a SharePoint asset"
            }
        
        # Extract encoded file info from URL (supports both /download/ and /download-folder/)
        import re
        match = re.search(r'/api/sharepoint-proxy/download(?:-folder)?/([^?]+)', base_url)
        if not match:
            return {
                "success": False,
                "is_sharepoint": True,
                "error": "Could not extract encoded info from SharePoint proxy URL"
            }
        
        encoded_file_info = match.group(1)
        logger.info(f"📦 Encoded info extracted: {encoded_file_info[:50]}...")
        
        # Decode base64 URL-safe to get drive_id|item_id
        import base64
        try:
            # Add padding if necessary
            padding = '=' * (4 - len(encoded_file_info) % 4) if len(encoded_file_info) % 4 != 0 else ''
            padded_encoded = encoded_file_info + padding
            
            # Decode base64 URL-safe
            decoded_bytes = base64.urlsafe_b64decode(padded_encoded.encode())
            decoded_str = decoded_bytes.decode('utf-8')
            
            # Split drive_id|item_id
            parts = decoded_str.split('|', 1)
            if len(parts) != 2:
                return {
                    "success": False,
                    "is_sharepoint": True,
                    "error": f"Invalid format: expected 'drive_id|item_id', got '{decoded_str}'"
                }
            
            drive_id, item_id = parts
            
            logger.info(f"✅ SharePoint info extracted:")
            logger.info(f"   Drive ID: {drive_id[:30]}...")
            logger.info(f"   Item ID: {item_id[:30]}...")
            
            # Get file metadata to extract real filename
            filename = None
            is_folder = False
            try:
                from sharepoint_gateway.sharepoint_auth import SharePointAuthService
                from sharepoint_gateway.sharepoint_gateway import SharePointGateway
                
                auth_service = SharePointAuthService()
                sp_token = auth_service.get_access_token()
                
                if sp_token:
                    gateway = SharePointGateway(access_token=sp_token)
                    metadata = gateway.get_file_metadata(drive_id=drive_id, item_id=item_id)
                    
                    filename = metadata.name
                    is_folder = metadata.is_folder
                    
                    if is_folder:
                        filename = f"{filename}.zip"
                    
                    logger.info(f"📝 Real filename: {filename}")
                    logger.info(f"📁 Is folder: {is_folder}")
            except Exception as e:
                logger.warning(f"⚠️ Could not get filename from SharePoint: {str(e)}")
            
            return {
                "success": True,
                "is_sharepoint": True,
                "drive_id": drive_id,
                "item_id": item_id,
                "filename": filename,
                "is_folder": is_folder,
                "base_url": base_url
            }
            
        except Exception as decode_error:
            logger.error(f"❌ Error decoding SharePoint info: {decode_error}")
            return {
                "success": False,
                "is_sharepoint": True,
                "error": f"Failed to decode SharePoint info: {str(decode_error)}"
            }
        
    except Exception as e:
        logger.error(f"❌ Error getting SharePoint info: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "is_sharepoint": False,
            "error": str(e)
        }
    finally:
        await ikln_client.close()
        await mass_client.close()
