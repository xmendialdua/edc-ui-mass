"""Kubernetes operations using kubectl commands."""

import asyncio
import logging
import os
from typing import Dict, Any

from poc.config import settings

logger = logging.getLogger(__name__)


async def run_kubectl_command(command: str, timeout: int = 30) -> Dict[str, Any]:
    """Execute a kubectl command and return the result.

    Args:
        command: The kubectl command to execute.
        timeout: Command timeout in seconds.

    Returns:
        Dict with success, stdout, stderr, and returncode.
    """
    try:
        # Set KUBECONFIG environment variable
        env = os.environ.copy()
        if settings.kubeconfig_path:
            env['KUBECONFIG'] = settings.kubeconfig_path

        # Execute the command
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )

            return {
                "success": process.returncode == 0,
                "stdout": stdout.decode('utf-8', errors='replace'),
                "stderr": stderr.decode('utf-8', errors='replace'),
                "returncode": process.returncode
            }
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Timeout: command took more than {timeout} seconds",
                "returncode": -1
            }

    except Exception as e:
        logger.error("Error executing kubectl command: %s", e)
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "returncode": -1
        }


async def get_pod_status(namespace: str = "default") -> Dict[str, Any]:
    """Get the status of pods in a namespace.

    Args:
        namespace: Kubernetes namespace.

    Returns:
        Dict with pod information.
    """
    command = f"kubectl get pods -n {namespace}"
    result = await run_kubectl_command(command)

    if result["success"]:
        pods = []
        lines = result["stdout"].strip().split('\n')
        if len(lines) > 1:
            # Skip header line
            for line in lines[1:]:
                parts = line.split()
                if len(parts) >= 5:
                    pods.append({
                        "name": parts[0],
                        "ready": parts[1],
                        "status": parts[2],
                        "restarts": parts[3],
                        "age": parts[4]
                    })

        return {
            "success": True,
            "pods": pods,
            "count": len(pods)
        }
    else:
        return {
            "success": False,
            "error": result["stderr"],
            "pods": []
        }


async def check_pod_logs(pod_name: str, namespace: str = "default", tail: int = 50) -> Dict[str, Any]:
    """Get logs from a pod.

    Args:
        pod_name: Name of the pod.
        namespace: Kubernetes namespace.
        tail: Number of lines to retrieve.

    Returns:
        Dict with log data.
    """
    command = f"kubectl logs {pod_name} -n {namespace} --tail={tail}"
    result = await run_kubectl_command(command)

    return {
        "success": result["success"],
        "logs": result["stdout"] if result["success"] else result["stderr"]
    }
