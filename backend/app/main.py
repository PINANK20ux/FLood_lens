import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .core.config import settings
from .core.database import db
from .api.routes_cameras import router as cameras_router
from .api.routes_edge import router as edge_router
from .api.routes_citizen import router as citizen_router
from .api.routes_navigation import router as navigation_router
from .api.routes_admin import router as admin_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("floodlens.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FloodLens Real-Time Urban Flood Monitoring, Spatial Verification, and Safe Routing Backend.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Ensure static directories exist
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
SNAPSHOTS_DIR = os.path.join(STATIC_DIR, "snapshots")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

# Mount static snapshot folder
app.mount("/snapshots", StaticFiles(directory=SNAPSHOTS_DIR), name="snapshots")

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers under prefix (e.g. /api/v1)
app.include_router(cameras_router, prefix=settings.API_V1_PREFIX)
app.include_router(cameras_router, prefix="/api")
app.include_router(edge_router, prefix=settings.API_V1_PREFIX)
app.include_router(citizen_router, prefix=settings.API_V1_PREFIX)
app.include_router(navigation_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health & Status"])
async def root():
    """Root status endpoint for FloodLens backend."""
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
        "database_mode": "in_memory_mock" if db.is_mock else "supabase_postgresql",
    }


@app.get("/health", tags=["Health & Status"])
async def health_check():
    """Health check endpoint for container orchestrators and status monitoring."""
    stations = await db.get_camera_stations()
    reports = await db.get_citizen_reports()
    return {
        "status": "healthy",
        "database": {
            "mode": "in_memory_mock" if db.is_mock else "supabase_postgresql",
            "stations_loaded": len(stations),
            "reports_loaded": len(reports),
        },
        "spatial_verification": {
            "radius_meters": settings.VERIFICATION_RADIUS_METERS,
            "engine": "geopy_geodesic",
        },
        "routing_engine": {
            "graph_library": "networkx",
            "osrm_endpoint": settings.OSRM_BASE_URL,
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
