export type StationStatus = 'safe' | 'caution' | 'danger';

export interface CameraStation {
  id: string;
  name: string;
  area?: string;
  latitude: number;
  longitude: number;
  water_level_cm: number;
  status: StationStatus;
  hazard?: string | null;
  last_updated?: string;
  image_url?: string;
  imageUrl?: string;
  snapshot_url?: string;
  snapshotUrl?: string;
}

export type HazardType =
  | 'Deep Water'
  | 'Small Flood'
  | 'Fallen Tree'
  | 'Broken Wire'
  | 'Big Hole in Road';

export type VerificationStatus =
  | 'verified_camera'
  | 'rejected_clear'
  | 'pending_community';

export interface CitizenReport {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  hazard_type: HazardType;
  description?: string;
  image_url?: string;
  verified: boolean;
  verification_status?: VerificationStatus;
  created_at: string;
  nearest_station_id?: string;
  distance_to_station_m?: number;
}

export interface RouteWaypoint {
  station_id: string;
  name: string;
  latitude: number;
  longitude: number;
  water_level_cm: number;
  status: StationStatus;
}

export interface RouteSummary {
  total_distance_km: number;
  estimated_duration_min: number;
  safety_rating: 'safe' | 'caution_advisory' | 'impassable';
  waypoints_count: number;
  danger_stations_avoided: string[];
  caution_zones_encountered: string[];
}

export interface SafeRouteResponse {
  success: boolean;
  message: string;
  summary: RouteSummary;
  path_stations: RouteWaypoint[];
  coordinates: [number, number][]; // [lat, lng][]
}

/* ----------------- Emergency Services Portal Types ----------------- */

export type AgencyRole = 'police' | 'fire' | 'hospital' | 'superadmin';

export interface AgencyUser {
  id: string;
  email: string;
  agency_name: string;
  role: AgencyRole;
  badge_number?: string;
  created_at?: string;
  token?: string;
}

export type DispatchPriority = 'low' | 'medium' | 'high' | 'critical';
export type DispatchStatus = 'dispatched' | 'en_route' | 'resolved';

export interface EmergencyDispatch {
  id: string;
  camera_id: string;
  dispatched_by?: string;
  agency_type: string;
  priority: DispatchPriority;
  notes?: string;
  status: DispatchStatus;
  dispatched_at: string;
  camera_name?: string;
  camera_area?: string;
  responder_agency?: string;
  responder_badge?: string;
}

export interface RawCameraFeed {
  id: string;
  name: string;
  area?: string;
  latitude: number;
  longitude: number;
  water_level_cm: number;
  status: StationStatus;
  hazard: string;
  last_updated?: string;
  raw_feed_url: string;
  segmentation_overlay_url: string;
  detected_hazards: string[];
  segmentation_metrics: {
    water_segmentation_pixels_pct?: number;
    flow_velocity_est?: string;
    submerged_curb_depth_cm?: number;
    optical_resolution?: string;
    encoder_latency_ms?: number;
    mask2former_inference_ms?: number;
    [key: string]: any;
  };
}
