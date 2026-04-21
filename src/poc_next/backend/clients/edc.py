"""HTTP client for the Tractus-X EDC Management API (v3).

Used to interact with EDC connectors for asset management, policy definitions,
contract definitions, catalog requests, negotiations, and transfers.

IMPORTANT: EDC v0.7.3+ requires a JSON-LD ``@context`` in every request body.
All API calls inject the standard EDC namespace automatically via ``_with_context``.
"""

import json
import logging
import warnings
from typing import Dict, Any, Optional

import httpx

# Suppress SSL verification warnings in development
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

logger = logging.getLogger(__name__)

# JSON-LD context required by the Tractus-X EDC Management API v3.
EDC_JSONLD_CONTEXT = {
    "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
    "odrl": "http://www.w3.org/ns/odrl/2/",
    "dcat": "https://www.w3.org/ns/dcat#",
    "dct": "http://purl.org/dc/terms/",
}

# ODRL JSON-LD context injected into policy bodies.
ODRL_CONTEXT = "http://www.w3.org/ns/odrl.jsonld"


def _with_context(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Wrap a payload dict with the EDC JSON-LD @context."""
    return {"@context": EDC_JSONLD_CONTEXT, **payload}


def _with_policy_context(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Wrap a policy definition and inject ODRL context into the inner policy."""
    result = {"@context": EDC_JSONLD_CONTEXT, **payload}
    if "policy" in result and isinstance(result["policy"], dict):
        result["policy"] = {"@context": ODRL_CONTEXT, **result["policy"]}
    return result


class EdcManagementClient:
    """Async client for the Tractus-X EDC Management API.

    Args:
        base_url: EDC Management API base URL.
        api_key: API key for the management endpoint.
    """

    def __init__(self, base_url: str, api_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        # Disable SSL verification for development environments with self-signed certificates
        # WARNING: In production, use proper SSL certificates and enable verification
        self._client = httpx.AsyncClient(timeout=30.0, verify=False)
        logger.debug(f"EdcManagementClient initialized for {base_url} (SSL verification disabled)")

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._client.aclose()

    def _headers(self) -> Dict[str, str]:
        return {
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json",
        }

    # ==================== Assets ====================

    async def create_asset(self, asset_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create an asset in the EDC catalog.

        Args:
            asset_data: Asset definition with data address.

        Returns:
            EDC response body.
        """
        payload = _with_context(asset_data)
        resp = await self._client.post(
            f"{self.base_url}/v3/assets",
            headers=self._headers(),
            json=payload,
        )
        if resp.status_code == 409:
            logger.info("EDC asset already exists (409): %s", asset_data.get("@id"))
            return {"@id": asset_data.get("@id"), "already_exists": True}
        resp.raise_for_status()
        logger.info("EDC asset created: %s", asset_data.get("@id"))
        return resp.json()

    async def list_assets(self) -> list[Dict[str, Any]]:
        """List all registered assets.

        Returns:
            List of asset definitions.
        """
        payload = _with_context({
            "@type": "QuerySpec",
            "offset": 0,
            "limit": 100,
            "sortOrder": "DESC",
            "filterExpression": []
        })
        resp = await self._client.post(
            f"{self.base_url}/v3/assets/request",
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

    async def delete_asset(self, asset_id: str) -> None:
        """Delete an asset by ID.

        Args:
            asset_id: Asset identifier.
        """
        resp = await self._client.delete(
            f"{self.base_url}/v3/assets/{asset_id}",
            headers=self._headers(),
        )
        resp.raise_for_status()
        logger.info("EDC asset deleted: %s", asset_id)

    # ==================== Policies ====================

    async def create_policy(self, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a policy definition in EDC.

        Args:
            policy_data: ODRL policy definition.

        Returns:
            EDC response body.
        """
        payload = _with_policy_context(policy_data)
        resp = await self._client.post(
            f"{self.base_url}/v3/policydefinitions",
            headers=self._headers(),
            json=payload,
        )
        if resp.status_code == 409:
            logger.info("EDC policy already exists (409): %s", policy_data.get("@id"))
            return {"@id": policy_data.get("@id"), "already_exists": True}
        resp.raise_for_status()
        logger.info("EDC policy created: %s", policy_data.get("@id"))
        return resp.json()

    async def create_policy_with_custom_context(self, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a policy definition with custom @context (for Catena-X policies).

        Use this method when the policy_data already contains a complete @context
        (e.g., Catena-X policies with custom constraints like BusinessPartnerNumber).

        Args:
            policy_data: Complete policy definition including @context.

        Returns:
            EDC response body.
        """
        resp = await self._client.post(
            f"{self.base_url}/v3/policydefinitions",
            headers=self._headers(),
            json=policy_data,
        )
        if resp.status_code == 409:
            logger.info("EDC policy already exists (409): %s", policy_data.get("@id"))
            return {"@id": policy_data.get("@id"), "already_exists": True}
        resp.raise_for_status()
        logger.info("EDC policy created: %s", policy_data.get("@id"))
        return resp.json()

    async def list_policies(self) -> list[Dict[str, Any]]:
        """List all registered policy definitions.

        Returns:
            List of policy definitions.
        """
        payload = _with_context({
            "@type": "QuerySpec",
            "offset": 0,
            "limit": 100,
            "sortOrder": "DESC",
            "filterExpression": []
        })
        resp = await self._client.post(
            f"{self.base_url}/v3/policydefinitions/request",
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

    async def delete_policy(self, policy_id: str) -> None:
        """Delete a policy definition by ID.

        Args:
            policy_id: Policy identifier.
        """
        resp = await self._client.delete(
            f"{self.base_url}/v3/policydefinitions/{policy_id}",
            headers=self._headers(),
        )
        resp.raise_for_status()
        logger.info("EDC policy deleted: %s", policy_id)

    # ==================== Contract Definitions ====================

    async def create_contract_definition(self, contract_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a contract definition linking an asset to policies.

        Args:
            contract_data: Contract definition.

        Returns:
            EDC response body.
        """
        payload = _with_context(contract_data)
        resp = await self._client.post(
            f"{self.base_url}/v3/contractdefinitions",
            headers=self._headers(),
            json=payload,
        )
        if resp.status_code == 409:
            logger.info("EDC contract already exists (409): %s", contract_data.get("@id"))
            return {"@id": contract_data.get("@id"), "already_exists": True}
        resp.raise_for_status()
        logger.info("EDC contract created: %s", contract_data.get("@id"))
        return resp.json()

    async def list_contract_definitions(self) -> list[Dict[str, Any]]:
        """List all registered contract definitions.

        Returns:
            List of contract definitions.
        """
        payload = _with_context({
            "@type": "QuerySpec",
            "offset": 0,
            "limit": 100,
            "sortOrder": "DESC",
            "filterExpression": []
        })
        resp = await self._client.post(
            f"{self.base_url}/v3/contractdefinitions/request",
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

    async def delete_contract_definition(self, contract_id: str) -> None:
        """Delete a contract definition by ID.

        Args:
            contract_id: Contract definition identifier.
        """
        resp = await self._client.delete(
            f"{self.base_url}/v3/contractdefinitions/{contract_id}",
            headers=self._headers(),
        )
        resp.raise_for_status()
        logger.info("EDC contract definition deleted: %s", contract_id)

    # ==================== Catalog ====================

    async def request_catalog(self, counter_party_url: str, counter_party_id: str) -> Dict[str, Any]:
        """Request the catalog from another connector.

        Args:
            counter_party_url: DSP URL of the counter party connector.
            counter_party_id: BPN of the counter party.

        Returns:
            Catalog response with datasets.
        """
        payload = _with_context({
            "@type": "CatalogRequest",
            "counterPartyAddress": counter_party_url,
            "counterPartyId": counter_party_id,
            "protocol": "dataspace-protocol-http"
        })
        resp = await self._client.post(
            f"{self.base_url}/v3/catalog/request",
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

    # ==================== Contract Negotiations ====================

    async def initiate_negotiation(self, negotiation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Initiate a contract negotiation.

        Args:
            negotiation_data: Negotiation request with offer.

        Returns:
            Negotiation response with negotiation ID.
        """
        # Use the same context format that works in edc-consumer
        payload = {
            "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
            **negotiation_data
        }
        
        logger.debug(f"Initiating negotiation with payload: {payload}")
        
        resp = await self._client.post(
            f"{self.base_url}/v3/contractnegotiations",
            headers=self._headers(),
            json=payload,
        )
        
        if resp.status_code != 200:
            error_text = resp.text
            logger.error(f"Negotiation failed with status {resp.status_code}: {error_text}")
            # Include the error response body in the exception
            resp.raise_for_status()
            
        return resp.json()

    async def get_negotiation(self, negotiation_id: str) -> Dict[str, Any]:
        """Get the status of a contract negotiation.

        Args:
            negotiation_id: Negotiation identifier.

        Returns:
            Negotiation status.
        """
        resp = await self._client.get(
            f"{self.base_url}/v3/contractnegotiations/{negotiation_id}",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def list_negotiations(self) -> list[Dict[str, Any]]:
        """List all contract negotiations.

        Returns:
            List of negotiations.
        """
        payload = _with_context({
            "@type": "QuerySpec",
            "offset": 0,
            "limit": 100,
            "sortOrder": "DESC",
            "filterExpression": []
        })
        resp = await self._client.post(
            f"{self.base_url}/v3/contractnegotiations/request",
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

    # ==================== Transfers ====================

    async def initiate_transfer(self, transfer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Initiate a data transfer.

        Args:
            transfer_data: Transfer request with contract agreement.

        Returns:
            Transfer response with transfer ID.
        """
        # Use the same context format as dashboard for transfers
        payload = {
            "@context": {
                "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
            },
            **transfer_data
        }
        
        logger.info(f"🚀 [EDC Client] Iniciando transfer request")
        logger.info(f"   Asset ID: {transfer_data.get('assetId', 'unknown')}")
        logger.info(f"   Contract ID: {transfer_data.get('contractId', 'unknown')}")
        logger.info(f"   Endpoint: {self.base_url}/v3/transferprocesses")
        
        resp = await self._client.post(
            f"{self.base_url}/v3/transferprocesses",
            headers=self._headers(),
            json=payload,
        )
        
        if resp.status_code not in [200, 201]:
            error_text = resp.text
            logger.error(f"❌ [EDC Client] Transfer failed with status {resp.status_code}: {error_text}")
            resp.raise_for_status()
        
        result = resp.json()
        logger.info(f"✅ [EDC Client] Transfer response received")
        logger.info(f"   Transfer ID: {result.get('@id', 'unknown')}")
        logger.info(f"   Estado: {result.get('state', 'unknown')}")
        
        return result

    async def get_transfer(self, transfer_id: str) -> Dict[str, Any]:
        """Get the status of a transfer process.

        Args:
            transfer_id: Transfer process identifier.

        Returns:
            Transfer status.
        """
        logger.debug(f"🔍 [EDC Client] Consultando estado de transfer: {transfer_id}")
        
        resp = await self._client.get(
            f"{self.base_url}/v3/transferprocesses/{transfer_id}",
            headers=self._headers(),
        )
        resp.raise_for_status()
        result = resp.json()
        
        logger.debug(f"📊 [EDC Client] Estado obtenido: {result.get('state', 'unknown')} para transfer {transfer_id}")
        
        return result

    async def list_transfers(self) -> list[Dict[str, Any]]:
        """List all transfer processes.

        Returns:
            List of transfers.
        """
        logger.debug(f"📋 [EDC Client] Listando todas las transferencias")
        
        payload = _with_context({
            "@type": "QuerySpec",
            "offset": 0,
            "limit": 100,
            "sortOrder": "DESC",
            "filterExpression": []
        })
        resp = await self._client.post(
            f"{self.base_url}/v3/transferprocesses/request",
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        result = resp.json()
        
        logger.debug(f"📦 [EDC Client] Transferencias obtenidas: {len(result)} total")
        
        return result

    # ==================== EDR (Endpoint Data Reference) ====================

    async def get_edr_for_transfer(self, transfer_id: str) -> Optional[Dict[str, Any]]:
        """Get the Endpoint Data Reference for a completed transfer.

        Args:
            transfer_id: Transfer process identifier.

        Returns:
            EDR data with endpoint and authorization token, or None if not available.
        """
        try:
            # Step 1: List all EDRs
            logger.info(f"Listing all EDRs to find transfer {transfer_id}")
            edr_list_resp = await self._client.post(
                f"{self.base_url}/v3/edrs/request",
                headers=self._headers(),
                json={
                    "@context": {"@vocab": "https://w3id.org/edc/v0.0.1/ns/"},
                    "@type": "QuerySpec",
                    "offset": 0,
                    "limit": 100
                },
            )
            
            if edr_list_resp.status_code != 200:
                logger.warning(f"Failed to list EDRs: HTTP {edr_list_resp.status_code} - {edr_list_resp.text[:200]}")
                return None
            
            edr_list = edr_list_resp.json()
            
            # Log the raw response for debugging
            logger.info(f"Raw EDR response type: {type(edr_list)}")
            logger.info(f"Raw EDR response: {json.dumps(edr_list, indent=2)[:500]}")
            
            logger.info(f"Retrieved {len(edr_list) if isinstance(edr_list, list) else 0} EDRs")
            
            if not isinstance(edr_list, list):
                logger.warning(f"EDR list is not a list, got: {type(edr_list)}")
                return None
            
            # Step 2: Find the EDR matching this transfer_id
            matching_edr = next(
                (edr for edr in edr_list if edr.get("transferProcessId") == transfer_id),
                None
            )
            
            if not matching_edr:
                logger.warning(f"No EDR found for transfer {transfer_id}. Available transfers: {[edr.get('transferProcessId') for edr in edr_list[:5]]}")
                return None
            
            logger.info(f"Found matching EDR for transfer {transfer_id}")
            
            # Step 3: Get the data address for this EDR
            edr_id = matching_edr.get("@id") or transfer_id
            logger.info(f"Getting dataaddress for EDR {edr_id}")
            
            dataaddress_resp = await self._client.get(
                f"{self.base_url}/v3/edrs/{edr_id}/dataaddress",
                headers=self._headers(),
            )
            
            if dataaddress_resp.status_code != 200:
                logger.warning(f"Failed to get dataaddress for EDR {edr_id}: HTTP {dataaddress_resp.status_code} - {dataaddress_resp.text[:200]}")
                return None
            
            edr_data = dataaddress_resp.json()
            logger.info(f"Successfully retrieved EDR data for transfer {transfer_id}")
            
            # Normalize field names (different EDC versions use different names)
            endpoint = edr_data.get("endpoint") or edr_data.get("baseUrl")
            authorization = edr_data.get("authCode") or edr_data.get("authorization") or edr_data.get("authKey")
            
            if not endpoint:
                logger.warning(f"EDR data has no endpoint field. Available fields: {list(edr_data.keys())}")
            
            return {
                "endpoint": endpoint,
                "authorization": authorization,
                "raw": edr_data  # Include raw data for debugging
            }
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.debug("No EDR available yet for transfer %s", transfer_id)
                return None
            logger.error(f"HTTP error getting EDR for transfer {transfer_id}: {e} - {e.response.text[:200]}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error getting EDR for transfer {transfer_id}: {e}")
            return None

    # ==================== Health ====================

    async def health_check(self) -> bool:
        """Check if the EDC Management API is reachable.

        Returns:
            True if the API responds successfully.
        """
        try:
            resp = await self._client.get(
                f"{self.base_url.replace('/management', '')}/api/check/health",
                headers=self._headers(),
                timeout=5.0,
            )
            return resp.status_code == 200
        except Exception:
            return False
