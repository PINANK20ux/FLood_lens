from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

AgencyRoleType = Literal["police", "fire", "hospital", "superadmin"]
DispatchPriorityType = Literal["low", "medium", "high", "critical"]
DispatchStatusType = Literal["dispatched", "en_route", "resolved"]


class AgencyUserResponse(BaseModel):
    id: str
    email: str
    agency_name: str
    role: AgencyRoleType
    badge_number: Optional[str] = None
    created_at: Optional[str] = None


class RawCameraFeedResponse(BaseModel):
    id: str
    name: str
    area: Optional[str] = "Delhi NCR"
    latitude: float
    longitude: float
    water_level_cm: float
    status: Literal["safe", "caution", "danger"]
    hazard: Optional[str] = "None"
    last_updated: Optional[str] = None
    raw_feed_url: str
    segmentation_overlay_url: str
    detected_hazards: List[str] = Field(default_factory=list)
    segmentation_metrics: Dict[str, Any] = Field(default_factory=dict)


class EmergencyDispatchCreate(BaseModel):
    camera_id: str = Field(..., description="Target camera station ID (e.g. CAM-01)")
    agency_type: str = Field(..., description="Unit type, e.g., 'Rescue Boat', 'Heavy Crane / Tow', 'Ambulance'")
    priority: DispatchPriorityType = Field("high", description="Emergency priority level")
    notes: Optional[str] = Field(None, description="Operational tactical notes from dispatch controller")


class EmergencyDispatchResponse(BaseModel):
    id: str
    camera_id: str
    dispatched_by: Optional[str] = None
    agency_type: str
    priority: DispatchPriorityType
    notes: Optional[str] = None
    status: DispatchStatusType = "dispatched"
    dispatched_at: str
    camera_name: Optional[str] = None
    camera_area: Optional[str] = None
    responder_agency: Optional[str] = None
    responder_badge: Optional[str] = None


class DispatchStatusUpdate(BaseModel):
    status: DispatchStatusType
