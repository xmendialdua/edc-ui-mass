#!/usr/bin/env python3
"""
Backend Flask para Dashboard EDC
Actúa como proxy para las APIs de EDC y ejecuta comandos kubectl
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import subprocess
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configuración de KUBECONFIG
# Busca en múltiples ubicaciones (por orden de prioridad):
# 1. Variable de entorno KUBECONFIG
# 2. ./kubeconfig.yaml (mismo directorio que backend.py)
# 3. ../kubeconfig.yaml (directorio padre)
# 4. ~/.kube/config (ubicación estándar)
def find_kubeconfig():
    """Busca kubeconfig en múltiples ubicaciones"""
    candidates = [
        os.environ.get('KUBECONFIG'),
        os.path.join(os.path.dirname(__file__), 'kubeconfig.yaml'),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), 'kubeconfig.yaml'),
        os.path.expanduser('~/.kube/config')
    ]
    
    for path in candidates:
        if path and os.path.exists(path):
            return path
    
    # Si no se encuentra, retornar el path por defecto (mismo directorio)
    return os.path.join(os.path.dirname(__file__), 'kubeconfig.yaml')

KUBECONFIG = find_kubeconfig()
os.environ['KUBECONFIG'] = KUBECONFIG

# Endpoints y credenciales (configúralos según tu entorno)
MASS_API = os.environ.get('MASS_API', "https://edc-mass-control.51.178.94.25.nip.io/management")
MASS_API_KEY = os.environ.get('MASS_API_KEY', "mass-api-key-change-in-production")
MASS_BPN = os.environ.get('MASS_BPN', "BPNL00000000MASS")
MASS_DSP = os.environ.get('MASS_DSP', "http://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp")

IKLN_API = os.environ.get('IKLN_API', "https://edc-ikln-control.51.178.94.25.nip.io/management")
IKLN_API_KEY = os.environ.get('IKLN_API_KEY', "ikln-api-key-change-in-production")
IKLN_BPN = os.environ.get('IKLN_BPN', "BPNL00000002IKLN")
IKLN_DSP = os.environ.get('IKLN_DSP', "http://edc-ikln-control.51.178.94.25.nip.io/api/v1/dsp")

PDF_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

# IDs para el ejercicio
ASSET_ID = "pdf-dummy-mass-ikln"
ACCESS_POLICY_ID = "access-policy-ikln-only"
CONTRACT_POLICY_ID = "contract-policy-ikln-only"
CONTRACT_DEF_ID = "contract-def-pdf-ikln"

# Cargar config.json si existe
try:
    config_path = os.path.join(os.path.dirname(__file__), 'config.json')
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            config = json.load(f)
            MASS_DSP = config.get('mass', {}).get('dsp', MASS_DSP)
            IKLN_DSP = config.get('ikln', {}).get('dsp', IKLN_DSP)
except Exception as e:
    print(f"Warning: Could not load config.json: {e}")


def log_message(message, level="info"):
    """Formatea mensajes de log con timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    return f"[{timestamp}] {message}"


