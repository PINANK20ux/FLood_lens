import React, { useState } from "react";
import { AlertCircle, ShieldCheck, Video, MapPin, Camera } from "lucide-react";
import TopNav from "../components/TopNav";
import LeafletMap from "../components/LeafletMap";
import RoadDetailPanel from "../components/RoadDetailPanel";
import { useFloodLens } from "../context/FloodLensContext";

export default function LiveIntelligence() {
  const {
    roads,
    cameras,
    reports,
    error,
    riskFilter,
    setRiskFilter,
    activeLayers,
    toggleLayer,
    selectedRoad,
    setSelectedRoad,
  } = useFloodLens();

  const stats = roads?.stats || {
    total: roads?.geojson?.features?.length || 0,
    safe: roads?.geojson?.features?.filter((f) => (f.properties?.status || "").toUpperCase() === "SAFE").length || 0,
    caution: roads?.geojson?.features?.filter((f) => (f.properties?.status || "").toUpperCase() === "CAUTION").length || 0,
    blocked: roads?.geojson?.features?.filter((f) => (f.properties?.status || "").toUpperCase() === "BLOCKED").length || 0,
  };

  return (
    <div className="h-screen min-h-screen h-dvh w-full flex flex-col bg-paper-100 overflow-hidden relative select-none">
      <TopNav />

      {/* Top Pill Counters Strip */}
      <div className="bg-ink-950/95 border-b border-ink-800/60 px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink-900 border border-ink-800 text-xs font-mono text-paper-50 shrink-0">
            <span className="text-ink-400">Total:</span>
            <span className="font-bold">{stats.total}</span>
          </div>

          <button
            onClick={() => setRiskFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
              riskFilter === "all"
                ? "bg-channel-500 text-ink-950 font-semibold"
                : "bg-ink-900/60 text-ink-300 hover:text-paper-50 border border-ink-800"
            }`}
          >
            All Corridors
          </button>

          <button
            onClick={() => setRiskFilter("safe")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
              riskFilter === "safe"
                ? "bg-emerald-500 text-ink-950 font-semibold"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Accessible: {stats.safe}</span>
          </button>

          <button
            onClick={() => setRiskFilter("caution")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
              riskFilter === "caution"
                ? "bg-amber-500 text-ink-950 font-semibold"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Pooling Risk: {stats.caution}</span>
          </button>

          <button
            onClick={() => setRiskFilter("blocked")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
              riskFilter === "blocked"
                ? "bg-red-500 text-paper-50 font-semibold"
                : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>Impassable: {stats.blocked}</span>
          </button>
        </div>
      </div>

      {/* Main Map Canvas Viewport */}
      <div className="relative flex-1 min-h-0 w-full h-full">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-panel flex items-center gap-2 animate-fade-in">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Floating Layer Controls (Top-Left) */}
        <div className="pointer-events-none absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
            {/* Layer Toggles */}
            <div className="bg-white/95 backdrop-blur-md rounded-full shadow-panel border border-ink-800/10 p-1 flex items-center gap-1">
              <button
                onClick={() => toggleLayer("roads")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeLayers.has("roads")
                    ? "bg-ink-950 text-paper-50 font-semibold"
                    : "text-ink-500 hover:text-ink-950"
                }`}
              >
                <span>Roads</span>
              </button>
              <button
                onClick={() => toggleLayer("cameras")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeLayers.has("cameras")
                    ? "bg-channel-500 text-ink-950 font-semibold"
                    : "text-ink-500 hover:text-ink-950"
                }`}
              >
                <Camera size={13} />
                <span>CCTV ({cameras.length})</span>
              </button>
              <button
                onClick={() => toggleLayer("hazards")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeLayers.has("hazards")
                    ? "bg-amber-500 text-ink-950 font-semibold"
                    : "text-ink-500 hover:text-ink-950"
                }`}
              >
                <AlertCircle size={13} />
                <span>Hazards ({reports.length})</span>
              </button>
            </div>
          </div>

          {/* Quick Area Guide Tag */}
          <div className="hidden sm:flex pointer-events-auto items-center gap-2 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 border border-ink-800/10 shadow-panel text-xs text-ink-700">
            <MapPin size={14} className="text-channel-600 animate-pulse" />
            <span>Click any road segment or camera for telemetry</span>
          </div>
        </div>

        {/* Interactive Leaflet Map Instance */}
        <LeafletMap onSelectRoad={setSelectedRoad} />

        {/* Selected Road Detail Drawer */}
        <RoadDetailPanel road={selectedRoad} onClose={() => setSelectedRoad(null)} />
      </div>
    </div>
  );
}
