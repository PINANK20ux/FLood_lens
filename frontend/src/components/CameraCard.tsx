import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, MapPin, Clock, Video, Laptop } from 'lucide-react';
import StatusBadge from './StatusBadge';
import DepthBadge from './DepthBadge';
import CameraWebcamModal from './CameraWebcamModal';
import { timeAgo } from '../utils/helpers';
import { requestCameraSnapshot } from '../lib/api';
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

  // Persist captured / inferred image across page reloads via localStorage
  const savedSnapshot =
    localStorage.getItem(`floodlens_${station.id}_snapshot`) ||
    (isWebcamNode ? localStorage.getItem('floodlens_cam09_snapshot') : null);

  const savedDepthLabel = localStorage.getItem(`floodlens_${station.id}_depth_label`);
  const savedStatus = localStorage.getItem(`floodlens_${station.id}_status`) as
    | StationStatus
    | 'Flooded'
    | 'Caution'
    | 'Clear'
    | null;
  const savedLastChecked = localStorage.getItem(`floodlens_${station.id}_last_checked`);

  const [isWebcamModalOpen, setIsWebcamModalOpen] = useState(false);
  const [isInferencing, setIsInferencing] = useState(false);
  const [snapshotDepthLabel, setSnapshotDepthLabel] = useState<string | null>(savedDepthLabel);
  const [snapshotStatus, setSnapshotStatus] = useState<StationStatus | 'Flooded' | 'Caution' | 'Clear' | null>(savedStatus);
  const [lastCheckedText, setLastCheckedText] = useState<string | null>(savedLastChecked);

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
  } | null>(null);

  // Keep image synced if station.image_url updates from backend polling or refetch
  useEffect(() => {
    const persisted =
      localStorage.getItem(`floodlens_${station.id}_snapshot`) ||
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

  // Active display values (allowing immediate local frame update upon capture)
  const currentStatus = localOverride?.status || station.status;
  const currentWaterLevel =
    localOverride?.water_level_cm !== undefined
      ? localOverride.water_level_cm
      : station.water_level_cm;
  const currentLastUpdated =
    localOverride?.last_updated || station.last_updated || new Date().toISOString();

  // Fresh live YOLO segmentation snapshot handler
  const handleRequestSnapshotClick = async () => {
    if (isBlocked || isCardLoading) return;

    // Trigger rate-limit token countdown in parent
    onRequestSnapshot(station.id);

    setIsInferencing(true);
    try {
      const res = await requestCameraSnapshot(station.id);
      if (res.annotated_image) {
        setCurrentImage(res.annotated_image);
        try {
          localStorage.setItem(`floodlens_${station.id}_snapshot`, res.annotated_image);
        } catch {}
      }
      setSnapshotDepthLabel(res.depth_label);
      setSnapshotStatus(res.status);
      setLastCheckedText(res.last_checked || 'Just now');

      try {
        localStorage.setItem(`floodlens_${station.id}_depth_label`, res.depth_label);
        localStorage.setItem(`floodlens_${station.id}_status`, res.status);
        localStorage.setItem(`floodlens_${station.id}_last_checked`, res.last_checked || 'Just now');
      } catch {}

      const mappedStatus: StationStatus =
        res.status === 'Flooded' ? 'danger' :
        res.status === 'Caution' ? 'caution' : 'safe';

      const mappedDepth =
        res.depth_label.includes('0 cm') ? 0 :
        res.depth_label.includes('10-20') ? 15 :
        res.depth_label.includes('30-50') ? 40 : 65;

      setLocalOverride({
        water_level_cm: mappedDepth,
        status: mappedStatus,
        last_updated: new Date().toISOString(),
      });
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
  }) => {
    // 1. Save permanent static URL to localStorage for CAM-09
    if (isWebcamNode) {
      localStorage.setItem('floodlens_cam09_snapshot', result.image_url);
    }

    // 2. Switch from optimistic blob: URL to permanent static URL
    setCurrentImage(result.image_url);

    // 3. Update telemetry state
    setLocalOverride({
      water_level_cm: result.water_level_cm,
      status: result.status,
      last_updated: new Date().toISOString(),
    });

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

          <div className="flex items-center gap-1 text-xs text-dark/50 mb-4">
            <Clock className="w-3 h-3" />
            <span>Last checked {lastCheckedText || timeAgo(currentLastUpdated)}</span>
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
                    <span>{formattedCountdown}</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Capture Live Frame ({requestsLeft} left)</span>
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
                  ? formattedCountdown
                  : isCardLoading
                  ? 'Analyzing Water...'
                  : `Request Fresh Snapshot (${requestsLeft} left)`}
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
