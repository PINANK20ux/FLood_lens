import logging
from fastapi import APIRouter, HTTPException, status
from ..core.database import db
from ..schemas.routing import RouteRequest, RouteResponse
from ..services.router import router_service

logger = logging.getLogger("floodlens.api.navigation")
router = APIRouter(prefix="/navigation", tags=["Navigation & Routing"])


@router.post("/route", response_model=RouteResponse)
async def compute_safe_route(payload: RouteRequest):
    """
    Computes a dynamically pruned safe route between origin and destination in Delhi.
    
    Logic:
    - Queries active flood statuses of all camera stations.
    - Prunes 'danger' stations (infinite weight) to route around severe waterlogging.
    - Penalizes 'caution' zones (x3 weight) to prefer dry arterial corridors.
    - Calculates shortest safe path using Dijkstra's algorithm.
    - Snaps waypoints to real Delhi street geometry via OSRM.
    """
    try:
        # Fetch current stations from database
        stations = await db.get_camera_stations()

        # Execute safe routing engine
        result = await router_service.calculate_safe_route(
            origin_query=payload.origin_id,
            destination_query=payload.destination_id,
            camera_stations=stations
        )
        return result
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Navigation routing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Route calculation failed: {str(e)}"
        )
