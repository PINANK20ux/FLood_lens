import datetime
import logging
import uuid
from typing import List
from fastapi import APIRouter, HTTPException, status
from ..core.database import db
from ..schemas.reports import (
    CitizenReportCreate,
    CitizenReportResponse,
    CitizenReportListResponse,
)
from ..services.verifier import verify_citizen_report

logger = logging.getLogger("floodlens.api.citizen")
router = APIRouter(prefix="/citizen", tags=["Citizen Reports"])


@router.get("/reports", response_model=List[CitizenReportResponse])
async def list_citizen_reports():
    """
    Returns all public citizen hazard reports sorted by created_at DESC.
    """
    reports = await db.get_citizen_reports()
    return reports


@router.get("/reports/summary", response_model=CitizenReportListResponse)
async def get_citizen_reports_summary():
    """
    Returns citizen reports along with verification counts.
    """
    reports = await db.get_citizen_reports()
    verified_cnt = sum(1 for r in reports if r.get("verified") is True)
    rejected_cnt = sum(1 for r in reports if r.get("verification_status") == "rejected_clear")
    pending_cnt = sum(1 for r in reports if r.get("verification_status") == "pending_community" or (not r.get("verified") and r.get("verification_status") != "rejected_clear"))

    return {
        "total": len(reports),
        "verified_count": verified_cnt,
        "pending_count": pending_cnt,
        "rejected_count": rejected_cnt,
        "reports": reports,
    }


@router.post("/report", response_model=CitizenReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_citizen_report(report: CitizenReportCreate):
    """
    Submits a new citizen hazard report and executes the 500-meter
    spatial auto-verification engine against active CCTV monitoring stations.

    Verification Rules:
    - Distance <= 500m & nearest station in ('caution', 'danger') -> verified=True, status='verified_camera'
    - Distance <= 500m & nearest station in ('safe') -> verified=False, status='rejected_clear'
    - Distance > 500m -> verified=False, status='pending_community'
    """
    # 1. Fetch live camera stations from database
    stations = await db.get_camera_stations()

    # 2. Run spatial geodesic verification
    verified, verification_status, nearest_station_id, dist_m = verify_citizen_report(
        report_lat=report.latitude,
        report_lon=report.longitude,
        camera_stations=stations
    )

    # 3. Build record
    new_report_data = {
        "id": str(uuid.uuid4()),
        "location_name": report.location_name,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "hazard_type": report.hazard_type,
        "description": report.description,
        "image_url": report.image_url,
        "verified": verified,
        "verification_status": verification_status,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "nearest_station_id": nearest_station_id,
        "distance_to_station_m": dist_m if dist_m != float("inf") else None,
    }

    # 4. Save to Supabase / store
    try:
        saved = await db.create_citizen_report(new_report_data)
        return saved
    except Exception as e:
        logger.error(f"Failed to persist citizen report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save citizen report: {str(e)}"
        )
