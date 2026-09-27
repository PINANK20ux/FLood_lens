import os
import re
import base64
import random
import datetime
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body, Request, status
from pydantic import BaseModel
from ..core.database import db, normalize_station_id
from ..schemas.telemetry import EdgeTelemetryInput, TelemetryResponse, FrameUploadResponse

logger = logging.getLogger("floodlens.api.edge")
router = APIRouter(prefix="/edge", tags=["Edge Telemetry"])

# Path to static snapshots folder
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
SNAPSHOTS_DIR = os.path.join(STATIC_DIR, "snapshots")
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

# Mapping integer state -> semantic status
STATE_MAP = {
    0: "safe",
    1: "caution",
    2: "danger"
}


class FrameUploadJSON(BaseModel):
    camera_id: str = "CAM-09"
    image_base64: str


@router.post("/telemetry", response_model=TelemetryResponse, status_code=status.HTTP_200_OK)
async def ingest_edge_telemetry(payload: EdgeTelemetryInput):
    """
    Ingests live telemetry packets from edge CCTV / fog computer nodes.
    """
    mapped_status = STATE_MAP.get(payload.state, "safe")
    
    try:
        updated_station = await db.update_camera_station_telemetry(
            camera_id=payload.camera_id,
            water_depth_cm=payload.water_depth_cm,
            status=mapped_status,
            hazard=payload.hazard,
            latitude=payload.latitude,
            longitude=payload.longitude,
            state_int=payload.state
        )

        return TelemetryResponse(
            status="success",
            message=f"Telemetry ingested for {payload.camera_id}. Status mapped to '{mapped_status}'.",
            camera_id=updated_station.get("id", payload.camera_id),
            mapped_status=mapped_status,
            water_level_cm=payload.water_depth_cm,
            updated_at=updated_station.get("last_updated", datetime.datetime.now(datetime.timezone.utc).isoformat())
        )
    except Exception as e:
        logger.error(f"Failed to process edge telemetry for {payload.camera_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest edge telemetry: {str(e)}"
        )


@router.post("/upload-frame", response_model=FrameUploadResponse, status_code=status.HTTP_200_OK)
async def upload_edge_frame(
    request: Request,
    camera_id: Optional[str] = Form("CAM-09"),
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
):
    """
    Accepts live webcam snapshot frame from laptop/edge demo node, saves it to static snapshots,
    runs simulated neural vision flood depth estimation, and updates station telemetry.
    Supports multipart/form-data (file/base64) and JSON request bodies.
    """
    target_camera_id = camera_id or "CAM-09"
    image_bytes = None

    # 1. Check if request body was JSON
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body_json = await request.json()
            target_camera_id = body_json.get("camera_id", target_camera_id)
            raw_b64 = body_json.get("image_base64") or body_json.get("image")
            if raw_b64:
                # Strip data URL header if present (e.g. data:image/jpeg;base64,...)
                clean_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", raw_b64)
                image_bytes = base64.b64decode(clean_b64)
        except Exception as e:
            logger.warning(f"Failed to parse JSON body for webcam upload: {e}")

    # 2. Check if file was uploaded via multipart Form
    if not image_bytes and file:
        image_bytes = await file.read()

    # 3. Check if base64 string was submitted via Form
    if not image_bytes and image_base64:
        clean_b64 = re.sub(r"^data:image\/[a-zA-Z]+;base64,", "", image_base64)
        image_bytes = base64.b64decode(clean_b64)

    # 4. Fallback: if no image supplied, generate dummy placeholder byte sequence
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid image payload provided (expected 'file', 'image_base64', or JSON).",
        )

    # Save to disk as cam_09_latest.jpg
    file_path = os.path.join(SNAPSHOTS_DIR, "cam_09_latest.jpg")
    try:
        with open(file_path, "wb") as f:
            f.write(image_bytes)
    except Exception as e:
        logger.error(f"Failed to write snapshot file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save snapshot: {str(e)}"
        )

    # Simulated edge neural detection
    now = datetime.datetime.now(datetime.timezone.utc)
    ts = int(now.timestamp())
    
    # Calculate a realistic edge reading
    random_factor = random.uniform(12.0, 32.0)
    water_level_cm = round(random_factor, 1)
    
    if water_level_cm >= 35.0:
        mapped_status = "danger"
        hazard = "Critical Urban Waterlogging (>35cm)"
    elif water_level_cm >= 10.0:
        mapped_status = "caution"
        hazard = "Edge Neural: Road Surface Inundation"
    else:
        mapped_status = "safe"
        hazard = "Clear / Nominal Roadway"

    # Relative image url with cache-busting timestamp
    image_url = f"/snapshots/cam_09_latest.jpg?t={ts}"

    # Update camera station telemetry in database
    canon_id = normalize_station_id(target_camera_id)
    await db.update_camera_station_telemetry(
        camera_id=canon_id,
        water_depth_cm=water_level_cm,
        status=mapped_status,
        hazard=hazard,
        latitude=28.6139,
        longitude=77.2090,
        state_int=2 if mapped_status == "danger" else (1 if mapped_status == "caution" else 0)
    )

    # Persist updated image_url on station object
    station = await db.get_camera_station(canon_id)
    if station:
        station["image_url"] = image_url
        station["water_level_cm"] = water_level_cm
        station["status"] = mapped_status
        station["hazard"] = hazard
        station["last_updated"] = now.isoformat()
        db._mock_db.upsert_camera_station(station)
        if db.supabase_client:
            try:
                db.supabase_client.table("camera_stations").update({
                    "image_url": image_url,
                    "water_level_cm": water_level_cm,
                    "status": mapped_status,
                    "hazard": hazard,
                    "last_updated": now.isoformat()
                }).eq("id", canon_id).execute()
            except Exception as e:
                logger.warning(f"Supabase update sync notice: {e}")

    return FrameUploadResponse(
        status="success",
        message="Webcam frame captured & neural telemetry computed successfully.",
        camera_id=canon_id,
        water_level_cm=water_level_cm,
        mapped_status=mapped_status,
        hazard=hazard,
        image_url=image_url,
        updated_at=now.isoformat()
    )
