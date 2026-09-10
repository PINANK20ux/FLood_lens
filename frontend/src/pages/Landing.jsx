import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Route, ShieldCheck, MapPin, ArrowRight, Video, Crosshair, Navigation, Camera } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import TopNav from "../components/TopNav";
import Footer from "../components/Footer";
import { useFloodLens, API } from "../context/FloodLensContext";
import { DELHI_CAMERAS } from "../data/delhiMockData";

const createMiniCameraIcon = (status) => {
  const norm = (status || "SAFE").toUpperCase();
  const isBlocked = norm === "IMPASSABLE" || norm === "BLOCKED";
  const isCaution = norm === "POOLING RISK" || norm === "CAUTION";
  const color = isBlocked ? "#ef4444" : isCaution ? "#f59e0b" : "#10b981";
  const ringColor = isBlocked
    ? "rgba(239, 68, 68, 0.45)"
    : isCaution
      ? "rgba(245, 158, 11, 0.45)"
      : "rgba(16, 185, 129, 0.45)";

  return L.divIcon({
    className: "mini-cam-marker",
    html: `
      <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
        <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:${ringColor}; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:18px; height:18px; background:${color}; border-radius:50%; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; z-index:2;">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

function InvalidateMiniMapSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MiniMapClickHandler({ onNavigate }) {
  useMapEvents({
    click() {
      onNavigate();
    },
  });
  return null;
}

function MiniRoadLayer({ geojson }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    const roadGroup = L.geoJSON(null, {
      style: (feature) => {
        const status = (feature?.properties?.status || "SAFE").toUpperCase();
        if (status === "BLOCKED" || status === "IMPASSABLE") {
          return { color: "#ef4444", weight: 4.5, opacity: 0.95, dashArray: "5, 5", lineCap: "round", lineJoin: "round" };
        }
        if (status === "CAUTION" || status === "POOLING RISK") {
          return { color: "#f59e0b", weight: 3.5, opacity: 0.9, lineCap: "round", lineJoin: "round" };
        }
        return { color: "#10b981", weight: 3, opacity: 0.85, lineCap: "round", lineJoin: "round" };
      },
    });

    roadGroup.addTo(map);
    layerRef.current = roadGroup;

    return () => {
      map.removeLayer(roadGroup);
    };
  }, [map]);

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();
    if (geojson?.features && geojson.features.length > 0) {
      layerRef.current.addData(geojson);
    }
  }, [geojson]);

  return null;
}

const STEPS = [
  {
    icon: Search,
    title: "Search any city or street",
    body: "Search your locality, underpass, or junction anywhere in the world. FloodLens fetches real-time OSM geometry instantly.",
  },
  {
    icon: MapPin,
    title: "See live risk & accessibility",
    body: "Roads are categorized as accessible, pooling caution, or impassable in plain language based on live computer vision telemetry.",
  },
  {
    icon: Route,
    title: "Evacuate via safe routes",
    body: "Dynamic Dijkstra & OSRM routing automatically routes around flooded corridors to guide you along safe asphalt.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef(null);

  const { roads, cameras, userLocation, locateUser, flyTo, searchLocation } = useFloodLens();

  const totalRoads = roads?.stats?.total || 3575;
  const safeRoads = roads?.stats?.safe || 2840;
  const blockedRoads = roads?.stats?.blocked || 140;

  const miniCameras = (cameras && cameras.length > 0 ? cameras : DELHI_CAMERAS).slice(0, 5);

  // Active camera preview
  const previewCam = cameras && cameras.length > 0 ? cameras[0] : null;

  // Handle outside click to close search dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchLocation(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
      setShowDropdown(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, searchLocation]);

  const handleSelectLocation = (item) => {
    flyTo(item.lat, item.lng, 15);
    setShowDropdown(false);
    navigate("/live");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSelectLocation(searchResults[0]);
    } else {
      navigate("/live");
    }
  };

  // 3 Monitored corridors (from live cameras or generalized arterial benchmarks)
  const monitoredCorridors = cameras && cameras.length >= 3
    ? cameras.slice(0, 3).map((cam) => ({
      id: cam.id,
      name: cam.name,
      label: cam.status === "SAFE" ? "Accessible" : cam.status === "CAUTION" ? "Caution Pooling" : "Impassable",
      color: cam.status === "SAFE" ? "#2f8f5b" : cam.status === "CAUTION" ? "#c98a2c" : "#b3402f",
      soft: cam.status === "SAFE" ? "#e4f3ea" : cam.status === "CAUTION" ? "#f8ecd7" : "#f6e2de",
      insight: `Water depth ${cam.depth_cm}cm. AI vision monitors live submersion ratio at ${cam.submersion_pct}%.`,
      affected: cam.status === "BLOCKED" ? "1 corridor closed" : "Passable",
      accessible: cam.segment_name,
    }))
    : [
      {
        id: "c1",
        name: "City Central Underpass",
        label: "Impassable",
        color: "#b3402f",
        soft: "#f6e2de",
        insight: "Water depth 45cm exceeding vehicle axle height. AI video stream confirms active submersion.",
        affected: "1 corridor closed",
        accessible: "Bypass via Elevated Parkway",
      },
      {
        id: "c2",
        name: "Commercial Hub Junction",
        label: "Caution Pooling",
        color: "#c98a2c",
        soft: "#f8ecd7",
        insight: "Curb-height pooling observed (18cm). Slow speed advised; sedans caution passable.",
        affected: "Water accumulating",
        accessible: "Clear to Transit Boulevard",
      },
      {
        id: "c3",
        name: "Riverfront Transit Causeway",
        label: "Accessible",
        color: "#2f8f5b",
        soft: "#e4f3ea",
        insight: "Drainage sensors confirm clear passage. Normal traffic flowing safely.",
        affected: "0 flood alerts",
        accessible: "All vehicles clear",
      },
    ];

  return (
    <div className="bg-ink-950 text-paper-50 min-h-screen flex flex-col">
      <TopNav />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-8 pt-14 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-channel-500/15 border border-channel-500/30 text-channel-400 text-xs font-mono mb-6">
            <span className="w-2 h-2 rounded-full bg-channel-400 animate-ping" />
            <span>Let's Find The Best Route</span>
          </div>

          <h1 className="font-display text-4xl leading-[1.05] sm:text-6xl sm:leading-[1.03] text-paper-50 mb-5">
            Know the water.
            <br />
            Choose the road.
          </h1>
          <p className="text-ink-300 text-base sm:text-lg max-w-lg mb-8 leading-relaxed">
            Check live flood conditions, understand real street passability, and make safer
            travel decisions with FloodLens.
          </p>

          {/* Quick Search Box with Auto-suggest */}
          <div ref={searchContainerRef} className="relative max-w-lg mb-6">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Search any city, locality, underpass, or street..."
                  className="w-full pl-10 pr-4 py-3 rounded-full bg-ink-900 border border-ink-800/80 text-paper-50 placeholder:text-ink-400 text-sm focus:border-channel-500 focus:outline-none transition-all"
                />
                {isSearching && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-channel-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              <button
                type="submit"
                className="rounded-full bg-channel-500 hover:bg-channel-400 text-ink-950 font-semibold px-6 py-3 text-sm transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Explore</span>
                <ArrowRight size={15} />
              </button>
            </form>

            {/* Nominatim Search Auto-suggest Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-ink-900 border border-ink-700/80 rounded-2xl shadow-panel overflow-hidden animate-fade-in">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectLocation(item)}
                    className="w-full px-4 py-3 text-left hover:bg-ink-800/80 transition-colors flex items-start gap-2.5 border-b border-ink-800/50 last:border-b-0"
                  >
                    <MapPin size={15} className="text-channel-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-paper-50">{item.shortName}</div>
                      <div className="text-[11px] text-ink-400 line-clamp-1">{item.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Call to action buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                locateUser();
                navigate("/live");
              }}
              className="rounded-full bg-channel-500 hover:bg-channel-400 text-ink-950 text-sm font-semibold px-6 py-3 transition-colors shadow-sm flex items-center gap-2"
            >
              <Navigation size={15} />
              <span>Use Current GPS Location</span>
            </button>
            <button
              onClick={() => navigate("/roads")}
              className="rounded-full border border-ink-700 hover:border-channel-400 text-paper-50 text-sm font-medium px-5 py-3 transition-colors flex items-center gap-2"
            >
              <Video size={15} className="text-channel-400" />
              <span>CCTV Vision Feeds</span>
            </button>
            <a
              href="#how-it-works"
              className="text-sm text-ink-300 hover:text-paper-50 font-medium transition-colors ml-2"
            >
              How It Works →
            </a>
          </div>
        </div>

        {/* Hero Visual Card (Interactive Leaflet Mini-Map) */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-[2.5rem] bg-channel-900/30 blur-2xl" aria-hidden />
          <div className="relative rounded-[2rem] overflow-hidden border border-ink-700/60 shadow-panel bg-ink-900 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-ink-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-display text-sm sm:text-base text-paper-50">
                  Central Delhi Live GIS Telemetry
                </span>
              </div>
              <span className="text-[11px] font-mono text-channel-400 px-2.5 py-1 rounded-full bg-channel-900/60 border border-channel-700/60">
                6 Optical CCTV Nodes
              </span>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-ink-950/80 rounded-2xl p-2.5 border border-ink-800">
                <div className="text-[10px] uppercase font-mono text-ink-400">Accessible</div>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">{roads?.stats?.safe || 25}</div>
              </div>
              <div className="bg-ink-950/80 rounded-2xl p-3 border border-ink-800">
                <div className="text-[10px] uppercase font-mono text-ink-400">At Risk</div>
                <div className="text-xl font-bold text-amber-400 mt-0.5">
                  {roads?.stats?.caution || 12}
                </div>
              </div>
              <div className="bg-ink-950/80 rounded-2xl p-3 border border-ink-800">
                <div className="text-[10px] uppercase font-mono text-ink-400">Blocked</div>
                <div className="text-xl font-bold text-red-400 mt-0.5">{roads?.stats?.blocked || 8}</div>
              </div>
            </div>

            {/* Interactive Leaflet Mini-Map Frame */}
            <div
              onClick={() => navigate("/live")}
              className="group cursor-pointer relative rounded-2xl overflow-hidden border border-ink-700/80 h-[280px] sm:h-[310px] transition-all hover:border-channel-400 shadow-inner bg-ink-950"
              title="Click anywhere to launch Live Interactive Map"
            >
              <MapContainer
                center={[28.6250, 77.2280]}
                zoom={13}
                zoomControl={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                dragging={false}
                attributionControl={false}
                style={{ height: "100%", width: "100%" }}
              >
                <InvalidateMiniMapSize />
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />
                <MiniRoadLayer geojson={roads?.geojson} />
                {miniCameras.map((cam) => (
                  <Marker
                    key={cam.id}
                    position={[cam.lat, cam.lng]}
                    icon={createMiniCameraIcon(cam.status)}
                  />
                ))}
                <MiniMapClickHandler onNavigate={() => navigate("/live")} />
              </MapContainer>

              {/* Top Mini-Map Overlay Tag */}
              <div className="absolute top-3 left-3 z-[400] pointer-events-none">
                <span className="bg-ink-950/90 text-channel-300 text-[10px] font-mono px-2.5 py-1 rounded-full border border-channel-700/60 backdrop-blur-md shadow-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>CENTRAL DELHI LIVE NETWORK</span>
                </span>
              </div>

              {/* Bottom Mini-Map Navigation Callout */}
              <div className="absolute bottom-3 left-3 right-3 z-[400] pointer-events-none flex items-center justify-between">
                <span className="bg-channel-500 text-ink-950 text-[11px] font-bold px-3 py-1 rounded-full shadow-md group-hover:scale-105 transition-transform flex items-center gap-1 backdrop-blur-md">
                  <span>Explore Live Map</span>
                  <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-paper-100 text-ink-950 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-channel-700 font-semibold">
              Three-Tier Autonomous Engine
            </span>
            <h2 className="font-display text-3xl sm:text-4xl mt-1.5 mb-3 text-ink-950">How FloodLens works</h2>
            <p className="text-ink-500 text-sm sm:text-base leading-relaxed">
              Three steps between wondering about a route and knowing the safest road to take.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative bg-white rounded-3xl p-7 border border-ink-800/10 shadow-panel">
                <div className="flex items-center justify-between mb-5">
                  <span className="grid place-items-center w-11 h-11 rounded-2xl bg-ink-950 text-paper-50">
                    <step.icon size={19} strokeWidth={2} />
                  </span>
                  <span className="text-sm font-mono text-ink-400 font-bold">{`0${i + 1}`}</span>
                </div>
                <h3 className="font-display text-xl mb-2 text-ink-950">{step.title}</h3>
                <p className="text-ink-600 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Snapshot Strip */}
      <section className="bg-ink-950 py-16 sm:py-20 border-t border-ink-800/60">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl text-paper-50">Live Corridor Statuses</h2>
              <p className="text-xs text-ink-400 mt-1">Monitored by autonomous camera nodes &amp; OSM graph</p>
            </div>
            <button
              onClick={() => navigate("/live")}
              className="text-xs sm:text-sm text-channel-400 hover:text-channel-300 font-semibold transition-colors flex items-center gap-1"
            >
              <span>View full map</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {monitoredCorridors.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate("/roads")}
                className="text-left rounded-3xl border border-ink-800/80 hover:border-channel-500/60 bg-ink-900/60 p-6 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg text-paper-50 group-hover:text-channel-300 transition-colors">
                    {c.name}
                  </h3>
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: c.soft, color: c.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
                    {c.label}
                  </span>
                </div>
                <p className="text-xs text-ink-300 leading-relaxed mb-4">{c.insight}</p>
                <div className="pt-3 border-t border-ink-800/60 flex items-center justify-between text-[11px] font-mono text-ink-400">
                  <span>{c.affected}</span>
                  <span className="text-channel-400">{c.accessible}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="bg-channel-700 py-16 sm:py-20 text-paper-50">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <ShieldCheck className="mx-auto mb-4 text-paper-50" size={36} strokeWidth={1.8} />
          <h2 className="font-display text-3xl sm:text-4xl mb-4">
            Travel with the water in view.
          </h2>
          <p className="text-channel-100 mb-8 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            FloodLens is free to use and built for the moments when a wrong turn costs more than time.
          </p>
          <button
            onClick={() => navigate("/live")}
            className="rounded-full bg-paper-50 hover:bg-white text-ink-950 text-sm font-semibold px-8 py-3.5 transition-all shadow-panel active:scale-95"
          >
            Open Live Map
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
