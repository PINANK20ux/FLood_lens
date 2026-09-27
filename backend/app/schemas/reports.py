from typing import List, Optional, Literal
from pydantic import BaseModel, Field

HazardTypeEnum = Literal[
    "Deep Water",
    "Small Flood",
    "Fallen Tree",
    "Broken Wire",
    "Big Hole in Road"
]

VerificationStatusEnum = Literal[
    "verified_camera",
    "rejected_clear",
    "pending_community"
]


class CitizenReportCreate(BaseModel):
    location_name: str = Field(..., min_length=2, description="Human readable location name or landmark")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")
    hazard_type: HazardTypeEnum = Field(..., description="Hazard category")
    description: Optional[str] = Field(None, max_length=1000, description="Additional context or details")
    image_url: Optional[str] = Field(None, description="Optional uploaded image URL")


class CitizenReportResponse(BaseModel):
    id: str
    location_name: str
    latitude: float
    longitude: float
    hazard_type: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    verified: bool
    verification_status: VerificationStatusEnum
    created_at: str
    nearest_station_id: Optional[str] = None
    distance_to_station_m: Optional[float] = None


class CitizenReportListResponse(BaseModel):
    total: int
    verified_count: int
    pending_count: int
    rejected_count: int
    reports: List[CitizenReportResponse]
