"""HTTP client for the Tractus-X EDC Management API (v3).

Used to interact with EDC connectors for asset management, policy definitions,
contract definitions, catalog requests, negotiations, and transfers.

IMPORTANT: EDC v0.7.3+ requires a JSON-LD ``@context`` in every request body.
All API calls inject the standard EDC namespace automatically via ``_with_context``.
"""

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
        payload = _with_context(negotiation_data)
        resp = await self._client.post(
            f"{self.base_url}/v3/contractnegotiations",
            headers=self._headers(),
            json=payload,
        )
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
        payload = _with_context(transfer_data)
        resp = await self._client.post(
            f"{self.base_url}/v3/transferprocesses",
            headers=self._headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

    async def get_transfer(self, transfer_id: str) -> Dict[str, Any]:
        """Get the status of a transfer process.

        Args:
            transfer_id: Transfer process identifier.

        Returns:
            Transfer status.
        """
        resp = await self._client.get(
            f"{self.base_url}/v3/transferprocesses/{transfer_id}",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def list_transfers(self) -> list[Dict[str, Any]]:
        """List all transfer processes.

        Returns:
            List of transfers.
        """
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
        return resp.json()

    # ==================== EDR (Endpoint Data Reference) ====================

    async def get_edr_for_transfer(self, transfer_id: str) -> Optional[Dict[str, Any]]:
        """Get the Endpoint Data Reference for a completed transfer.

        Args:
            transfer_id: Transfer process identifier.

        Returns:
            EDR data with endpoint and authorization token, or None if not available.
        """
        try:
            resp = await self._client.post(
                f"{self.base_url}/v1/edrs/{transfer_id}/dataaddress",
                headers=self._headers(),
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.debug("No EDR available yet for transfer %s", transfer_id)
                return None
            raise

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
