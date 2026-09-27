"""Schemas package for FloodLens API requests and responses."""
from .cameras import CameraStationResponse, CameraStationListResponse
from .telemetry import EdgeTelemetryInput, TelemetryResponse
from .reports import CitizenReportCreate, CitizenReportResponse, CitizenReportListResponse
from .routing import RouteRequest, RouteResponse, Waypoint, RouteSummary

__all__ = [
    "CameraStationResponse",
    "CameraStationListResponse",
    "EdgeTelemetryInput",
    "TelemetryResponse",
    "CitizenReportCreate",
    "CitizenReportResponse",
    "CitizenReportListResponse",
    "RouteRequest",
    "RouteResponse",
    "Waypoint",
    "RouteSummary",
]
