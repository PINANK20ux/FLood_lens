import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  LogOut,
  Radio,
  AlertTriangle,
  Flame,
  Truck,
  Send,
  Clock,
  MapPin,
  Eye,
  Sparkles,
  PhoneCall,
  Activity,
  Droplets,
  X,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchRawCameraFeeds,
  fetchEmergencyDispatches,
  createEmergencyDispatch,
  updateDispatchStatus,
} from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';
import { timeAgo } from '../../utils/helpers';
import type {
  RawCameraFeed,
  EmergencyDispatch,
  DispatchPriority,
  DispatchStatus,
} from '../../types';

const DISPATCH_UNITS = [
  { id: 'Rescue Boat Unit', label: '🚤 Rescue Boat Unit (DDMA / Fire)', icon: Flame },
  { id: 'Heavy Crane / Tow', label: '🏗️ Heavy Crane / Tow Truck (Police)', icon: Truck },
  { id: 'ALS Ambulance Unit', label: '🚑 Advanced Life Support Ambulance (AIIMS)', icon: Activity },
  { id: 'Water Pump Dewatering Team', label: '💧 High-Capacity Pump Team (MCD / PWD)', icon: Droplets },
  { id: 'Quick Response Patrol', label: '🚨 Quick Response PCR Patrol', icon: ShieldAlert },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { agencyProfile, token, logout } = useAuth();

  const [cameras, setCameras] = useState<RawCameraFeed[]>([]);
  const [dispatches, setDispatches] = useState<EmergencyDispatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<Record<string, 'raw' | 'segmentation'>>({});
  const [filter, setFilter] = useState<'all' | 'danger' | 'caution' | 'safe'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dispatch Modal State
  const [selectedCamera, setSelectedCamera] = useState<RawCameraFeed | null>(null);
  const [unitType, setUnitType] = useState<string>(DISPATCH_UNITS[0].id);
  const [priority, setPriority] = useState<DispatchPriority>('high');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load telemetry and dispatches
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [camsData, dispData] = await Promise.all([
        fetchRawCameraFeeds(token),
        fetchEmergencyDispatches(token),
      ]);
      setCameras(camsData);
      setDispatches(dispData);
    } catch (err) {
      console.warn('Error loading admin feeds:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000); // 8-second live telemetry poll

    // Subscribe to Supabase Realtime channel if available
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel('emergency_dispatches')
        .on('broadcast', { event: 'new_dispatch' }, (payload) => {
          if (payload.payload) {
            setDispatches((prev) => [payload.payload, ...prev.filter((d) => d.id !== payload.payload.id)]);
            showToast(`🚨 NEW DISPATCH: ${payload.payload.agency_type} assigned to ${payload.payload.camera_name || 'Station'}`);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_dispatches' }, () => {
          loadData();
        })
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  // Open dispatch modal
  const handleOpenDispatch = (camera: RawCameraFeed) => {
    setSelectedCamera(camera);
    // Pre-fill notes based on hazard
    setDispatchNotes(
      camera.water_level_cm >= 30
        ? `Water accumulation at ${camera.water_level_cm}cm. Immediate lane clearance & traffic diversion needed.`
        : `Precautionary deployment for ${camera.name}. Hazard detected: ${camera.hazard}`
    );
    setPriority(camera.water_level_cm >= 35 ? 'critical' : 'high');
  };

  // Submit dispatch
  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamera || !token) return;

    setIsSubmitting(true);
    try {
      const newDispatch = await createEmergencyDispatch(
        {
          camera_id: selectedCamera.id,
          agency_type: unitType,
          priority,
          notes: dispatchNotes,
        },
        token
      );

      setDispatches((prev) => [newDispatch, ...prev]);
      showToast(`✅ Dispatch Unit successfully alerted: ${unitType}`);
      setSelectedCamera(null);
    } catch (err: any) {
      showToast(`❌ Dispatch failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update dispatch status
  const handleUpdateStatus = async (dispatchId: string, nextStatus: DispatchStatus) => {
    if (!token) return;
    try {
      const updated = await updateDispatchStatus(dispatchId, nextStatus, token);
      setDispatches((prev) =>
        prev.map((d) => (d.id === dispatchId ? { ...d, status: updated.status } : d))
      );
      showToast(`Status updated to ${nextStatus.replace('_', ' ').toUpperCase()}`);
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`);
    }
  };

  const filteredCameras = useMemo(() => {
    return cameras.filter((cam) => {
      const matchesFilter = filter === 'all' || cam.status === filter;
      const matchesSearch =
        !searchQuery ||
        cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cam.area?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [cameras, filter, searchQuery]);

  const stats = useMemo(() => {
    const danger = cameras.filter((c) => c.status === 'danger').length;
    const caution = cameras.filter((c) => c.status === 'caution').length;
    const activeDispatches = dispatches.filter((d) => d.status !== 'resolved').length;
    const maxWater = cameras.reduce((max, c) => Math.max(max, c.water_level_cm), 0);
    return { danger, caution, activeDispatches, maxWater, total: cameras.length };
  }, [cameras, dispatches]);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'police':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'fire':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'hospital':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'superadmin':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-emerald-500/40 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Tactical Command Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-slate-800 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  Flood<span className="text-emerald-400">Lens</span>
                </span>
                <span className="text-[10px] bg-slate-800 border border-slate-700 text-emerald-400 px-2 py-0.5 rounded font-mono font-semibold">
                  EMERGENCY PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                TELEMETRY ENCRYPTED • LIVE
              </p>
            </div>
          </div>

          {/* Agency badge & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-200">
                  {agencyProfile?.agency_name || 'Emergency Responder'}
                </p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded border font-mono font-bold ${getRoleBadgeColor(
                      agencyProfile?.role
                    )}`}
                  >
                    {agencyProfile?.role || 'RESPONDER'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    #{agencyProfile?.badge_number || 'EMG-01'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-xs font-medium text-slate-300 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Metrics Ribbon */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Critical Danger</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1 font-mono">{stats.danger} Hotspots</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Water depth &gt; 35cm</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Caution Alerts</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1 font-mono">{stats.caution} Zones</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Slow traffic &amp; waterlogging</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Radio className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Dispatches</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                {stats.activeDispatches} Units
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Deployed across NCR</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Peak Water Level</p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1 font-mono">{stats.maxWater} cm</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Minto / Prahladpur corridors</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Droplets className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Feeds' },
              { id: 'danger', label: '🔴 Critical Danger' },
              { id: 'caution', label: '🟡 Caution' },
              { id: 'safe', label: '🟢 Clear / Safe' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filter === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search junction, corridor, ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </section>

        {/* Main 2-Column Command Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left 2 Columns: Unrestricted High-Def & Mask2Former Feeds */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-400" />
                  Tactical CCTV Feeds &amp; AI Mask2Former Overlays
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bypassing public rate limits. Real-time unblurred optical &amp; segmented hazard streams.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {filteredCameras.length} Live Feeds
              </span>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-500 font-mono text-xs">
                INITIALIZING HIGH-BANDWIDTH TACTICAL FEEDS...
              </div>
            ) : filteredCameras.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
                <p className="text-sm font-medium">No camera streams match filter criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCameras.map((camera) => {
                  const isSeg = viewMode[camera.id] === 'segmentation';
                  return (
                    <div
                      key={camera.id}
                      className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col"
                    >
                      {/* Video/Image Frame */}
                      <div className="relative aspect-video bg-slate-950 overflow-hidden group">
                        <img
                          src={camera.raw_feed_url}
                          alt={camera.name}
                          className={`w-full h-full object-cover transition-all duration-300 ${
                            isSeg ? 'contrast-125 saturate-150' : 'brightness-95'
                          }`}
                        />

                        {/* Artificial Mask2Former Segmentation Visual Canvas */}
                        {isSeg && (
                          <div className="absolute inset-0 pointer-events-none">
                            {/* Flood mask polygon overlay */}
                            <div
                              className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                              style={{
                                height: `${Math.min(camera.water_level_cm * 1.6, 75)}%`,
                                background:
                                  camera.status === 'danger'
                                    ? 'linear-gradient(to top, rgba(244,63,94,0.45), rgba(244,63,94,0.1))'
                                    : 'linear-gradient(to top, rgba(6,182,212,0.4), rgba(6,182,212,0.1))',
                                borderTop: '2px dashed rgba(255,255,255,0.7)',
                              }}
                            />
                            {/* AI Hazard Bounding Box */}
                            {camera.water_level_cm > 15 && (
                              <div className="absolute bottom-10 left-12 w-28 h-16 border-2 border-emerald-400 bg-emerald-400/20 rounded font-mono text-[9px] text-white px-1 py-0.5">
                                [SUBMERGED_VEHICLE 94%]
                              </div>
                            )}
                            {/* Segmentation HUD Watermark */}
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              MASK2FORMER SEGMENTATION ON
                            </div>
                          </div>
                        )}

                        {/* Stream Watermark Info */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>4K RAW • {camera.id}</span>
                        </div>

                        {/* View Switcher Controls */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                          <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-lg border border-slate-800 backdrop-blur-sm">
                            <button
                              onClick={() =>
                                setViewMode((prev) => ({ ...prev, [camera.id]: 'raw' }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                                !isSeg
                                  ? 'bg-emerald-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Optical
                            </button>
                            <button
                              onClick={() =>
                                setViewMode((prev) => ({
                                  ...prev,
                                  [camera.id]: 'segmentation',
                                }))
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                                isSeg
                                  ? 'bg-emerald-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Mask2Former
                            </button>
                          </div>

                          <div
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              camera.status === 'danger'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : camera.status === 'caution'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {camera.status} • {camera.water_level_cm} cm
                          </div>
                        </div>
                      </div>

                      {/* Details & Action */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-sm text-white leading-snug">
                                {camera.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {camera.area || 'Delhi NCR'} ({camera.latitude.toFixed(4)},{' '}
                                {camera.longitude.toFixed(4)})
                              </p>
                            </div>
                          </div>

                          {/* Detected AI Hazard Tags */}
                          <div className="mt-3 space-y-1">
                            {camera.detected_hazards.slice(0, 2).map((h, i) => (
                              <div
                                key={i}
                                className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                              >
                                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                {h}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Dispatch Button */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">
                            Checked {timeAgo(camera.last_updated || new Date().toISOString())}
                          </span>
                          <button
                            onClick={() => handleOpenDispatch(camera)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 active:scale-95"
                          >
                            <Send className="w-3 h-3" />
                            Dispatch Unit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 1 Column: Active Emergency Dispatches Stream */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-amber-400" />
                  Active Incident Dispatches
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live command status of units deployed in the field.
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {dispatches.length} Total
              </span>
            </div>

            <div className="space-y-3">
              {dispatches.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-500 text-xs">
                  No active emergency dispatches recorded.
                </div>
              ) : (
                dispatches.map((disp) => {
                  const isResolved = disp.status === 'resolved';
                  const isEnRoute = disp.status === 'en_route';

                  return (
                    <div
                      key={disp.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isResolved
                          ? 'bg-slate-900/40 border-slate-800 opacity-60'
                          : isEnRoute
                          ? 'bg-slate-900/90 border-blue-500/40 shadow-lg shadow-blue-500/5'
                          : 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span
                            className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-full font-bold border ${
                              disp.priority === 'critical'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : disp.priority === 'high'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}
                          >
                            {disp.priority} PRIORITY
                          </span>
                          <h4 className="font-semibold text-sm text-slate-100 mt-1">
                            {disp.agency_type}
                          </h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {disp.camera_name || disp.camera_id}
                          </p>
                        </div>

                        {/* Status Tag */}
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                            isResolved
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : isEnRoute
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {disp.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      {disp.notes && (
                        <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mb-3 font-mono leading-relaxed">
                          "{disp.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                        <span className="font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(disp.dispatched_at)}
                        </span>

                        {/* Operational State Stepper */}
                        <div className="flex items-center gap-1.5">
                          {disp.status === 'dispatched' && (
                            <button
                              onClick={() => handleUpdateStatus(disp.id, 'en_route')}
                              className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-[10px] font-mono transition-colors"
                            >
                              Mark En Route
                            </button>
                          )}
                          {disp.status !== 'resolved' && (
                            <button
                              onClick={() => handleUpdateStatus(disp.id, 'resolved')}
                              className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-mono transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Emergency Unit Dispatch Modal */}
      {selectedCamera && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedCamera(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Emergency Dispatch Directive</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedCamera.id} • {selectedCamera.name}
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Unit Type
                </label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-rose-500 font-medium"
                >
                  {DISPATCH_UNITS.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Emergency Priority
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['critical', 'high', 'medium', 'low'] as DispatchPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all border ${
                        priority === p
                          ? p === 'critical'
                            ? 'bg-rose-600 text-white border-rose-500'
                            : p === 'high'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Field Operator Tactical Notes
                </label>
                <textarea
                  rows={3}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Specific routing instructions, vehicle counts, hazards..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                  required
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedCamera(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Transmitting Directive...' : 'Transmit Dispatch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
