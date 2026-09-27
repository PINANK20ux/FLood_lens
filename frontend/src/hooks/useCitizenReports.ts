import { useState, useEffect, useCallback } from 'react';
import type { CitizenReport, HazardType, CameraStation } from '../types';
import { fetchCitizenReports, submitCitizenReport } from '../lib/api';
import { mockCitizenReports, mockCameraStations } from '../data/mockData';
import { haversineDistance } from '../utils/helpers';

const LOCAL_STORAGE_KEY = 'floodlens_citizen_reports';

/** Load reports from localStorage (fallback persistence) */
function loadLocalReports(): CitizenReport[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CitizenReport[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return mockCitizenReports;
}

/** Save reports to localStorage */
function saveLocalReports(reports: CitizenReport[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // ignore quota errors
  }
}

/**
 * Fallback auto-verification: check if a report coordinate is within 500m of any
 * camera station with status 'danger' or 'caution'.
 */
function autoVerifyFallback(
  lat: number,
  lng: number,
  stations: CameraStation[]
): boolean {
  const THRESHOLD_KM = 0.5; // 500 meters
  return stations.some(
    (s) =>
      (s.status === 'danger' || s.status === 'caution') &&
      haversineDistance(lat, lng, s.latitude, s.longitude) <= THRESHOLD_KM
  );
}

export function useCitizenReports(stationsOverride?: CameraStation[]) {
  const stations = stationsOverride ?? mockCameraStations;
  const [reports, setReports] = useState<CitizenReport[]>(loadLocalReports);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const data = await fetchCitizenReports();
      if (data && Array.isArray(data)) {
        setReports(data);
        saveLocalReports(data);
        setError(null);
      }
    } catch (err) {
      console.warn('FastAPI backend fetch reports failed, using local/cached reports:', err);
      setError('Backend offline — using offline reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    // Poll reports every 15 seconds
    const interval = setInterval(loadReports, 15000);
    return () => clearInterval(interval);
  }, [loadReports]);

  const submitReport = async (report: {
    location_name: string;
    latitude: number;
    longitude: number;
    hazard_type: HazardType;
    description?: string;
    image_url?: string;
  }): Promise<CitizenReport> => {
    try {
      // 1. Try submitting to FastAPI backend
      const createdReport = await submitCitizenReport(report);
      setReports((prev) => [createdReport, ...prev.filter((r) => r.id !== createdReport.id)]);
      return createdReport;
    } catch (err) {
      console.warn('Backend submit failed, falling back to local verification & localStorage:', err);
      
      // Fallback local verification
      const verified = autoVerifyFallback(report.latitude, report.longitude, stations);
      const fallbackReport: CitizenReport = {
        id: `report-${Date.now()}`,
        ...report,
        verified,
        verification_status: verified ? 'verified_camera' : 'pending_community',
        created_at: new Date().toISOString(),
      };

      setReports((prev) => {
        const updated = [fallbackReport, ...prev];
        saveLocalReports(updated);
        return updated;
      });

      return fallbackReport;
    }
  };

  return { reports, loading, error, submitReport, refetch: loadReports };
}
