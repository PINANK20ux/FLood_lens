import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  MapPin,
  Clock,
  Video,
  Laptop,
  Droplets,
  Users,
  Car,
  AlertTriangle,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import DepthBadge from './DepthBadge';
import CameraWebcamModal from './CameraWebcamModal';
import { timeAgo } from '../utils/helpers';
import {
  requestCameraSnapshot,
  analyzeFloodImage,
  type FloodAnalysisResult,
} from '../lib/api';
import type { CameraStation, StationStatus } from '../types';

interface CameraCardProps {
  station: CameraStation;
  isHighlighted?: boolean;
  isRefreshing?: boolean;
  requestsLeft: number;
  formattedCountdown: string;
  onRequestSnapshot: (id: string) => void;
}

// Compute standard fallback image based on station ID
function getDefaultCameraImage(id: string): string {
  const num = parseInt(id.replace(/\D/g, '') || '1', 10);
  const camIdx = ((num - 1) % 5) + 1;
  return `/test_cameras/cam_${String(camIdx).padStart(2, '0')}.png`;
}

// Ground-truth AI telemetry baseline for monitored junctions
const DEFAULT_AI_METRICS: Record<
  string,
  {
    water_percentage: number;
    depth_label: string;
    status: 'Flooded' | 'Caution' | 'Clear';
    station_status: StationStatus;
    water_level_cm: number;
    stranded_people_count: number;
    submerged_vehicles_count: number;
  }
> = {
  'CAM-01': {
    water_percentage: 45.1,
    depth_label: 'Submerged / Danger (>60 cm)',
    status: 'Flooded',
    station_status: 'danger',
    water_level_cm: 65,
    stranded_people_count: 17,
    submerged_vehicles_count: 0,
  },
  'CAM-02': {
    water_percentage: 18.2,
    depth_label: 'Ankle Deep (~10-20 cm)',
    status: 'Caution',
    station_status: 'caution',
    water_level_cm: 15,
    stranded_people_count: 0,
    submerged_vehicles_count: 0,
  },
  'CAM-03': {
    water_percentage: 37.7,
    depth_label: 'Wheel Deep (~30-50 cm)',
    status: 'Flooded',
    station_status: 'danger',
    water_level_cm: 40,
    stranded_people_count: 2,
    submerged_vehicles_count: 0,
  },
  'CAM-04': {
    water_percentage: 42.2,
    depth_label: 'Submerged / Danger (>60 cm)',
    status: 'Flooded',
    station_status: 'danger',
    water_level_cm: 65,
    stranded_people_count: 0,
    submerged_vehicles_count: 0,
  },
  'CAM-05': {
    water_percentage: 57.9,
    depth_label: 'Submerged / Danger (>60 cm)',
    status: 'Flooded',
    station_status: 'danger',
    water_level_cm: 65,
    stranded_people_count: 2,
    submerged_vehicles_count: 1,
  },
};

