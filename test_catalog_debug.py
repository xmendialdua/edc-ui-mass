#!/usr/bin/env python3
"""
Script de debugging para analizar el flujo completo de catalog request
IKLN -> MASS con IATP
"""

import requests
import json
import time
from datetime import datetime

# Configuración
IKLN_MANAGEMENT_API = "https://edc-ikln-control.51.178.94.25.nip.io/management"
IKLN_API_KEY = "ikln-api-key-change-in-production"
MASS_DSP_ADDRESS = "http://edc-mass-control.51.178.94.25.nip.io/api/v1/dsp"

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] {level}: {message}")

def catalog_request():
    """Ejecuta catalog request con logging detallado"""
    
    log("=" * 80)
    log("INICIANDO CATALOG REQUEST: IKLN → MASS")
    log("=" * 80)
    
    # Preparar payload
    payload = {
        "@context": {
            "@vocab": "https://w3id.org/edc/v0.0.1/ns/"
        },
        "counterPartyAddress": MASS_DSP_ADDRESS,
        "protocol": "dataspace-protocol-http",
        "querySpec": {
            "offset": 0,
            "limit": 100
        }
    }
    
    log(f"Endpoint: {IKLN_MANAGEMENT_API}/v3/catalog/request")
    log(f"Counter-party: {MASS_DSP_ADDRESS}")
    log(f"Payload: {json.dumps(payload, indent=2)}")
    
    # Headers
    headers = {
        "X-Api-Key": IKLN_API_KEY,
        "Content-Type": "application/json"
    }
    
    log("Enviando petición HTTP POST...")
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{IKLN_MANAGEMENT_API}/v3/catalog/request",
            headers=headers,
            json=payload,
            verify=False,  # Self-signed certs
            timeout=30
        )
        
        elapsed = time.time() - start_time
        
        log(f"Respuesta recibida en {elapsed:.3f} segundos")
        log(f"HTTP Status Code: {response.status_code}")
        log(f"Response Headers: {dict(response.headers)}")
        
        # Analizar respuesta
        if response.status_code == 200:
            log("✅ SUCCESS: Catalog request exitoso", "SUCCESS")
            try:
                data = response.json()
                if isinstance(data, list):
                    log(f"Datasets encontrados: {len(data)}")
                    for idx, dataset in enumerate(data):
                        dataset_id = dataset.get('@id', 'unknown')
                        log(f"  [{idx+1}] Dataset ID: {dataset_id}")
                else:
                    log(f"Estructura de respuesta: {type(data)}")
                    log(f"Response data: {json.dumps(data, indent=2)}")
            except json.JSONDecodeError:
                log(f"Response (text): {response.text[:500]}")
        
        elif response.status_code == 502:
            log("❌ ERROR 502: Bad Gateway", "ERROR")
            try:
                error_data = response.json()
                log(f"Error message: {json.dumps(error_data, indent=2)}", "ERROR")
                
                # Analizar mensaje de error
                if isinstance(error_data, list) and len(error_data) > 0:
                    error_msg = error_data[0].get('message', '')
                    if "Unable to obtain credentials" in error_msg:
                        log("🔍 DIAGNÓSTICO: Fallo en obtención de credenciales IATP", "ERROR")
                        log("  - El conector IKLN no pudo obtener SI Token del DIM Wallet", "ERROR")
                        log("  - Revisar: dim-wallet-proxy logs", "ERROR")
                        log("  - Revisar: ssi-dim-wallet-stub logs", "ERROR")
                    
                    if "Empty optional" in error_msg:
                        log("🔍 DIAGNÓSTICO: Respuesta vacía del wallet", "ERROR")
                        log("  - El wallet devolvió Optional.empty()", "ERROR")
                        log("  - Posibles causas:", "ERROR")
                        log("    1. Token OAuth expirado", "ERROR")
                        log("    2. VP/VCs faltantes en response", "ERROR")
                        log("    3. Proxy no está modificando JWT correctamente", "ERROR")
                
            except json.JSONDecodeError:
                log(f"Error response (text): {response.text}", "ERROR")
        
        else:
            log(f"❌ ERROR {response.status_code}: {response.reason}", "ERROR")
            log(f"Response: {response.text[:500]}", "ERROR")
        
        return response
        
    except requests.exceptions.Timeout:
        log("❌ TIMEOUT: La petición tardó más de 30 segundos", "ERROR")
        log("  - Posible problema de red o conector no responde", "ERROR")
        return None
        
    except requests.exceptions.ConnectionError as e:
        log(f"❌ CONNECTION ERROR: {str(e)}", "ERROR")
        log("  - No se pudo conectar al conector IKLN", "ERROR")
        return None
        
    except Exception as e:
        log(f"❌ EXCEPTION: {type(e).__name__}: {str(e)}", "ERROR")
        return None

if __name__ == "__main__":
    log("Script de debugging - Catalog Request IATP")
    log("Asegúrate de tener kubectl configurado para ver logs simultáneamente")
    log("")
    log("Comandos útiles:")
    log("  kubectl logs -n portal dim-wallet-proxy-<pod-id> --tail=50 -f")
    log("  kubectl logs -n umbrella ikln-edc-controlplane-<pod-id> --tail=50 -f")
    log("")
    input("Presiona ENTER cuando estés listo para comenzar...")
    
    response = catalog_request()
    
    log("")
    log("=" * 80)
    log("DEBUGGING COMPLETO")
    log("=" * 80)
