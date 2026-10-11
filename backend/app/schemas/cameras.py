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
    water_depth_cm: float = 0.0
    depth_label: str
    status: Literal["Flooded", "Caution", "Clear"]
    annotated_image: str
    last_checked: str = "Just now"
    stranded_people_count: Optional[int] = 0
    submerged_vehicles_count: Optional[int] = 0
    total_objects_detected: Optional[int] = 0


class CameraSnapshotRequest(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None


class DetectedObject(BaseModel):
    label: str
    confidence: float
    is_submerged: bool
    bbox: List[float]


class FloodAnalysisResponse(BaseModel):
    water_percentage: float
    water_severity: Literal["Low", "Moderate", "Critical"]
    water_depth_cm: float = 0.0
    depth_label: str = "Dry (0 cm)"
    status: Literal["Flooded", "Caution", "Clear"] = "Clear"
    stranded_people_count: int
    submerged_vehicles_count: int
    total_objects_detected: int
    annotated_image: str
    detected_objects: List[DetectedObject]
