import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Map,
  Camera,
  AlertTriangle,
  Info,
  ArrowRight,
  Compass,
  ExternalLink,
} from 'lucide-react';
import { useCameraStations } from '../hooks/useCameraStations';
import StatusBadge from '../components/StatusBadge';
import DepthBadge from '../components/DepthBadge';
import { DELHI_CENTER } from '../data/mockData';
import type { StationStatus } from '../types';

/* ─── Marker icon factory ─── */
function makeMarkerIcon(status: StationStatus) {
  const color =
    status === 'danger'
      ? '#D9534F'
      : status === 'caution'
      ? '#F0AD4E'
      : '#1C3F24';

  const pulseRing =
    status === 'danger'
      ? `<div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(217,83,79,0.35);animation:pulse-ring 1.8s ease-out infinite;"></div>`
      : status === 'caution'
      ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:rgba(240,173,78,0.25);animation:pulse-ring 2.4s ease-out infinite;"></div>`
      : '';

  return L.divIcon({
    className: 'mini-map-pin',
    html: `
      <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
        ${pulseRing}
        <div style="
          width:18px;height:18px;border-radius:50%;
          background:${color};
          border:2px solid #FFFFFF;
          box-shadow:0 2px 6px rgba(0,0,0,0.2);
          z-index:2;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

export default function Home() {
  const { stations } = useCameraStations();
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const safe = stations.filter((s) => s.status === 'safe').length;
    const caution = stations.filter((s) => s.status === 'caution').length;
    const danger = stations.filter((s) => s.status === 'danger').length;
    return { total: stations.length, safe, caution, danger };
  }, [stations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q) ||
        (s.hazard || '').toLowerCase().includes(q)
    );
  }, [search, stations]);

  const navModules = [
    {
      to: '/map',
      idx: '01',
      tag: 'GEOSPATIAL ROUTING',
      icon: Map,
      title: 'Safe Roads Map',
      desc: 'Topographic corridor routing with automated flooded underpass bypass algorithm.',
    },
    {
      to: '/cameras',
      idx: '02',
      tag: 'DUAL-STREAM VISION',
      icon: Camera,
      title: 'Street Cameras',
      desc: 'Real-time YOLO water segmentation & civilian submersion telemetry from junction nodes.',
    },
    {
      to: '/report',
      idx: '03',
      tag: 'SPATIAL VERIFICATION',
      icon: AlertTriangle,
      title: 'Report Hazard',
      desc: 'Citizen ground observations correlated against nearby cameras within 500-meter radius.',
    },
    {
      to: '/about',
      idx: '04',
      tag: 'HYDROLOGIC SYSTEM',
      icon: Info,
      title: 'System Architecture',
      desc: 'Open-source urban flood monitoring framework designed for high-density municipal grids.',
    },
  ];

  return (
    <div className="page-enter bg-[#FAF9F6] text-slate-900 min-h-screen">
      {/* ═══════════ HERO: Clean 2-Column Split (Map on Top-Left, Text & Search on Right) ═══════════ */}
      <section className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[540px] lg:min-h-[580px]">
          {/* ── LEFT COLUMN: Mini Map (Top-Left) ── */}
          <div className="relative flex flex-col px-6 sm:px-8 lg:px-10 xl:px-12 py-8 lg:py-10 lg:border-r border-slate-200">
            {/* System status pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 font-mono text-[11px] text-slate-700 mb-5 w-fit select-none">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${stats.danger > 0 ? 'bg-[#D9534F]' : 'bg-[#1C3F24]'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${stats.danger > 0 ? 'bg-[#D9534F]' : 'bg-[#1C3F24]'}`} />
              </span>
              <span className="font-bold text-[#1C3F24] tracking-wider">
                [REC]
              </span>
              <span className="text-slate-500 tracking-tight">
                DELHI NCR <span className="text-slate-300 mx-0.5">//</span> LIVE RADAR
              </span>
            </div>

            {/* Mini Map Container */}
            <div className="relative flex-1 min-h-[360px] lg:min-h-[420px] rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Map overlay controls */}
              <div className="absolute top-3 left-3 z-[450] flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E05D38] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E05D38]" />
                  </span>
                  <span className="font-mono text-[11px] font-medium text-slate-700 tracking-tight">
                    LIVE BASIN RADAR
                  </span>
                </div>
                <Link
                  to="/map"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md shadow-sm text-[11px] font-mono font-medium text-[#1C3F24] hover:bg-[#1C3F24] hover:text-white transition-colors"
                >
                  Full Map
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Leaflet map */}
              <MapContainer
                center={DELHI_CENTER}
                zoom={11}
                scrollWheelZoom={false}
                zoomControl={false}
                className="h-full w-full z-0"
                style={{ minHeight: '360px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  maxZoom={19}
                />
                <ZoomControl position="bottomright" />

                {stations.map((station) => (
                  <Marker
                    key={station.id}
                    position={[station.latitude, station.longitude]}
                    icon={makeMarkerIcon(station.status)}
                  >
                    <Popup>
                      <div className="p-1 min-w-[190px] text-slate-900 font-sans">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1 mb-1.5">
                          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                            {station.id}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {station.latitude.toFixed(3)}°,{' '}
                            {station.longitude.toFixed(3)}°
                          </span>
                        </div>
                        <p className="font-bold text-xs leading-snug">
                          {station.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <DepthBadge
                            cm={station.water_level_cm}
                            status={station.status}
                          />
                          <StatusBadge status={station.status} size="sm" />
                        </div>
                        {station.hazard && (
                          <p className="text-[11px] text-slate-600 mt-1.5 font-medium leading-tight">
                            <span className="text-slate-400 font-mono">
                              STATUS:
                            </span>{' '}
                            {station.hazard}
                          </p>
                        )}
                        <div className="mt-2.5 pt-2 border-t border-slate-200">
                          <Link
                            to={`/cameras?id=${station.id}`}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-[#1C3F24] hover:bg-[#234E2B] text-white text-xs font-mono font-medium transition-colors"
                          >
                            <Camera className="w-3 h-3" />
                            <span>VIEW FEED →</span>
                          </Link>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>

              {/* Bottom telemetry bar */}
              <div className="absolute bottom-0 left-0 right-0 z-[400] flex items-center justify-between px-3.5 py-2 bg-slate-50/95 backdrop-blur-xs border-t border-slate-200 font-mono text-[11px] text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-[#1C3F24]" />
                    <span className="text-slate-500">CLEAR:</span> {stats.safe}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-[#F0AD4E]" />
                    <span className="text-slate-500">CAUTION:</span> {stats.caution}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-[#D9534F]" />
                    <span className="text-slate-500">FLOODED:</span> {stats.danger}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Clean Editorial Content & Search ── */}
          <div className="relative flex flex-col justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-14 lg:py-20">
            {/* Headline */}
            <h1 className="font-sans font-semibold tracking-[-0.03em] text-slate-900 text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.08] max-w-lg">
              Clear paths when{' '}
              <span className="text-[#1C3F24]">waters rise.</span>
            </h1>

            {/* Value proposition */}
            <p className="mt-6 text-slate-600 text-base leading-relaxed max-w-md">
              Structured flood intelligence, real-time depth telemetry and
              safe-path route guidance for Delhi's critical junctions and
              underpass basins.
            </p>

            {/* Minimalist search */}
            <div className="mt-8 relative max-w-md z-30">
              <div className="relative flex items-center bg-white border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-[#1C3F24]/20 focus-within:border-[#1C3F24]/50 transition-all">
                <div className="pl-3.5 pr-2 text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-mono text-slate-200 select-none">
                    |
                  </span>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search corridor or camera ID …'
                  className="w-full py-3 pr-4 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="pr-3 text-xs font-mono text-slate-400 hover:text-slate-700 uppercase"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Search results dropdown */}
              {filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {filtered.map((s) => (
                    <Link
                      key={s.id}
                      to={`/cameras?id=${s.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500 font-semibold uppercase">
                            {s.id}
                          </span>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {s.name}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5 font-mono">
                          {s.hazard || 'Clear passage'}
                        </p>
                      </div>
                      <StatusBadge status={s.status} size="sm" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── STATS ROW: Bottom bar with hairline dividers ── */}
        <div className="border-t border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200">
            {/* Monitored */}
            <div className="px-6 sm:px-8 py-5 sm:py-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 font-medium">
                Monitored Corridors
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-semibold font-mono text-slate-900 tracking-tight">
                  {stats.total}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  NODES
                </span>
              </div>
            </div>

            {/* Open & Dry */}
            <div className="px-6 sm:px-8 py-5 sm:py-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#1C3F24] font-medium">
                Open & Dry
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-semibold font-mono text-[#1C3F24] tracking-tight">
                  {stats.safe}
                </span>
                <span className="text-[10px] font-mono text-[#1C3F24]/60">
                  CLEAR
                </span>
              </div>
            </div>

            {/* Caution */}
            <div className="px-6 sm:px-8 py-5 sm:py-6 border-t sm:border-t-0 border-slate-200">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#F0AD4E] font-medium">
                Caution
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-semibold font-mono text-[#F0AD4E] tracking-tight">
                  {stats.caution}
                </span>
                <span className="text-[10px] font-mono text-[#F0AD4E]/70">
                  ELEVATED
                </span>
              </div>
            </div>

            {/* Impassable */}
            <div className="px-6 sm:px-8 py-5 sm:py-6 border-t sm:border-t-0 border-slate-200">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#D9534F] font-medium">
                Impassable
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-semibold font-mono text-[#D9534F] tracking-tight">
                  {stats.danger}
                </span>
                <span className="text-[10px] font-mono text-[#D9534F]/70">
                  ALERT
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ MODULES: Quick Nav Grid ═══════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-200">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500 font-medium mb-1">
              SUBSYSTEMS // CORE MODULES
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
              FloodLens Operational Platform
            </h2>
          </div>
          <div className="font-mono text-xs text-slate-400">
            [4 ACTIVE MONITORING SUBSYSTEMS]
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {navModules.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="group relative flex flex-col p-6 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200"
            >
              {/* Module header */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="font-mono text-[10px] font-bold text-[#1C3F24] bg-[#1C3F24]/5 border border-[#1C3F24]/15 px-2 py-0.5 rounded">
                  {card.tag}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  [{card.idx}]
                </span>
              </div>

              {/* Icon & title */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[#1C3F24] group-hover:bg-[#1C3F24] group-hover:text-white transition-colors">
                  <card.icon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  {card.title}
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed flex-1 mt-2">
                {card.desc}
              </p>

              {/* Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono font-medium text-slate-600 group-hover:text-[#1C3F24] transition-colors">
                <span>OPEN MODULE</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
