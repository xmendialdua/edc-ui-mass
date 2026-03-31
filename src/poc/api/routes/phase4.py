"""Phase 4 routes — Contract definition management."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List

from poc.clients.edc import EdcManagementClient
from poc.config import settings

router = APIRouter(prefix="/api/phase4", tags=["Phase 4 - Contract Definitions"])


def log_message(message: str) -> str:
    """Format a log message with timestamp."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"[{timestamp}] {message}"


class CreateContractDefinitionRequest(BaseModel):
    contractName: str
    assetId: str
    accessPolicyId: str
    contractPolicyId: str


class DeleteContractDefinitionRequest(BaseModel):
    contractId: str


@router.post("/create-contract-definition")
async def create_contract_definition(request: CreateContractDefinitionRequest) -> Dict[str, Any]:
    """Create a contract definition linking asset and policies."""
    logs: List[str] = []

    logs.append(log_message(f"🔗 Creando Contract Definition '{request.contractName}'..."))
    logs.append(log_message(f"   Asset: {request.assetId}"))
    logs.append(log_message(f"   Access Policy: {request.accessPolicyId}"))
    logs.append(log_message(f"   Contract Policy: {request.contractPolicyId}"))

    # Build contract definition
    contract_data = {
        "@id": request.contractName,
        "@type": "ContractDefinition",
        "accessPolicyId": request.accessPolicyId,
        "contractPolicyId": request.contractPolicyId,
        "assetsSelector": {
            "@type": "CriterionDto",
            "operandLeft": "https://w3id.org/edc/v0.0.1/ns/id",
            "operator": "=",
            "operandRight": request.assetId
        }
    }

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        result = await mass_client.create_contract_definition(contract_data)

        if result.get("already_exists"):
            logs.append(log_message(f"⚠️  El Contract Definition ya existe: {request.contractName}"))
            return {
                "success": False,
                "logs": logs,
                "error": "CONTRACT_EXISTS"
            }

        logs.append(log_message("✅ Contract Definition creado exitosamente"))
        logs.append(log_message(f"   ID: {request.contractName}"))

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


@router.post("/list-contract-definitions")
async def list_contract_definitions() -> Dict[str, Any]:
    """List all contract definitions in MASS connector."""
    logs: List[str] = []

    logs.append(log_message("📋 Consultando Contract Definitions en MASS..."))

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        contracts = await mass_client.list_contract_definitions()

        logs.append(log_message(f"✅ Encontrados {len(contracts)} Contract Definitions"))

        if contracts:
            logs.append(log_message(""))
            for contract in contracts:
                contract_id = contract.get("@id", "unknown")
                logs.append(log_message(f"🔗 {contract_id}"))

        return {
            "success": True,
            "logs": logs,
            "contracts": contracts
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        return {
            "success": False,
            "logs": logs,
            "contracts": []
        }
    finally:
        await mass_client.close()


@router.post("/delete-contract-definition")
async def delete_contract_definition(request: DeleteContractDefinitionRequest) -> Dict[str, Any]:
    """Delete a contract definition from MASS connector."""
    logs: List[str] = []
    contract_id = request.contractId

    logs.append(log_message(f"🗑️  Eliminando Contract Definition '{contract_id}'..."))

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        await mass_client.delete_contract_definition(contract_id)

        logs.append(log_message(f"✅ Contract Definition '{contract_id}' eliminado"))

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
