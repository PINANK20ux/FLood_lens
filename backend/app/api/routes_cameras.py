import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from ..core.database import db
from ..schemas.cameras import (
    CameraStationResponse,
    CameraStationListResponse,
    CameraSnapshotResponse,
    CameraSnapshotRequest,
)

logger = logging.getLogger("floodlens.api.cameras")
router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("", response_model=List[CameraStationResponse])
async def list_camera_stations():
    """
    Returns all monitored Delhi CCTV flood monitoring stations
    with live water levels, flood statuses, and telemetry.
    """
    stations = await db.get_camera_stations()
    return stations


@router.get("/summary", response_model=CameraStationListResponse)
async def get_camera_stations_summary():
    """
    Returns summary metrics (total, safe, caution, danger counts)
    along with full station list.
    """
    stations = await db.get_camera_stations()
    safe_cnt = sum(1 for s in stations if str(s.get("status", "")).lower() == "safe")
    caution_cnt = sum(1 for s in stations if str(s.get("status", "")).lower() == "caution")
    danger_cnt = sum(1 for s in stations if str(s.get("status", "")).lower() == "danger")

    return {
        "total": len(stations),
        "safe_count": safe_cnt,
        "caution_count": caution_cnt,
        "danger_count": danger_cnt,
        "stations": stations,
    }


@router.get("/{camera_id}", response_model=CameraStationResponse)
async def get_camera_station_by_id(camera_id: str):
    """
    Returns details for a specific camera station by its identifier
    (e.g., CAM-01 or station-1), including simulated snapshot image URL.
    """
    station = await db.get_camera_station(camera_id)
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera station with ID '{camera_id}' not found."
        )
    return station


def _find_camera_image_file(camera_id: str, station: Optional[dict] = None) -> Path:
    """
    Resolves the physical file path of a camera station's latest snapshot.
    Checks public frontend assets, backend test images, and static snapshot caches.
    """
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir.parent.parent
    repo_root = backend_dir.parent
    frontend_cams = repo_root / "frontend" / "public" / "test_cameras"
    test_images = backend_dir / "test_images"
    snapshots_dir = backend_dir / "app" / "static" / "snapshots"

    # 1. If CAM-09 or laptop webcam node, prefer latest captured edge frame
    if "09" in camera_id or "webcam" in camera_id.lower() or "laptop" in camera_id.lower():
        cam09_candidates = [
            snapshots_dir / "cam_09_latest.jpg",
            test_images / "cam_09_latest.jpg",
        ]
        for p in cam09_candidates:
            if p.is_file():
                return p

    # 2. Check if station has an image_url referencing a file
    if station and station.get("image_url"):
        img_name = Path(station["image_url"].split("?")[0]).name
        candidates = [
            test_images / img_name,
            frontend_cams / img_name,
            snapshots_dir / img_name,
        ]
        for c in candidates:
            if c.is_file():
                return c

    # 3. Derive standard camera frame index ((num - 1) % 5) + 1
    digits = "".join(filter(str.isdigit, camera_id))
    num = int(digits) if digits else 1
    cam_idx = ((num - 1) % 5) + 1
    std_filename = f"cam_{cam_idx:02d}.png"

    std_candidates = [
        frontend_cams / std_filename,
        test_images / std_filename,
        test_images / f"cam_{cam_idx:02d}.jpg",
    ]
    for c in std_candidates:
        if c.is_file():
            return c

    # 4. Fallback to any available camera image in test_images
    if test_images.is_dir():
        for fallback in test_images.iterdir():
            if fallback.suffix.lower() in {".png", ".jpg", ".jpeg"}:
                return fallback

    if frontend_cams.is_dir():
        for fallback in frontend_cams.iterdir():
            if fallback.suffix.lower() in {".png", ".jpg", ".jpeg"}:
                return fallback

    raise FileNotFoundError(f"Could not locate any valid snapshot image for camera '{camera_id}'")


@router.post("/{camera_id}/snapshot", response_model=CameraSnapshotResponse)
async def request_camera_snapshot(
    camera_id: str,
    payload: Optional[CameraSnapshotRequest] = None,
):
    """
    Processes a fresh snapshot for the specified camera station using YOLOv8
    water segmentation weights (water_seg.pt).

    Calculates:
    - water_percentage from mask pixels vs total pixels.
    - Depth label and operational category based on flood coverage:
        * Water < 5%: "Clear / Safe" (0 cm) -> Status: "Clear"
        * Water 5% - 25%: "Ankle Deep" (~10-20 cm) -> Status: "Caution"
        * Water 25% - 50%: "Wheel Deep" (~30-50 cm) -> Status: "Flooded"
        * Water > 50%: "Submerged / Danger" (>60 cm) -> Status: "Flooded"
    - Visual overlay returned as a Base64 data URL.
    - Updates camera station status and water depth in the database.
    """
    from ..services.water_seg_service import process_image

    station = await db.get_camera_station(camera_id)

    # 1. Resolve image source (raw bytes, uploaded base64, or local file)
    image_source = None
    if payload and payload.image_base64:
        import base64
        import re
        b64_clean = re.sub(r"^data:image/[a-zA-Z]+;base64,", "", payload.image_base64)
        try:
            image_source = base64.b64decode(b64_clean)
        except Exception as e:
            logger.warning(f"Failed to decode payload base64: {e}")

    if image_source is None:
        try:
            image_source = _find_camera_image_file(camera_id, station)
        except Exception as e:
            logger.error(f"Image resolution error for camera {camera_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Snapshot source image for camera '{camera_id}' could not be located."
            )

    # 2. Run live YOLOv8 water instance segmentation inference
    try:
        seg_res = process_image(image_input=image_source)
    except Exception as e:
        logger.error(f"Water segmentation inference failed for camera {camera_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Neural segmentation inference failed: {str(e)}"
        )

    water_percentage = float(seg_res["water_surface_percentage"])

    # 3. Calculate estimated depth label and status category
    if water_percentage < 5.0:
        depth_label = "Clear / Safe (0 cm)"
        status_category = "Clear"
        db_status = "safe"
        depth_cm = 0.0
    elif water_percentage <= 25.0:
        depth_label = "Ankle Deep (~10-20 cm)"
        status_category = "Caution"
        db_status = "caution"
        depth_cm = 15.0
    elif water_percentage <= 50.0:
        depth_label = "Wheel Deep (~30-50 cm)"
        status_category = "Flooded"
        db_status = "danger"
        depth_cm = 40.0
    else:
        depth_label = "Submerged / Danger (>60 cm)"
        status_category = "Flooded"
        db_status = "danger"
        depth_cm = 65.0

    # 4. Synchronize telemetry update to database store
    try:
        await db.update_camera_station_telemetry(
            camera_id=camera_id,
            water_depth_cm=depth_cm,
            status=db_status,
            hazard=f"YOLO AI: {depth_label} ({water_percentage:.1f}%)" if status_category != "Clear" else "None",
        )
    except Exception as db_err:
        logger.warning(f"Could not update database telemetry for {camera_id}: {db_err}")

    # 5. Format base64 annotated image data URL
    raw_b64 = seg_res.get("overlay_base64", "")
    annotated_image = f"data:image/jpeg;base64,{raw_b64}"

    return {
        "camera_id": camera_id,
        "water_percentage": water_percentage,
        "depth_label": depth_label,
        "status": status_category,
        "annotated_image": annotated_image,
        "last_checked": "Just now",
    }
