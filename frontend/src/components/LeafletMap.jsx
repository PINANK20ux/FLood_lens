import React, { useMemo, useEffect, useRef, memo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { Camera, Users, ShieldAlert, Crosshair, MapPin, Navigation, ArrowRight, AlertTriangle } from "lucide-react";
import { useFloodLens } from "../context/FloodLensContext";
import HazardConfirmationPill from "./HazardConfirmationPill";

// Fix Leaflet default marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const DEFAULT_DELHI_CENTER = [28.6328, 77.2180]; // Centered on Connaught Place Inner Circle
const DEFAULT_DELHI_ZOOM = 13.5;

const STATUS_COLORS = {
  SAFE: "#10b981",
  ACCESSIBLE: "#10b981",
  CAUTION: "#f59e0b",
  "POOLING RISK": "#f59e0b",
  BLOCKED: "#ef4444",
  IMPASSABLE: "#ef4444",
};

/**
 * Custom styled HTML/DivIcon camera badge marker
 * - Red pulsing icon for IMPASSABLE / BLOCKED
 * - Amber icon for POOLING RISK / CAUTION
 * - Green icon for ACCESSIBLE / SAFE
 */
const createCameraIcon = (status, isSelected) => {
  const normStatus = (status || "SAFE").toUpperCase();
  const isBlocked = normStatus === "IMPASSABLE" || normStatus === "BLOCKED";
  const isCaution = normStatus === "POOLING RISK" || normStatus === "CAUTION";

  const color = isBlocked ? "#ef4444" : isCaution ? "#f59e0b" : "#10b981";
  const ringColor = isBlocked
    ? "rgba(239, 68, 68, 0.4)"
    : isCaution
    ? "rgba(245, 158, 11, 0.4)"
    : "rgba(16, 185, 129, 0.4)";
  const size = isSelected ? 38 : 32;

  return L.divIcon({
    className: "custom-cctv-badge-marker",
    html: `
      <div style="position:relative; width:${size}px; height:${size}px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
        ${
          isBlocked
            ? `<div style="position:absolute; width:100%; height:100%; border-radius:50%; background:${ringColor}; animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ""
        }
        <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:${ringColor};"></div>
        <div style="width:${size - 8}px; height:${size - 8}px; background:${color}; border-radius:50%; border:2.5px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; color:white; z-index:2;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const originIcon = L.divIcon({
  className: "custom-origin-marker",
  html: `
    <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
      <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(16,185,129,0.35); animation:pulse-ring 1.5s infinite;"></div>
      <div style="width:26px; height:26px; background:#10b981; border-radius:50%; border:3px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:800; z-index:2;">
        A
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const destinationIcon = L.divIcon({
  className: "custom-dest-marker",
  html: `
    <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
      <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(239,68,68,0.35); animation:pulse-ring 1.5s infinite;"></div>
      <div style="width:26px; height:26px; background:#ef4444; border-radius:50%; border:3px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:800; z-index:2;">
        B
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const userLocationIcon = L.divIcon({
  className: "custom-user-gps-marker",
  html: `
    <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
      <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(37, 99, 235, 0.25); animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position:absolute; width:24px; height:24px; border-radius:50%; background:rgba(37, 99, 235, 0.35); animation:pulse 2s infinite;"></div>
      <div style="width:14px; height:14px; background:#2563eb; border-radius:50%; border:2.5px solid white; box-shadow:0 0 10px rgba(37, 99, 235, 0.9); z-index:2;"></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const createProvisionalPinIcon = (severity) => {
  const isSevere = (severity || "SEVERE").toUpperCase() === "SEVERE";
  const color = isSevere ? "#ef4444" : "#f59e0b";
  const ringColor = isSevere ? "rgba(239, 68, 68, 0.45)" : "rgba(245, 158, 11, 0.45)";
  const label = isSevere ? "!" : "▲";

  return L.divIcon({
    className: "custom-provisional-pin",
    html: `
      <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center; cursor:grab;">
        <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:${ringColor}; animation:ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position:absolute; width:75%; height:75%; border-radius:50%; background:${ringColor}; animation:pulse 1.8s infinite;"></div>
        <div style="width:26px; height:26px; background:${color}; border-radius:50%; border:3px solid white; box-shadow:0 4px 14px rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:800; z-index:3;">
          ${label}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function MapController({ flyToTarget, onBoundsChange }) {
  const map = useMap();

  useEffect(() => {
    if (flyToTarget && flyToTarget.lat && flyToTarget.lng) {
      map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom || 15, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [flyToTarget, map]);

  useMapEvents({
    moveend() {
      if (onBoundsChange && map.getZoom() >= 13) {
        onBoundsChange(map.getBounds());
      }
    },
  });

  return null;
}

function RouteBoundsHandler({ routePath }) {
  const map = useMap();

  useEffect(() => {
    if (routePath && Array.isArray(routePath) && routePath.length > 1) {
      try {
        const bounds = L.latLngBounds(routePath);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
        }
      } catch (err) {
        console.warn("fitBounds notice:", err);
      }
    }
  }, [routePath, map]);

  return null;
}

/**
 * High-performance, zero-flicker native Leaflet GeoJSON layer.
 * Updates roads via clearLayers() and addData() without unmounting or re-rendering React trees.
 */
function RoadGeoJsonLayer({ geojson, onSelectRoad, riskFilter, activeLayers }) {
  const map = useMap();
  const layerRef = useRef(null);
  const onSelectRoadRef = useRef(onSelectRoad);
  onSelectRoadRef.current = onSelectRoad;

  useEffect(() => {
    const roadGroup = L.geoJSON(null, {
      style: (feature) => {
        const status = (feature?.properties?.status || "SAFE").toUpperCase();
        if (status === "BLOCKED" || status === "IMPASSABLE") {
          return { color: "#ef4444", weight: 5, opacity: 0.95, dashArray: "8, 8", lineCap: "round", lineJoin: "round" };
        }
        if (status === "CAUTION" || status === "POOLING RISK") {
          return { color: "#f59e0b", weight: 5, opacity: 0.9, lineCap: "round", lineJoin: "round" };
        }
        return { color: "#10b981", weight: 5, opacity: 0.9, lineCap: "round", lineJoin: "round" };
      },
      filter: (feature) => {
        if (!riskFilter || riskFilter === "all") return true;
        const s = (feature?.properties?.status || "SAFE").toUpperCase();
        if (riskFilter === "blocked") return s === "BLOCKED" || s === "IMPASSABLE";
        if (riskFilter === "caution") return s === "CAUTION" || s === "POOLING RISK";
        if (riskFilter === "safe") return s === "SAFE" || s === "ACCESSIBLE";
        return true;
      },
      onEachFeature: (feature, layer) => {
        layer.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          if (onSelectRoadRef.current) {
            const p = feature.properties || {};
            const coords = feature.geometry?.coordinates || [];
            // Handle LineString [lng, lat]
            const latlngs = coords.map((pt) => [pt[1], pt[0]]);
            onSelectRoadRef.current({ ...p, coordinates: latlngs });
          }
        });
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

    if (!activeLayers.has("roads")) return;

    if (geojson?.features && geojson.features.length > 0) {
      layerRef.current.addData(geojson);
    }
  }, [geojson, activeLayers, riskFilter]);

  return null;
}

function LeafletMapComponent({
  center = null,
  zoom = null,
  showRoads = true,
  showCameras = true,
  showHazards = true,
  showRoute = true,
  className = "w-full h-full",
  onSelectRoad = null,
  onSelectCamera = null,
}) {
  const {
    roads,
    cameras,
    reports,
    selectedCamera,
    setSelectedCamera,
    setSelectedRoad,
    riskFilter,
    activeLayers,
    routeOrigin,
    routeDestination,
    routePath,
    pickingPoint,
    handleMapPointClick,
    activePinCoords,
    userLocation,
    locationStatus,
    mapCenter,
    mapZoom,
    flyToTarget,
    locateUser,
    fetchRoadsForBounds,
    // Interactive Hazard Pinning
    isPlacingPin,
    provisionalPin,
    setProvisionalPin,
    selectedSeverity,
  } = useFloodLens();

  const navigate = useNavigate();

  const effectiveCenter = useMemo(
    () => center || mapCenter || DEFAULT_DELHI_CENTER,
    [center, mapCenter]
  );
  const effectiveZoom = useMemo(
    () => zoom || mapZoom || DEFAULT_DELHI_ZOOM,
    [zoom, mapZoom]
  );

  const handleSelectRoadIntegrated = (roadObj) => {
    setSelectedRoad(roadObj);
    if (onSelectRoad) onSelectRoad(roadObj);
  };

  const handleCameraClick = (cam) => {
    setSelectedCamera(cam);
    if (onSelectCamera) onSelectCamera(cam);
  };

  return (
    <div className={`relative ${className} ${isPlacingPin || pickingPoint ? "cursor-crosshair [&_.leaflet-container]:!cursor-crosshair" : ""}`}>
      {/* Interactive Picking Mode Banner for Routes */}
      {pickingPoint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-channel-600 text-paper-50 px-4 py-2 rounded-full text-xs font-semibold shadow-panel flex items-center gap-2 animate-fade-in border border-channel-400/40">
          <Crosshair size={14} className="animate-spin text-paper-50" />
          <span>
            {pickingPoint === "origin"
              ? "Click map to set Origin (Green Pin A)"
              : pickingPoint === "destination"
              ? "Click map to set Destination (Red Pin B)"
              : "Click map to place hazard report pin"}
          </span>
        </div>
      )}

      {/* Interactive Hazard Pin Placement Banner */}
      {isPlacingPin && !provisionalPin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-slate-900/95 text-paper-50 px-4 py-2.5 rounded-full text-xs font-semibold shadow-panel flex items-center gap-2 animate-fade-in border border-amber-500/50 backdrop-blur-md">
          <Crosshair size={14} className="animate-spin text-amber-400" />
          <span>Click anywhere on the map to drop provisional hazard pin</span>
        </div>
      )}

      {/* Floating "Locate Me" GPS Button */}
      <button
        type="button"
        onClick={() => locateUser()}
        title="Locate Me (Current GPS)"
        className="absolute bottom-6 right-4 z-[400] bg-white hover:bg-paper-100 text-ink-800 p-2.5 rounded-lg shadow-panel border border-ink-200 backdrop-blur-sm transition-all flex items-center gap-1.5 text-xs font-semibold group active:scale-95"
      >
        <Crosshair
          size={16}
          className={`text-channel-600 ${
            locationStatus === "requesting" ? "animate-spin" : "group-hover:rotate-45 transition-transform"
          }`}
        />
        <span className="hidden sm:inline">
          {locationStatus === "requesting" ? "Locating..." : "Locate Me"}
        </span>
      </button>

      <MapContainer
        center={effectiveCenter}
        zoom={effectiveZoom}
        zoomControl={true}
        style={{ height: "100%", width: "100%" }}
      >
        <InvalidateSizeOnMount />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          subdomains={["a", "b", "c"]}
          keepBuffer={8}
          updateWhenZooming={false}
          updateWhenIdle={true}
        />

        <MapController flyToTarget={flyToTarget} onBoundsChange={fetchRoadsForBounds} />
        <RouteBoundsHandler routePath={routePath} />
        <MapClickHandler onClick={handleMapPointClick} />

        {/* ── Native Zero-Flicker Road Layer ── */}
        {showRoads && (
          <RoadGeoJsonLayer
            geojson={roads?.geojson}
            onSelectRoad={handleSelectRoadIntegrated}
            riskFilter={riskFilter}
            activeLayers={activeLayers}
          />
        )}

        {/* ── User GPS Pulsing Location Marker ── */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup>
              <div className="text-xs p-1 font-sans space-y-1">
                <div className="font-bold text-blue-600 flex items-center gap-1">
                  <Navigation size={13} className="text-blue-600" />
                  Your Current Location
                </div>
                <div className="text-ink-500 font-mono text-[11px]">
                  {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* ── CCTV Camera Markers ── */}
        {showCameras &&
          activeLayers.has("cameras") &&
          cameras.map((cam) => {
            const isSelected = selectedCamera?.id === cam.id;
            const statusUpper = (cam.status || "SAFE").toUpperCase();
            const isBlocked = statusUpper === "IMPASSABLE" || statusUpper === "BLOCKED";
            const isCaution = statusUpper === "POOLING RISK" || statusUpper === "CAUTION";

            return (
              <Marker
                key={cam.id}
                position={[cam.lat, cam.lng]}
                icon={createCameraIcon(cam.status, isSelected)}
                eventHandlers={{
                  click: () => handleCameraClick(cam),
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-2 min-w-[210px] font-sans">
                    <div className="flex items-center justify-between gap-2 border-b border-ink-800/10 pb-1.5">
                      <div className="font-display font-bold text-ink-950 flex items-center gap-1.5 truncate">
                        <Camera size={14} className="text-channel-600 shrink-0" />
                        <span className="truncate">{cam.name}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          isBlocked
                            ? "bg-red-500/15 text-red-700 border border-red-300"
                            : isCaution
                            ? "bg-amber-500/15 text-amber-700 border border-amber-300"
                            : "bg-emerald-500/15 text-emerald-700 border border-emerald-300"
                        }`}
                      >
                        {cam.status || "SAFE"}
                      </span>
                    </div>

                    <div className="text-ink-500 text-[11px]">
                      <span className="font-mono text-[10px] text-channel-600 font-semibold">{cam.id}</span> ·{" "}
                      {cam.segment_name}
                    </div>

                    <div className="rounded-lg overflow-hidden border border-ink-800/10 bg-black aspect-video relative">
                      <img
                        src={cam.feed || cam.image_url || `/test_media/${cam.id}.png`}
                        alt={cam.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `/test_media/${cam.id}.png`;
                        }}
                      />
                      <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-xs text-[10px] text-white font-mono px-1.5 py-0.5 rounded font-bold">
                        {cam.depth_cm} cm
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] bg-paper-50 p-1.5 rounded-lg border border-ink-800/5">
                      <div>
                        <span className="text-ink-400 block text-[9px] uppercase font-semibold">Water Depth</span>
                        <span className="font-bold text-ink-900 font-mono">{cam.depth_cm} cm</span>
                      </div>
                      <div>
                        <span className="text-ink-400 block text-[9px] uppercase font-semibold">Submersion</span>
                        <span className="font-bold text-ink-900 font-mono">{cam.submersion_pct || 0}%</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCamera(cam);
                        navigate("/roads");
                      }}
                      className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded-lg bg-channel-500 hover:bg-channel-400 text-ink-950 transition-colors shadow-sm flex items-center justify-center gap-1 mt-1 cursor-pointer"
                    >
                      <span>View Full CCTV Telemetry</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* ── Citizen Hazard Markers ── */}
        {showHazards &&
          activeLayers.has("hazards") &&
          reports.map((rpt) => {
            const isVerified = rpt.status === "verified";
            const sev = (rpt.severity || rpt.water_level || "moderate").toLowerCase();
            const color = sev === "high" ? "#ef4444" : sev === "moderate" ? "#f59e0b" : "#10b981";

            return (
              <CircleMarker
                key={rpt.id}
                center={[rpt.lat, rpt.lng]}
                radius={isVerified ? 8 : 6}
                pathOptions={{
                  color: isVerified ? color : "#71879e",
                  fillColor: color,
                  fillOpacity: isVerified ? 0.95 : 0.6,
                  weight: isVerified ? 2.5 : 1.5,
                  dashArray: !isVerified ? "3 3" : undefined,
                }}
              >
                <Popup>
                  <div className="text-xs p-0.5 space-y-1 min-w-[180px]">
                    <div className="font-display font-bold text-ink-950 flex items-center gap-1.5">
                      <Users size={14} className="text-channel-600" />
                      Citizen Hazard Report
                    </div>
                    <div className="text-ink-600 capitalize">
                      Severity: <strong>{rpt.water_level || rpt.severity}</strong>
                    </div>
                    {rpt.flagged_road_name && (
                      <div className="text-[11px] bg-red-50 text-red-700 p-1 rounded font-semibold border border-red-200">
                        Flagged: {rpt.flagged_road_name}
                      </div>
                    )}
                    <div className="text-[10px] text-ink-400 font-mono pt-1">
                      {isVerified ? "✓ Verified by YOLO AI" : "Pending Community Confirmation"}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Active Pin Placement for reporting */}
        {activePinCoords && (
          <CircleMarker
            center={activePinCoords}
            radius={9}
            pathOptions={{
              color: "#1f9a97",
              fillColor: "#4db8b0",
              fillOpacity: 0.95,
              weight: 3,
            }}
          />
        )}

        {/* ── Provisional Interactive Hazard Pin ── */}
        {provisionalPin && (
          <Marker
            position={[provisionalPin.lat, provisionalPin.lng]}
            icon={createProvisionalPinIcon(selectedSeverity)}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const latlng = e.target.getLatLng();
                setProvisionalPin({ lat: latlng.lat, lng: latlng.lng });
              },
            }}
          />
        )}

        {/* ── Route Pins & Dynamic Polyline ── */}
        {showRoute && (
          <>
            {routeOrigin && (
              <Marker
                position={routeOrigin}
                icon={originIcon}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const latlng = e.target.getLatLng();
                    const newOrig = [Number(latlng.lat.toFixed(5)), Number(latlng.lng.toFixed(5))];
                    setRouteOrigin(newOrig);
                    setRouteOriginName(`Point A (${newOrig[0]}, ${newOrig[1]})`);
                    if (routeDestination) {
                      calculateRoute(newOrig, routeDestination);
                    }
                  },
                }}
              />
            )}
            {routeDestination && (
              <Marker
                position={routeDestination}
                icon={destinationIcon}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const latlng = e.target.getLatLng();
                    const newDest = [Number(latlng.lat.toFixed(5)), Number(latlng.lng.toFixed(5))];
                    setRouteDestination(newDest);
                    setRouteDestinationName(`Point B (${newDest[0]}, ${newDest[1]})`);
                    if (routeOrigin) {
                      calculateRoute(routeOrigin, newDest);
                    }
                  },
                }}
              />
            )}

            {routePath && routePath.length > 1 && (
              <Polyline
                positions={routePath}
                pathOptions={{
                  color: "#06b6d4",
                  weight: 6,
                  opacity: 0.95,
                  lineJoin: "round",
                  lineCap: "round",
                }}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Floating Glassmorphic Hazard Confirmation Pill */}
      <HazardConfirmationPill />
    </div>
  );
}

const LeafletMap = memo(LeafletMapComponent);
export default LeafletMap;
