import React, { useState, useEffect } from "react";
import {
  Video,
  Radio,
  AlertTriangle,
  ShieldCheck,
  Activity,
  RefreshCw,
  Droplets,
  Ruler,
  Car,
} from "lucide-react";
import TopNav from "../components/TopNav";
import Footer from "../components/Footer";
import { useFloodLens, API, apiFetch } from "../context/FloodLensContext";

export default function RoadAccessibility() {
  const {
    cameras,
    selectedCamera,
    setSelectedCamera,
    streamError,
    setStreamError,
    userLocation,
    mapCenter,
  } = useFloodLens();

  const [telemetry, setTelemetry] = useState(null);
  const [videoSource, setVideoSource] = useState(0);
  const [availableDevices, setAvailableDevices] = useState([0, 1]);
  const [logs, setLogs] = useState([
    "[SYSTEM] Dual YOLOv8 Video Inference Engine connected",
    "[YOLO] Water boundary segmentation running at 25 FPS",
    "[STATUS] Dynamic OSM road graph weights synchronized",
  ]);

  const defaultCoords = userLocation || mapCenter || [28.6139, 77.2090];
  const activeCam = selectedCamera || cameras[0] || {
    id: "CAM01",
    name: "Minto Bridge Underpass",
    segment_name: "Minto Road Underpass Corridor",
    depth_cm: 62,
    status: "BLOCKED",
    submersion_pct: 85,
    lat: defaultCoords[0],
    lng: defaultCoords[1],
  };

  const isCam06 = activeCam.id === "CAM06" || activeCam.id === "WEBCAM";

  // Query active hardware camera devices on mount
  useEffect(() => {
    apiFetch("/api/cameras/hardware")
      .then((res) => {
        if (res && res.available_devices && res.available_devices.length > 0) {
          setAvailableDevices(res.available_devices);
        }
      })
      .catch((err) => console.warn("Hardware camera query notice:", err));
  }, []);

  const handleSourceChange = async (src) => {
    setVideoSource(src);
    try {
      await apiFetch(`/api/webcam/device?index=${src}`);
    } catch (e) {
      console.warn("Could not switch device index:", e);
    }
    const now = new Date().toLocaleTimeString();
    setLogs((prev) => [
      `[${now}] [HARDWARE] Switched optical source to Device ${src} (${src === 0 ? "External Laptop Cam" : "Integrated USB Cam"})`,
      ...prev,
    ]);
  };

  // Fetch telemetry whenever active camera changes or on interval for live webcam
  useEffect(() => {
    let isMounted = true;

    const fetchInference = async () => {
      try {
        const endpoint = isCam06
          ? `/api/cameras/CAM06/infer?device_index=${videoSource}`
          : `/api/cameras/${activeCam.id}/telemetry`;
        const data = await apiFetch(endpoint);
        if (isMounted && data) {
          setTelemetry(data);
          const now = new Date().toLocaleTimeString();
          const newEntries = [];

          if (data.inference_log) {
            newEntries.push(`[${now}] [${activeCam.id}] ${data.inference_log}`);
          }
          if (data.detections && data.detections.length > 0) {
            const detSummary = data.detections
              .filter((d) => d.class !== "water_hazard")
              .map((d) => `${d.class} (${(d.confidence * 100).toFixed(0)}%)`)
              .join(", ") || "No vehicles/pedestrians detected";
            newEntries.push(`[${now}] [${activeCam.id}] Objects: ${detSummary}`);
          }
          if (data.passability) {
            newEntries.push(
              `[${now}] [${activeCam.id}] Passability: Sedans=${data.passability.sedans || data.passability.sedan || "CLEAR"} | 2-Wheelers=${data.passability.two_wheelers || data.passability.twoWheeler || "CLEAR"} | SUVs=${data.passability.suvs || data.passability.suv || "CLEAR"} | Trucks=${data.passability.trucks || data.passability.heavyTruck || "CLEAR"}`
            );
          }

          if (newEntries.length > 0) {
            setLogs((prev) => {
              if (prev.length > 0 && data.inference_log && prev[0].includes(data.inference_log)) {
                return prev;
              }
              return [...newEntries, ...prev.slice(0, 18)];
            });
          }
        }
      } catch (err) {
        console.warn(`Could not fetch telemetry for ${activeCam.id}:`, err);
      }
    };

    fetchInference();
    const intervalTime = isCam06 ? 1000 : 5000;
    const timer = setInterval(fetchInference, intervalTime);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeCam.id, videoSource, isCam06]);

  const depth = telemetry ? (telemetry.water_depth_cm ?? telemetry.depth_cm ?? 0) : (activeCam.depth_cm || 0);
  const submersion = telemetry ? (telemetry.tire_submersion_pct ?? telemetry.submersion_pct ?? 0) : (activeCam.submersion_pct || 0);
  const status = (telemetry?.status || activeCam.status || "SAFE").toUpperCase();
  const isBlocked = status === "IMPASSABLE" || status === "BLOCKED";
  const isCaution = status === "CAUTION" || status === "POOLING RISK";

  const passability = telemetry?.passability || {
    sedans: depth < 20 ? "ACCESSIBLE" : "UNSAFE",
    two_wheelers: depth < 12 ? "ACCESSIBLE" : "UNSAFE",
    suvs: depth < 40 ? "ACCESSIBLE" : "CAUTION",
    trucks: depth < 60 ? "ACCESSIBLE" : "UNSAFE",
  };

  const getPillBadge = (val) => {
    const raw = typeof val === "string" ? val.toUpperCase() : val ? "CLEAR" : "UNSAFE";
    if (raw === "ACCESSIBLE" || raw === "PASSABLE" || raw === "CLEAR" || raw === "SAFE") {
      return {
        label: raw === "ACCESSIBLE" || raw === "PASSABLE" ? "CLEAR" : raw,
        badgeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
      };
    } else if (raw === "CAUTION" || raw === "CAUTION REQUIRED" || raw === "POOLING RISK") {
      return {
        label: "CAUTION",
        badgeClass: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
      };
    } else {
      return {
        label: "UNSAFE",
        badgeClass: "bg-red-500/20 text-red-400 border border-red-500/30",
      };
    }
  };

  const switchToPreset = (cam) => {
    setSelectedCamera(cam);
    setStreamError(false);
  };

  return (
    <div className="bg-paper-100 min-h-screen flex flex-col select-none">
      <div className="bg-ink-950">
        <TopNav />
      </div>

      {/* Header Banner */}
      <section className="bg-ink-950 text-paper-50 pb-12 pt-10 border-b border-ink-800/40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-center gap-2 mb-2">
          </div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">
            Live CCTV &amp; Waterlogging Status
          </h1>
          <p className="text-ink-300 max-w-2xl text-xs sm:text-sm mt-2 leading-relaxed">
            Real-time water depth alerts to help you avoid flooded roads and underpasses.
          </p>
        </div>
      </section>

      {/* Main Workspace */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 -mt-6 pb-20 flex-1 w-full">
        <div className="bg-ink-950 rounded-3xl p-6 sm:p-8 shadow-2xl border border-ink-800/80 space-y-6">
          {/* Stream Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-ink-900/80 rounded-2xl border border-ink-800/80 p-3.5 shadow-panel">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <div>
                <div className="text-xs font-semibold text-paper-50 flex items-center gap-2">
                  <span>{activeCam.name}</span>
                  <span className="font-mono text-[10px] text-channel-400">[{activeCam.id}]</span>
                </div>
                <div className="text-[11px] text-ink-400">{activeCam.segment_name}</div>
              </div>
            </div>

            {/* Camera Nodes Tabs: Uniform 6-pill selector */}
            <div className="flex flex-wrap items-center gap-1.5">
              {cameras.map((cam) => {
                const isSelected = activeCam.id === cam.id;
                const isLiveCam = cam.id === "CAM06" || cam.id === "WEBCAM";
                const displayName = isLiveCam ? "CAM06 (Live)" : cam.id;
                return (
                  <button
                    key={cam.id}
                    onClick={() => switchToPreset(cam)}
                    className={`text-xs px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${isSelected
                      ? "bg-channel-500 text-ink-950 font-semibold border-channel-400 shadow-sm"
                      : "bg-ink-950/70 border-ink-800 text-ink-300 hover:text-paper-50 hover:border-ink-700"
                      }`}
                  >
                    <Video size={13} />
                    <span>{displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid lg:grid-cols-[1.45fr_1fr] gap-6">
            {/* Left Column: Live Feed Stream & Controls */}
            <div className="flex flex-col gap-3">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-ink-800/80 shadow-2xl aspect-video group flex items-center justify-center">
                {/* ── Strict Decoupling: Static Media vs Live Hardware Webcam ── */}
                {!isCam06 ? (
                  /* Render YOLOv8 annotated test media for CAM01 through CAM05 */
                  <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    <img
                      key={`annotated-${activeCam.id}`}
                      src={`${API}/api/cameras/${activeCam.id}/annotated`}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `/test_media/${activeCam.id}.png`;
                      }}
                      alt={`${activeCam.id} YOLO Annotated CCTV Asset`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  /* Render live stream ONLY when CAM06 is active */
                  <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    <img
                      key={`live-stream-${videoSource}`}
                      src={`${API}/api/cameras/CAM06/stream?device_index=${videoSource}`}
                      alt="CAM06 Live Stream"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("Live stream error on CAM06, retrying...");
                        setStreamError(true);
                      }}
                    />
                  </div>
                )}

                {/* Top Video HUD Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                  <div className="flex items-center gap-2 bg-ink-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-ink-700/60 text-xs font-mono text-paper-50 shadow-sm">
                    <Radio size={13} className="text-red-400 animate-pulse" />
                    <span>
                      {isCam06 ? "Live Hardware Node • 60 FPS • Edge AI" : "Fixed CCTV Node • 60 FPS • 720p Edge AI"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Clean device source toggle ONLY when CAM06 is active */}
                    {isCam06 && (
                      <div className="pointer-events-auto flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg p-1 text-[11px] text-slate-300 shadow-sm">
                        <span className="px-1 text-slate-400 font-mono">Source:</span>
                        <button
                          onClick={() => handleSourceChange(0)}
                          className={`px-2 py-0.5 rounded transition ${videoSource === 0 ? "bg-teal-500 text-black font-semibold shadow-sm" : "hover:text-white text-slate-300"
                            }`}
                        >
                          External
                        </button>
                        <button
                          onClick={() => handleSourceChange(1)}
                          className={`px-2 py-0.5 rounded transition ${videoSource === 1 ? "bg-teal-500 text-black font-semibold shadow-sm" : "hover:text-white text-slate-300"
                            }`}
                        >
                          Integrated
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 bg-ink-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-ink-700/60 text-xs font-medium shadow-sm">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: isBlocked ? "#ef4444" : isCaution ? "#f59e0b" : "#10b981" }}
                      />
                      <span className="text-paper-50 font-mono">
                        {status} ({depth} cm)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Video HUD Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                  <div className="bg-ink-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-ink-700/60 text-xs font-mono text-ink-300 flex items-center gap-2 shadow-sm">
                    <Activity size={13} className="text-channel-400" />
                    <span>
                      YOLOv8 SEGMENTATION: <strong className="text-paper-50">{submersion}% SUBMERGED</strong>
                    </span>
                  </div>
                  <span className="bg-black/75 px-2 py-1 rounded text-[10px] font-mono text-emerald-400 border border-slate-700">
                    {isCam06 ? "Live Optical Stream" : "Static CCTV Asset"}
                  </span>
                </div>
              </div>

              {/* Camera Geo-tag Location Bar */}
              <div className="flex items-center justify-between gap-3 bg-ink-900/60 rounded-2xl border border-ink-800 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-ink-300">
                  <ShieldCheck size={15} className="text-channel-400 shrink-0" />
                  <span>
                    Camera geo-tagged to: <strong className="text-paper-50">{activeCam.segment_name}</strong>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink-400">
                  {activeCam.lat?.toFixed ? activeCam.lat.toFixed(4) : "28.6250"}° N, {activeCam.lng?.toFixed ? activeCam.lng.toFixed(4) : "77.2280"}° E
                </span>
              </div>
            </div>

            {/* Right Column: Passability Assessment & Telemetry Stream */}
            <div className="flex flex-col gap-4">
              {/* Road Passability Assessment Card */}
              <div className="bg-ink-900/80 backdrop-blur-md rounded-2xl border border-ink-800 p-5 shadow-panel flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base text-paper-50 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" />
                    Road Passability Assessment
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    UPDATED LIVE
                  </span>
                </div>

                {/* Depth Gauge Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-ink-400">Calculated Water Depth:</span>
                    <span className="font-mono font-bold text-channel-400">{depth} cm ({status})</span>
                  </div>
                  <div className="w-full h-2.5 bg-ink-950 rounded-full overflow-hidden border border-ink-800">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (depth / 65) * 100)}%`,
                        background:
                          isBlocked
                            ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                            : isCaution
                              ? "linear-gradient(90deg, #10b981, #f59e0b)"
                              : "#10b981",
                      }}
                    />
                  </div>
                </div>

                {/* Tire Submersion Gauge */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-ink-400">Tire Submersion Ratio:</span>
                    <span className="font-mono font-bold text-amber-400">{submersion}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-ink-950 rounded-full overflow-hidden border border-ink-800">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(100, submersion)}%`,
                        background:
                          submersion >= 60
                            ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                            : submersion >= 30
                              ? "linear-gradient(90deg, #10b981, #f59e0b)"
                              : "#10b981",
                      }}
                    />
                  </div>
                </div>

                {/* Advisory Notice */}
                {activeCam.recommendation && (
                  <div className="text-[11px] p-2.5 rounded-xl bg-ink-950/70 border border-ink-800/80 text-ink-300 leading-relaxed">
                    <strong className="text-paper-50 font-semibold block mb-0.5">Route Recommendation:</strong>
                    {activeCam.recommendation}
                  </div>
                )}

                {/* Passability Vehicle Matrix */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Sedans */}
                  {(() => {
                    const pill = getPillBadge(passability.sedans || passability.sedan);
                    return (
                      <div className="bg-ink-950/60 rounded-xl p-2.5 border border-ink-800/80 flex items-center justify-between">
                        <span className="text-ink-300">Sedans / Small Cars</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${pill.badgeClass}`}>
                          {pill.label}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Two Wheelers */}
                  {(() => {
                    const pill = getPillBadge(passability.two_wheelers || passability.twoWheeler);
                    return (
                      <div className="bg-ink-950/60 rounded-xl p-2.5 border border-ink-800/80 flex items-center justify-between">
                        <span className="text-ink-300">Two-Wheelers</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${pill.badgeClass}`}>
                          {pill.label}
                        </span>
                      </div>
                    );
                  })()}

                  {/* SUVs */}
                  {(() => {
                    const pill = getPillBadge(passability.suvs || passability.suv);
                    return (
                      <div className="bg-ink-950/60 rounded-xl p-2.5 border border-ink-800/80 flex items-center justify-between">
                        <span className="text-ink-300">SUVs / 4x4s</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${pill.badgeClass}`}>
                          {pill.label}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Trucks */}
                  {(() => {
                    const pill = getPillBadge(passability.trucks || passability.heavyTruck);
                    return (
                      <div className="bg-ink-950/60 rounded-xl p-2.5 border border-ink-800/80 flex items-center justify-between">
                        <span className="text-ink-300">Buses &amp; Heavy Trucks</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-md text-[10px] ${pill.badgeClass}`}>
                          {pill.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Real-time Telemetry Stream Log Terminal */}
              <div className="bg-ink-900/80 backdrop-blur-md rounded-2xl border border-ink-800 p-4 shadow-panel flex flex-col gap-2 flex-1 min-h-[190px]">
                <div className="flex items-center justify-between text-xs text-ink-400 pb-2 border-b border-ink-800">
                  <span className="font-mono text-paper-50 font-semibold flex items-center gap-1.5">
                    <RefreshCw size={12} className="animate-spin text-channel-400" />
                    Real-Time Inference Stream
                  </span>
                  <span className="text-[10px] font-mono text-ink-400">
                    Live Model Stream
                  </span>
                </div>

                <div className="font-mono text-[11px] text-ink-300 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {logs.map((line, idx) => (
                    <div key={idx} className="leading-snug hover:text-paper-50 transition-colors">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

