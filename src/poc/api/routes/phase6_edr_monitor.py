"""EDR monitoring module for capturing EDRs while transfers are active."""

import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from poc.clients.edc import EdcManagementClient
from poc.config import settings

logger = logging.getLogger(__name__)

# In-memory cache of captured EDRs (in production, use Redis or DB)
_edr_cache: Dict[str, Dict[str, Any]] = {}


async def monitor_transfer_for_edr(transfer_id: str, max_attempts: int = 60, interval: float = 1.0) -> Optional[Dict[str, Any]]:
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
    
    logger.info(f"🚀 Starting EDR monitor for transfer {transfer_id}")
    print(f"🚀 Starting EDR monitor for transfer {transfer_id}")
    
    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    
    try:
        for attempt in range(max_attempts):
            # Get current transfer state
            transfer = await ikln_client.get_transfer(transfer_id)
            state = transfer.get("state")
            
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
                        "capturedAt": datetime.now().isoformat(),
                        "transferState": state
                    }
                    logger.info(f"✅ EDR found in dataAddress for transfer {transfer_id}")
                    print(f"✅ EDR captured from dataAddress for transfer {transfer_id} (state: {state})")
            
            # 2. Query EDRs endpoint
            if not edr_data:
                edr_data = await ikln_client.get_edr_for_transfer(transfer_id)
                if edr_data:
                    edr_data["capturedAt"] = datetime.now().isoformat()
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
        await ikln_client.close()


def get_cached_edr(transfer_id: str) -> Optional[Dict[str, Any]]:
    """Get a cached EDR if it exists."""
    return _edr_cache.get(transfer_id)


def clear_edr_cache(transfer_id: Optional[str] = None):
    """Clear EDR cache for a specific transfer or all transfers."""
    if transfer_id:
        _edr_cache.pop(transfer_id, None)
    else:
        _edr_cache.clear()
