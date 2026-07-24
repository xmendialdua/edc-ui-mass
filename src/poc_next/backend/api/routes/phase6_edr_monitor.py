"""EDR monitoring module for capturing EDRs while transfers are active."""

import asyncio
import logging
import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from clients.edc import EdcManagementClient
from config import settings

logger = logging.getLogger(__name__)

# In-memory cache of captured EDRs (in production, use Redis or DB)
_edr_cache: Dict[str, Dict[str, Any]] = {}

# Track active monitoring tasks to prevent duplicates
_monitoring_transfers: set = set()


def is_monitoring(transfer_id: str) -> bool:
    """Check if a transfer is already being monitored."""
    return transfer_id in _monitoring_transfers


async def monitor_transfer_for_edr(
    transfer_id: str,
    max_attempts: int = 60,
    interval: float = 1.0,
    management_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Monitor a transfer process and capture its EDR when it becomes available.
    
    This is necessary because in Tractus-X EDC, EDRs for PULL transfers only exist
    while the transfer is in STARTED state and disappear after TERMINATED.
    
    Args:
        transfer_id: Transfer process ID to monitor
        max_attempts: Maximum number of polling attempts (default: 30 = 60 seconds)
        interval: Seconds between polling attempts (default: 2.0)
    
    Returns:
        EDR data if found, None otherwise
    """
    # Check cache first
    if transfer_id in _edr_cache:
        logger.info(f"EDR for transfer {transfer_id} found in cache")
        return _edr_cache[transfer_id]
    
    # Check if already monitoring (prevent duplicates)
    if transfer_id in _monitoring_transfers:
        logger.info(f"⏭️ Transfer {transfer_id} already being monitored, skipping duplicate")
        return None
    
    # Add to monitoring set
    _monitoring_transfers.add(transfer_id)
    logger.info(f"🚀 Starting EDR monitor for transfer {transfer_id}")
    print(f"🚀 Starting EDR monitor for transfer {transfer_id}")
    
    # Create client with increased timeout for monitor (60s vs default 30s)
    monitor_management_url = (management_url or settings.ikln_management_url).rstrip("/")
    monitor_api_key = (api_key or settings.ikln_api_key)
    monitor_client = EdcManagementClient(monitor_management_url, monitor_api_key)
    monitor_client._client = httpx.AsyncClient(timeout=60.0, verify=False)
    
    try:
        consecutive_unavailable = 0
        MAX_CONSECUTIVE_UNAVAILABLE = 5

        for attempt in range(max_attempts):
            try:
                # Get current transfer state
                transfer = await monitor_client.get_transfer(transfer_id)
                state = transfer.get("state")
            except httpx.ReadTimeout:
                # Handle timeout gracefully and continue monitoring
                logger.warning(f"⏱️ Timeout getting transfer {transfer_id} attempt {attempt+1}/{max_attempts}, retrying...")
                await asyncio.sleep(interval * 2)  # Double interval after timeout
                continue
            except httpx.HTTPStatusError as e:
                status = e.response.status_code if e.response else None
                if status == 404:
                    logger.warning(
                        f"⛔ Transfer {transfer_id} not found in connector {monitor_management_url}; "
                        f"stopping monitor"
                    )
                    return None
                logger.warning(
                    f"⚠️ HTTP error polling transfer {transfer_id} (status={status}) in {monitor_management_url}: {e}"
                )
                await asyncio.sleep(interval)
                continue
            
            logger.info(f"📊 Transfer {transfer_id} attempt {attempt + 1}/{max_attempts}: state={state}")
            print(f"📊 Transfer {transfer_id} attempt {attempt + 1}/{max_attempts}: state={state}")
            
            # Log the full transfer in interesting states
            if state in ["STARTED", "COMPLETED", "TERMINATED"] and attempt <= 2:
                import json
                print(f"🔍 Full transfer data: {json.dumps(transfer, indent=2)[:1000]}")
            
            # Check for EDR in different locations
            edr_data = None
            
            # 1. Check if embedded in dataAddress
            data_address = transfer.get("dataAddress")
            if data_address:
                endpoint = data_address.get("endpoint") or data_address.get("baseUrl")
                auth = data_address.get("authCode") or data_address.get("authorization") or data_address.get("authKey")
                
                if endpoint and auth:
                    edr_data = {
                        "endpoint": endpoint,
                        "authorization": auth,
                        "capturedAt": datetime.now(timezone.utc).isoformat(),
                        "transferState": state
                    }
                    logger.info(f"✅ EDR found in dataAddress for transfer {transfer_id}")
                    print(f"✅ EDR captured from dataAddress for transfer {transfer_id} (state: {state})")
            
            # 2. Query EDRs endpoint
            if not edr_data:
                edr_result = await monitor_client.get_edr_for_transfer(transfer_id)
                
                # Check if it's an error dict (config error or STS unavailable)
                if edr_result and isinstance(edr_result, dict) and "error" in edr_result:
                    error_type = edr_result["error"]
                    if error_type == "config_error":
                        logger.error(f"🚫 Configuration error for transfer {transfer_id}: {edr_result.get('message')}")
                        logger.error(f"   Stopping monitor - this requires EDC/DIM configuration fix")
                        print(f"🚫 Config error for {transfer_id} - stopping monitor")
                        _edr_cache[transfer_id] = {**edr_result, "failedAt": datetime.now(timezone.utc).isoformat()}
                        return None  # Stop monitoring, can't be fixed by retrying
                    
                    # For other errors (unavailable, timeout, network) count consecutive failures
                    consecutive_unavailable += 1
                    logger.warning(
                        f"⚠️ EDR unavailable for transfer {transfer_id} "
                        f"(attempt {attempt+1}, consecutive failures: {consecutive_unavailable}/{MAX_CONSECUTIVE_UNAVAILABLE}): "
                        f"{edr_result.get('message', '')[:100]}"
                    )
                    if consecutive_unavailable >= MAX_CONSECUTIVE_UNAVAILABLE:
                        logger.error(
                            f"⛔ Stopping monitor for {transfer_id}: "
                            f"{consecutive_unavailable} consecutive unavailable errors (STS refresh failing)"
                        )
                        print(f"⛔ Monitor stopped for {transfer_id} - persistent EDR refresh failure")
                        _edr_cache[transfer_id] = {
                            "error": "refresh_failed",
                            "message": edr_result.get("message", "STS token refresh failed persistently")[:200],
                            "failedAt": datetime.now(timezone.utc).isoformat(),
                        }
                        return None
                    continue
                
                if edr_result:
                    consecutive_unavailable = 0  # Reset on success
                    edr_data = edr_result
                    edr_data["capturedAt"] = datetime.now(timezone.utc).isoformat()
                    edr_data["transferState"] = state
                    logger.info(f"✅ EDR found via EDRs endpoint for transfer {transfer_id}")
                    print(f"✅ EDR captured from EDRs endpoint for transfer {transfer_id} (state: {state})")
            
            # If EDR found, cache it and return
            if edr_data:
                _edr_cache[transfer_id] = edr_data
                print(f"💾 EDR cached for transfer {transfer_id}")
                return edr_data
            
            # If transfer is in a final state, check a few more times for dataAddress
            if state in ["COMPLETED", "TERMINATED"]:
                print(f"📍 Transfer {transfer_id} in final state {state}, checking for dataAddress...")
                # Give it 3 more attempts even in final state
                if attempt >= 3:  # After first 3 attempts
                    logger.warning(f"Transfer {transfer_id} reached final state {state} without EDR")
                    print(f"⛔ Transfer {transfer_id} reached {state} without EDR")
                    return None
            
            # Stop immediately if transfer failed
            if state == "FAILED":
                logger.warning(f"Transfer {transfer_id} FAILED")
                print(f"❌ Transfer {transfer_id} FAILED")
                return None
            
            # Wait before next attempt
            await asyncio.sleep(interval)
        
        logger.warning(f"Transfer {transfer_id} monitoring timed out after {max_attempts} attempts")
        print(f"⏱️ Monitor timeout for transfer {transfer_id} after {max_attempts} attempts")
        return None
        
    finally:
        # Always remove from monitoring set and close client
        _monitoring_transfers.discard(transfer_id)
        logger.info(f"🏁 Monitor completed for transfer {transfer_id}")
        await monitor_client.close()


def get_cached_edr(transfer_id: str) -> Optional[Dict[str, Any]]:
    """Get a cached EDR if it exists."""
    return _edr_cache.get(transfer_id)


def clear_edr_cache(transfer_id: Optional[str] = None):
    """Clear EDR cache for a specific transfer or all transfers."""
    if transfer_id:
        _edr_cache.pop(transfer_id, None)
    else:
        _edr_cache.clear()
