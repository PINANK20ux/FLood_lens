import { useState, useEffect, useCallback } from 'react';
import type { CameraStation, StationStatus } from '../types';
import { fetchCameras } from '../lib/api';
import { mockCameraStations } from '../data/mockData';

/**
 * Merges persisted or edge-captured camera vision metrics from localStorage
 * so the map and all views update in real time from live camera feeds.
 */
function mergeLocalTelemetry(stationsList: CameraStation[]): CameraStation[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return stationsList;
  }

  return stationsList.map((st) => {
    const savedDepth = localStorage.getItem(`floodlens_v2_${st.id}_water_depth`);
    const savedStatus = localStorage.getItem(`floodlens_v2_${st.id}_status`);
    const savedSnapshot =
      localStorage.getItem(`floodlens_v2_${st.id}_snapshot`) ||
      (st.id === 'CAM-09' ? localStorage.getItem('floodlens_cam09_snapshot') : null);
    const savedHazard = localStorage.getItem(`floodlens_v2_${st.id}_depth_label`);

    if (!savedDepth && !savedStatus && !savedSnapshot) {
      return st;
    }

    const normalizedStatus: StationStatus =
      savedStatus === 'Flooded'
        ? 'danger'
        : savedStatus === 'Caution'
        ? 'caution'
        : savedStatus === 'Clear'
        ? 'safe'
        : (savedStatus as StationStatus) || st.status;

    return {
      ...st,
      water_level_cm: savedDepth ? parseFloat(savedDepth) : st.water_level_cm,
      status: normalizedStatus,
      snapshot_url: savedSnapshot || st.snapshot_url,
      image_url: savedSnapshot || st.image_url,
      hazard: savedHazard ? `YOLO AI: ${savedHazard}` : st.hazard,
      last_updated: new Date().toISOString(),
    };
  });
}

export function useCameraStations() {
  const [stations, setStations] = useState<CameraStation[]>(() =>
    mergeLocalTelemetry(mockCameraStations)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStations = useCallback(async () => {
    try {
      const data = await fetchCameras();
      if (data && data.length > 0) {
        setStations(mergeLocalTelemetry(data));
        setError(null);
      }
    } catch (err) {
      console.warn('FastAPI backend fetch failed, using fallback stations:', err);
      setError('Backend offline — using cached/mock data');
      setStations((prev) => mergeLocalTelemetry(prev));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    loadStations();

    // 3-second polling interval for real-time camera feed telemetry
    const interval = setInterval(loadStations, 3000);

    // Cross-tab and local snapshot event listeners for instant zero-latency map updates
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('floodlens_')) {
        loadStations();
      }
    };

    const handleCustomCameraUpdate = () => {
      loadStations();
    };

    window.addEventListener('storage', handleStorageUpdate);
    window.addEventListener('floodlens_camera_updated', handleCustomCameraUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageUpdate);
      window.removeEventListener('floodlens_camera_updated', handleCustomCameraUpdate);
    };
  }, [loadStations]);

  return { stations, loading, error, refetch: loadStations };
}
