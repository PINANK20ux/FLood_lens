import React from "react";
import { useFloodLens } from "../context/FloodLensContext";
import { Loader2 } from "lucide-react";

export default function HazardConfirmationPill() {
  const {
    provisionalPin,
    setProvisionalPin,
    selectedSeverity,
    setSelectedSeverity,
    confirmProvisionalHazard,
    cancelPinPlacement,
    reportSubmitting,
  } = useFloodLens();

  if (!provisionalPin) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 border border-slate-700/80 rounded-2xl px-5 py-3 shadow-2xl flex flex-wrap items-center justify-center gap-4 text-white backdrop-blur-md animate-fade-in select-none">
      <div className="flex items-center gap-2">
        <span
          className={`w-3 h-3 rounded-full ${
            selectedSeverity === "CAUTION" ? "bg-amber-500" : "bg-red-500"
          } animate-pulse`}
        />
        <span className="text-xs font-mono text-slate-300">
          {provisionalPin.lat.toFixed(4)}, {provisionalPin.lng.toFixed(4)}
        </span>
      </div>

      {/* Quick Severity Selector */}
      <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setSelectedSeverity("CAUTION")}
          className={`text-xs px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
            selectedSeverity === "CAUTION"
              ? "bg-amber-500 text-black font-semibold shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Pooling (Yellow)
        </button>
        <button
          type="button"
          onClick={() => setSelectedSeverity("SEVERE")}
          className={`text-xs px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
            selectedSeverity === "SEVERE"
              ? "bg-red-500 text-white font-semibold shadow-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Submerged (Red)
        </button>
      </div>

      {/* Confirm Action */}
      <button
        type="button"
        onClick={confirmProvisionalHazard}
        disabled={reportSubmitting}
        className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-teal-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
      >
        {reportSubmitting ? (
          <>
            <Loader2 size={13} className="animate-spin" />
            <span>Submitting...</span>
          </>
        ) : (
          <span>Confirm Report</span>
        )}
      </button>

      {/* Cancel */}
      <button
        type="button"
        onClick={cancelPinPlacement}
        className="text-xs text-slate-400 hover:text-white px-2 py-1 transition cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}
