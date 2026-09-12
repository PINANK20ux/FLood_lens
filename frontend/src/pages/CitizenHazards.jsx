import React, { useState } from "react";
import { Plus, X, Users, ShieldCheck, AlertTriangle, CheckCircle2, Clock, MapPin, RefreshCw, Crosshair } from "lucide-react";
import TopNav from "../components/TopNav";
import Footer from "../components/Footer";
import LeafletMap from "../components/LeafletMap";
import { useFloodLens } from "../context/FloodLensContext";

export default function CitizenHazards() {
  const {
    reports,
    isPlacingPin,
    setIsPlacingPin,
    cancelPinPlacement,
    provisionalPin,
  } = useFloodLens();
  const [filter, setFilter] = useState("all"); // 'all' | 'verified' | 'high'

  const filteredReports = reports.filter((rpt) => {
    if (filter === "verified") return rpt.status === "verified";
    if (filter === "high") return (rpt.severity || rpt.water_level || "").toLowerCase() === "high";
    return true;
  });

  return (
    <div className="bg-paper-100 min-h-screen flex flex-col select-none">
      <div className="bg-ink-950">
        <TopNav />
      </div>

      {/* Hero Header */}
      <section className="bg-ink-950 text-paper-50 pb-12 pt-10 border-b border-ink-800/40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
              </div>
              <h1 className="font-display text-3xl sm:text-4xl tracking-tight">
                Citizen Reports
              </h1>
              <p className="text-ink-300 max-w-2xl text-xs sm:text-sm mt-2 leading-relaxed">
                Ground reports fill the gaps between static municipal sensors. Citizen uploads undergo
                neural segmentation to confirm standing floodwater before dynamically flagging road corridors.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isPlacingPin) {
                    cancelPinPlacement();
                  } else {
                    setIsPlacingPin(true);
                  }
                }}
                className={`flex items-center gap-2 rounded-full text-xs font-semibold px-5 py-3 transition-all shadow-sm active:scale-95 cursor-pointer ${isPlacingPin
                  ? "bg-red-500 hover:bg-red-400 text-white ring-2 ring-red-300 ring-offset-2 ring-offset-ink-950"
                  : "bg-channel-500 hover:bg-channel-400 text-ink-950"
                  }`}
              >
                {isPlacingPin ? (
                  <>
                    <X size={16} />
                    <span>✕ Cancel Pinning</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>+ Drop Hazard Pin</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              { id: "all", label: `All Reports (${reports.length})` },
              {
                id: "verified",
                label: `AI Verified (${reports.filter((r) => r.status === "verified").length})`,
              },
              {
                id: "high",
                label: `High Severity (${reports.filter((r) => (r.severity || r.water_level || "").toLowerCase() === "high").length
                  })`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`text-xs font-medium px-4 py-1.5 rounded-full transition-colors ${filter === tab.id
                  ? "bg-paper-50 text-ink-950 font-semibold shadow-sm"
                  : "bg-ink-900 border border-ink-800 text-ink-400 hover:text-paper-50"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 -mt-6 pb-20 flex-1 w-full">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-6 items-start">
          {/* Left Column: Community Reports Feed */}
          <div className="bg-white rounded-3xl p-6 shadow-panel border border-ink-800/10 flex flex-col gap-4 max-h-[640px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-ink-800/10 pb-3">
              <h2 className="font-display text-base text-ink-950 flex items-center gap-2">
                <Users size={16} className="text-channel-600" />
                <span>Verified Reports Feed</span>
              </h2>
              <span className="text-[11px] font-mono text-ink-400">
                {filteredReports.length} incidents logged
              </span>
            </div>

            {filteredReports.length === 0 ? (
              <div className="text-center py-12 text-ink-400 space-y-2">
                <ShieldCheck size={32} className="mx-auto text-ink-300" />
                <p className="text-xs">No reports found matching this filter.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredReports.map((rpt) => {
                  const isVerified = rpt.status === "verified";
                  const sev = (rpt.severity || rpt.water_level || "moderate").toLowerCase();
                  const sevBadge =
                    sev === "high"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : sev === "moderate"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200";

                  return (
                    <div
                      key={rpt.id}
                      className="p-4 rounded-2xl border border-ink-800/10 bg-paper-50/50 hover:bg-paper-50 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${sevBadge}`}
                        >
                          {rpt.severity || rpt.water_level} Severity
                        </span>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${isVerified
                            ? "bg-emerald-100 text-emerald-800 font-semibold"
                            : "bg-ink-100 text-ink-600"
                            }`}
                        >
                          {isVerified ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          <span>{isVerified ? "AI Confirmed" : "Under Review"}</span>
                        </span>
                      </div>

                      {/* Privacy-Blurred Media Preview if present */}
                      {(rpt.blurred_image || rpt.image) && (
                        <div className="relative rounded-xl overflow-hidden border border-ink-800/10 h-36 bg-ink-950">
                          <img
                            src={rpt.blurred_image || rpt.image}
                            alt="Privacy Protected Flood Observation"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1.5 left-1.5 bg-ink-950/85 backdrop-blur-sm text-channel-300 px-2 py-0.5 rounded text-[9px] font-mono border border-channel-500/30 flex items-center gap-1">
                            <ShieldCheck size={11} />
                            <span>Privacy Protected • Faces/Plates Blurred</span>
                          </div>
                        </div>
                      )}

                      {rpt.flagged_road_name && (
                        <div className="text-xs font-semibold text-ink-900 flex items-center gap-1.5">
                          <MapPin size={13} className="text-channel-600 shrink-0" />
                          <span>Road Flagged: {rpt.flagged_road_name}</span>
                        </div>
                      )}

                      {rpt.assigned_unit && (
                        <div className="text-[11px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                          🚨 Municipal Action: <strong>{rpt.assigned_unit}</strong>
                        </div>
                      )}

                      {rpt.reason && (
                        <p className="text-xs text-ink-600 leading-relaxed bg-white p-2.5 rounded-xl border border-ink-800/5">
                          {rpt.reason}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] font-mono text-ink-400 pt-1 border-t border-ink-800/5">
                        <span>
                          [{rpt.lat?.toFixed(4)}, {rpt.lng?.toFixed(4)}]
                        </span>
                        <span>{rpt.timestamp?.split("T")[0] || "Live"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Leaflet Map Container */}
          <div className="rounded-3xl overflow-hidden shadow-panel border border-ink-800/10 h-[640px] bg-white relative">
            <LeafletMap />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
