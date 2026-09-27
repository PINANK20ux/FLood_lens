import { useState, useEffect, useCallback } from 'react';
import type { CameraStation } from '../types';
import { fetchCameras } from '../lib/api';
import { mockCameraStations } from '../data/mockData';

export function useCameraStations() {
  const [stations, setStations] = useState<CameraStation[]>(mockCameraStations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStations = useCallback(async () => {
    try {
      const data = await fetchCameras();
      if (data && data.length > 0) {
        setStations(data);
        setError(null);
      }
    } catch (err) {
      console.warn('FastAPI backend fetch failed, using fallback stations:', err);
      setError('Backend offline — using cached/mock data');
      // If error occurs, keep existing or fallback mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    loadStations();

    // 10-second polling interval for real-time telemetry updates
    const interval = setInterval(loadStations, 10000);
    return () => clearInterval(interval);
  }, [loadStations]);

  return { stations, loading, error, refetch: loadStations };
}
