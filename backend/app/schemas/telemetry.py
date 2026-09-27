from typing import Optional, Literal
from pydantic import BaseModel, Field


class EdgeTelemetryInput(BaseModel):
    camera_id: str = Field(..., description="Camera identifier, e.g. CAM-01 or station-1")
    latitude: Optional[float] = Field(None, description="Current latitude of camera sensor")
    longitude: Optional[float] = Field(None, description="Current longitude of camera sensor")
    water_depth_cm: float = Field(..., ge=0.0, description="Measured water depth in cm")
    state: int = Field(..., ge=0, le=2, description="Edge state: 0 = safe, 1 = caution, 2 = danger")
    hazard: Optional[str] = Field(None, description="Detected hazard summary (e.g. Submerged Lane)")
    timestamp: Optional[str] = Field(None, description="Telemetry timestamp (ISO format)")


class TelemetryResponse(BaseModel):
    status: Literal["success", "error"] = "success"
    message: str
    camera_id: str
    mapped_status: Literal["safe", "caution", "danger"]
    water_level_cm: float
    updated_at: str


class FrameUploadResponse(BaseModel):
    status: Literal["success", "error"] = "success"
    message: str
    camera_id: str
    water_level_cm: float
    mapped_status: Literal["safe", "caution", "danger"]
    hazard: str
    image_url: str
    updated_at: str
