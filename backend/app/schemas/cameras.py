from typing import List, Optional, Literal
from pydantic import BaseModel, Field

StationStatusType = Literal["safe", "caution", "danger"]


class CameraStationBase(BaseModel):
    id: str = Field(..., description="Unique station ID (e.g., CAM-01, station-1)")
    name: str = Field(..., description="Station or landmark name")
    area: Optional[str] = Field("Delhi NCR", description="Administrative district or area")
    latitude: float = Field(..., description="WGS84 Latitude")
    longitude: float = Field(..., description="WGS84 Longitude")
    water_level_cm: float = Field(0.0, description="Current flood depth in cm")
    status: StationStatusType = Field("safe", description="Traffic flood state")
    hazard: Optional[str] = Field("None", description="Hazard description or reason")
    last_updated: Optional[str] = Field(None, description="ISO timestamp of last reading")
    image_url: Optional[str] = Field(None, description="CCTV feed snapshot URL")


class CameraStationResponse(CameraStationBase):
    pass


class CameraStationListResponse(BaseModel):
    total: int
    safe_count: int
    caution_count: int
    danger_count: int
    stations: List[CameraStationResponse]


class CameraSnapshotResponse(BaseModel):
    camera_id: str
    water_percentage: float
    depth_label: str
    status: Literal["Flooded", "Caution", "Clear"]
    annotated_image: str
    last_checked: str = "Just now"


class CameraSnapshotRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
