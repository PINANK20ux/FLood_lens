import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Truck,
  Activity,
  Megaphone,
  Sliders,
  RotateCcw,
  Plus,
  Trash2,
  Send,
  Lock,
  Layers,
  Camera,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  X,
  Droplets,
  RefreshCw,
  Search,
  Navigation
} from "lucide-react";
import TopNav from "../components/TopNav";
import Footer from "../components/Footer";
import LeafletMap from "../components/LeafletMap";
import { useFloodLens } from "../context/FloodLensContext";

export default function AuthorityDashboard() {
  const {
    adminReports,
    emergencyAlerts,
    responseUnits,
    adminLogs,
    roadOverrides,
    updateReportStatus,
    reblurReport,
    broadcastEmergencyAlert,
    deleteEmergencyAlert,
    dispatchResponseUnit,
    overrideRoadSegment,
    fetchAdminData,
    cameras,
    roads,
    flyTo,
  } = useFloodLens();

  const navigate = useNavigate();

  // Active Tab: 'triage' | 'map' | 'dispatch' | 'broadcast' | 'roads' | 'audit'
  const [activeTab, setActiveTab] = useState("triage");
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportFilter, setReportFilter] = useState("all"); // 'all' | 'pending' | 'dispatched' | 'verified' | 'resolved'
  const [imagePrivacyMode, setImagePrivacyMode] = useState("comparison"); // 'comparison' | 'raw' | 'blurred'

  // Broadcast Alert Form State
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("CRITICAL");
  const [alertAreas, setAlertAreas] = useState("Minto Bridge Underpass, CP Outer Circle, Tilak Bridge");
  const [broadcasting, setBroadcasting] = useState(false);

  // Unit Dispatch Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [targetIncident, setTargetIncident] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [customSector, setCustomSector] = useState("");

  // Road Override Modal State
  const [selectedRoadToOverride, setSelectedRoadToOverride] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("BLOCKED");
  const [overrideDepth, setOverrideDepth] = useState(45);
  const [overrideReason, setOverrideReason] = useState("Precautionary authority barricade due to Yamuna surge.");

  // Action status toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Default select first report if none selected
  useEffect(() => {
    if (!selectedReportId && adminReports.length > 0) {
      setSelectedReportId(adminReports[0].id);
    }
  }, [adminReports, selectedReportId]);

  const selectedReport = adminReports.find((r) => r.id === selectedReportId) || adminReports[0];

  const filteredReports = adminReports.filter((rpt) => {
    if (reportFilter === "pending") return rpt.status === "pending_review";
    if (reportFilter === "dispatched") return rpt.status === "dispatched";
    if (reportFilter === "verified") return rpt.status === "verified";
    if (reportFilter === "resolved") return rpt.status === "resolved";
    return true;
  });

  // KPI Calculations
  const pendingCount = adminReports.filter((r) => r.status === "pending_review").length;
  const dispatchedUnitsCount = responseUnits.filter((u) => u.status === "DISPATCHED" || u.status === "ON_SCENE").length;
  const criticalRoadsCount = roads?.geojson?.features?.filter((f) => f.properties.status === "BLOCKED").length || 2;
  const activeAlertsCount = emergencyAlerts.filter((a) => a.active).length;

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) return;
    setBroadcasting(true);
    try {
      const areasList = alertAreas.split(",").map((a) => a.trim()).filter(Boolean);
      await broadcastEmergencyAlert({
        title: alertTitle,
        message: alertMessage,
        severity: alertSeverity,
        affected_areas: areasList,
      });
      setAlertTitle("");
      setAlertMessage("");
      showToast("Emergency alert successfully broadcasted to all citizens!");
    } catch (err) {
      console.error(err);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDispatchConfirm = async () => {
    if (!selectedUnitId) return;
    try {
      await dispatchResponseUnit({
        unit_id: selectedUnitId,
        incident_id: targetIncident?.id,
        sector: customSector || targetIncident?.flagged_road_name || targetIncident?.title,
        status: "DISPATCHED",
      });
      setDispatchModalOpen(false);
      setTargetIncident(null);
      showToast("Response Unit dispatched to incident sector!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoadOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoadToOverride) return;
    try {
      await overrideRoadSegment({
        road_id: selectedRoadToOverride,
        status: overrideStatus,
        depth_cm: Number(overrideDepth),
        reason: overrideReason,
      });
      showToast(`Corridor ${selectedRoadToOverride} override applied!`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-ink-950 text-paper-50 min-h-screen flex flex-col font-sans select-none">
      {/* Top Navbar */}
      <TopNav />

      {/* Authority Command HUD Top Bar */}
      <div className="bg-ink-900 border-b border-ink-800/80 px-4 sm:px-8 py-3">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
            </span>
            <div className="flex items-center gap-2">
              <Shield className="text-channel-400" size={18} />
              <span className="font-display text-base tracking-tight font-bold text-paper-50">
                MUNICIPAL FLOOD COMMAND &amp; CONTROL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-ink-300">
            <div className="hidden md:flex items-center gap-1.5 bg-ink-950 px-3 py-1.5 rounded-lg border border-ink-800">
              <Radio size={13} className="text-emerald-400 animate-pulse" />
              <span>OPTICAL SENSORS: 6/6 ONLINE (30 FPS)</span>
            </div>
            <button
              onClick={() => {
                fetchAdminData();
                showToast("Telemetry & Incident Queue refreshed.");
              }}
              className="flex items-center gap-1.5 bg-ink-800 hover:bg-ink-700 text-paper-50 px-3 py-1.5 rounded-lg border border-ink-700 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>SYNC DATA</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <section className="bg-ink-950 border-b border-ink-800/60 py-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* KPI 1 */}
            <div className="bg-ink-900/90 border border-red-500/30 p-3.5 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-red-300">Submerged Corridors</span>
                <AlertTriangle size={15} className="text-red-400" />
              </div>
              <div className="text-2xl font-bold font-display text-paper-50 mt-1">{criticalRoadsCount}</div>
              <div className="text-[10px] text-ink-400 mt-0.5 font-mono">Minto &amp; Tilak Bridge Blocked</div>
            </div>

            {/* KPI 2 */}
            <div className="bg-ink-900/90 border border-amber-500/30 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-amber-300">Pending Review</span>
                <Clock size={15} className="text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-display text-paper-50 mt-1">{pendingCount}</div>
              <div className="text-[10px] text-ink-400 mt-0.5 font-mono">Citizen ground reports</div>
            </div>

            {/* KPI 3 */}
            <div className="bg-ink-900/90 border border-channel-500/30 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-channel-300">Deployed Pumps</span>
                <Truck size={15} className="text-channel-400" />
              </div>
              <div className="text-2xl font-bold font-display text-paper-50 mt-1">
                {dispatchedUnitsCount} / {responseUnits.length}
              </div>
              <div className="text-[10px] text-ink-400 mt-0.5 font-mono">8,500 LPM high discharge</div>
            </div>

            {/* KPI 4 */}
            <div className="bg-ink-900/90 border border-emerald-500/30 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-emerald-300">CCTV Telemetry</span>
                <Camera size={15} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-display text-paper-50 mt-1">100%</div>
              <div className="text-[10px] text-ink-400 mt-0.5 font-mono">Neural Water AI Active</div>
            </div>

            {/* KPI 5 */}
            <div className="bg-ink-900/90 border border-purple-500/30 p-3.5 rounded-2xl col-span-2 md:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-purple-300">Public Alerts</span>
                <Megaphone size={15} className="text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-display text-paper-50 mt-1">{activeAlertsCount}</div>
              <div className="text-[10px] text-ink-400 mt-0.5 font-mono">Live ticker broadcasts</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mt-5 border-t border-ink-800/60 pt-4">
            {[
              { id: "triage", label: "Incident Triage & Privacy Blur", icon: ShieldCheck, badge: pendingCount },
              { id: "map", label: "Tactical GIS Map", icon: Navigation },
              { id: "dispatch", label: "Dewatering Pumps & Units", icon: Truck, badge: dispatchedUnitsCount },
              { id: "broadcast", label: "Emergency Broadcasts", icon: Megaphone, badge: activeAlertsCount },
              { id: "roads", label: "Road Overrides & Barricades", icon: Sliders },
              { id: "audit", label: "Activity Logs", icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                    ? "bg-channel-500 text-ink-950 shadow-md shadow-channel-500/20"
                    : "bg-ink-900/80 text-ink-300 hover:text-paper-50 hover:bg-ink-800 border border-ink-800"
                    }`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full font-bold ${isActive ? "bg-ink-950 text-channel-300" : "bg-red-500 text-white"
                        }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workspace Body */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-6 flex-1 w-full">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-channel-600 text-paper-50 px-5 py-3 rounded-2xl shadow-float flex items-center gap-2.5 font-medium text-xs animate-fade-in border border-channel-400">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 1: INCIDENT TRIAGE & PRIVACY BLURRING REVIEW     */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "triage" && (
          <div className="grid lg:grid-cols-[1.1fr_1.9fr] gap-6 items-start">
            {/* Left: Incident Queue */}
            <div className="bg-ink-900 border border-ink-800 rounded-3xl p-5 flex flex-col gap-4 max-h-[720px]">
              <div className="flex items-center justify-between border-b border-ink-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-channel-400" size={17} />
                  <h2 className="font-display text-sm font-bold text-paper-50 uppercase tracking-wider">
                    Incoming Reports Queue
                  </h2>
                </div>
                <span className="text-xs font-mono text-ink-400">{filteredReports.length} incidents</span>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: `All (${adminReports.length})` },
                  { id: "pending", label: `Pending (${adminReports.filter((r) => r.status === "pending_review").length})` },
                  { id: "dispatched", label: `Dispatched (${adminReports.filter((r) => r.status === "dispatched").length})` },
                  { id: "verified", label: `Verified (${adminReports.filter((r) => r.status === "verified").length})` },
                  { id: "resolved", label: `Resolved (${adminReports.filter((r) => r.status === "resolved").length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setReportFilter(f.id)}
                    className={`text-[11px] px-3 py-1 rounded-full transition-colors font-medium ${reportFilter === f.id
                      ? "bg-paper-50 text-ink-950 font-bold"
                      : "bg-ink-950 border border-ink-800 text-ink-400 hover:text-paper-50"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Queue List */}
              <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
                {filteredReports.length === 0 ? (
                  <div className="text-center py-12 text-ink-500 space-y-2 font-mono text-xs">
                    <ShieldCheck size={28} className="mx-auto text-ink-600" />
                    <p>No incidents in this queue state.</p>
                  </div>
                ) : (
                  filteredReports.map((rpt) => {
                    const isSelected = selectedReport?.id === rpt.id;
                    const isPending = rpt.status === "pending_review";
                    const isDispatched = rpt.status === "dispatched";
                    const isVerified = rpt.status === "verified";
                    const isResolved = rpt.status === "resolved";

                    const statusBadge = isPending
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : isDispatched
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        : isVerified
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : isResolved
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            : "bg-ink-800 text-ink-400 border-ink-700";

                    return (
                      <div
                        key={rpt.id}
                        onClick={() => setSelectedReportId(rpt.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected
                          ? "bg-ink-800/90 border-channel-500 shadow-sm"
                          : "bg-ink-950/70 border-ink-800 hover:bg-ink-800/50"
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${statusBadge}`}>
                            {rpt.status.replace("_", " ")}
                          </span>
                          <span className="text-[10px] font-mono text-ink-400">
                            {rpt.priority || (rpt.depth_cm > 40 ? "P1 CRITICAL" : "P2 ELEVATED")}
                          </span>
                        </div>

                        <div className="font-semibold text-xs text-paper-50 mt-2 line-clamp-1">
                          {rpt.title || rpt.flagged_road_name || "Citizen Flood Hazard"}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-ink-400 mt-2">
                          <span className="text-channel-400 font-bold">{rpt.depth_cm || 25} cm Depth</span>
                          <span>{rpt.timestamp ? rpt.timestamp.split("T")[0] : "Today"}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Selected Incident Detail & Privacy Protection Workbench */}
            {selectedReport ? (
              <div className="bg-ink-900 border border-ink-800 rounded-3xl p-6 flex flex-col gap-6">
                {/* Header & Meta */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono bg-channel-500/20 text-channel-300 border border-channel-500/30 px-2 py-0.5 rounded-full">
                        INCIDENT ID: {selectedReport.id}
                      </span>
                      <span className="text-[10px] font-mono bg-ink-800 text-ink-300 px-2 py-0.5 rounded-full">
                        PRIORITY: {selectedReport.priority || "P1_CRITICAL"}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-paper-50">
                      {selectedReport.title || selectedReport.flagged_road_name}
                    </h3>
                    <p className="text-xs text-ink-300 mt-1 font-mono flex items-center gap-1.5">
                      <MapPin size={13} className="text-channel-400" />
                      <span>GPS: [{selectedReport.lat?.toFixed(4)}, {selectedReport.lng?.toFixed(4)}]</span>
                      <span>•</span>
                      <span>Assigned Road: {selectedReport.flagged_road_name || "Central Corridor"}</span>
                    </p>
                  </div>

                  {/* Quick Status Tag */}
                  <div className="text-right">
                    <div className="text-[11px] font-mono uppercase text-ink-400">Current Status</div>
                    <div className="text-sm font-bold text-channel-300 uppercase font-mono mt-0.5">
                      {selectedReport.status?.replace("_", " ")}
                    </div>
                  </div>
                </div>

                {/* ━━━━ PRIVACY BLURRING WORKBENCH (DUAL-VIEW) ━━━━ */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock size={15} className="text-channel-400" />
                      <span className="font-display text-sm font-bold text-paper-50">
                        Citizen Privacy &amp; Public Release Inspection
                      </span>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-ink-950 p-1 rounded-xl border border-ink-800 text-xs">
                      <button
                        onClick={() => setImagePrivacyMode("comparison")}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${imagePrivacyMode === "comparison" ? "bg-channel-500 text-ink-950 font-bold" : "text-ink-400"
                          }`}
                      >
                        Side-by-Side Dual View
                      </button>
                      <button
                        onClick={() => setImagePrivacyMode("raw")}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${imagePrivacyMode === "raw" ? "bg-channel-500 text-ink-950 font-bold" : "text-ink-400"
                          }`}
                      >
                        Raw (Authority Only)
                      </button>
                      <button
                        onClick={() => setImagePrivacyMode("blurred")}
                        className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${imagePrivacyMode === "blurred" ? "bg-channel-500 text-ink-950 font-bold" : "text-ink-400"
                          }`}
                      >
                        Privacy Blurred (Public Safe)
                      </button>
                    </div>
                  </div>

                  {/* Dual View Media Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Raw Evidence (Authority Eyes Only) */}
                    {(imagePrivacyMode === "comparison" || imagePrivacyMode === "raw") && (
                      <div className="bg-ink-950 rounded-2xl border border-red-500/30 overflow-hidden flex flex-col">
                        <div className="bg-red-950/50 border-b border-red-500/30 px-3 py-2 flex items-center justify-between text-xs">
                          <span className="font-mono text-[11px] text-red-300 font-bold flex items-center gap-1.5">
                            <EyeOff size={13} />
                            <span>RAW CITIZEN EVIDENCE (AUTHORITY ONLY)</span>
                          </span>
                          <span className="text-[10px] font-mono text-red-400">UNREDACTED</span>
                        </div>
                        <div className="h-56 bg-ink-950 relative flex items-center justify-center overflow-hidden">
                          {selectedReport.raw_image ? (
                            <img
                              src={selectedReport.raw_image}
                              alt="Raw Evidence"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-ink-500 font-mono text-xs text-center p-4">
                              <Camera size={24} className="mx-auto mb-1 text-ink-600" />
                              <span>No raw media attached</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Right: Privacy-Blurred Public Release Safe Version */}
                    {(imagePrivacyMode === "comparison" || imagePrivacyMode === "blurred") && (
                      <div className="bg-ink-950 rounded-2xl border border-channel-500/40 overflow-hidden flex flex-col">
                        <div className="bg-channel-950/60 border-b border-channel-500/30 px-3 py-2 flex items-center justify-between text-xs">
                          <span className="font-mono text-[11px] text-channel-300 font-bold flex items-center gap-1.5">
                            <ShieldCheck size={13} />
                            <span>PRIVACY-BLURRED (PUBLIC MAP RELEASE)</span>
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">SAFE FOR CITIZENS</span>
                        </div>
                        <div className="h-56 bg-ink-950 relative flex items-center justify-center overflow-hidden">
                          {selectedReport.blurred_image || selectedReport.raw_image ? (
                            <img
                              src={selectedReport.blurred_image || selectedReport.raw_image}
                              alt="Privacy Blurred Release"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-ink-500 font-mono text-xs text-center p-4">
                              <Camera size={24} className="mx-auto mb-1 text-ink-600" />
                              <span>Privacy blur preview ready</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-ink-400 leading-relaxed font-mono bg-ink-950 p-3 rounded-xl border border-ink-800">
                    🛡️ <strong className="text-channel-300">Privacy Safeguard:</strong> All citizen face contours and vehicle registration plates are automatically Gaussian-blurred using FloodLens’s neural object layer prior to public syndication.
                  </p>
                </div>

                {/* Ground Observation & Triage Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="bg-ink-950 p-3 rounded-xl border border-ink-800">
                    <span className="text-ink-400 block text-[10px] uppercase">Estimated Water Depth</span>
                    <span className="text-base font-bold text-red-400 mt-0.5 block">
                      {selectedReport.depth_cm || 25} cm
                    </span>
                  </div>
                  <div className="bg-ink-950 p-3 rounded-xl border border-ink-800">
                    <span className="text-ink-400 block text-[10px] uppercase">Public Visibility</span>
                    <span
                      className={`text-base font-bold mt-0.5 block ${selectedReport.public_visible ? "text-emerald-400" : "text-amber-400"
                        }`}
                    >
                      {selectedReport.public_visible ? "PUBLISHED (LIVE)" : "HOLD / DRAFT"}
                    </span>
                  </div>
                  <div className="bg-ink-950 p-3 rounded-xl border border-ink-800">
                    <span className="text-ink-400 block text-[10px] uppercase">Assigned Unit</span>
                    <span className="text-xs font-bold text-paper-50 mt-0.5 block line-clamp-1">
                      {selectedReport.assigned_unit || "None Assigned"}
                    </span>
                  </div>
                </div>

                {selectedReport.reason && (
                  <div className="bg-ink-950 p-3 rounded-xl border border-ink-800 text-xs text-ink-300">
                    <span className="text-[10px] font-mono uppercase text-ink-400 block mb-1">Citizen Observation Notes:</span>
                    <p>{selectedReport.reason}</p>
                  </div>
                )}

                {/* ━━━━ AUTHORITY ACTION COMMANDS ━━━━ */}
                <div className="pt-2 border-t border-ink-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Approve & Release to Public Map */}
                    <button
                      onClick={async () => {
                        await updateReportStatus(selectedReport.id, {
                          status: "verified",
                          public_visible: true,
                        });
                        showToast("Report approved & published to public live map!");
                      }}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      <span>Approve &amp; Release to Public</span>
                    </button>

                    {/* Dispatch Dewatering Unit Modal Trigger */}
                    <button
                      onClick={() => {
                        setTargetIncident(selectedReport);
                        setCustomSector(selectedReport.flagged_road_name || selectedReport.title);
                        setDispatchModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 bg-channel-600 hover:bg-channel-500 text-paper-50 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Truck size={15} />
                      <span>Dispatch Pump / Crew</span>
                    </button>

                    {/* Re-blur Privacy Image */}
                    <button
                      onClick={async () => {
                        await reblurReport(selectedReport.id);
                        showToast("Privacy blurring re-executed.");
                      }}
                      className="flex items-center gap-1.5 bg-ink-800 hover:bg-ink-700 text-ink-300 hover:text-paper-50 font-semibold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-ink-700 cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      <span>Re-Blur Privacy</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Mark Resolved */}
                    <button
                      onClick={async () => {
                        await updateReportStatus(selectedReport.id, {
                          status: "resolved",
                          public_visible: false,
                        });
                        showToast("Incident marked as RESOLVED and cleared.");
                      }}
                      className="flex items-center gap-1 text-xs bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 px-3 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Mark Resolved</span>
                    </button>

                    {/* Dismiss False Positive */}
                    <button
                      onClick={async () => {
                        await updateReportStatus(selectedReport.id, {
                          status: "dismissed",
                          public_visible: false,
                        });
                        showToast("Report marked as FALSE POSITIVE and dismissed.");
                      }}
                      className="flex items-center gap-1 text-xs bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 px-3 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      <X size={14} />
                      <span>Dismiss Report</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-ink-900 border border-ink-800 rounded-3xl p-12 text-center text-ink-400">
                <Shield size={32} className="mx-auto mb-2 text-ink-600" />
                <p className="text-sm">Select an incident ticket on the left to inspect.</p>
              </div>
            )}
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 2: TACTICAL GIS COMMAND MAP                      */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "map" && (
          <div className="space-y-4">
            <div className="bg-ink-900 border border-ink-800 rounded-3xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className="text-channel-400" size={20} />
                <div>
                  <h3 className="font-display text-sm font-bold text-paper-50">
                    Tactical Central Delhi Command &amp; Optical Map
                  </h3>
                  <p className="text-xs text-ink-400 font-mono">
                    Real-time corridor telemetry, citizen incident pins, and response unit positions.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  onClick={() => flyTo(28.6332, 77.2270, 16)}
                  className="bg-ink-950 hover:bg-ink-800 px-3 py-1.5 rounded-lg border border-ink-800 text-red-400 cursor-pointer"
                >
                  Focus Minto (CAM01)
                </button>
                <button
                  onClick={() => flyTo(28.6260, 77.2405, 16)}
                  className="bg-ink-950 hover:bg-ink-800 px-3 py-1.5 rounded-lg border border-ink-800 text-amber-400 cursor-pointer"
                >
                  Focus Tilak (CAM02)
                </button>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-panel border border-ink-800 h-[640px] bg-ink-950 relative">
              <LeafletMap />
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 3: MUNICIPAL DEWATERING PUMPS & UNITS DISPATCH   */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "dispatch" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-800 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-paper-50">Municipal Dewatering &amp; Rescue Task Force</h2>
                <p className="text-xs text-ink-400 font-mono mt-1">
                  Manage high-capacity pump trucks, water rescue boats, and traffic barricade deployment units.
                </p>
              </div>

              <button
                onClick={() => {
                  setTargetIncident(null);
                  setCustomSector("Central Vista Sector");
                  setDispatchModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-channel-500 hover:bg-channel-400 text-ink-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <Plus size={15} />
                <span>Deploy Unit to Sector</span>
              </button>
            </div>

            {/* Units Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {responseUnits.map((unit) => {
                const isDispatched = unit.status === "DISPATCHED" || unit.status === "ON_SCENE";
                return (
                  <div
                    key={unit.id}
                    className="bg-ink-900 border border-ink-800 p-5 rounded-3xl flex flex-col justify-between gap-4 hover:border-channel-500/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono uppercase text-ink-400">{unit.type.replace("_", " ")}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${unit.status === "DISPATCHED"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : unit.status === "ON_SCENE"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-ink-800 text-ink-400 border border-ink-700"
                            }`}
                        >
                          {unit.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-paper-50">{unit.callsign}</h3>

                      <div className="mt-3 space-y-2 text-xs font-mono text-ink-300">
                        <div className="flex items-center justify-between">
                          <span className="text-ink-400">Sector:</span>
                          <span className="text-paper-50 font-semibold">{unit.current_sector}</span>
                        </div>
                        {unit.capacity_lpm > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-ink-400">Pump Capacity:</span>
                            <span className="text-channel-400 font-bold">{unit.capacity_lpm} LPM</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-ink-400">Fuel Level:</span>
                          <span className="text-emerald-400 font-bold">{unit.fuel_pct}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-ink-800 flex items-center justify-between gap-2">
                      {isDispatched ? (
                        <button
                          onClick={async () => {
                            await dispatchResponseUnit({
                              unit_id: unit.id,
                              status: "STANDBY",
                              sector: "Municipal Depot",
                            });
                            showToast(`${unit.callsign} recalled to Standby.`);
                          }}
                          className="w-full bg-ink-950 hover:bg-ink-800 text-ink-300 hover:text-paper-50 text-xs font-semibold py-2 rounded-xl border border-ink-800 transition-colors cursor-pointer"
                        >
                          Recall Unit
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUnitId(unit.id);
                            setCustomSector(unit.current_sector);
                            setDispatchModalOpen(true);
                          }}
                          className="w-full bg-channel-600 hover:bg-channel-500 text-paper-50 text-xs font-semibold py-2 rounded-xl transition-colors cursor-pointer"
                        >
                          Dispatch Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 4: EMERGENCY ALERT BROADCAST CONSOLE            */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "broadcast" && (
          <div className="grid lg:grid-cols-[1.2fr_1.8fr] gap-6 items-start">
            {/* Left: Compose Broadcast */}
            <div className="bg-ink-900 border border-ink-800 rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2.5 border-b border-ink-800 pb-3">
                <Megaphone className="text-channel-400" size={18} />
                <h3 className="font-display text-base font-bold text-paper-50">Broadcast Public Emergency Warning</h3>
              </div>

              <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block font-mono uppercase text-[11px] text-ink-300 mb-1.5">Alert Severity</label>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    {["CRITICAL", "WARNING", "ADVISORY"].map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setAlertSeverity(sev)}
                        className={`py-2 rounded-xl border font-bold transition-colors cursor-pointer ${alertSeverity === sev
                          ? sev === "CRITICAL"
                            ? "bg-red-500/20 text-red-300 border-red-500"
                            : sev === "WARNING"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500"
                              : "bg-blue-500/20 text-blue-300 border-blue-500"
                          : "bg-ink-950 border-ink-800 text-ink-400 hover:text-paper-50"
                          }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono uppercase text-[11px] text-ink-300 mb-1.5">Alert Headline</label>
                  <input
                    type="text"
                    required
                    value={alertTitle}
                    onChange={(e) => setAlertTitle(e.target.value)}
                    placeholder="e.g. RED ALERT: Minto Bridge Submerged (62cm)"
                    className="w-full bg-ink-950 border border-ink-800 rounded-xl p-3 text-paper-50 placeholder:text-ink-600 focus:border-channel-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono uppercase text-[11px] text-ink-300 mb-1.5">Affected Sectors &amp; Underpasses</label>
                  <input
                    type="text"
                    value={alertAreas}
                    onChange={(e) => setAlertAreas(e.target.value)}
                    placeholder="Minto Bridge, Tilak Bridge, Ring Road"
                    className="w-full bg-ink-950 border border-ink-800 rounded-xl p-3 text-paper-50 placeholder:text-ink-600 focus:border-channel-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono uppercase text-[11px] text-ink-300 mb-1.5">Public Broadcast Directive / Message</label>
                  <textarea
                    rows={4}
                    required
                    value={alertMessage}
                    onChange={(e) => setAlertMessage(e.target.value)}
                    placeholder="Avoid low-lying underpasses. Heavy standing water logged. Dewatering crews actively clearing corridor."
                    className="w-full bg-ink-950 border border-ink-800 rounded-xl p-3 text-paper-50 placeholder:text-ink-600 focus:border-channel-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={broadcasting}
                  className="w-full bg-channel-500 hover:bg-channel-400 text-ink-950 font-bold text-xs py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>{broadcasting ? "Broadcasting..." : "Transmit Public Alert Now"}</span>
                </button>
              </form>
            </div>

            {/* Right: Active Broadcasts List */}
            <div className="bg-ink-900 border border-ink-800 rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-ink-800 pb-3">
                <h3 className="font-display text-base font-bold text-paper-50">Active Public Advisories &amp; Tickers</h3>
                <span className="text-xs font-mono text-ink-400">{emergencyAlerts.length} total active</span>
              </div>

              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {emergencyAlerts.map((alert) => {
                  const isCrit = alert.severity === "CRITICAL";
                  const isWarn = alert.severity === "WARNING";
                  const sevColor = isCrit
                    ? "border-red-500/40 bg-red-950/20 text-red-300"
                    : isWarn
                      ? "border-amber-500/40 bg-amber-950/20 text-amber-300"
                      : "border-blue-500/40 bg-blue-950/20 text-blue-300";

                  return (
                    <div key={alert.id} className={`p-4 rounded-2xl border ${sevColor} space-y-2`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-ink-950 border border-ink-800">
                          {alert.severity} ADVISORY
                        </span>
                        <button
                          onClick={async () => {
                            await deleteEmergencyAlert(alert.id);
                            showToast("Broadcast alert revoked.");
                          }}
                          className="text-ink-400 hover:text-red-400 transition-colors p-1"
                          title="Deactivate Alert"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <h4 className="font-bold text-sm text-paper-50">{alert.title}</h4>
                      <p className="text-xs text-ink-300 leading-relaxed">{alert.message}</p>

                      {alert.affected_areas && (
                        <div className="text-[11px] font-mono text-ink-400 pt-2 border-t border-ink-800/40 flex flex-wrap gap-1">
                          <span>Sectors:</span>
                          <span className="text-paper-50 font-semibold">{alert.affected_areas.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 5: ROAD OVERRIDES & BARRICADES MATRIX            */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "roads" && (
          <div className="grid lg:grid-cols-[1.2fr_1.8fr] gap-6 items-start">
            {/* Left: Override Form */}
            <div className="bg-ink-900 border border-ink-800 rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2.5 border-b border-ink-800 pb-3">
                <Sliders className="text-channel-400" size={18} />
                <h3 className="font-display text-base font-bold text-paper-50">Manual Corridor Barricade Override</h3>
              </div>

              <form onSubmit={handleRoadOverrideSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-mono uppercase text-[11px] text-ink-300 mb-1.5">Select Road Corridor</label>
                  <select
                    value={selectedRoadToOverride}
                    onChange={(e) => setSelectedRoadToOverride(e.target.value)}
                    required
                    className="w-full bg-ink-950 border border-ink-800 rounded-xl p-3 text-paper-50 focus:border-channel-500 focus:outline-none"
                  >
                    <option value="">-- Choose Corridor --</option>
                    {roads?.geojson?.features?.map((f) => {
                      const id = f.properties?.id || f.properties?.road_id;
                      return (
                        <option key={id} value={id}>
                          {f.properties?.name} ({id})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-mono uppercase text-[11px] text-ink-300 mb-1.5">Enforce Status</label>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    {["BLOCKED", "CAUTION", "SAFE"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOverrideStatus(st)}
                        className={`py-2 rounded-xl border font-bold transition-colors cursor-pointer ${overrideStatus === st
                          ? st === "BLOCKED"
                            ? "bg-red-500/20 text-red-300 border-red-500"
                            : st === "CAUTION"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                          : "bg-ink-950 border-ink-800 text-ink-400 hover:text-paper-50"
                          }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono uppercase text-[11px] text-ink-300 mb-1.5">Manual Depth Override (cm)</label>
                  <input
                    type="number"
                    value={overrideDepth}
                    onChange={(e) => setOverrideDepth(e.target.value)}
                    className="w-full bg-ink-950 border border-ink-800 rounded-xl p-3 text-paper-50 focus:border-channel-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono uppercase text-[11px] text-ink-300 mb-1.5">Authority Justification</label>
                  <textarea
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full bg-ink-950 border border-ink-800 rounded-xl p-3 text-paper-50 focus:border-channel-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-channel-500 hover:bg-channel-400 text-ink-950 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
                >
                  Apply Authority Corridor Override
                </button>
              </form>
            </div>

            {/* Right: Monitored Corridors & Overrides Table */}
            <div className="bg-ink-900 border border-ink-800 rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-ink-800 pb-3">
                <h3 className="font-display text-base font-bold text-paper-50">Monitored Corridors Status</h3>
                <span className="text-xs font-mono text-ink-400">
                  {roads?.geojson?.features?.length || 0} segments tracked
                </span>
              </div>

              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {roads?.geojson?.features?.map((f) => {
                  const props = f.properties;
                  const id = props.id || props.road_id;
                  const isBlocked = props.status === "BLOCKED";
                  const isCaution = props.status === "CAUTION";

                  return (
                    <div
                      key={id}
                      className="bg-ink-950 p-3.5 rounded-2xl border border-ink-800 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-bold text-xs text-paper-50">{props.name}</div>
                        <div className="text-[11px] font-mono text-ink-400 mt-0.5">
                          Depth: <strong className="text-paper-50">{props.depth_cm || 0}cm</strong> • Length: {props.length_m || 500}m
                        </div>
                        {props.override_active && (
                          <div className="text-[10px] font-mono text-amber-400 mt-1">
                            ⚠️ OVERRIDE ACTIVE: {props.override_reason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold uppercase ${isBlocked
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : isCaution
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                        >
                          {props.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB 6: ACTIVITY & AUDIT LOGS                         */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeTab === "audit" && (
          <div className="bg-ink-900 border border-ink-800 rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-ink-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="text-channel-400" size={18} />
                <h3 className="font-display text-base font-bold text-paper-50">Authority Operations Audit Trail</h3>
              </div>
              <span className="text-xs font-mono text-ink-400">{adminLogs.length} events logged</span>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {adminLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-ink-950 p-3.5 rounded-2xl border border-ink-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-channel-500/20 text-channel-300 font-bold border border-channel-500/30">
                      {log.action}
                    </span>
                    <span className="text-paper-50">{log.details}</span>
                  </div>
                  <div className="flex items-center gap-3 text-ink-400 text-[11px]">
                    <span>{log.operator}</span>
                    <span>•</span>
                    <span>{log.timestamp ? log.timestamp.split("T")[1]?.slice(0, 8) || "Live" : "Live"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Dispatch Response Unit Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-ink-900 border border-ink-700 rounded-3xl p-6 shadow-panel space-y-4">
            <div className="flex items-center justify-between border-b border-ink-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="text-channel-400" size={18} />
                <h4 className="font-display text-base font-bold text-paper-50">Dispatch Response Unit</h4>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="w-7 h-7 rounded-full grid place-items-center text-ink-400 hover:text-paper-50 hover:bg-ink-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-mono uppercase text-[10px] text-ink-400 mb-1">Target Sector / Road</label>
                <input
                  type="text"
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  className="w-full bg-ink-950 border border-ink-800 rounded-xl p-2.5 text-paper-50"
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-[10px] text-ink-400 mb-1">Select Available Unit</label>
                <div className="space-y-2">
                  {responseUnits.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUnitId(u.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedUnitId === u.id
                        ? "bg-channel-500/20 border-channel-500 text-paper-50"
                        : "bg-ink-950 border-ink-800 text-ink-300 hover:bg-ink-800"
                        }`}
                    >
                      <div>
                        <div className="font-bold text-xs">{u.callsign}</div>
                        <div className="text-[10px] font-mono text-ink-400 mt-0.5">
                          {u.type} • {u.capacity_lpm > 0 ? `${u.capacity_lpm} LPM` : "Rescue"}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ink-850 border border-ink-700">
                        {u.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleDispatchConfirm}
                className="w-full bg-channel-500 hover:bg-channel-400 text-ink-950 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
              >
                Confirm Dispatch
              </button>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="w-full bg-ink-950 hover:bg-ink-800 text-ink-300 text-xs font-semibold py-3 rounded-xl border border-ink-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
