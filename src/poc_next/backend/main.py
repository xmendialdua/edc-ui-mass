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
    # Logging
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )

    logger.info("POC Next Backend API started on %s:%s", settings.app_host, settings.app_port)

    yield

    logger.info("POC Next Backend API shutting down")


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
