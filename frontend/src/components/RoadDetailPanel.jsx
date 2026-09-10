import React from "react";
import { X, Navigation, AlertTriangle, ShieldCheck, Ruler, Droplets } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFloodLens } from "../context/FloodLensContext";

export default function RoadDetailPanel({ road, onClose }) {
  const navigate = useNavigate();
  const { setRouteDestination, setRouteDestinationName, setProvisionalPin, setIsPlacingPin } = useFloodLens();

  if (!road) return null;

  const status = (road.status || "SAFE").toUpperCase();
  const isBlocked = status === "BLOCKED";
  const isCaution = status === "CAUTION";
  const depth = road.depth_cm || 0;
  const submersion = road.submersion_pct || 0;

  const statusColor = isBlocked ? "#b3402f" : isCaution ? "#c98a2c" : "#2f8f5b";
  const statusBg = isBlocked ? "#f6e2de" : isCaution ? "#f8ecd7" : "#e4f3ea";
  const statusLabel = isBlocked ? "Impassable / Blocked" : isCaution ? "Caution / Pooling" : "Accessible / Safe";

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-30 animate-slide-in">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-panel border border-ink-800/10 p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-ink-800/10 pb-3">
          <div>
            <span className="text-[10px] font-mono text-ink-400 uppercase tracking-wider">
              ROAD SEGMENT [{road.road_id || road.id}]
            </span>
            <h3 className="font-display text-base text-ink-950 mt-0.5 leading-snug">
              {road.name || "Urban Corridor"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full grid place-items-center text-ink-400 hover:text-ink-950 hover:bg-paper-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Status Pill Badge */}
        <div
          className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold"
          style={{ background: statusBg, color: statusColor }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
            <span>{statusLabel}</span>
          </div>
          <span className="font-mono text-[11px]">{depth} cm depth</span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-paper-50 rounded-xl p-2.5 border border-ink-800/10">
            <div className="text-[10px] text-ink-400 flex items-center gap-1">
              <Ruler size={11} /> Segment Length
            </div>
            <div className="text-sm font-semibold text-ink-900 mt-1">
              {Math.round(road.length_m || 120)} m
            </div>
          </div>
          <div className="bg-paper-50 rounded-xl p-2.5 border border-ink-800/10">
            <div className="text-[10px] text-ink-400 flex items-center gap-1">
              <Droplets size={11} /> Submersion Index
            </div>
            <div className="text-sm font-semibold text-ink-900 mt-1">
              {submersion}%
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => {
              if (road.coordinates && road.coordinates.length > 0) {
                setRouteDestination(road.coordinates[0]);
                setRouteDestinationName(road.name || "Corridor");
              }
              navigate("/routes");
            }}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-channel-500 hover:bg-channel-400 text-ink-950 text-xs font-semibold py-2.5 transition-colors shadow-sm"
          >
            <Navigation size={14} /> Calculate Safe Route Here
          </button>
          <button
            onClick={() => {
              if (road.coordinates && road.coordinates.length > 0) {
                setProvisionalPin({ lat: road.coordinates[0][0], lng: road.coordinates[0][1] });
              } else if (road.lat && road.lng) {
                setProvisionalPin({ lat: road.lat, lng: road.lng });
              }
              setIsPlacingPin(true);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 rounded-full border border-ink-800/15 hover:bg-paper-50 text-ink-700 text-xs font-medium py-2 transition-colors cursor-pointer"
          >
            <AlertTriangle size={13} /> Report Hazard on this Road
          </button>
        </div>
      </div>
    </div>
  );
}
