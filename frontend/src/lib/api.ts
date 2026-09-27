import type {
  CameraStation,
  CitizenReport,
  HazardType,
  SafeRouteResponse,
  AgencyUser,
  EmergencyDispatch,
  RawCameraFeed,
  DispatchStatus,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

/**
 * Fetch all active camera monitoring stations with live flood statuses and water levels.
 */
export async function fetchCameras(): Promise<CameraStation[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/cameras`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch camera stations: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch a single camera station by ID or alias.
 */
export async function fetchCameraById(id: string): Promise<CameraStation> {
  const res = await fetch(`${API_BASE_URL}/api/v1/cameras/${encodeURIComponent(id)}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch camera station '${id}': ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface CameraSnapshotResult {
  camera_id: string;
  water_percentage: number;
  depth_label: string;
  status: 'Flooded' | 'Caution' | 'Clear';
  annotated_image: string;
  last_checked: string;
}

/**
 * Request fresh live YOLOv8 segmentation snapshot for a camera station.
 */
export async function requestCameraSnapshot(cameraId: string): Promise<CameraSnapshotResult> {
  const res = await fetch(`${API_BASE_URL}/api/v1/cameras/${encodeURIComponent(cameraId)}/snapshot`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to request camera snapshot: ${res.status} ${errorBody || res.statusText}`);
  }
  return res.json();
}

export interface CitizenReportPayload {
  location_name: string;
  latitude: number;
  longitude: number;
  hazard_type: HazardType;
  description?: string;
  image_url?: string;
}

/**
 * Submit a new citizen hazard report to backend for 500m spatial verification.
 */
export async function submitCitizenReport(payload: CitizenReportPayload): Promise<CitizenReport> {
  const res = await fetch(`${API_BASE_URL}/api/v1/citizen/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to submit citizen report: ${res.status} ${errorBody || res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch all verified and public citizen hazard reports.
 */
export async function fetchCitizenReports(): Promise<CitizenReport[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/citizen/reports`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch citizen reports: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Calculate dynamically pruned safe route bypassing flood zones.
 */
export async function getSafeRoute(
  originId: string,
  destinationId: string,
  vehicleType: string = 'car'
): Promise<SafeRouteResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/navigation/route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      origin_id: originId,
      destination_id: destinationId,
      vehicle_type: vehicleType,
    }),
  });
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errorMsg = errJson.detail;
    } catch {
      // Fallback
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

/* ----------------- Emergency Services Portal Admin API ----------------- */

/**
 * Fetch authenticated agency user profile.
 */
export async function fetchAgencyProfile(token: string): Promise<AgencyUser> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/me`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Authentication error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch unrestricted raw camera feeds with Mask2Former segmentation overlays (bypasses rate limit).
 */
export async function fetchRawCameraFeeds(token: string): Promise<RawCameraFeed[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/cameras/raw`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch raw camera feeds: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch all emergency unit dispatches.
 */
export async function fetchEmergencyDispatches(token: string): Promise<EmergencyDispatch[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/dispatches`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch dispatches: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface EmergencyDispatchPayload {
  camera_id: string;
  agency_type: string;
  priority: string;
  notes?: string;
}

/**
 * Create a new emergency unit dispatch.
 */
export async function createEmergencyDispatch(
  payload: EmergencyDispatchPayload,
  token: string
): Promise<EmergencyDispatch> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to create dispatch: ${res.status} ${errorBody || res.statusText}`);
  }
  return res.json();
}

/**
 * Update dispatch status (dispatched -> en_route -> resolved).
 */
export async function updateDispatchStatus(
  dispatchId: string,
  status: DispatchStatus,
  token: string
): Promise<EmergencyDispatch> {
  const res = await fetch(`${API_BASE_URL}/api/v1/admin/dispatch/${encodeURIComponent(dispatchId)}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update dispatch status: ${res.status}`);
  }
  return res.json();
}

export interface WebcamUploadResponse {
  status: 'success' | 'error';
  message: string;
  camera_id: string;
  water_level_cm: number;
  mapped_status: 'safe' | 'caution' | 'danger';
  hazard: string;
  image_url: string;
  updated_at: string;
}

/**
 * Upload a live captured webcam frame to the edge telemetry endpoint.
 * Supports binary Blob (via multipart/form-data) or base64 JSON.
 */
export async function uploadWebcamFrame(
  imageBlobOrBase64: Blob | string,
  cameraId: string = 'CAM-09'
): Promise<WebcamUploadResponse> {
  let res: Response;

  if (imageBlobOrBase64 instanceof Blob) {
    const formData = new FormData();
    formData.append('file', imageBlobOrBase64, 'cam_09_latest.jpg');
    formData.append('camera_id', cameraId);

    res = await fetch(`${API_BASE_URL}/api/v1/edge/upload-frame`, {
      method: 'POST',
      body: formData,
    });
  } else {
    res = await fetch(`${API_BASE_URL}/api/v1/edge/upload-frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        camera_id: cameraId,
        image_base64: imageBlobOrBase64,
      }),
    });
  }

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to process edge frame: ${res.status} ${errorBody || res.statusText}`);
  }
  const data = await res.json();
  if (data.image_url && data.image_url.startsWith('/')) {
    data.image_url = `${API_BASE_URL}${data.image_url}`;
  }
  return data;
}
