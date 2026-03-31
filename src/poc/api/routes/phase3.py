"""Phase 3 routes — Policy management."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List

from poc.clients.edc import EdcManagementClient
from poc.config import settings

router = APIRouter(prefix="/api/phase3", tags=["Phase 3 - Policies"])


def log_message(message: str) -> str:
    """Format a log message with timestamp."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"[{timestamp}] {message}"


class CreateAccessPolicyRequest(BaseModel):
    bpn: str


class DeletePolicyRequest(BaseModel):
    policyId: str


@router.post("/create-access-policy")
async def create_access_policy(request: CreateAccessPolicyRequest) -> Dict[str, Any]:
    """Create an access policy with BPN restriction."""
    logs: List[str] = []
    bpn = request.bpn

    policy_id = f"access-policy-{bpn.lower()}"
    logs.append(log_message(f"🔐 Creando Access Policy para BPN: {bpn}"))

    # Build access policy
    policy_data = {
        "@id": policy_id,
        "@type": "PolicyDefinition",
        "policy": {
            "@type": "Set",
            "permission": [{
                "action": "access",
                "constraint": {
                    "leftOperand": "BusinessPartnerNumber",
                    "operator": "eq",
                    "rightOperand": bpn
                }
            }]
        }
    }

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        result = await mass_client.create_policy(policy_data)

        if result.get("already_exists"):
            logs.append(log_message(f"⚠️  La Access Policy ya existe: {policy_id}"))
            return {
                "success": False,
                "logs": logs,
                "error": "POLICY_EXISTS"
            }

        logs.append(log_message("✅ Access Policy creada exitosamente"))
        logs.append(log_message(f"   ID: {policy_id}"))
        logs.append(log_message(f"   BPN permitido: {bpn}"))

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


@router.post("/create-contract-policy")
async def create_contract_policy() -> Dict[str, Any]:
    """Create a contract usage policy."""
    logs: List[str] = []

    policy_id = "contract-policy-ikln-only"
    logs.append(log_message(f"📜 Creando Contract Policy..."))

    # Build contract policy
    policy_data = {
        "@id": policy_id,
        "@type": "PolicyDefinition",
        "policy": {
            "@type": "Set",
            "permission": [{
                "action": "use",
                "constraint": {
                    "leftOperand": "BusinessPartnerNumber",
                    "operator": "eq",
                    "rightOperand": settings.ikln_bpn
                }
            }]
        }
    }

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        result = await mass_client.create_policy(policy_data)

        if result.get("already_exists"):
            logs.append(log_message(f"⚠️  La Contract Policy ya existe: {policy_id}"))
            return {
                "success": False,
                "logs": logs,
                "error": "POLICY_EXISTS"
            }

        logs.append(log_message("✅ Contract Policy creada exitosamente"))
        logs.append(log_message(f"   ID: {policy_id}"))
        logs.append(log_message(f"   BPN permitido: {settings.ikln_bpn}"))

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


@router.post("/list-policies")
async def list_policies() -> Dict[str, Any]:
    """List all policy definitions in MASS connector."""
    logs: List[str] = []

    logs.append(log_message("📋 Consultando políticas en MASS..."))

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        policies = await mass_client.list_policies()

        logs.append(log_message(f"✅ Encontradas {len(policies)} políticas"))

        if policies:
            logs.append(log_message(""))
            for policy in policies:
                policy_id = policy.get("@id", "unknown")
                logs.append(log_message(f"📜 {policy_id}"))

        return {
            "success": True,
            "logs": logs,
            "policies": policies
        }

    except Exception as e:
        logs.append(log_message(f"❌ Error: {str(e)}"))
        return {
            "success": False,
            "logs": logs,
            "policies": []
        }
    finally:
        await mass_client.close()


@router.post("/delete-policy")
async def delete_policy(request: DeletePolicyRequest) -> Dict[str, Any]:
    """Delete a policy definition from MASS connector."""
    logs: List[str] = []
    policy_id = request.policyId

    logs.append(log_message(f"🗑️  Eliminando política '{policy_id}'..."))

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        await mass_client.delete_policy(policy_id)

        logs.append(log_message(f"✅ Política '{policy_id}' eliminada"))

        return {
            "success": True,
            "logs": logs
        }

    except Exception as e:
        error_msg = str(e)
        
        if "409" in error_msg:
            logs.append(log_message(f"❌ Error: Política en uso"))
            logs.append(log_message("   La política está vinculada a Contract Definitions"))
            logs.append(log_message("   Elimina primero los Contract Definitions"))
        else:
            logs.append(log_message(f"❌ Error: {error_msg}"))

        return {
            "success": False,
            "logs": logs,
            "error": error_msg
        }
    finally:
        await mass_client.close()