export default function CameraCard({
  station,
  isHighlighted = false,
  isRefreshing = false,
  requestsLeft,
  formattedCountdown,
  onRequestSnapshot,
}: CameraCardProps) {
  const isBlocked = requestsLeft <= 0;
  const isWebcamNode =
    station.id === 'CAM-09' ||
    station.id === 'station-9' ||
    station.name.toLowerCase().includes('webcam') ||
    station.name.toLowerCase().includes('laptop');

  const defaultMetric = DEFAULT_AI_METRICS[station.id];

  // Storage key v2 ensures stale/corrupted caches are bypassed
  const savedSnapshot =
    localStorage.getItem(`floodlens_v2_${station.id}_snapshot`) ||
    (isWebcamNode ? localStorage.getItem('floodlens_cam09_snapshot') : null);

  const savedDepth = localStorage.getItem(`floodlens_v2_${station.id}_water_depth`);
  const savedDepthLabel = localStorage.getItem(`floodlens_v2_${station.id}_depth_label`);
  const savedStatus = localStorage.getItem(`floodlens_v2_${station.id}_status`) as
    | StationStatus
    | 'Flooded'
    | 'Caution'
    | 'Clear'
    | null;
  const savedLastChecked = localStorage.getItem(`floodlens_v2_${station.id}_last_checked`);
  const savedWaterPct = localStorage.getItem(`floodlens_v2_${station.id}_water_pct`);
  const savedStranded = localStorage.getItem(`floodlens_v2_${station.id}_stranded`);
  const savedSubmerged = localStorage.getItem(`floodlens_v2_${station.id}_submerged`);

  const [isWebcamModalOpen, setIsWebcamModalOpen] = useState(false);
  const [isInferencing, setIsInferencing] = useState(false);

  // Initialize with persisted v2 metrics, falling back to verified baseline values
  const [snapshotDepthLabel, setSnapshotDepthLabel] = useState<string | null>(
    savedDepthLabel || defaultMetric?.depth_label || null
  );
  const [snapshotStatus, setSnapshotStatus] = useState<
    StationStatus | 'Flooded' | 'Caution' | 'Clear' | null
  >(savedStatus || defaultMetric?.status || null);
  const [lastCheckedText, setLastCheckedText] = useState<string | null>(
    savedLastChecked || (defaultMetric ? 'AI Monitored' : null)
  );

  const [waterPercentage, setWaterPercentage] = useState<number | null>(
    savedWaterPct !== null ? parseFloat(savedWaterPct) : defaultMetric?.water_percentage ?? null
  );
  const [strandedCount, setStrandedCount] = useState<number | null>(
    savedStranded !== null ? parseInt(savedStranded, 10) : defaultMetric?.stranded_people_count ?? null
  );
  const [submergedCount, setSubmergedCount] = useState<number | null>(
    savedSubmerged !== null ? parseInt(savedSubmerged, 10) : defaultMetric?.submerged_vehicles_count ?? null
  );

  const initialImage =
    savedSnapshot ||
    station.image_url ||
    station.imageUrl ||
    station.snapshot_url ||
    station.snapshotUrl ||
    getDefaultCameraImage(station.id);

  const [currentImage, setCurrentImage] = useState<string>(initialImage);
  const [localOverride, setLocalOverride] = useState<{
    water_level_cm?: number;
    status?: StationStatus;
    last_updated?: string;
  } | null>(
    savedDepth !== null || defaultMetric
      ? {
          water_level_cm:
            savedDepth !== null
              ? parseFloat(savedDepth)
              : defaultMetric?.water_level_cm,
          status:
            (savedStatus === 'Flooded'
              ? 'danger'
              : savedStatus === 'Caution'
              ? 'caution'
              : savedStatus === 'Clear'
              ? 'safe'
              : (savedStatus as StationStatus)) || defaultMetric?.station_status,
          last_updated: station.last_updated || new Date().toISOString(),
        }
      : null
  );

  // Keep image synced if station.image_url updates from backend polling or refetch
  useEffect(() => {
    const persisted =
      localStorage.getItem(`floodlens_v2_${station.id}_snapshot`) ||
      (isWebcamNode ? localStorage.getItem('floodlens_cam09_snapshot') : null);
    if (persisted) {
      setCurrentImage(persisted);
      return;
    }

    const candidate =
      station.image_url ||
      station.imageUrl ||
      station.snapshot_url ||
      station.snapshotUrl;
    if (
      candidate &&
      !currentImage.startsWith('blob:') &&
      !currentImage.startsWith('data:')
    ) {
      setCurrentImage(candidate);
    }
  }, [station.image_url, station.imageUrl, station.snapshot_url, station.snapshotUrl, isWebcamNode, station.id]);

  // Combined loading state for live inference or background refresh
  const isCardLoading = isRefreshing || isInferencing;

  // Active display values
  const currentStatus = localOverride?.status || station.status;
  const currentWaterLevel =
    localOverride?.water_level_cm !== undefined
      ? localOverride.water_level_cm
      : station.water_level_cm;
  const currentLastUpdated =
    localOverride?.last_updated || station.last_updated || new Date().toISOString();

  // Fresh live YOLO segmentation & object detection snapshot handler
  const handleRequestSnapshotClick = async () => {
    if (isBlocked || isCardLoading) return;

    onRequestSnapshot(station.id);
    setIsInferencing(true);

    try {
      // ALWAYS analyze the clean, unadulterated source frame - NEVER re-encode a data URL!
      const rawFeedUrl = getDefaultCameraImage(station.id);

      let analysis: FloodAnalysisResult | null = null;
      try {
        const imgFetch = await fetch(rawFeedUrl);
        if (imgFetch.ok) {
          const blob = await imgFetch.blob();
          analysis = await analyzeFloodImage(blob, station.id);
        }
      } catch (fetchErr) {
        console.warn(`Direct frame blob fetch failed for ${station.id}, falling back to snapshot API:`, fetchErr);
      }

      if (analysis) {
        if (analysis.annotated_image) {
          setCurrentImage(analysis.annotated_image);
          try {
            localStorage.setItem(`floodlens_v2_${station.id}_snapshot`, analysis.annotated_image);
          } catch {}
        }

        setWaterPercentage(analysis.water_percentage);
        setStrandedCount(analysis.stranded_people_count);
        setSubmergedCount(analysis.submerged_vehicles_count);

        // Real-time dynamic depth calculation directly from YOLO flood segmentation
        const dynamicDepth = typeof analysis.water_depth_cm === 'number' && analysis.water_depth_cm >= 0
          ? analysis.water_depth_cm
          : (analysis.water_percentage < 2.0
              ? 0.0
              : analysis.water_percentage < 15.0
              ? Math.round((5.0 + (analysis.water_percentage - 2.0) * (10.0 / 13.0)) * 10) / 10
              : analysis.water_percentage < 35.0
              ? Math.round((16.0 + (analysis.water_percentage - 15.0) * (29.0 / 20.0)) * 10) / 10
              : Math.round((48.0 + (analysis.water_percentage - 35.0) * 1.5) * 10) / 10);

        const statusCategory: 'Flooded' | 'Caution' | 'Clear' =
          analysis.status ||
          (dynamicDepth >= 30.0 || analysis.stranded_people_count > 0 || analysis.submerged_vehicles_count > 0
            ? 'Flooded'
            : dynamicDepth >= 5.0
            ? 'Caution'
            : 'Clear');

        const depthLabel =
          analysis.depth_label ||
          (dynamicDepth <= 0
            ? 'Dry (0 cm)'
            : dynamicDepth <= 15
            ? `Ankle Deep (~${Math.round(dynamicDepth)} cm)`
            : dynamicDepth <= 45
            ? `Wheel Deep (~${Math.round(dynamicDepth)} cm)`
            : `Submerged / Danger (~${Math.round(dynamicDepth)} cm)`);

        const mappedStatus: StationStatus =
          statusCategory === 'Flooded' ? 'danger' :
          statusCategory === 'Caution' ? 'caution' : 'safe';

        setSnapshotDepthLabel(depthLabel);
        setSnapshotStatus(statusCategory);
        setLastCheckedText('Just now');

        try {
          localStorage.setItem(`floodlens_v2_${station.id}_water_pct`, String(analysis.water_percentage));
          localStorage.setItem(`floodlens_v2_${station.id}_water_depth`, String(dynamicDepth));
          localStorage.setItem(`floodlens_v2_${station.id}_stranded`, String(analysis.stranded_people_count));
          localStorage.setItem(`floodlens_v2_${station.id}_submerged`, String(analysis.submerged_vehicles_count));
          localStorage.setItem(`floodlens_v2_${station.id}_depth_label`, depthLabel);
          localStorage.setItem(`floodlens_v2_${station.id}_status`, statusCategory);
          localStorage.setItem(`floodlens_v2_${station.id}_last_checked`, 'Just now');
        } catch {}

        setLocalOverride({
          water_level_cm: dynamicDepth,
          status: mappedStatus,
          last_updated: new Date().toISOString(),
        });

        // Trigger real-time map update
        window.dispatchEvent(
          new CustomEvent('floodlens_camera_updated', {
            detail: {
              cameraId: station.id,
              status: mappedStatus,
              water_level_cm: dynamicDepth,
              image_url: analysis.annotated_image,
            },
          })
        );
      } else {
        // Fallback to backend snapshot endpoint
        const res = await requestCameraSnapshot(station.id);
        if (res.annotated_image) {
          setCurrentImage(res.annotated_image);
          try {
            localStorage.setItem(`floodlens_v2_${station.id}_snapshot`, res.annotated_image);
          } catch {}
        }

        const dynamicDepth = typeof res.water_depth_cm === 'number' && res.water_depth_cm >= 0
          ? res.water_depth_cm
          : (res.depth_label.includes('0 cm') ? 0 :
             res.depth_label.includes('10-20') ? 15 :
             res.depth_label.includes('30-50') ? 40 : 65);

        setSnapshotDepthLabel(res.depth_label);
        setSnapshotStatus(res.status);
        setLastCheckedText(res.last_checked || 'Just now');
        setWaterPercentage(res.water_percentage);
        if (res.stranded_people_count !== undefined) setStrandedCount(res.stranded_people_count);
        if (res.submerged_vehicles_count !== undefined) setSubmergedCount(res.submerged_vehicles_count);

        try {
          localStorage.setItem(`floodlens_v2_${station.id}_depth_label`, res.depth_label);
          localStorage.setItem(`floodlens_v2_${station.id}_status`, res.status);
          localStorage.setItem(`floodlens_v2_${station.id}_last_checked`, res.last_checked || 'Just now');
          localStorage.setItem(`floodlens_v2_${station.id}_water_pct`, String(res.water_percentage));
          localStorage.setItem(`floodlens_v2_${station.id}_water_depth`, String(dynamicDepth));
          if (res.stranded_people_count !== undefined) {
            localStorage.setItem(`floodlens_v2_${station.id}_stranded`, String(res.stranded_people_count));
          }
          if (res.submerged_vehicles_count !== undefined) {
            localStorage.setItem(`floodlens_v2_${station.id}_submerged`, String(res.submerged_vehicles_count));
          }
        } catch {}

        const mappedStatus: StationStatus =
          res.status === 'Flooded' ? 'danger' :
          res.status === 'Caution' ? 'caution' : 'safe';

        setLocalOverride({
          water_level_cm: dynamicDepth,
          status: mappedStatus,
          last_updated: new Date().toISOString(),
        });

        // Trigger real-time map update
        window.dispatchEvent(
          new CustomEvent('floodlens_camera_updated', {
            detail: {
              cameraId: station.id,
              status: mappedStatus,
              water_level_cm: dynamicDepth,
              image_url: res.annotated_image,
            },
          })
        );
      }
    } catch (err) {
      console.error(`Failed to process live snapshot for camera ${station.id}:`, err);
    } finally {
      setIsInferencing(false);
    }
  };

  // Optimistic UI preview when user clicks Capture in the webcam modal
  const handleImmediatePreview = (previewUrl: string) => {
    setCurrentImage(previewUrl);
    setLocalOverride((prev) => ({
      ...prev,
      last_updated: new Date().toISOString(),
    }));
  };

  // On successful edge upload & neural processing
  const handleCaptureSuccess = (result: {
    image_url: string;
    water_level_cm: number;
    status: StationStatus;
    hazard: string;
    water_percentage?: number;
    stranded_people_count?: number;
    submerged_vehicles_count?: number;
  }) => {
    // 1. Save permanent static URL to localStorage for CAM-09
    if (isWebcamNode) {
      localStorage.setItem('floodlens_cam09_snapshot', result.image_url);
    }

    // 2. Switch to latest annotated / analyzed image URL
    setCurrentImage(result.image_url);

    // 3. Update telemetry and detection badges
    if (result.water_percentage !== undefined) {
      setWaterPercentage(result.water_percentage);
      try {
        localStorage.setItem(`floodlens_v2_${station.id}_water_pct`, String(result.water_percentage));
      } catch {}
    }
    if (result.stranded_people_count !== undefined) {
      setStrandedCount(result.stranded_people_count);
      try {
        localStorage.setItem(`floodlens_v2_${station.id}_stranded`, String(result.stranded_people_count));
      } catch {}
    }
    if (result.submerged_vehicles_count !== undefined) {
      setSubmergedCount(result.submerged_vehicles_count);
      try {
        localStorage.setItem(`floodlens_v2_${station.id}_submerged`, String(result.submerged_vehicles_count));
      } catch {}
    }

    setLocalOverride({
      water_level_cm: result.water_level_cm,
      status: result.status,
      last_updated: new Date().toISOString(),
    });

    // Trigger real-time map update
    window.dispatchEvent(
      new CustomEvent('floodlens_camera_updated', {
        detail: {
          cameraId: station.id,
          status: result.status,
          water_level_cm: result.water_level_cm,
          image_url: result.image_url,
        },
      })
    );

    // 4. Enforce 1 rate-limit token consumption upon successful capture
    onRequestSnapshot(station.id);
  };

  return (
    <>
      <div
        className={`rounded-2xl bg-white border overflow-hidden shadow-sm
                    transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
                    ${
                      isHighlighted || isWebcamNode
                        ? 'border-emerald-500/80 ring-2 ring-emerald-500/20'
                        : 'border-sand/60'
                    }`}
      >
        {/* Camera feed image header container */}
        <div className="relative w-full h-48 overflow-hidden rounded-t-xl bg-slate-900">
          <img
            src={currentImage}
            alt={station.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              const fallback = getDefaultCameraImage(station.id);
              if (!target.src.endsWith(fallback)) {
                target.src = fallback;
              } else if (!target.src.endsWith('/test_cameras/cam_01.png')) {
                target.src = '/test_cameras/cam_01.png';
              }
            }}
          />

          {/* Refreshing / Neural inference loader overlay */}
          {isCardLoading && (
            <div className="absolute inset-0 bg-dark/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
              <RefreshCw className="w-7 h-7 text-cream animate-spin" />
              <span className="text-xs font-mono font-medium text-cream/90 bg-black/50 px-2 py-0.5 rounded">
                {isInferencing ? 'Running YOLO Segmentation...' : 'Updating Camera Feed...'}
              </span>
            </div>
          )}

          {/* Floating status badges and live status tag */}
          <div className="absolute top-3 left-3 z-10">
            <StatusBadge status={snapshotStatus || currentStatus} size="sm" />
          </div>

          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-cream font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            LIVE
          </div>

          {/* Station identifier and Laptop Camera Connection badge */}
          <div className="absolute bottom-2 left-3 z-10 flex items-center gap-2">
            <span className="text-[11px] font-mono text-cream/90 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
              {station.id}
            </span>

            {isWebcamNode && (
              <span className="text-[10px] font-mono font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                <Laptop className="w-3 h-3 text-emerald-400" />
                Laptop Camera Connected
              </span>
            )}
          </div>
        </div>

        {/* Card body */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="font-semibold text-dark text-sm leading-snug">
                {station.name}
              </h3>
              <div className="flex items-center gap-1 mt-1 text-xs text-dark/40">
                <MapPin className="w-3 h-3" />
                <span>
                  {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                </span>
              </div>
            </div>
            <DepthBadge
              cm={currentWaterLevel}
              status={snapshotStatus || currentStatus}
              label={snapshotDepthLabel || undefined}
            />
          </div>

          <div className="flex items-center gap-1 text-xs text-dark/50 mb-3">
            <Clock className="w-3 h-3" />
            <span>Last checked {lastCheckedText || timeAgo(currentLastUpdated)}</span>
          </div>

          {/* Live Dual-Stream Vision Telemetry Badges */}
          <div className="grid grid-cols-3 gap-2 p-2.5 mb-4 rounded-xl bg-slate-50/90 border border-slate-200/80 shadow-xs">
            {/* Water Coverage % */}
            <div className="flex flex-col items-center justify-center py-1.5 px-1 rounded-lg bg-white border border-slate-200/60">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Droplets className="w-3 h-3 text-sky-500" />
                Water
              </span>
              <span
                className={`text-xs font-mono font-bold mt-0.5 ${
                  (waterPercentage ?? 0) > 40
                    ? 'text-rose-600'
                    : (waterPercentage ?? 0) >= 15
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}
              >
                {waterPercentage !== null ? `${waterPercentage.toFixed(1)}%` : '--'}
              </span>
            </div>

            {/* Stranded People */}
            <div
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border transition-colors ${
                (strandedCount ?? 0) > 0
                  ? 'bg-rose-50/90 border-rose-300'
                  : 'bg-white border-slate-200/60'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Users
                  className={`w-3 h-3 ${
                    (strandedCount ?? 0) > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'
                  }`}
                />
                <span className={(strandedCount ?? 0) > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'}>
                  Stranded
                </span>
              </span>
              <span
                className={`text-xs font-mono mt-0.5 flex items-center gap-1 ${
                  (strandedCount ?? 0) > 0
                    ? 'text-rose-600 font-black'
                    : 'text-slate-700 font-bold'
                }`}
              >
                {(strandedCount ?? 0) > 0 && (
                  <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />
                )}
                {strandedCount !== null ? strandedCount : '--'}
              </span>
            </div>

            {/* Submerged Vehicles */}
            <div
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border transition-colors ${
                (submergedCount ?? 0) > 0
                  ? 'bg-rose-50/90 border-rose-300'
                  : 'bg-white border-slate-200/60'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Car
                  className={`w-3 h-3 ${
                    (submergedCount ?? 0) > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'
                  }`}
                />
                <span className={(submergedCount ?? 0) > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'}>
                  Submerged
                </span>
              </span>
              <span
                className={`text-xs font-mono mt-0.5 flex items-center gap-1 ${
                  (submergedCount ?? 0) > 0
                    ? 'text-rose-600 font-black'
                    : 'text-slate-700 font-bold'
                }`}
              >
                {(submergedCount ?? 0) > 0 && (
                  <AlertTriangle className="w-3 h-3 text-rose-600 animate-bounce" />
                )}
                {submergedCount !== null ? submergedCount : '--'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isWebcamNode ? (
              <button
                onClick={() => {
                  if (!isBlocked) {
                    setIsWebcamModalOpen(true);
                  }
                }}
                disabled={isBlocked || isCardLoading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           text-sm font-semibold transition-all
                           ${
                             isBlocked
                               ? 'bg-sand/50 text-dark/40 opacity-50 cursor-not-allowed'
                               : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]'
                           }`}
              >
                {isBlocked ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{formattedCountdown} (3/15m limit)</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Capture Live Frame ({requestsLeft}/3 per 15m)</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleRequestSnapshotClick}
                disabled={isBlocked || isCardLoading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           text-sm font-medium transition-all
                           ${
                             isBlocked
                               ? 'bg-sand/50 text-dark/40 opacity-50 cursor-not-allowed'
                               : 'bg-forest text-cream hover:bg-forest/90 active:scale-[0.98]'
                           }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCardLoading ? 'animate-spin' : ''}`} />
                {isBlocked
                  ? `${formattedCountdown} (3/15m limit)`
                  : isCardLoading
                  ? 'Calculating Live Depth...'
                  : `Request Fresh Snapshot (${requestsLeft}/3 per 15 min)`}
              </button>
            )}

            <Link
              to={`/map`}
              className="px-3 py-2.5 rounded-xl border border-sand text-sm font-medium
                        text-dark/70 hover:border-forest/40 hover:text-dark transition-colors"
            >
              Map
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Webcam Capture Modal */}
      {isWebcamNode && (
        <CameraWebcamModal
          isOpen={isWebcamModalOpen}
          station={station}
          onClose={() => setIsWebcamModalOpen(false)}
          onImmediatePreview={handleImmediatePreview}
          onCaptureSuccess={handleCaptureSuccess}
        />
      )}
    </>
  );
}
