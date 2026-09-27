"""API package containing route controllers for FloodLens."""
from .routes_cameras import router as cameras_router
from .routes_edge import router as edge_router
from .routes_citizen import router as citizen_router
from .routes_navigation import router as navigation_router

__all__ = ["cameras_router", "edge_router", "citizen_router", "navigation_router"]
