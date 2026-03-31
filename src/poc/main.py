"""POC Dashboard API — FastAPI application entry point.

This is the main application module that wires together all routes
and configures the FastAPI application.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from poc.api.routes import (
    phase1_router,
    phase2_router,
    phase3_router,
    phase4_router,
    phase5_router,
    phase6_router,
)
from poc.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown hooks."""
    # Logging
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )

    logger.info("POC Dashboard API started on %s:%s", settings.app_host, settings.app_port)

    yield

    logger.info("POC Dashboard API shutting down")


# Create FastAPI application
app = FastAPI(
    title="POC EDC Dashboard API",
    description="Dashboard for managing Tractus-X EDC operations",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(phase1_router)
app.include_router(phase2_router)
app.include_router(phase3_router)
app.include_router(phase4_router)
app.include_router(phase5_router)
app.include_router(phase6_router)


@app.get("/")
async def root():
    """Serve the main dashboard HTML."""
    static_file = Path(__file__).parent / "static" / "index.html"
    if static_file.exists():
        return FileResponse(static_file)
    return {"message": "POC Dashboard API", "version": "0.1.0"}


@app.get("/{file_path:path}")
async def serve_static(file_path: str):
    """Serve static files from the static directory."""
    # Only serve files with known extensions to avoid conflicts with API routes
    allowed_extensions = {".js", ".css", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".json", ".html"}
    
    file_ext = Path(file_path).suffix.lower()
    if file_ext not in allowed_extensions:
        return {"message": "POC Dashboard API", "version": "0.1.0"}
    
    static_file = Path(__file__).parent / "static" / file_path
    if static_file.exists() and static_file.is_file():
        return FileResponse(static_file)
    
    # Return 404 for missing files
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="File not found")


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/api/info")
async def info():
    """Get connector information."""
    return {
        "mass": {
            "bpn": settings.mass_bpn,
            "management_api": settings.mass_management_url,
            "dsp": settings.mass_dsp,
        },
        "ikln": {
            "bpn": settings.ikln_bpn,
            "management_api": settings.ikln_management_url,
            "dsp": settings.ikln_dsp,
        }
    }


def run():
    """Entry point for running the application."""
    import uvicorn
    uvicorn.run(
        "poc.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
    )


if __name__ == "__main__":
    run()
