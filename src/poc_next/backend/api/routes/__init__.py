"""API routes package."""

from .phase1 import router as phase1_router
from .phase2 import router as phase2_router
from .phase3 import router as phase3_router
from .phase4 import router as phase4_router
from .phase5 import router as phase5_router
from .phase6 import router as phase6_router
from .sharepoint import router as sharepoint_router

__all__ = [
    "phase1_router",
    "phase2_router",
    "phase3_router",
    "phase4_router",
    "phase5_router",
    "phase6_router",
    "sharepoint_router",
]