def run_kubectl_command(command):
    """Ejecuta comando kubectl y retorna resultado"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": "Timeout: comando tardó más de 30 segundos",
            "returncode": -1
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "returncode": -1
        }


@app.route('/api/info', methods=['GET'])
def get_info():
    """Obtiene información de configuración"""
    return jsonify({
        "mass": {
            "api": MASS_API,
            "bpn": MASS_BPN,
            "api_key_set": bool(MASS_API_KEY)
        },
        "ikln": {
            "api": IKLN_API,
            "bpn": IKLN_BPN,
            "api_key_set": bool(IKLN_API_KEY)
        },
        "asset": {
            "id": ASSET_ID,
            "url": PDF_URL
        },
        "kubeconfig": KUBECONFIG,
        "kubeconfig_exists": os.path.exists(KUBECONFIG)
    })


# ============================================================================
# FASE 1: Verificación de Prerequisitos
# ============================================================================

@app.route('/api/phase1/check-connectivity', methods=['POST'])
def check_connectivity():
    """Verifica conectividad a las Management APIs"""
    results = []
    
    # Payload para query de assets
    query_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "@type": "QuerySpec",
        "offset": 0,
        "limit": 10,
        "sortOrder": "DESC",
        "filterExpression": []
    }
    
    # ========== Verificar MASS ==========
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("🔍 Verificando Conector MASS", "info"))
    results.append(log_message("=" * 60, "info"))
    
    # Paso 1: Verificar disponibilidad del endpoint base
    results.append(log_message("Paso 1: Verificando disponibilidad del endpoint base", "info"))
    results.append(log_message(f"→ URL: {MASS_API}", "info"))
    results.append(log_message(f"→ Método: HEAD (verificación rápida)", "info"))
    results.append("")
    
    mass_base_available = False
    try:
        head_response = requests.head(
            MASS_API,
            headers={"X-Api-Key": MASS_API_KEY},
            verify=False,
            timeout=10
        )
        results.append(log_message(f"← HTTP Status: {head_response.status_code}", "info"))
        
        if head_response.status_code == 404:
            results.append(log_message(f"✅ Conector MASS funcionando correctamente (404 esperado en /management)", "success"))
            mass_base_available = True
        elif head_response.status_code in [200, 301, 302, 405]:  # 405 Method Not Allowed es OK (endpoint existe)
            results.append(log_message(f"✅ Endpoint base MASS accesible (HTTP {head_response.status_code})", "success"))
            mass_base_available = True
        else:
            results.append(log_message(f"⚠️ Endpoint base respondió con HTTP {head_response.status_code}", "warning"))
            mass_base_available = True  # Intentar de todos modos
        
        # Mostrar algunos headers importantes
        if mass_base_available and 'server' in head_response.headers:
            results.append(log_message(f"   Server: {head_response.headers['server']}", "info"))
        if mass_base_available and 'content-type' in head_response.headers:
            results.append(log_message(f"   Content-Type: {head_response.headers['content-type']}", "info"))
            
    except requests.exceptions.Timeout:
        results.append(log_message(f"❌ Timeout al verificar endpoint base MASS", "error"))
        results.append(log_message(f"   El servidor no respondió en 10 segundos", "error"))
    except requests.exceptions.ConnectionError as e:
        results.append(log_message(f"❌ Error de conexión al endpoint base MASS", "error"))
        results.append(log_message(f"   {str(e)[:100]}", "error"))
    except Exception as e:
        results.append(log_message(f"⚠️ Error verificando endpoint base: {str(e)[:100]}", "warning"))
        mass_base_available = True  # Intentar de todos modos
    
    results.append("")
    
    # Paso 2: Verificar Health Check endpoints
    results.append(log_message("Paso 2: Verificando Health Check endpoints", "info"))
    
    health_endpoints = [
        ("Health API", "https://edc-mass-control.51.178.94.25.nip.io/api/check/health"),
        ("Health Management", f"{MASS_API}/check/health"),
        ("Liveness", "https://edc-mass-control.51.178.94.25.nip.io/api/check/liveness"),
        ("Readiness", "https://edc-mass-control.51.178.94.25.nip.io/api/check/readiness")
    ]
    
    health_ok_count = 0
    for endpoint_name, endpoint_url in health_endpoints:
        try:
            health_response = requests.get(
                endpoint_url,
                verify=False,
                timeout=5
            )
            
            if health_response.status_code == 200:
                results.append(log_message(f"   ✅ {endpoint_name}: OK", "success"))
                health_ok_count += 1
                # Mostrar contenido del health check si es JSON
                try:
                    health_data = health_response.json()
                    if isinstance(health_data, dict) and 'status' in health_data:
                        results.append(log_message(f"      Status: {health_data.get('status', 'unknown')}", "info"))
                except:
                    pass
            elif health_response.status_code == 404:
                results.append(log_message(f"   ⚪ {endpoint_name}: No disponible (404)", "info"))
            else:
                results.append(log_message(f"   ⚠️ {endpoint_name}: HTTP {health_response.status_code}", "warning"))
                
        except requests.exceptions.Timeout:
            results.append(log_message(f"   ⚪ {endpoint_name}: Timeout", "info"))
        except requests.exceptions.ConnectionError:
            results.append(log_message(f"   ⚪ {endpoint_name}: No conecta", "info"))
        except Exception as e:
            results.append(log_message(f"   ⚪ {endpoint_name}: Error", "info"))
    
    if health_ok_count > 0:
        results.append(log_message(f"   📊 Health checks respondieron: {health_ok_count}/4", "info"))
    else:
        results.append(log_message(f"   ℹ️ Health checks no disponibles (puede ser normal)", "info"))
    
    results.append("")
    
    # Paso 3: Consultar assets solo si el endpoint base está disponible
    if mass_base_available:
        results.append(log_message("Paso 3: Consultando lista de assets", "info"))
        mass_url = f"{MASS_API}/v3/assets/request"
        results.append(log_message(f"→ URL: {mass_url}", "info"))
        results.append(log_message(f"→ Método: POST", "info"))
        results.append("")
        
        try:
            response = requests.post(
                mass_url,
                headers={
                    "X-Api-Key": MASS_API_KEY,
                    "Content-Type": "application/json"
                },
                json=query_payload,
                verify=False,
                timeout=15
            )
        
            results.append(log_message(f"← HTTP Status: {response.status_code}", "info"))
        
            if response.status_code == 200:
                try:
                    assets = response.json()
                    if isinstance(assets, list):
                        if len(assets) > 0:
                            results.append(log_message(f"✅ Conexión MASS OK - {len(assets)} asset(s) encontrado(s)", "success"))
                            results.append("")
                            results.append(log_message(f"📦 Assets en MASS:", "info"))
                            for idx, asset in enumerate(assets[:5], 1):  # Mostrar primeros 5
                                asset_id = asset.get("@id", "unknown")
                                asset_name = asset.get("properties", {}).get("name", "Sin nombre")
                                results.append(log_message(f"   {idx}. {asset_id}", "info"))
                                if asset_name != "Sin nombre":
                                    results.append(log_message(f"      Nombre: {asset_name}", "info"))
                            if len(assets) > 5:
                                results.append(log_message(f"   ... y {len(assets) - 5} más", "info"))
                        else:
                            results.append(log_message(f"✅ Conexión MASS OK (sin assets registrados)", "success"))
                    else:
                        results.append(log_message(f"✅ Conexión MASS OK", "success"))
                except Exception as e:
                    results.append(log_message(f"✅ Conexión MASS OK (respuesta no JSON)", "success"))
                    results.append(log_message(f"   Respuesta: {response.text[:200]}", "info"))
            elif response.status_code == 401:
                results.append(log_message(f"❌ Conector MASS Unauthorized (401)", "error"))
                results.append(log_message(f"   API Key incorrecta o no válida", "error"))
            elif response.status_code == 403:
                results.append(log_message(f"❌ Conector MASS Forbidden (403)", "error"))
                results.append(log_message(f"   Sin permisos para acceder al recurso", "error"))
            elif response.status_code == 404:
                results.append(log_message(f"❌ Endpoint no encontrado (404)", "error"))
                results.append(log_message(f"   El endpoint /v3/assets/request no existe", "error"))
            elif response.status_code == 500:
                results.append(log_message(f"❌ Error interno del servidor MASS (500)", "error"))
                results.append(log_message(f"   {response.text[:200]}", "error"))
            else:
                results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
                results.append(log_message(f"   {response.text[:200]}", "error"))
            
        except requests.exceptions.Timeout:
            results.append(log_message(f"❌ Conector MASS no disponible (Timeout)", "error"))
            results.append(log_message(f"   El servidor no respondió en 15 segundos", "error"))
        except requests.exceptions.ConnectionError:
            results.append(log_message(f"❌ Conector MASS no disponible (Connection Error)", "error"))
            results.append(log_message(f"   No se pudo establecer conexión con el servidor", "error"))
        except Exception as e:
            results.append(log_message(f"❌ Conector MASS no disponible", "error"))
            results.append(log_message(f"   Error: {str(e)}", "error"))
    else:
        results.append(log_message("⏭️ Saltando consulta de assets (endpoint base no disponible)", "warning"))
    
    results.append("")
    
    # ========== Verificar IKLN ==========
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("🔍 Verificando Conector IKLN", "info"))
    results.append(log_message("=" * 60, "info"))
    
    # Paso 1: Verificar disponibilidad del endpoint base
    results.append(log_message("Paso 1: Verificando disponibilidad del endpoint base", "info"))
    results.append(log_message(f"→ URL: {IKLN_API}", "info"))
    results.append(log_message(f"→ Método: HEAD (verificación rápida)", "info"))
    results.append("")
    
    ikln_base_available = False
    try:
        head_response = requests.head(
            IKLN_API,
            headers={"X-Api-Key": IKLN_API_KEY},
            verify=False,
            timeout=10
        )
        results.append(log_message(f"← HTTP Status: {head_response.status_code}", "info"))
        
        if head_response.status_code == 404:
            results.append(log_message(f"✅ Conector IKLN funcionando correctamente (404 esperado en /management)", "success"))
            ikln_base_available = True
        elif head_response.status_code in [200, 301, 302, 405]:  # 405 Method Not Allowed es OK (endpoint existe)
            results.append(log_message(f"✅ Endpoint base IKLN accesible (HTTP {head_response.status_code})", "success"))
            ikln_base_available = True
        else:
            results.append(log_message(f"⚠️ Endpoint base respondió con HTTP {head_response.status_code}", "warning"))
            ikln_base_available = True  # Intentar de todos modos
        
        # Mostrar algunos headers importantes
        if ikln_base_available and 'server' in head_response.headers:
            results.append(log_message(f"   Server: {head_response.headers['server']}", "info"))
        if ikln_base_available and 'content-type' in head_response.headers:
            results.append(log_message(f"   Content-Type: {head_response.headers['content-type']}", "info"))
            
    except requests.exceptions.Timeout:
        results.append(log_message(f"❌ Timeout al verificar endpoint base IKLN", "error"))
        results.append(log_message(f"   El servidor no respondió en 10 segundos", "error"))
    except requests.exceptions.ConnectionError as e:
        results.append(log_message(f"❌ Error de conexión al endpoint base IKLN", "error"))
        results.append(log_message(f"   {str(e)[:100]}", "error"))
    except Exception as e:
        results.append(log_message(f"⚠️ Error verificando endpoint base: {str(e)[:100]}", "warning"))
        ikln_base_available = True  # Intentar de todos modos
    
    results.append("")
    
    # Paso 2: Verificar Health Check endpoints
    results.append(log_message("Paso 2: Verificando Health Check endpoints", "info"))
    
    health_endpoints = [
        ("Health API", "https://edc-ikln-control.51.178.94.25.nip.io/api/check/health"),
        ("Health Management", f"{IKLN_API}/check/health"),
        ("Liveness", "https://edc-ikln-control.51.178.94.25.nip.io/api/check/liveness"),
        ("Readiness", "https://edc-ikln-control.51.178.94.25.nip.io/api/check/readiness")
    ]
    
    health_ok_count = 0
    for endpoint_name, endpoint_url in health_endpoints:
        try:
            health_response = requests.get(
                endpoint_url,
                verify=False,
                timeout=5
            )
            
            if health_response.status_code == 200:
                results.append(log_message(f"   ✅ {endpoint_name}: OK", "success"))
                health_ok_count += 1
                # Mostrar contenido del health check si es JSON
                try:
                    health_data = health_response.json()
                    if isinstance(health_data, dict) and 'status' in health_data:
                        results.append(log_message(f"      Status: {health_data.get('status', 'unknown')}", "info"))
                except:
                    pass
            elif health_response.status_code == 404:
                results.append(log_message(f"   ⚪ {endpoint_name}: No disponible (404)", "info"))
            else:
                results.append(log_message(f"   ⚠️ {endpoint_name}: HTTP {health_response.status_code}", "warning"))
                
        except requests.exceptions.Timeout:
            results.append(log_message(f"   ⚪ {endpoint_name}: Timeout", "info"))
        except requests.exceptions.ConnectionError:
            results.append(log_message(f"   ⚪ {endpoint_name}: No conecta", "info"))
        except Exception as e:
            results.append(log_message(f"   ⚪ {endpoint_name}: Error", "info"))
    
    if health_ok_count > 0:
        results.append(log_message(f"   📊 Health checks respondieron: {health_ok_count}/4", "info"))
    else:
        results.append(log_message(f"   ℹ️ Health checks no disponibles (puede ser normal)", "info"))
    
    results.append("")
    
    # Paso 3: Consultar assets solo si el endpoint base está disponible
    if ikln_base_available:
        results.append(log_message("Paso 3: Consultando lista de assets", "info"))
        ikln_url = f"{IKLN_API}/v3/assets/request"
        results.append(log_message(f"→ URL: {ikln_url}", "info"))
        results.append(log_message(f"→ Método: POST", "info"))
        results.append("")
        
        try:
            response = requests.post(
                ikln_url,
                headers={
                    "X-Api-Key": IKLN_API_KEY,
                    "Content-Type": "application/json"
                },
                json=query_payload,
                verify=False,
                timeout=15
            )
        
            results.append(log_message(f"← HTTP Status: {response.status_code}", "info"))
        
            if response.status_code == 200:
                try:
                    assets = response.json()
                    if isinstance(assets, list):
                        if len(assets) > 0:
                            results.append(log_message(f"✅ Conexión IKLN OK - {len(assets)} asset(s) encontrado(s)", "success"))
                            results.append("")
                            results.append(log_message(f"📦 Assets en IKLN:", "info"))
                            for idx, asset in enumerate(assets[:5], 1):  # Mostrar primeros 5
                                asset_id = asset.get("@id", "unknown")
                                asset_name = asset.get("properties", {}).get("name", "Sin nombre")
                                results.append(log_message(f"   {idx}. {asset_id}", "info"))
                                if asset_name != "Sin nombre":
                                    results.append(log_message(f"      Nombre: {asset_name}", "info"))
                            if len(assets) > 5:
                                results.append(log_message(f"   ... y {len(assets) - 5} más", "info"))
                        else:
                            results.append(log_message(f"✅ Conexión IKLN OK (sin assets registrados)", "success"))
                    else:
                        results.append(log_message(f"✅ Conexión IKLN OK", "success"))
                except Exception as e:
                    results.append(log_message(f"✅ Conexión IKLN OK (respuesta no JSON)", "success"))
                    results.append(log_message(f"   Respuesta: {response.text[:200]}", "info"))
            elif response.status_code == 401:
                results.append(log_message(f"❌ Conector IKLN Unauthorized (401)", "error"))
                results.append(log_message(f"   API Key incorrecta o no válida", "error"))
            elif response.status_code == 403:
                results.append(log_message(f"❌ Conector IKLN Forbidden (403)", "error"))
                results.append(log_message(f"   Sin permisos para acceder al recurso", "error"))
            elif response.status_code == 404:
                results.append(log_message(f"❌ Endpoint no encontrado (404)", "error"))
                results.append(log_message(f"   El endpoint /v3/assets/request no existe", "error"))
            elif response.status_code == 500:
                results.append(log_message(f"❌ Error interno del servidor IKLN (500)", "error"))
                results.append(log_message(f"   {response.text[:200]}", "error"))
            else:
                results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
                results.append(log_message(f"   {response.text[:200]}", "error"))
            
        except requests.exceptions.Timeout:
            results.append(log_message(f"❌ Conector IKLN no disponible (Timeout)", "error"))
            results.append(log_message(f"   El servidor no respondió en 15 segundos", "error"))
        except requests.exceptions.ConnectionError:
            results.append(log_message(f"❌ Conector IKLN no disponible (Connection Error)", "error"))
            results.append(log_message(f"   No se pudo establecer conexión con el servidor", "error"))
        except Exception as e:
            results.append(log_message(f"❌ Conector IKLN no disponible", "error"))
            results.append(log_message(f"   Error: {str(e)}", "error"))
    else:
        results.append(log_message("⏭️ Saltando consulta de assets (endpoint base no disponible)", "warning"))
    
    results.append("")
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("✅ Verificación de conectividad completada", "success"))
    results.append(log_message("=" * 60, "info"))
    
    return jsonify({"success": True, "logs": results})


@app.route('/api/phase1/check-pods', methods=['POST'])
def check_pods():
    """Verifica estado de los pods de los conectores"""
    results = []
    
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("🔍 Verificando pods en namespace 'umbrella'", "info"))
    results.append(log_message("=" * 60, "info"))
    results.append(log_message(f"→ KUBECONFIG: {KUBECONFIG}", "info"))
    results.append(log_message(f"→ KUBECONFIG existe: {os.path.exists(KUBECONFIG)}", "info"))
    results.append("")
    
    # Verificar que kubectl funciona
    test_cmd = "kubectl version --client --short 2>/dev/null || kubectl version --client 2>&1 | head -1"
    test_result = run_kubectl_command(test_cmd)
    if test_result["success"]:
        results.append(log_message(f"→ kubectl: {test_result['stdout'].strip()}", "info"))
    else:
        results.append(log_message(f"⚠️ kubectl error: {test_result['stderr']}", "warning"))
    
    results.append("")
    results.append(log_message("→ Listando todos los pods en namespace 'umbrella'...", "info"))
    
    # Listar todos los pods del namespace umbrella
    cmd = "kubectl get pods -n umbrella -o wide"
    results.append(log_message(f"→ Comando: {cmd}", "info"))
    results.append("")
    result = run_kubectl_command(cmd)
    
    if result["success"]:
        stdout_lines = result["stdout"].strip().split('\n')
        
        if len(stdout_lines) <= 1 or "No resources found" in result["stdout"]:
            results.append(log_message("⚠️ No se encontraron pods en el namespace 'umbrella'", "warning"))
            results.append(log_message("   El namespace podría estar vacío o no existir", "warning"))
        else:
            # Mostrar todos los pods
            results.append(log_message("📋 Pods encontrados:", "info"))
            results.append("")
            for line in stdout_lines:
                results.append(line)
            
            results.append("")
            
            # Analizar pods EDC específicamente
            mass_control = [l for l in stdout_lines if "mass-edc-controlplane" in l]
            mass_data = [l for l in stdout_lines if "mass-edc-dataplane" in l]
            ikln_control = [l for l in stdout_lines if "ikln-edc-controlplane" in l]
            ikln_data = [l for l in stdout_lines if "ikln-edc-dataplane" in l]
            
            results.append(log_message("=" * 60, "info"))
            results.append(log_message("📊 Análisis de Conectores EDC", "info"))
            results.append(log_message("=" * 60, "info"))
            
            # MASS Connector
            results.append(log_message("🔷 MASS EDC Connector:", "info"))
            if mass_control:
                status = "Running" if "Running" in mass_control[0] else "❌"
                icon = "✅" if "Running" in mass_control[0] else "❌"
                results.append(log_message(f"   {icon} Control Plane: {status}", "success" if icon == "✅" else "error"))
            else:
                results.append(log_message(f"   ❌ Control Plane: No encontrado", "error"))
            
            if mass_data:
                status = "Running" if "Running" in mass_data[0] else "❌"
                icon = "✅" if "Running" in mass_data[0] else "❌"
                results.append(log_message(f"   {icon} Data Plane: {status}", "success" if icon == "✅" else "error"))
            else:
                results.append(log_message(f"   ❌ Data Plane: No encontrado", "error"))
            
            results.append("")
            
            # IKLN Connector
            results.append(log_message("🔶 IKLN EDC Connector:", "info"))
            if ikln_control:
                status = "Running" if "Running" in ikln_control[0] else "❌"
                icon = "✅" if "Running" in ikln_control[0] else "❌"
                results.append(log_message(f"   {icon} Control Plane: {status}", "success" if icon == "✅" else "error"))
            else:
                results.append(log_message(f"   ❌ Control Plane: No encontrado", "error"))
            
            if ikln_data:
                status = "Running" if "Running" in ikln_data[0] else "❌"
                icon = "✅" if "Running" in ikln_data[0] else "❌"
                results.append(log_message(f"   {icon} Data Plane: {status}", "success" if icon == "✅" else "error"))
            else:
                results.append(log_message(f"   ❌ Data Plane: No encontrado", "error"))
            
            results.append("")
            
            # Resumen
            total_running = result["stdout"].count("Running")
            total_pods = len(stdout_lines) - 1  # -1 para header
            edc_running = sum([
                1 if mass_control and "Running" in mass_control[0] else 0,
                1 if mass_data and "Running" in mass_data[0] else 0,
                1 if ikln_control and "Running" in ikln_control[0] else 0,
                1 if ikln_data and "Running" in ikln_data[0] else 0
            ])
            
            results.append(log_message("=" * 60, "info"))
            results.append(log_message(f"📈 Resumen:", "info"))
            results.append(log_message(f"   Total de pods en namespace: {total_pods}", "info"))
            results.append(log_message(f"   Pods en estado Running: {total_running}", "info"))
            results.append(log_message(f"   Conectores EDC principales: {edc_running}/4", "info"))
            
            if edc_running == 4:
                results.append(log_message("✅ Todos los conectores EDC están Running", "success"))
            elif edc_running >= 2:
                results.append(log_message(f"⚠️ Solo {edc_running}/4 conectores EDC en Running", "warning"))
            else:
                results.append(log_message(f"❌ Conectores EDC no disponibles ({edc_running}/4)", "error"))
            
            results.append(log_message("=" * 60, "info"))
    else:
        results.append(log_message(f"❌ Error ejecutando kubectl: {result['stderr']}", "error"))
        if "No such file" in result["stderr"]:
            results.append(log_message("   KUBECONFIG no encontrado o inaccesible", "error"))
        elif "connection refused" in result["stderr"].lower():
            results.append(log_message("   No se puede conectar al cluster de Kubernetes", "error"))
    
    # Información adicional: Servicios
    results.append("")
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("📡 Verificando Servicios (Services)", "info"))
    results.append(log_message("=" * 60, "info"))
    
    svc_cmd = "kubectl get svc -n umbrella -o wide"
    results.append(log_message(f"→ Comando: {svc_cmd}", "info"))
    results.append("")
    
    svc_result = run_kubectl_command(svc_cmd)
    
    if svc_result["success"]:
        svc_lines = svc_result["stdout"].strip().split('\n')
        
        # Filtrar servicios relacionados con mass e ikln
        mass_ikln_services = [line for line in svc_lines if 'mass-edc' in line.lower() or 'ikln-edc' in line.lower() or line.startswith('NAME')]
        
        if len(mass_ikln_services) > 1:  # Más de 1 porque incluye header
            results.append(log_message("📋 Servicios EDC encontrados:", "info"))
            results.append("")
            for line in mass_ikln_services:
                results.append(line)
            results.append("")
            
            # Contar servicios
            mass_svc_count = len([l for l in mass_ikln_services if 'mass-edc' in l.lower()])
            ikln_svc_count = len([l for l in mass_ikln_services if 'ikln-edc' in l.lower()])
            
            results.append(log_message(f"📊 Servicios MASS: {mass_svc_count}", "info"))
            results.append(log_message(f"📊 Servicios IKLN: {ikln_svc_count}", "info"))
        else:
            results.append(log_message("⚠️ No se encontraron servicios EDC", "warning"))
    else:
        results.append(log_message(f"❌ Error listando servicios: {svc_result['stderr']}", "error"))
    
    results.append("")
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("💡 Información sobre Port-Forward", "info"))
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("", "info"))
    results.append(log_message("Si necesitas acceder localmente a los servicios, usa port-forward:", "info"))
    results.append("")
    results.append(log_message("# MASS Control Plane (Management API en puerto 8081):", "info"))
    results.append(log_message("kubectl port-forward -n umbrella svc/mass-edc-controlplane 8081:8081", "info"))
    results.append(log_message("# Luego: curl http://localhost:8081/api/check/health", "info"))
    results.append("")
    results.append(log_message("# IKLN Control Plane (Management API en puerto 8081):", "info"))
    results.append(log_message("kubectl port-forward -n umbrella svc/ikln-edc-controlplane 8081:8081", "info"))
    results.append(log_message("# Luego: curl http://localhost:8081/api/check/health", "info"))
    results.append("")
    results.append(log_message("# MASS Data Plane (puerto 8081):", "info"))
    results.append(log_message("kubectl port-forward -n umbrella svc/mass-edc-dataplane 8081:8081", "info"))
    results.append("")
    results.append(log_message("# IKLN Data Plane (puerto 8081):", "info"))
    results.append(log_message("kubectl port-forward -n umbrella svc/ikln-edc-dataplane 8081:8081", "info"))
    results.append("")
    results.append(log_message("⚠️ Nota: Solo puedes tener un port-forward activo a la vez por puerto", "warning"))
    results.append(log_message("=" * 60, "info"))
    
    return jsonify({"success": result["success"], "logs": results})


@app.route('/api/phase1/check-trust', methods=['POST'])
def check_trust():
    """Verifica que el entorno esté listo para establecer trust"""
    results = []
    
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("🤝 Información sobre Trust entre Business Partners", "info"))
    results.append(log_message("=" * 60, "info"))
    results.append("")
    
    # Información sobre trust
    results.append(log_message("ℹ️  El Management API v3 no expone endpoints públicos para consultar", "info"))
    results.append(log_message("   business partner groups desde fuera del cluster.", "info"))
    results.append("")
    
    # Verificar conectividad básica
    results.append(log_message("Paso 1: Verificando conectividad básica con MASS...", "info"))
    try:
        response = requests.head(f"{MASS_API}", verify=False, timeout=5)
        if response.status_code in [200, 401, 403, 404]:
            results.append(log_message(f"✅ MASS API accesible (HTTP {response.status_code})", "success"))
        else:
            results.append(log_message(f"⚠️  MASS API respondió con HTTP {response.status_code}", "warning"))
    except Exception as e:
        results.append(log_message(f"❌ Error accediendo a MASS: {str(e)}", "error"))
    
    results.append("")
    
    results.append(log_message("Paso 2: Verificando conectividad básica con IKLN...", "info"))
    try:
        response = requests.head(f"{IKLN_API}", verify=False, timeout=5)
        if response.status_code in [200, 401, 403, 404]:
            results.append(log_message(f"✅ IKLN API accesible (HTTP {response.status_code})", "success"))
        else:
            results.append(log_message(f"⚠️  IKLN API respondió con HTTP {response.status_code}", "warning"))
    except Exception as e:
        results.append(log_message(f"❌ Error accediendo a IKLN: {str(e)}", "error"))
    
    results.append("")
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("📋 Cómo verificar trust:", "info"))
    results.append(log_message("=" * 60, "info"))
    results.append("")
    results.append(log_message("1️⃣  Ejecutar 'Ejecutar Seeding' para registrar partners", "info"))
    results.append(log_message("    (seed-business-partners.sh)", "info"))
    results.append("")
    results.append(log_message("2️⃣  Verificar los logs de los pods de seeding:", "info"))
    results.append(log_message("    kubectl logs job/mass-edc-business-partner-seeding -n mass-connector", "info"))
    results.append(log_message("    kubectl logs job/ikln-edc-business-partner-seeding -n ikln-connector", "info"))
    results.append("")
    results.append(log_message("3️⃣  Alternativamente, usar port-forward para acceder internamente:", "info"))
    results.append(log_message("    kubectl port-forward -n mass-connector svc/mass-edc-controlplane 8081:8081", "info"))
    results.append(log_message("    curl -X POST http://localhost:8081/management/v3/business-partner-groups/request \\", "info"))
    results.append(log_message("         -H 'X-Api-Key: password' -H 'Content-Type: application/json' \\", "info"))
    results.append(log_message("         -d '{\"@context\":{\"@vocab\":\"https://w3id.org/edc/v0.0.1/ns/\"},", "info"))
    results.append(log_message("              \"@type\":\"QuerySpec\",\"offset\":0,\"limit\":100}'", "info"))
    results.append("")
    
    results.append(log_message("=" * 60, "info"))
    results.append(log_message("✅ Verificación completada", "success"))
    results.append(log_message("=" * 60, "info"))
    
    return jsonify({
        "success": True,
        "logs": results
    })


@app.route('/api/phase1/seed-partners', methods=['POST'])
def seed_partners():
    """Ejecuta el script de seeding de business partners"""
    results = []
    
    results.append(log_message("🚀 Ejecutando seed-business-partners.sh...", "info"))
    
    script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'seed-business-partners.sh')
    
    if not os.path.exists(script_path):
        results.append(log_message(f"❌ Script no encontrado: {script_path}", "error"))
        return jsonify({"success": False, "logs": results})
    
    result = run_kubectl_command(f"bash {script_path}")
    
    results.append(log_message("📋 Output del script:", "info"))
    for line in result["stdout"].split('\n'):
        if line.strip():
            results.append(line)
    
    if result["stderr"]:
        results.append(log_message("⚠️ Errores:", "warning"))
        for line in result["stderr"].split('\n'):
            if line.strip():
                results.append(line)
    
    if result["success"]:
        results.append(log_message("✅ Seeding completado exitosamente", "success"))
    else:
        results.append(log_message(f"❌ Seeding falló (exit code {result['returncode']})", "error"))
    
    return jsonify({"success": result["success"], "logs": results})


# ============================================================================
# FASE 2: Publicación del Asset
# ============================================================================

@app.route('/api/phase2/create-asset', methods=['POST'])
def create_asset():
    """Crea el asset PDF en MASS"""
    results = []
    
    # Obtener el asset ID del request body (o usar el default)
    data = request.get_json() or {}
    asset_id = data.get('assetId', ASSET_ID)
    
    results.append(log_message(f"📦 Creando asset '{asset_id}' en MASS...", "info"))
    
    # Primero verificar si el asset ya existe
    results.append(log_message(f"🔍 Verificando si '{asset_id}' ya existe...", "info"))
    
    query_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "@type": "QuerySpec",
        "offset": 0,
        "limit": 100,
        "sortOrder": "DESC",
        "filterExpression": []
    }
    
    try:
        check_response = requests.post(
            f"{MASS_API}/v3/assets/request",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            json=query_payload,
            verify=False,
            timeout=10
        )
        
        if check_response.status_code == 200:
            existing_assets = check_response.json()
            asset_exists = any(a.get("@id") == asset_id for a in existing_assets)
            
            if asset_exists:
                results.append(log_message(f"❌ Error: Ya existe un asset con ID '{asset_id}'", "error"))
                results.append(log_message("💡 Por favor, elige otro nombre para el asset", "info"))
                return jsonify({"success": False, "logs": results, "error": "ASSET_EXISTS"})
            
            results.append(log_message(f"✅ El ID '{asset_id}' está disponible", "success"))
    except Exception as e:
        results.append(log_message(f"⚠️ No se pudo verificar assets existentes: {str(e)}", "warning"))
        results.append(log_message("Continuando con la creación...", "info"))
    
    results.append("")
    
    asset_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "@id": asset_id,
        "@type": "Asset",
        "properties": {
            "name": f"Asset: {asset_id}",
            "description": "PDF de prueba para demostración de políticas EDC basadas en BPN",
            "contenttype": "application/pdf",
            "version": "1.0"
        },
        "dataAddress": {
            "@type": "DataAddress",
            "type": "HttpData",
            "baseUrl": PDF_URL
        }
    }
    
    results.append(log_message("📄 Payload del asset:", "info"))
    results.append(json.dumps(asset_payload, indent=2))
    
    try:
        response = requests.post(
            f"{MASS_API}/v3/assets",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            json=asset_payload,
            verify=False,
            timeout=10
        )
        
        results.append(log_message(f"📡 HTTP {response.status_code}", "info"))
        
        if response.status_code in [200, 201]:
            results.append(log_message("✅ Asset creado exitosamente", "success"))
            results.append(json.dumps(response.json(), indent=2))
        elif response.status_code == 409:
            results.append(log_message("⚠️ Asset ya existe (409 Conflict)", "warning"))
            results.append(response.text[:500])
            return jsonify({"success": False, "logs": results, "error": "ASSET_EXISTS"})
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text[:500])
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})
    
    return jsonify({"success": True, "logs": results})


@app.route('/api/phase2/list-assets', methods=['POST'])
def list_assets():
    """Lista todos los assets en MASS"""
    results = []
    
    results.append(log_message("📋 Listando assets en MASS...", "info"))
    
    # QuerySpec correcto para consultar assets
    query_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "@type": "QuerySpec",
        "offset": 0,
        "limit": 100,
        "sortOrder": "DESC",
        "filterExpression": []
    }
    
    try:
        response = requests.post(
            f"{MASS_API}/v3/assets/request",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            json=query_payload,
            verify=False,
            timeout=10
        )
        
        if response.status_code == 200:
            assets = response.json()
            results.append(log_message(f"✅ Encontrados {len(assets)} assets", "success"))
            results.append("")
            
            if len(assets) > 0:
                # Mostrar lista con bullets de los nombres
                results.append(log_message("📋 Lista de assets:", "info"))
                for idx, asset in enumerate(assets, 1):
                    asset_id = asset.get("@id", "unknown")
                    asset_name = asset.get("properties", {}).get("name", "Sin nombre")
                    results.append(f"  {idx}. {asset_id}")
                    results.append(f"     └─ Nombre: {asset_name}")
                
                # Devolver también los assets como estructura JSON para el viewer
                return jsonify({"success": True, "logs": results, "assets": assets})
            else:
                results.append(log_message("ℹ️  No hay assets registrados en MASS", "info"))
                return jsonify({"success": True, "logs": results, "assets": []})
                
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text[:500])  # Limitar longitud de respuesta
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})


@app.route('/api/phase2/delete-asset', methods=['POST'])
def delete_asset():
    """Elimina un asset específico de MASS"""
    results = []
    
    # Obtener el asset ID del request body
    data = request.get_json()
    if not data or 'assetId' not in data:
        results.append(log_message("❌ Error: assetId no proporcionado", "error"))
        return jsonify({"success": False, "logs": results})
    
    asset_id = data['assetId']
    
    results.append(log_message(f"🗑️ Eliminando asset '{asset_id}' de MASS...", "info"))
    
    try:
        # EDC v3 API - DELETE /v3/assets/{id}
        response = requests.delete(
            f"{MASS_API}/v3/assets/{asset_id}",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            verify=False,
            timeout=10
        )
        
        results.append(log_message(f"📡 HTTP {response.status_code}", "info"))
        
        if response.status_code == 204:
            results.append(log_message(f"✅ Asset '{asset_id}' eliminado exitosamente", "success"))
            results.append("")
            results.append(log_message("⚠️ Importante:", "warning"))
            results.append(log_message("   Si este asset estaba vinculado a Contract Definitions,", "warning"))
            results.append(log_message("   considera eliminar también esos contratos.", "warning"))
            return jsonify({"success": True, "logs": results})
        elif response.status_code == 404:
            results.append(log_message(f"⚠️ Asset '{asset_id}' no encontrado", "warning"))
            return jsonify({"success": False, "logs": results})
        elif response.status_code == 409:
            results.append(log_message(f"❌ No se puede eliminar el asset '{asset_id}'", "error"))
            results.append(log_message("   El asset puede estar en uso por Contract Definitions activos", "error"))
            results.append(log_message("   Elimina primero los Contract Definitions que lo referencian", "error"))
            results.append("")
            results.append(log_message("   Respuesta del servidor:", "info"))
            results.append(response.text[:500])
            return jsonify({"success": False, "logs": results})
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text[:500])
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})


# ============================================================================
# FASE 3: Configuración de Políticas
# ============================================================================

@app.route('/api/phase3/create-access-policy', methods=['POST'])
def create_access_policy():
    """Crea la Access Policy restringida por BPN"""
    results = []
    
    # Obtener el BPN del request body (si existe, sino usar IKLN_BPN por defecto)
    data = request.get_json() or {}
    target_bpn = data.get('bpn', IKLN_BPN)
    
    # Generar ID de política basado en el BPN
    policy_id = f"access-policy-{target_bpn.lower()}"
    
    results.append(log_message(f"🔐 Creando Access Policy '{policy_id}'...", "info"))
    results.append(log_message(f"ℹ️ Access Policy: Controla VISIBILIDAD en el catálogo", "info"))
    results.append(log_message(f"ℹ️ Solo {target_bpn} podrá VER el asset en su catalog discovery", "info"))
    
    # Formato oficial de Catena-X (validado con tractus-x-umbrella docs)
    policy_payload = {
        "@context": [
            "https://w3id.org/catenax/2025/9/policy/odrl.jsonld",
            "https://w3id.org/catenax/2025/9/policy/context.jsonld",
            {
                "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
            }
        ],
        "@id": policy_id,
        "@type": "PolicyDefinition",
        "policy": {
            "@type": "Set",
            "permission": [{
                "action": "access",
                "constraint": [{
                    "and": [
                        {
                            "leftOperand": "Membership",
                            "operator": "eq",
                            "rightOperand": "active"
                        },
                        {
                            "leftOperand": "FrameworkAgreement",
                            "operator": "eq",
                            "rightOperand": "DataExchangeGovernance:1.0"
                        },
                        {
                            "leftOperand": "BusinessPartnerNumber",
                            "operator": "isAnyOf",
                            "rightOperand": [target_bpn]
                        }
                    ]
                }]
            }]
        }
    }
    
    results.append(log_message("📄 Payload de la política:", "info"))
    results.append(json.dumps(policy_payload, indent=2))
    
    try:
        response = requests.post(
            f"{MASS_API}/v3/policydefinitions",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            json=policy_payload,
            verify=False,
            timeout=10
        )
        
        results.append(log_message(f"📡 HTTP {response.status_code}", "info"))
        
        if response.status_code in [200, 201]:
            results.append(log_message("✅ Access Policy creada exitosamente", "success"))
            results.append(json.dumps(response.json(), indent=2))
            return jsonify({"success": True, "logs": results})
        elif response.status_code == 409:
            results.append(log_message("⚠️ Policy ya existe (409 Conflict)", "warning"))
            results.append(log_message("La política ya está registrada en el EDC", "warning"))
            return jsonify({"success": False, "error": "POLICY_EXISTS", "logs": results})
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text)
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})


@app.route('/api/phase3/create-contract-policy', methods=['POST'])
def create_contract_policy():
    """Crea la Contract Policy restringida por BPN"""
    results = []
    
    results.append(log_message(f"📜 Creando Contract Policy '{CONTRACT_POLICY_ID}'...", "info"))
    results.append(log_message(f"ℹ️ Contract Policy: Controla DERECHOS DE USO del asset", "info"))
    results.append(log_message(f"ℹ️ Define qué puede hacer {IKLN_BPN} con el asset una vez negociado", "info"))
    
    # Formato oficial de Catena-X (validado con tractus-x-umbrella docs)
    policy_payload = {
        "@context": [
            "https://w3id.org/catenax/2025/9/policy/odrl.jsonld",
            "https://w3id.org/catenax/2025/9/policy/context.jsonld",
            {
                "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
            }
        ],
        "@type": "PolicyDefinition",
        "@id": CONTRACT_POLICY_ID,
        "policy": {
            "@type": "Set",
            "permission": [{
                "action": "use",
                "constraint": {
                    "and": [
                        {
                            "leftOperand": "Membership",
                            "operator": "eq",
                            "rightOperand": "active"
                        },
                        {
                            "leftOperand": "FrameworkAgreement",
                            "operator": "eq",
                            "rightOperand": "DataExchangeGovernance:1.0"
                        },
                        {
                            "leftOperand": "UsagePurpose",
                            "operator": "isAnyOf",
                            "rightOperand": ["cx.core.industrycore:1"]
                        }
                    ]
                }
            }],
            "prohibition": [],
            "obligation": []
        }
    }
    
    results.append(log_message("📄 Payload de la política:", "info"))
    results.append(json.dumps(policy_payload, indent=2))
    
    try:
        response = requests.post(
            f"{MASS_API}/v3/policydefinitions",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            json=policy_payload,
            verify=False,
            timeout=10
        )
        
        results.append(log_message(f"📡 HTTP {response.status_code}", "info"))
        
        if response.status_code in [200, 201]:
            results.append(log_message("✅ Contract Policy creada exitosamente", "success"))
            results.append(json.dumps(response.json(), indent=2))
            return jsonify({"success": True, "logs": results})
        elif response.status_code == 409:
            results.append(log_message("⚠️ Policy ya existe (409 Conflict)", "warning"))
            results.append(log_message("La política ya está registrada en el EDC", "warning"))
            return jsonify({"success": False, "error": "POLICY_EXISTS", "logs": results})
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text)
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})
    
    return jsonify({"success": True, "logs": results})


@app.route('/api/phase3/list-policies', methods=['POST'])
def list_policies():
    """Lista todas las políticas en MASS"""
    results = []
    
    results.append(log_message("📋 Listando políticas en MASS...", "info"))
    
    # QuerySpec simple (igual que el curl que funcionó)
    query_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "@type": "QuerySpec",
        "offset": 0,
        "limit": 100
    }
    
    try:
        response = requests.post(
            f"{MASS_API}/v3/policydefinitions/request",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            json=query_payload,
            verify=False,
            timeout=10
        )
        
        if response.status_code == 200:
            policies = response.json()
            results.append(log_message(f"✅ Encontradas {len(policies)} políticas", "success"))
            
            # Devolver las políticas completas para que el frontend pueda trabajar con ellas
            return jsonify({
                "success": True, 
                "logs": results,
                "policies": policies  # Datos completos de todas las políticas
            })
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text[:500])
            return jsonify({"success": False, "logs": results, "policies": []})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results, "policies": []})


@app.route('/api/phase3/delete-policy', methods=['POST'])
def delete_policy():
    """Elimina una política en MASS"""
    results = []
    
    data = request.get_json()
    policy_id = data.get('policyId')
    
    if not policy_id:
        return jsonify({"success": False, "logs": ["❌ No se proporcionó policyId"]})
    
    results.append(log_message(f"🗑️ Eliminando política '{policy_id}' en MASS...", "info"))
    
    try:
        response = requests.delete(
            f"{MASS_API}/v3/policydefinitions/{policy_id}",
            headers={
                "X-Api-Key": MASS_API_KEY,
            },
            verify=False,
            timeout=10
        )
        
        if response.status_code == 204 or response.status_code == 200:
            results.append(log_message(f"✅ Política '{policy_id}' eliminada exitosamente", "success"))
            return jsonify({"success": True, "logs": results})
        elif response.status_code == 404:
            results.append(log_message(f"⚠️ Política '{policy_id}' no encontrada", "warning"))
            return jsonify({"success": False, "logs": results})
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text[:500])
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})


# ============================================================================
# FASE 4: Vinculación Asset-Políticas (Contract Definition)
# ============================================================================

@app.route('/api/phase4/create-contract-definition', methods=['POST'])
def create_contract_definition():
    """Crea la Contract Definition vinculando asset y políticas"""
    results = []
    
    # Obtener datos del request body
    data = request.get_json() or {}
    contract_name = data.get('contractName', CONTRACT_DEF_ID)
    asset_id = data.get('assetId', ASSET_ID)
    access_policy_id = data.get('accessPolicyId', ACCESS_POLICY_ID)
    contract_policy_id = data.get('contractPolicyId', CONTRACT_POLICY_ID)
    
    # Generar ID del contrato a partir del nombre (limpiar caracteres especiales)
    contract_def_id = contract_name.lower().replace(' ', '-').replace('_', '-')
    # Eliminar caracteres no alfanuméricos excepto guiones
    import re
    contract_def_id = re.sub(r'[^a-z0-9-]', '', contract_def_id)
    
    results.append(log_message(f"🔗 Creando Contract Definition '{contract_def_id}'...", "info"))
    results.append(log_message(f"ℹ️ Contract Definition: Vincula un asset con sus políticas", "info"))
    results.append(log_message(f"ℹ️ Asset: {asset_id}", "info"))
    results.append(log_message(f"ℹ️ Access Policy: {access_policy_id}", "info"))
    results.append(log_message(f"ℹ️ Contract Policy: {contract_policy_id}", "info"))
    
    contract_def_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "@id": contract_def_id,
        "@type": "ContractDefinition",
        "accessPolicyId": access_policy_id,
        "contractPolicyId": contract_policy_id,
        "assetsSelector": {
            "operandLeft": "https://w3id.org/edc/v0.0.1/ns/id",
            "operator": "=",
            "operandRight": asset_id
        }
    }
    
    results.append(log_message("📄 Payload de la Contract Definition:", "info"))
    results.append(json.dumps(contract_def_payload, indent=2))
    
    try:
        response = requests.post(
            f"{MASS_API}/v3/contractdefinitions",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            json=contract_def_payload,
            verify=False,
            timeout=10
        )
        
        results.append(log_message(f"📡 HTTP {response.status_code}", "info"))
        
        if response.status_code in [200, 201]:
            results.append(log_message("✅ Contract Definition creado exitosamente", "success"))
            results.append(json.dumps(response.json(), indent=2))
            return jsonify({"success": True, "logs": results})
        elif response.status_code == 409:
            results.append(log_message("⚠️ Contract Definition ya existe (409 Conflict)", "warning"))
            results.append(log_message("El contrato ya está registrado en el EDC", "warning"))
            return jsonify({"success": False, "error": "CONTRACT_EXISTS", "logs": results})
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text)
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})


@app.route('/api/phase4/list-contract-definitions', methods=['POST'])
def list_contract_definitions():
    """Lista todas las Contract Definitions en MASS"""
    results = []
    
    results.append(log_message("📋 Listando Contract Definitions en MASS...", "info"))
    
    # QuerySpec simple (igual que el de políticas)
    query_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "@type": "QuerySpec",
        "offset": 0,
        "limit": 100
    }
    
    try:
        # Primero intentar con POST usando el endpoint de query
        response = requests.post(
            f"{MASS_API}/v3/contractdefinitions/request",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            json=query_payload,
            verify=False,
            timeout=10
        )
        
        # Si falla con 400, intentar con GET
        if response.status_code == 400:
            results.append(log_message("⚠️ POST no soportado, intentando con GET...", "info"))
            response = requests.get(
                f"{MASS_API}/v2/contractdefinitions",
                headers={
                    "X-Api-Key": MASS_API_KEY,
                },
                verify=False,
                timeout=10
            )
        
        if response.status_code == 200:
            contracts = response.json()
            results.append(log_message(f"✅ Encontrados {len(contracts)} Contract Definitions", "success"))
            
            # Devolver los Contract Definitions completos para que el frontend pueda trabajar con ellos
            return jsonify({
                "success": True, 
                "logs": results,
                "contracts": contracts  # Datos completos de todos los Contract Definitions
            })
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text[:500])
            return jsonify({"success": False, "logs": results, "contracts": []})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results, "contracts": []})


@app.route('/api/phase4/delete-contract-definition', methods=['POST'])
def delete_contract_definition():
    """Elimina una Contract Definition específica de MASS"""
    results = []
    
    # Obtener el contract ID del request body
    data = request.get_json()
    if not data or 'contractId' not in data:
        results.append(log_message("❌ Error: contractId no proporcionado", "error"))
        return jsonify({"success": False, "logs": results})
    
    contract_id = data['contractId']
    
    results.append(log_message(f"🗑️ Eliminando Contract Definition '{contract_id}' de MASS...", "info"))
    
    try:
        # EDC v3 API - DELETE /v3/contractdefinitions/{id}
        response = requests.delete(
            f"{MASS_API}/v3/contractdefinitions/{contract_id}",
            headers={
                "X-Api-Key": MASS_API_KEY,
                "Content-Type": "application/json"
            },
            verify=False,
            timeout=10
        )
        
        results.append(log_message(f"📡 HTTP {response.status_code}", "info"))
        
        if response.status_code == 204:
            results.append(log_message(f"✅ Contract Definition '{contract_id}' eliminado exitosamente", "success"))
            results.append("")
            results.append(log_message("ℹ️ El asset y las políticas vinculadas NO se eliminan", "info"))
            results.append(log_message("   Solo se elimina el vínculo entre ellos", "info"))
            return jsonify({"success": True, "logs": results})
        elif response.status_code == 404:
            results.append(log_message(f"⚠️ Contract Definition '{contract_id}' no encontrado", "warning"))
            return jsonify({"success": False, "logs": results})
        elif response.status_code == 409:
            results.append(log_message(f"❌ No se puede eliminar el Contract Definition '{contract_id}'", "error"))
            results.append(log_message("   Puede estar en uso por negociaciones activas", "error"))
            results.append("")
            results.append(log_message("   Respuesta del servidor:", "info"))
            results.append(response.text[:500])
            return jsonify({"success": False, "logs": results})
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text[:500])
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})


# ============================================================================
# FASE 5: Descubrimiento desde IKLN (Catalog Discovery)
# ============================================================================

@app.route('/api/phase5/catalog-request', methods=['POST'])
def catalog_request():
    """IKLN consulta el catálogo de MASS"""
    results = []
    
    results.append(log_message("🔍 IKLN consultando catálogo de MASS...", "info"))
    results.append(log_message(f"ℹ️ Protocolo DSP: Dataspace Protocol para descubrimiento", "info"))
    results.append(log_message(f"ℹ️ IKLN pregunta: '¿Qué datos tiene MASS disponibles para mí?'", "info"))
    results.append(log_message(f"🔗 DSP Endpoint: {MASS_DSP}", "info"))
    results.append("")
    
    catalog_request_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "counterPartyAddress": MASS_DSP,
        "protocol": "dataspace-protocol-http",
        "querySpec": {
            "offset": 0,
            "limit": 100
        }
    }
    
    results.append(log_message("📄 Catalog Request Payload:", "info"))
    results.append(json.dumps(catalog_request_payload, indent=2))
    results.append("")
    
    try:
        response = requests.post(
            f"{IKLN_API}/v3/catalog/request",
            headers={
                "X-Api-Key": IKLN_API_KEY,
                "Content-Type": "application/json"
            },
            json=catalog_request_payload,
            verify=False,
            timeout=30
        )
        
        results.append(log_message(f"📡 HTTP {response.status_code}", "info"))
        
        if response.status_code == 200:
            catalog = response.json()
            
            # Buscar datasets en el catálogo
            datasets = catalog.get("dcat:dataset", [])
            if not datasets:
                datasets = catalog.get("datasets", [])
            
            results.append(log_message(f"✅ Catálogo recibido con {len(datasets)} datasets", "success"))
            results.append("")
            
            if len(datasets) > 0:
                results.append(log_message("📋 Datasets encontrados:", "info"))
                for idx, dataset in enumerate(datasets, 1):
                    dataset_id = dataset.get("@id", "unknown")
                    # Obtener properties si existen
                    props = dataset.get("properties", {})
                    if not props:
                        props = dataset.get("edc:properties", {})
                    
                    dataset_name = props.get("name", props.get("edc:name", "Sin nombre"))
                    results.append(f"  {idx}. {dataset_id}")
                    if dataset_name != "Sin nombre":
                        results.append(f"     └─ Nombre: {dataset_name}")
                
                # Devolver datasets para el frontend
                return jsonify({
                    "success": True, 
                    "logs": results, 
                    "datasets": datasets,
                    "catalog": catalog
                })
            else:
                results.append(log_message("⚠️ No se encontraron datasets en el catálogo", "warning"))
                results.append(log_message("Posibles causas:", "info"))
                results.append("  - Las políticas no permiten visibilidad a IKLN")
                results.append("  - La Contract Definition no está correcta")
                results.append("  - El trust entre partners no está establecido")
                results.append("  - No hay assets publicados en MASS")
                return jsonify({"success": True, "logs": results, "datasets": []})
            
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            
            # Intentar parsear el error
            try:
                error_data = response.json()
                results.append(log_message("🔴 Detalle del error:", "error"))
                if isinstance(error_data, list):
                    for err in error_data:
                        msg = err.get('message', str(err))
                        results.append(f"  - {msg}")
                else:
                    results.append(json.dumps(error_data, indent=2))
                
                # Si es error 502 con credenciales
                if response.status_code == 502 and 'credentials' in response.text.lower():
                    results.append("")
                    results.append(log_message("💡 Sugerencias para resolver:", "warning"))
                    results.append("  1. Verifica que ambos conectores estén funcionando (kubectl get pods)")
                    results.append("  2. Verifica la configuración del DIM Wallet / IATP")
                    results.append("  3. Revisa los logs de los pods: kubectl logs -n umbrella <pod-name>")
                    results.append("  4. Verifica que el DSP endpoint use HTTP (no HTTPS)")
            except:
                results.append(response.text[:500])
            
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})
    
    return jsonify({"success": True, "logs": results})


# ============================================================================
# FASE 6: Negociación y Acceso (Opcional)
# ============================================================================

@app.route('/api/phase6/negotiate-contract', methods=['POST'])
def negotiate_contract():
    """IKLN negocia un contrato con MASS para el asset"""
    results = []
    
    results.append(log_message("🤝 Iniciando negociación de contrato...", "info"))
    results.append(log_message("⏳ Esta operación puede tardar varios segundos...", "info"))
    
    # Primero necesitamos obtener la oferta del catálogo
    results.append(log_message("Paso 1: Obteniendo información del catálogo...", "info"))
    
    try:
        # Catalog request para obtener la oferta
        dsp_endpoint = "https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp"
        
        catalog_response = requests.post(
            f"{IKLN_API}/v3/catalog/request",
            headers={
                "X-Api-Key": IKLN_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "@context": {"@vocab": "https://w3id.org/edc/v0.0.1/ns/"},
                "counterPartyAddress": dsp_endpoint,
                "protocol": "dataspace-protocol-http"
            },
            verify=False,
            timeout=30
        )
        
        if catalog_response.status_code != 200:
            results.append(log_message(f"❌ Error obteniendo catálogo: HTTP {catalog_response.status_code}", "error"))
            return jsonify({"success": False, "logs": results})
        
        catalog = catalog_response.json()
        datasets = catalog.get("dcat:dataset", catalog.get("datasets", []))
        
        # Buscar nuestro asset y su oferta
        offer = None
        for dataset in datasets:
            if ASSET_ID in str(dataset.get("@id", "")):
                # Obtener la primera oferta disponible
                offers = dataset.get("odrl:hasPolicy", [])
                if offers:
                    offer = offers[0]
                    break
        
        if not offer:
            results.append(log_message(f"❌ No se encontró oferta para el asset '{ASSET_ID}'", "error"))
            return jsonify({"success": False, "logs": results})
        
        results.append(log_message(f"✅ Oferta encontrada: {offer.get('@id', 'unknown')}", "success"))
        
        # Paso 2: Iniciar negociación
        results.append(log_message("Paso 2: Iniciando negociación de contrato...", "info"))
        
        negotiation_payload = {
            "@context": {
                "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
            },
            "counterPartyAddress": dsp_endpoint,
            "protocol": "dataspace-protocol-http",
            "providerId": MASS_BPN,
            "offer": {
                "offerId": offer.get("@id"),
                "assetId": ASSET_ID,
                "policy": offer
            }
        }
        
        results.append(log_message("📄 Negotiation Payload:", "info"))
        results.append(json.dumps(negotiation_payload, indent=2))
        
        negotiation_response = requests.post(
            f"{IKLN_API}/v3/contractnegotiations",
            headers={
                "X-Api-Key": IKLN_API_KEY,
                "Content-Type": "application/json"
            },
            json=negotiation_payload,
            verify=False,
            timeout=30
        )
        
        results.append(log_message(f"📡 HTTP {negotiation_response.status_code}", "info"))
        
        if negotiation_response.status_code in [200, 201]:
            negotiation = negotiation_response.json()
            negotiation_id = negotiation.get("@id")
            
            results.append(log_message(f"✅ Negociación iniciada: {negotiation_id}", "success"))
            results.append(json.dumps(negotiation, indent=2))
            
            # Guardar el negotiation ID para la siguiente fase
            return jsonify({
                "success": True,
                "logs": results,
                "negotiationId": negotiation_id
            })
        else:
            results.append(log_message(f"❌ Error HTTP {negotiation_response.status_code}", "error"))
            results.append(negotiation_response.text)
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})


@app.route('/api/phase6/check-negotiation/<negotiation_id>', methods=['GET'])
def check_negotiation(negotiation_id):
    """Verifica el estado de una negociación"""
    results = []
    
    results.append(log_message(f"🔍 Verificando estado de negociación {negotiation_id}...", "info"))
    
    try:
        response = requests.get(
            f"{IKLN_API}/v3/contractnegotiations/{negotiation_id}",
            headers={"X-Api-Key": IKLN_API_KEY},
            verify=False,
            timeout=10
        )
        
        if response.status_code == 200:
            negotiation = response.json()
            state = negotiation.get("state", "UNKNOWN")
            
            results.append(log_message(f"Estado: {state}", "info"))
            
            if state == "FINALIZED":
                contract_agreement_id = negotiation.get("contractAgreementId")
                results.append(log_message(f"✅ Negociación finalizada exitosamente!", "success"))
                results.append(log_message(f"Contract Agreement ID: {contract_agreement_id}", "success"))
                return jsonify({
                    "success": True,
                    "logs": results,
                    "state": state,
                    "contractAgreementId": contract_agreement_id
                })
            elif state in ["REQUESTED", "NEGOTIATING", "AGREED"]:
                results.append(log_message(f"⏳ Negociación en progreso...", "info"))
            else:
                results.append(log_message(f"⚠️ Estado: {state}", "warning"))
            
            results.append(json.dumps(negotiation, indent=2))
            return jsonify({"success": True, "logs": results, "state": state})
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})


@app.route('/api/phase6/initiate-transfer', methods=['POST'])
def initiate_transfer():
    """Inicia la transferencia de datos usando el contract agreement"""
    data = request.get_json()
    contract_agreement_id = data.get("contractAgreementId")
    
    results = []
    
    results.append(log_message(f"📥 Iniciando transferencia de datos...", "info"))
    results.append(log_message(f"Contract Agreement: {contract_agreement_id}", "info"))
    
    transfer_payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "assetId": ASSET_ID,
        "contractId": contract_agreement_id,
        "counterPartyAddress": "https://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp",
        "protocol": "dataspace-protocol-http",
        "transferType": "HttpData-PULL"
    }
    
    results.append(log_message("📄 Transfer Request Payload:", "info"))
    results.append(json.dumps(transfer_payload, indent=2))
    
    try:
        response = requests.post(
            f"{IKLN_API}/v3/transferprocesses",
            headers={
                "X-Api-Key": IKLN_API_KEY,
                "Content-Type": "application/json"
            },
            json=transfer_payload,
            verify=False,
            timeout=30
        )
        
        results.append(log_message(f"📡 HTTP {response.status_code}", "info"))
        
        if response.status_code in [200, 201]:
            transfer = response.json()
            transfer_id = transfer.get("@id")
            
            results.append(log_message(f"✅ Transferencia iniciada: {transfer_id}", "success"))
            results.append(json.dumps(transfer, indent=2))
            
            return jsonify({
                "success": True,
                "logs": results,
                "transferId": transfer_id
            })
        else:
            results.append(log_message(f"❌ Error HTTP {response.status_code}", "error"))
            results.append(response.text)
            return jsonify({"success": False, "logs": results})
            
    except Exception as e:
        results.append(log_message(f"❌ Error: {str(e)}", "error"))
        return jsonify({"success": False, "logs": results})


if __name__ == '__main__':
    # Deshabilitar warnings de SSL
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    print("=" * 60)
    print("🚀 EDC Dashboard Backend")
    print("=" * 60)
    print(f"KUBECONFIG: {KUBECONFIG}")
    print(f"KUBECONFIG exists: {os.path.exists(KUBECONFIG)}")
    print(f"MASS API: {MASS_API}")
    print(f"IKLN API: {IKLN_API}")
    print("=" * 60)
    print("Backend listening on http://localhost:5000")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
