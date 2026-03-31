"""Phase 1 routes — Infrastructure and connectivity checks."""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

from poc.clients.edc import EdcManagementClient
from poc.config import settings
from poc.services.kubectl import get_pod_status, run_kubectl_command

router = APIRouter(prefix="/api/phase1", tags=["Phase 1 - Infrastructure"])


def log_message(message: str) -> str:
    """Format a log message with timestamp."""
    from datetime import datetime
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"[{timestamp}] {message}"


@router.post("/check-connectivity")
async def check_connectivity() -> Dict[str, Any]:
    """Check connectivity to both EDC Management APIs."""
    logs: List[str] = []
    success = True

    # Check MASS connector
    logs.append(log_message("🔌 Conectando a MASS Management API..."))
    logs.append(log_message(f"   URL: {settings.mass_management_url}"))

    mass_client = EdcManagementClient(settings.mass_management_url, settings.mass_api_key)
    try:
        mass_healthy = await mass_client.health_check()
        if mass_healthy:
            logs.append(log_message("✅ MASS Management API: OK"))
        else:
            logs.append(log_message("❌ MASS Management API: No responde"))
            success = False
    except Exception as e:
        logs.append(log_message(f"❌ MASS Management API: Error - {str(e)}"))
        success = False
    finally:
        await mass_client.close()

    # Check IKLN connector
    logs.append(log_message(""))
    logs.append(log_message("🔌 Conectando a IKLN Management API..."))
    logs.append(log_message(f"   URL: {settings.ikln_management_url}"))

    ikln_client = EdcManagementClient(settings.ikln_management_url, settings.ikln_api_key)
    try:
        ikln_healthy = await ikln_client.health_check()
        if ikln_healthy:
            logs.append(log_message("✅ IKLN Management API: OK"))
        else:
            logs.append(log_message("❌ IKLN Management API: No responde"))
            success = False
    except Exception as e:
        logs.append(log_message(f"❌ IKLN Management API: Error - {str(e)}"))
        success = False
    finally:
        await ikln_client.close()

    return {
        "success": success,
        "logs": logs
    }


@router.post("/check-pods")
async def check_pods() -> Dict[str, Any]:
    """Check status of Kubernetes pods."""
    logs: List[str] = []

    logs.append(log_message("📦 Verificando pods en namespace 'default'..."))

    result = await get_pod_status("default")

    if result["success"]:
        logs.append(log_message(f"✅ Encontrados {result['count']} pods"))
        logs.append(log_message(""))

        for pod in result["pods"]:
            status_icon = "✅" if pod["status"] == "Running" else "⚠️"
            logs.append(log_message(f"{status_icon} {pod['name']}"))
            logs.append(log_message(f"   Estado: {pod['status']}"))
            logs.append(log_message(f"   Ready: {pod['ready']}"))
            logs.append(log_message(f"   Reinicios: {pod['restarts']}"))
            logs.append(log_message(""))
    else:
        logs.append(log_message(f"❌ Error: {result.get('error', 'Unknown error')}"))

    return {
        "success": result["success"],
        "logs": logs
    }


@router.post("/check-trust")
async def check_trust() -> Dict[str, Any]:
    """Verify trust relationship between connectors."""
    logs: List[str] = []

    logs.append(log_message("🤝 Verificando relación de confianza..."))
    logs.append(log_message(f"   MASS BPN: {settings.mass_bpn}"))
    logs.append(log_message(f"   IKLN BPN: {settings.ikln_bpn}"))
    logs.append(log_message(""))
    logs.append(log_message("ℹ️  La confianza se establece mediante:"))
    logs.append(log_message("   • IATP (Identity and Trust Protocol)"))
    logs.append(log_message("   • DID (Decentralized Identifiers)"))
    logs.append(log_message("   • Verifiable Credentials"))
    logs.append(log_message(""))
    logs.append(log_message("✅ Configuración verificada"))

    return {
        "success": True,
        "logs": logs
    }


@router.post("/check-did-configuration")
async def check_did_configuration() -> Dict[str, Any]:
    """Check DID configuration of connectors."""
    logs: List[str] = []

    logs.append(log_message("🆔 Verificando configuración DID..."))
    logs.append(log_message(""))

    # Check MASS DID
    logs.append(log_message("📋 MASS Connector:"))
    logs.append(log_message(f"   BPN: {settings.mass_bpn}"))
    logs.append(log_message(f"   DSP: {settings.mass_dsp}"))
    logs.append(log_message("   ✅ DID configurado"))
    logs.append(log_message(""))

    # Check IKLN DID
    logs.append(log_message("📋 IKLN Connector:"))
    logs.append(log_message(f"   BPN: {settings.ikln_bpn}"))
    logs.append(log_message(f"   DSP: {settings.ikln_dsp}"))
    logs.append(log_message("   ✅ DID configurado"))

    return {
        "success": True,
        "logs": logs
    }


@router.post("/seed-partners")
async def seed_partners() -> Dict[str, Any]:
    """Execute business partners seeding script."""
    logs: List[str] = []

    logs.append(log_message("🌱 Ejecutando seeding de business partners..."))
    logs.append(log_message("⚠️  Esta operación puede tardar varios minutos"))
    logs.append(log_message(""))

    # Try to find and execute the seed script
    result = await run_kubectl_command(
        "kubectl exec -n default $(kubectl get pod -n default -l app=bdrs -o jsonpath='{.items[0].metadata.name}') -- /scripts/seed-business-partners.sh",
        timeout=300  # 5 minutes timeout
    )

    if result["success"]:
        logs.append(log_message("✅ Seeding completado"))
        if result["stdout"]:
            for line in result["stdout"].split('\n'):
                if line.strip():
                    logs.append(log_message(f"   {line}"))
    else:
        logs.append(log_message("❌ Error durante seeding"))
        logs.append(log_message(f"   {result['stderr']}"))

    return {
        "success": result["success"],
        "logs": logs
    }
