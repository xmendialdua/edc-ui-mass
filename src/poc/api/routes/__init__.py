"""API routes package."""

from poc.api.routes.phase1 import router as phase1_router
from poc.api.routes.phase2 import router as phase2_router
from poc.api.routes.phase3 import router as phase3_router
from poc.api.routes.phase4 import router as phase4_router
from poc.api.routes.phase5 import router as phase5_router
from poc.api.routes.phase6 import router as phase6_router

__all__ = [
    "phase1_router",
    "phase2_router",
    "phase3_router",
    "phase4_router",
    "phase5_router",
    "phase6_router",
]
