"""
SharePoint Proxy Standalone Application

Esta es una aplicación FastAPI mínima que SOLO ejecuta el proxy de SharePoint.
Se usa para desplegar el proxy como un servicio independiente en Kubernetes.

¿Por qué necesitamos esto?
- El archivo sharepoint_proxy.py es un APIRouter, no una app completa
- Uvicorn necesita un objeto 'app' de tipo FastAPI para ejecutarse
- Esto crea ese 'app' e incluye el router de SharePoint

Flujo:
1. Kubernetes inicia este archivo con: uvicorn sharepoint_proxy_app:app
2. FastAPI se inicializa con configuración mínima
3. Se incluye el router de SharePoint (que ya existe)
4. El servicio queda listo para recibir peticiones del DataPlane
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import sharepoint_proxy

# Configurar logging para ver los mensajes en los logs de Kubernetes
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Crear la aplicación FastAPI mínima
app = FastAPI(
    title="SharePoint Proxy",
    description="Proxy service for SharePoint file downloads in EDC",
    version="1.0.0"
)

# Configurar CORS - permitir peticiones desde cualquier origen
# En producción, esto permitirá que el DataPlane (que está en otro namespace) acceda
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Acepta peticiones de cualquier origen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir el router de SharePoint proxy (el que ya existe)
# El prefijo /api hace que los endpoints sean: /api/sharepoint-proxy/...
app.include_router(sharepoint_proxy.router, prefix="/api")

# Health check endpoint - usado por Kubernetes para verificar que el servicio está vivo
@app.get("/health")
async def health_check():
    """
    Endpoint simple que responde si el servicio está funcionando.
    Kubernetes llama a esto periódicamente (liveness/readiness probes).
    """
    logger.info("Health check requested")
    return {
        "status": "healthy",
        "service": "sharepoint-proxy",
        "message": "SharePoint proxy is running and ready to serve requests"
    }

# Logging al iniciar la aplicación
logger.info("=" * 60)
logger.info("SharePoint Proxy Standalone Application Starting")
logger.info("=" * 60)
logger.info("Available endpoints:")
logger.info("  GET  /health - Health check")
logger.info("  GET  /api/sharepoint-proxy/download/{encoded} - Download file")
logger.info("  GET  /api/sharepoint-proxy/health - Proxy health check")
logger.info("  GET  /api/sharepoint-proxy/info - Proxy information")
logger.info("=" * 60)
