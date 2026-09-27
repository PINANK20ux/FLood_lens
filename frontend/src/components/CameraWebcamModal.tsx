import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, AlertCircle, RefreshCw, Video, ShieldCheck, Zap } from 'lucide-react';
import { uploadWebcamFrame } from '../lib/api';
import type { CameraStation, StationStatus } from '../types';

interface CameraWebcamModalProps {
  isOpen: boolean;
  station: CameraStation;
  onClose: () => void;
  onImmediatePreview?: (previewUrl: string) => void;
  onCaptureSuccess: (result: {
    image_url: string;
    water_level_cm: number;
    status: StationStatus;
    hazard: string;
  }) => void;
}

export default function CameraWebcamModal({
  isOpen,
  station,
  onClose,
  onImmediatePreview,
  onCaptureSuccess,
}: CameraWebcamModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stop video stream tracks and turn off webcam LED immediately
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignore
      }
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Request browser camera stream (optimized standard resolution with timeout guard)
  const startCamera = useCallback(async () => {
    setError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Webcam hardware initialization timed out.'));
          }, 4000);

          const onReady = () => {
            video
              .play()
              .then(() => {
                clearTimeout(timeout);
                setIsStreaming(true);
                resolve();
              })
              .catch((err) => {
                clearTimeout(timeout);
                reject(err);
              });
          };

          if (video.readyState >= 2) {
            onReady();
          } else {
            video.onloadeddata = onReady;
            video.onloadedmetadata = onReady;
          }
        });
      }
    } catch (err: any) {
      console.warn('Webcam initialization error:', err);
      stopStream();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Please allow camera access in browser settings to test live edge capture.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No physical camera device detected on this system.');
      } else {
        setError(err.message || 'Failed to initialize camera.');
      }
      setIsStreaming(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  // Instant Canvas Grab (<200ms zero-latency capture + Optimistic Preview)
  const handleCapture = async () => {
    if (!videoRef.current || isUploading) return;

    setError(null);
    const video = videoRef.current;

    // Standard CCTV resolution (640x360) for near-instant upload
    const targetWidth = video.videoWidth || 640;
    const targetHeight = video.videoHeight || 360;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not initialize canvas rendering context.');
      return;
    }

    // 1. Instant frame grab to canvas
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // 2. Shut down hardware camera tracks immediately so webcam LED turns off instantly
    stopStream();

    // 3. Compress to lightweight JPEG (<40 KB)
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError('Failed to encode frame blob.');
          return;
        }

        // 4. Optimistic UI: Generate instant local object URL for zero-latency card display
        const localPreviewUrl = URL.createObjectURL(blob);
        if (onImmediatePreview) {
          onImmediatePreview(localPreviewUrl);
        }

        setIsUploading(true);

        // 5. Fast background upload to FastAPI edge telemetry backend
        try {
          const response = await uploadWebcamFrame(blob, station.id);

          onCaptureSuccess({
            image_url: response.image_url,
            water_level_cm: response.water_level_cm,
            status: response.mapped_status as StationStatus,
            hazard: response.hazard,
          });

          onClose();
        } catch (err: any) {
          setError(err.message || 'Background frame upload failed.');
          setIsUploading(false);
        }
      },
      'image/jpeg',
      0.75
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                Live Laptop Edge Camera
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  INSTANT CAPTURE
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {station.name} • 640x360 CCTV Stream
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {/* Live Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
          />

          {/* Loading Overlay */}
          {!isStreaming && !error && !isUploading && (
            <div className="flex flex-col items-center gap-2 text-slate-400 font-mono text-xs">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
              <span>INITIALIZING HARDWARE SENSOR...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6 text-center max-w-md">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-rose-200">Capture Issue</h4>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">{error}</p>
              <button
                onClick={startCamera}
                className="mt-3 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* HUD Viewfinder Reticle */}
          {isStreaming && (
            <div className="absolute inset-0 pointer-events-none p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 border border-white/10 text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  STREAM: ACTIVE
                </span>
                <span className="text-[10px] font-mono text-white/70 bg-black/70 px-2 py-0.5 rounded">
                  640x360 CCTV
                </span>
              </div>

              {/* Viewfinder Target */}
              <div className="w-28 h-28 border border-emerald-500/40 rounded-xl mx-auto flex items-center justify-center relative">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              </div>

              <div className="text-[10px] font-mono text-cream/70 bg-black/70 px-2.5 py-1 rounded-lg self-start backdrop-blur-sm">
                Single frame will capture in &lt;200ms &amp; turn off camera LED instantly.
              </div>
            </div>
          )}

          {/* Fast Uploading Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 z-30 animate-in fade-in">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
              <div className="text-center font-mono">
                <p className="text-sm font-bold text-white">EDGE INGESTION IN PROGRESS...</p>
                <p className="text-xs text-slate-400 mt-0.5">Streaming 640x360 payload to FastAPI</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted local capture</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleCapture}
              disabled={!isStreaming || isUploading}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-40"
            >
              <Video className="w-4 h-4" />
              <span>Capture Live Frame</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
