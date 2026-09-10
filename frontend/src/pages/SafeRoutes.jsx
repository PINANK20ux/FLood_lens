import React, { useEffect, useCallback } from "react";
import {
  Navigation,
  ArrowRight,
  ArrowUpDown,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Ruler,
  Crosshair,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Compass,
  Route as RouteIcon,
} from "lucide-react";
import TopNav from "../components/TopNav";
import Footer from "../components/Footer";
import LeafletMap from "../components/LeafletMap";
import { useFloodLens, fetchRealStreetRoute } from "../context/FloodLensContext";

export default function SafeRoutes() {
  const {
    routeOrigin,
    setRouteOrigin,
    routeDestination,
    setRouteDestination,
    routeOriginName,
    setRouteOriginName,
    routeDestinationName,
    setRouteDestinationName,
    routePath,
    routeInfo,
    routeLoading,
    routeError,
    calculateRoute,
    clearRoute,
    pickingPoint,
    setPickingPoint,
    userLocation,
    locateUser,
    cameras,
  } = useFloodLens();

  // Auto-seed Default Safe Route (Point A: Baba Kharak Singh Marg -> Point B: India Gate Hexagon)
  useEffect(() => {
    if (!routeOrigin && !routeDestination) {
      const orig = [28.6288, 77.2085];
      const dest = [28.6125, 77.2295];
      const origName = "Baba Kharak Singh Marg (Point A)";
      const destName = "India Gate Hexagon (Point B)";
      setRouteOrigin(orig);
      setRouteOriginName(origName);
      setRouteDestination(dest);
      setRouteDestinationName(destName);
      calculateRoute(orig, dest, origName, destName);
    }
  }, []);

  const handleSwap = () => {
    if (!routeOrigin || !routeDestination) return;
    const tempCoords = routeOrigin;
    const tempName = routeOriginName;
    setRouteOrigin(routeDestination);
    setRouteOriginName(routeDestinationName);
    setRouteDestination(tempCoords);
    setRouteDestinationName(tempName);
    calculateRoute(routeDestination, tempCoords, routeDestinationName, tempName);
  };

  const handleUseGPSForOrigin = () => {
    if (userLocation) {
      setRouteOrigin(userLocation);
      setRouteOriginName(`My GPS (${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)})`);
      if (routeDestination) {
        calculateRoute(userLocation, routeDestination);
      }
    } else {
      locateUser();
    }
  };

  const handleSelectCameraAsDestination = (cam) => {
    const coords = [cam.lat, cam.lng];
    setRouteDestination(coords);
    setRouteDestinationName(cam.name);
    if (routeOrigin) {
      calculateRoute(routeOrigin, coords);
    }
  };

  const distanceKm = routeInfo?.distanceKm || routeInfo?.distance_km || "0";
  const durationMin = routeInfo?.durationMin || routeInfo?.estimated_time_min || routeInfo?.eta_min || 0;

  return (
    <div className="bg-paper-100 min-h-screen flex flex-col select-none">
      <div className="bg-ink-950">
        <TopNav />
      </div>

      {/* Hero Header */}
      <section className="bg-ink-950 text-paper-50 pb-12 pt-10 border-b border-ink-800/40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <RouteIcon size={12} /> OpenStreetMap Snapped Engine
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight">
            Dynamic Safe Evacuation Routing
          </h1>
          <p className="text-ink-300 max-w-2xl text-xs sm:text-sm mt-2 leading-relaxed">
            Real street-snapped routing dynamically navigates vehicles through accessible boulevards while avoiding flooded underpass choke points.
          </p>
        </div>
      </section>

      {/* Main Routing Workspace */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 -mt-6 pb-20 flex-1 w-full">
        <div className="grid lg:grid-cols-[1fr_1.6fr] gap-6 items-start">
          {/* Left: Route Planner Input Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-panel border border-ink-800/10 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-ink-800/10 pb-3">
              <h2 className="font-display text-lg text-ink-950 flex items-center gap-2">
                <Navigation size={17} className="text-channel-600" />
                <span>Safe Route</span>
              </h2>
              {routePath && (
                <button
                  onClick={clearRoute}
                  className="text-xs text-ink-400 hover:text-ink-900 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} /> Clear
                </button>
              )}
            </div>

            {/* Origin Input */}
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Origin (Point A)
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleUseGPSForOrigin}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Compass size={12} /> Current GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickingPoint(pickingPoint === "origin" ? null : "origin")}
                    className="text-[11px] text-channel-600 hover:text-channel-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Crosshair size={12} /> Pick on Map
                  </button>
                </div>
              </label>
              <div className="bg-paper-50 border border-ink-800/10 rounded-2xl p-3 text-xs text-ink-800 flex items-center justify-between">
                <span className="font-medium truncate max-w-[220px]">
                  {routeOriginName || "Pick on map or use GPS location"}
                </span>
                {routeOrigin && (
                  <span className="text-[10px] font-mono text-ink-400">
                    [{routeOrigin[0].toFixed(3)}, {routeOrigin[1].toFixed(3)}]
                  </span>
                )}
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-2">
              <button
                onClick={handleSwap}
                disabled={!routeOrigin || !routeDestination}
                className="w-8 h-8 rounded-full border border-ink-800/15 bg-white hover:bg-paper-100 disabled:opacity-30 grid place-items-center text-ink-600 shadow-sm transition-transform active:scale-95 cursor-pointer"
                title="Swap Origin and Destination"
              >
                <ArrowUpDown size={14} />
              </button>
            </div>

            {/* Destination Input */}
            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Destination (Point B)
                </span>
                <button
                  type="button"
                  onClick={() => setPickingPoint(pickingPoint === "destination" ? null : "destination")}
                  className="text-[11px] text-channel-600 hover:text-channel-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Crosshair size={12} /> Pick on Map
                </button>
              </label>
              <div className="bg-paper-50 border border-ink-800/10 rounded-2xl p-3 text-xs text-ink-800 flex items-center justify-between">
                <span className="font-medium truncate max-w-[220px]">
                  {routeDestinationName || "Click 'Pick on Map' or select destination"}
                </span>
                {routeDestination && (
                  <span className="text-[10px] font-mono text-ink-400">
                    [{routeDestination[0].toFixed(3)}, {routeDestination[1].toFixed(3)}]
                  </span>
                )}
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={() => calculateRoute(routeOrigin, routeDestination)}
              disabled={!routeOrigin || !routeDestination || routeLoading}
              className="w-full rounded-full bg-channel-500 hover:bg-channel-400 disabled:opacity-40 text-ink-950 text-xs font-semibold py-3 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {routeLoading ? (
                <span>Snapping to Real Street Geometry...</span>
              ) : (
                <>
                  <Navigation size={15} />
                  <span>Calculate Street-Snapped Route</span>
                </>
              )}
            </button>

            {/* Route Error Alert */}
            {routeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-xs flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{routeError}</span>
              </div>
            )}

            {/* Route Success Metrics Cards */}
            {routeInfo && (
              <div className="space-y-3 pt-2 border-t border-ink-800/10 animate-fade-in">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-paper-50 rounded-2xl p-3 border border-ink-800/10">
                    <div className="text-[10px] text-ink-400 uppercase font-mono flex items-center justify-center gap-1">
                      <Ruler size={11} /> Total Distance
                    </div>
                    <div className="text-xl font-bold text-ink-950 mt-1 font-mono">
                      {distanceKm} <span className="text-xs font-normal text-ink-400">km</span>
                    </div>
                  </div>

                  <div className="bg-paper-50 rounded-2xl p-3 border border-ink-800/10">
                    <div className="text-[10px] text-ink-400 uppercase font-mono flex items-center justify-center gap-1">
                      <Clock size={11} /> Estimated Time
                    </div>
                    <div className="text-xl font-bold text-ink-950 mt-1 font-mono">
                      {durationMin} <span className="text-xs font-normal text-ink-400">min</span>
                    </div>
                  </div>
                </div>

                {/* Avoidance Alerts */}
                {routeInfo.avoidance_alerts && routeInfo.avoidance_alerts.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-800 space-y-1">
                    {routeInfo.avoidance_alerts.map((alert, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Delhi Flood Corridor Presets */}
            <div className="pt-2 border-t border-ink-800/10">
              <span className="text-xs font-semibold text-ink-700 block mb-2 flex items-center justify-between">
                <span>Central Delhi Flood Route Presets</span>
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Street-Snapped
                </span>
              </span>
              <div className="grid sm:grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const orig = [28.6288, 77.2085];
                    const dest = [28.6125, 77.2295];
                    const origName = "Baba Kharak Singh Marg (Point A)";
                    const destName = "India Gate Hexagon (Point B)";
                    setRouteOrigin(orig);
                    setRouteOriginName(origName);
                    setRouteDestination(dest);
                    setRouteDestinationName(destName);
                    calculateRoute(orig, dest, origName, destName);
                  }}
                  className="text-left text-xs p-3 rounded-2xl border border-channel-500/40 bg-channel-50/40 hover:bg-channel-50/70 transition-all text-ink-800 flex items-center justify-between group shadow-2xs cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-ink-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-channel-500"></span>
                      BKS Marg (Point A) → India Gate (Point B)
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      Direct avenue via Ashoka Road & Central Vista network
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-channel-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const orig = [28.6180, 77.2405];
                    const dest = [28.6295, 77.2275];
                    const origName = "Supreme Court / Purana Qila";
                    const destName = "Barakhamba Road / KG Marg";
                    setRouteOrigin(orig);
                    setRouteOriginName(origName);
                    setRouteDestination(dest);
                    setRouteDestinationName(destName);
                    calculateRoute(orig, dest, origName, destName);
                  }}
                  className="text-left text-xs p-3 rounded-2xl border border-ink-800/10 hover:border-channel-500 hover:bg-channel-50/30 transition-all text-ink-800 flex items-center justify-between group shadow-2xs cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-ink-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-channel-500"></span>
                      Supreme Court → Barakhamba Rd
                    </div>
                    <div className="text-[11px] text-emerald-600 font-medium">
                      Via Tilak Marg & Sikandra Road (clear)
                    </div>
                  </div>
                  <ArrowRight size={15} className="text-channel-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </div>
            </div>

            {/* Quick Corridor Selection based on Active Cameras */}
            {cameras && cameras.length > 0 && (
              <div className="pt-2 border-t border-ink-800/10">
                <span className="text-xs font-medium text-ink-500 block mb-2">
                  Active Monitored Destinations
                </span>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                  {cameras.slice(0, 4).map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => handleSelectCameraAsDestination(cam)}
                      className="text-left text-xs p-2.5 rounded-xl border border-ink-800/10 hover:border-channel-500 hover:bg-channel-50/40 transition-colors text-ink-700 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-channel-600 shrink-0" />
                        <span className="font-medium truncate">{cam.name}</span>
                      </div>
                      <ArrowRight size={13} className="text-ink-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Leaflet Map Container & Interactive Pick Toolbar */}
          <div className="flex flex-col gap-3">
            {/* Top Road Routing Telemetry Overlay Card */}
            <div className="bg-ink-950 text-paper-50 px-5 py-3 rounded-2xl border border-ink-800/60 shadow-panel flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <RouteIcon size={16} className="text-cyan-400 shrink-0" />
                <span className="text-xs font-bold text-paper-100">
                  Total Safe Distance: <span className="text-cyan-400 font-mono">{distanceKm} km</span> • Est. Transit: <span className="text-cyan-400 font-mono">{durationMin} mins</span>
                </span>
              </div>
              <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Snapped to OpenStreetMap Road Network</span>
              </div>
            </div>

            {/* Interactive Mode & Waypoint Toolbar */}
            <div className="bg-white px-5 py-3 rounded-2xl border border-ink-800/10 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Navigation size={15} className="text-channel-600 shrink-0" />
                <span className="text-xs font-bold text-ink-950">
                  Interactive Route Waypoints:
                </span>
                <span className="text-[11px] text-ink-500 hidden sm:inline">
                  Click to drop or drag pins anywhere on the map
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickingPoint(pickingPoint === "origin" ? null : "origin")}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    pickingPoint === "origin"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                  <span>[ Set Start (A) ]</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPickingPoint(pickingPoint === "destination" ? null : "destination")}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    pickingPoint === "destination"
                      ? "bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400"
                      : "bg-red-50 hover:bg-red-100 text-red-800 border-red-300"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 border border-white" />
                  <span>[ Set Destination (B) ]</span>
                </button>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-panel border border-ink-800/10 h-[520px] bg-white relative">
              <LeafletMap />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
