"""POC Next Backend — FastAPI application for Next.js frontend.

This is the backend API that serves the Next.js frontend.
All static file serving has been removed - Next.js handles that.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import (
    phase1_router,
    phase2_router,
    phase3_router,
    phase4_router,
    phase5_router,
    phase6_router,
)
from config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown hooks."""
    # Logging configuration similar to src/poc - force output to console
    import sys
    
    # Clear any existing handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(formatter)
    
    # Add handler to root logger
    root_logger.addHandler(console_handler)
    root_logger.setLevel(logging.INFO)
    
    # Also set specific loggers
    logging.getLogger("api.routes.phase6").setLevel(logging.INFO)
    logging.getLogger("clients.edc").setLevel(logging.INFO)

    logger.info("="*80)
    logger.info("🚀 POC Next Backend API started")
    logger.info(f"   Host: {settings.app_host}")
    logger.info(f"   Port: {settings.app_port}")
    logger.info(f"   Log Level: INFO")
    logger.info(f"   IKLN Management: {settings.ikln_management_url}")
    logger.info(f"   MASS BPN: {settings.mass_bpn}")
    logger.info("="*80)

    yield

    logger.info("="*80)
    logger.info("🛑 POC Next Backend API shutting down")
    logger.info("="*80)


# Create FastAPI application
app = FastAPI(
    title="POC Next Backend API",
    description="Backend API for POC Next.js Dashboard",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration - allow Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",  # Next.js dev server
        "http://127.0.0.1:3001",
        "*",  # For development - restrict in production
    ],
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
    """API root - health check."""
    return {
        "message": "POC Next Backend API",
        "version": "0.1.0",
        "status": "running",
        "frontend_url": "http://localhost:3001"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
        log_level=settings.log_level.lower(),
    )
