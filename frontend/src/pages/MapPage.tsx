import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation,
  X,
  ExternalLink,
  Route,
  ShieldCheck,
  AlertTriangle,
  Users,
  Eye,
  Clock,
  MapPin,
  LocateFixed,
  ArrowUpDown,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import { useCameraStations } from '../hooks/useCameraStations';
import { useCitizenReports } from '../hooks/useCitizenReports';
import { DELHI_CENTER, DEFAULT_ZOOM } from '../data/mockData';
import StatusBadge from '../components/StatusBadge';
import DepthBadge from '../components/DepthBadge';
import { getSafeRoute } from '../lib/api';
import {
  STATUS_COLORS,
  getPassabilityAdvice,
  timeAgo,
  haversineDistance,
} from '../utils/helpers';
import type { CameraStation, StationStatus } from '../types';

/* ─── Custom Point Type ──────────────────────── */
export interface RoutePoint {
  lat: number;
  lng: number;
  name: string;
  stationId?: string;
  isCustom?: boolean;
}

/* ─── Helpers ───────────────────────────────── */

function makeMarkerIcon(status: CameraStation['status']) {
  const color = STATUS_COLORS[status];
  const pulseColor = status === 'danger' ? 'rgba(194,65,12,0.4)' : 'transparent';

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:28px;height:28px;">
        ${
          status === 'danger'
            ? `<div style="position:absolute;inset:-4px;border-radius:50%;background:${pulseColor};animation:pulse-ring 2s ease-out infinite;"></div>`
            : ''
        }
        <div style="
          width:28px;height:28px;border-radius:50%;
          background:${color};
          border:3px solid #F5EFE3;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center;
        ">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="#F5EFE3">
            <path d="M8 1s-5 6.5-5 10a5 5 0 0 0 10 0C13 7.5 8 1 8 1z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function makePinIcon(type: 'origin' | 'destination') {
  const isOrigin = type === 'origin';
  const bgColor = isOrigin ? '#2D5A27' : '#C2410C';
  const label = isOrigin ? 'A' : 'B';
  const pulseBg = isOrigin ? 'rgba(45,90,39,0.35)' : 'rgba(194,65,12,0.35)';

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:34px;height:42px;display:flex;flex-direction:column;align-items:center;">
        <div style="position:absolute;top:-4px;width:38px;height:38px;border-radius:50%;background:${pulseBg};animation:pulse-ring 1.8s ease-out infinite;"></div>
        <div style="
          width:32px;height:32px;border-radius:50%;
          background:${bgColor};
          border:3px solid #FFFFFF;
          box-shadow:0 4px 12px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          font-family:sans-serif;font-weight:800;font-size:14px;color:#FFFFFF;
          z-index:2;
        ">
          ${label}
        </div>
        <div style="
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:8px solid ${bgColor};
          margin-top:-2px;
          z-index:1;
        "></div>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    popupAnchor: [0, -38],
  });
}

function makeReportMarkerIcon(verified: boolean) {
  const color = verified ? '#4F5B2A' : '#B8892D';
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:20px;height:20px;border-radius:4px;
        background:${color};
        border:2px solid #F5EFE3;
        box-shadow:0 1px 4px rgba(0,0,0,0.2);
        display:flex;align-items:center;justify-content:center;
        transform:rotate(45deg);
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#F5EFE3" style="transform:rotate(-45deg);">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

function getNearestLocationName(
  lat: number,
  lng: number,
  stations: CameraStation[]
): string {
  let closest: CameraStation | null = null;
  let minDist = Infinity;

  for (const s of stations) {
    const d = haversineDistance(lat, lng, s.latitude, s.longitude);
    if (d < minDist) {
      minDist = d;
      closest = s;
    }
  }

  if (closest && minDist < 0.6) {
    return `Near ${closest.name}`;
  } else if (closest && minDist < 1.8) {
    return `Near ${closest.name} (${minDist.toFixed(1)} km)`;
  }
  return `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/* ─── OSRM Road Geometry Cache ───────────────── */

interface RoadSegment {
  key: string;
  from: CameraStation;
  to: CameraStation;
  geometry: [number, number][] | null;
  status: StationStatus;
}

const geometryCache: Record<string, [number, number][]> = {};

async function fetchRoadGeometry(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<[number, number][]> {
  const cacheKey = `${fromLat},${fromLng}-${toLat},${toLng}`;
  if (geometryCache[cacheKey]) return geometryCache[cacheKey];

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );
      geometryCache[cacheKey] = coords;
      return coords;
    }
  } catch (err) {
    console.warn('OSRM fetch failed for segment:', cacheKey, err);
  }

  const fallback: [number, number][] = [
    [fromLat, fromLng],
    [toLat, toLng],
  ];
  geometryCache[cacheKey] = fallback;
  return fallback;
}

/* ─── Route Waypoints Geometry & Details ─────── */

interface DetailedRouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  avoidedStations: CameraStation[];
  cautionStations: CameraStation[];
}

async function fetchDetailedRouteGeometry(
  waypoints: [number, number][],
  allStations: CameraStation[]
): Promise<DetailedRouteResult> {
  if (waypoints.length < 2) {
    return {
      coordinates: [],
      distanceKm: 0,
      durationMin: 0,
      avoidedStations: [],
      cautionStations: [],
    };
  }

  const waypointsStr = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  let coords: [number, number][] = waypoints;
  let distanceKm = 0;
  let durationMin = 0;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${waypointsStr}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      coords = route.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );
      distanceKm = Number((route.distance / 1000).toFixed(1));
      durationMin = Math.round(route.duration / 60);
    }
  } catch (err) {
    console.warn('OSRM route fetch failed, using fallback:', err);
    let dist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      dist += haversineDistance(
        waypoints[i][0],
        waypoints[i][1],
        waypoints[i + 1][0],
        waypoints[i + 1][1]
      );
    }
    distanceKm = Number(dist.toFixed(1));
    durationMin = Math.round((distanceKm / 30) * 60);
  }

  const dangerStations = allStations.filter((s) => s.status === 'danger');
  const cautionStations = allStations.filter((s) => s.status === 'caution');

  const avoidedStations = dangerStations.filter((dangerSt) => {
    const minLat = Math.min(...waypoints.map((w) => w[0])) - 0.05;
    const maxLat = Math.max(...waypoints.map((w) => w[0])) + 0.05;
    const minLng = Math.min(...waypoints.map((w) => w[1])) - 0.05;
    const maxLng = Math.max(...waypoints.map((w) => w[1])) + 0.05;

    return (
      dangerSt.latitude >= minLat &&
      dangerSt.latitude <= maxLat &&
      dangerSt.longitude >= minLng &&
      dangerSt.longitude <= maxLng
    );
  });

  return {
    coordinates: coords,
    distanceKm,
    durationMin,
    avoidedStations,
    cautionStations,
  };
}

/* ─── Graph & Safe Pathfinding ───────────────── */

function buildGraph(stations: CameraStation[]) {
  const adj: Record<string, string[]> = {};
  for (const s of stations) adj[s.id] = [];
  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const d = haversineDistance(
        stations[i].latitude,
        stations[i].longitude,
        stations[j].latitude,
        stations[j].longitude
      );
      if (d < 15) {
        adj[stations[i].id].push(stations[j].id);
        adj[stations[j].id].push(stations[i].id);
      }
    }
  }
  return adj;
}

function findSafePath(
  stations: CameraStation[],
  originId: string,
  destId: string
): string[] | null {
  const adj = buildGraph(stations);
  const dangerIds = new Set(
    stations.filter((s) => s.status === 'danger').map((s) => s.id)
  );

  const queue: string[][] = [[originId]];
  const visited = new Set<string>([originId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === destId) return path;

    for (const neighbor of adj[current] || []) {
      if (visited.has(neighbor)) continue;
      if (neighbor !== destId && dangerIds.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push([...path, neighbor]);
    }
  }

  return null;
}

function findSafePathForCoordinates(
  origin: RoutePoint,
  dest: RoutePoint,
  stations: CameraStation[]
): [number, number][] {
  const dangerStations = stations.filter((s) => s.status === 'danger');
  const safeStations = stations.filter((s) => s.status !== 'danger');

  let closestSafeToOrigin: CameraStation | null = null;
  let minOriginDist = Infinity;
  for (const s of safeStations) {
    const d = haversineDistance(origin.lat, origin.lng, s.latitude, s.longitude);
    if (d < minOriginDist) {
      minOriginDist = d;
      closestSafeToOrigin = s;
    }
  }

  let closestSafeToDest: CameraStation | null = null;
  let minDestDist = Infinity;
  for (const s of safeStations) {
    const d = haversineDistance(dest.lat, dest.lng, s.latitude, s.longitude);
    if (d < minDestDist) {
      minDestDist = d;
      closestSafeToDest = s;
    }
  }

  const resultWaypoints: [number, number][] = [[origin.lat, origin.lng]];

  const directDangerStations = dangerStations.filter((dSt) => {
    const dStart = haversineDistance(origin.lat, origin.lng, dSt.latitude, dSt.longitude);
    const dEnd = haversineDistance(dest.lat, dest.lng, dSt.latitude, dSt.longitude);
    const dDirect = haversineDistance(origin.lat, origin.lng, dest.lat, dest.lng);
    return (dStart + dEnd) < (dDirect + 1.2) && dStart < dDirect && dEnd < dDirect;
  });

  if (
    directDangerStations.length > 0 &&
    closestSafeToOrigin &&
    closestSafeToDest &&
    closestSafeToOrigin.id !== closestSafeToDest.id
  ) {
    const safeNodePath = findSafePath(stations, closestSafeToOrigin.id, closestSafeToDest.id);
    if (safeNodePath) {
      for (const stId of safeNodePath) {
        const node = stations.find((s) => s.id === stId);
        if (node) {
          resultWaypoints.push([node.latitude, node.longitude]);
        }
      }
    } else {
      resultWaypoints.push([closestSafeToOrigin.latitude, closestSafeToOrigin.longitude]);
      resultWaypoints.push([closestSafeToDest.latitude, closestSafeToDest.longitude]);
    }
  } else if (
    closestSafeToOrigin &&
    closestSafeToDest &&
    (minOriginDist > 3 || minDestDist > 3)
  ) {
    const safeNodePath = findSafePath(stations, closestSafeToOrigin.id, closestSafeToDest.id);
    if (safeNodePath && safeNodePath.length > 2) {
      for (const stId of safeNodePath.slice(1, -1)) {
        const node = stations.find((s) => s.id === stId);
        if (node) resultWaypoints.push([node.latitude, node.longitude]);
      }
    }
  }

  resultWaypoints.push([dest.lat, dest.lng]);
  return resultWaypoints;
}

/* ─── Map Click & Event Component ────────────── */
function MapClickHandler({
  pinningMode,
  onMapClick,
}: {
  pinningMode: 'origin' | 'destination' | null;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (pinningMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

/* ─── FlyTo Helper ───────────────────────────── */
function FlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 0.8 });
  }, [center, map]);
  return null;
}

/* ─── Road Segment Style Config ──────────────── */
const SEGMENT_STYLES: Record<
  StationStatus,
  { color: string; weight: number; opacity: number; dashArray?: string }
> = {
  safe: { color: '#4F5B2A', weight: 4, opacity: 0.7 },
  caution: { color: '#B8892D', weight: 5, opacity: 0.75 },
  danger: { color: '#C2410C', weight: 6, opacity: 0.8, dashArray: '6, 8' },
};

/* ─── Main Component ─────────────────────────── */

export default function MapPage() {
  const { stations } = useCameraStations();
  const { reports } = useCitizenReports(stations);
  const [selectedStation, setSelectedStation] = useState<CameraStation | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  // Route finder state with custom map pinning
  const [routeOpen, setRouteOpen] = useState(false);
  const [pinningMode, setPinningMode] = useState<'origin' | 'destination' | null>(null);
  const [originPoint, setOriginPoint] = useState<RoutePoint | null>(null);
  const [destPoint, setDestPoint] = useState<RoutePoint | null>(null);

  const [routeError, setRouteError] = useState('');
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [isComputingRoute, setIsComputingRoute] = useState(false);
  const [routeDetails, setRouteDetails] = useState<DetailedRouteResult | null>(null);
  const [routeMessage, setRouteMessage] = useState('');

  // Reports overlay toggle
  const [showReports, setShowReports] = useState(true);

  // Road segment geometries from OSRM
  const [roadSegments, setRoadSegments] = useState<RoadSegment[]>([]);

  // Compute pairs and fetch OSRM road geometries
  useEffect(() => {
    const pairs: { from: CameraStation; to: CameraStation }[] = [];
    for (let i = 0; i < stations.length; i++) {
      for (let j = i + 1; j < stations.length; j++) {
        const d = haversineDistance(
          stations[i].latitude,
          stations[i].longitude,
          stations[j].latitude,
          stations[j].longitude
        );
        if (d < 15) {
          pairs.push({ from: stations[i], to: stations[j] });
        }
      }
    }

    const loadGeometries = async () => {
      const results: RoadSegment[] = await Promise.all(
        pairs.map(async ({ from, to }) => {
          const worstStatus: StationStatus =
            from.status === 'danger' || to.status === 'danger'
              ? 'danger'
              : from.status === 'caution' || to.status === 'caution'
              ? 'caution'
              : 'safe';

          const geometry = await fetchRoadGeometry(
            from.latitude,
            from.longitude,
            to.latitude,
            to.longitude
          );

          return {
            key: `${from.id}-${to.id}`,
            from,
            to,
            geometry,
            status: worstStatus,
          };
        })
      );
      setRoadSegments(results);
    };

    if (stations.length > 0) {
      loadGeometries();
    }
  }, [stations]);

  // Handle map click to pin points
  const handleMapPin = useCallback(
    (lat: number, lng: number) => {
      const name = getNearestLocationName(lat, lng, stations);

      if (pinningMode === 'origin') {
        setOriginPoint({ lat, lng, name, isCustom: true });
        setRouteError('');
        if (!destPoint) {
          setPinningMode('destination');
        } else {
          setPinningMode(null);
        }
      } else if (pinningMode === 'destination') {
        setDestPoint({ lat, lng, name, isCustom: true });
        setRouteError('');
        setPinningMode(null);
      }
    },
    [pinningMode, stations, destPoint]
  );

  // Quick set from station
  const setStationAsOrigin = (st: CameraStation) => {
    setOriginPoint({
      lat: st.latitude,
      lng: st.longitude,
      name: st.name,
      stationId: st.id,
      isCustom: false,
    });
    setRouteOpen(true);
    setRouteError('');
    if (!destPoint) setPinningMode('destination');
  };

  const setStationAsDestination = (st: CameraStation) => {
    setDestPoint({
      lat: st.latitude,
      lng: st.longitude,
      name: st.name,
      stationId: st.id,
      isCustom: false,
    });
    setRouteOpen(true);
    setRouteError('');
    setPinningMode(null);
  };

  // Swap origin and destination
  const handleSwapPoints = () => {
    const temp = originPoint;
    setOriginPoint(destPoint);
    setDestPoint(temp);
    setRouteGeometry([]);
    setRouteDetails(null);
    setRouteMessage('');
  };

  // Reset route finder
  const handleClearRoute = () => {
    setOriginPoint(null);
    setDestPoint(null);
    setPinningMode(null);
    setRouteGeometry([]);
    setRouteDetails(null);
    setRouteMessage('');
    setRouteError('');
  };

  // Compute safe route using FastAPI backend with client fallback
  const handleFindSafeRoute = useCallback(async () => {
    if (!originPoint || !destPoint) {
      setRouteError('Please set both a start location and destination.');
      return;
    }

    if (
      haversineDistance(originPoint.lat, originPoint.lng, destPoint.lat, destPoint.lng) <
      0.1
    ) {
      setRouteError('Start and destination cannot be the same location.');
      return;
    }

    setIsComputingRoute(true);
    setRouteError('');

    try {
      // 1. Try FastAPI backend safe route calculation if landmark / station IDs are available
      const origQuery = originPoint.stationId || originPoint.name;
      const destQuery = destPoint.stationId || destPoint.name;

      if (originPoint.stationId && destPoint.stationId) {
        try {
          const res = await getSafeRoute(origQuery, destQuery);
          if (res.success && res.coordinates && res.coordinates.length > 0) {
            const avoided = stations.filter((s) =>
              res.summary.danger_stations_avoided?.includes(s.name) ||
              res.summary.danger_stations_avoided?.includes(s.id)
            );
            const caution = stations.filter((s) =>
              res.summary.caution_zones_encountered?.includes(s.name) ||
              res.summary.caution_zones_encountered?.includes(s.id)
            );

            setRouteGeometry(res.coordinates as [number, number][]);
            setRouteDetails({
              coordinates: res.coordinates as [number, number][],
              distanceKm: res.summary.total_distance_km,
              durationMin: Math.round(res.summary.estimated_duration_min),
              avoidedStations: avoided.length > 0 ? avoided : stations.filter((s) => s.status === 'danger'),
              cautionStations: caution,
            });
            setRouteMessage(res.message);
            return;
          }
        } catch (backendErr) {
          console.warn('FastAPI route endpoint fallback to local resolver:', backendErr);
        }
      }

      // 2. Client-side flood graph + OSRM routing for arbitrary pinned coordinates or fallback
      const waypoints = findSafePathForCoordinates(originPoint, destPoint, stations);
      const detailedResult = await fetchDetailedRouteGeometry(waypoints, stations);

      if (detailedResult.coordinates.length < 2) {
        setRouteError('Could not construct road path. Please try different coordinates.');
        setRouteGeometry([]);
        setRouteDetails(null);
      } else {
        setRouteGeometry(detailedResult.coordinates);
        setRouteDetails(detailedResult);
        setRouteMessage(`Safe route generated (${detailedResult.avoidedStations.length} flooded zones avoided).`);
        setRouteError('');
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      setRouteError('Failed to compute safe route. Please try again.');
    } finally {
      setIsComputingRoute(false);
    }
  }, [originPoint, destPoint, stations]);

  return (
    <div
      className={`page-enter relative ${
        pinningMode ? 'cursor-crosshair' : ''
      }`}
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Map */}
      <MapContainer
        center={DELHI_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full z-0"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Map Click Listener for Pinning */}
        <MapClickHandler
          pinningMode={pinningMode}
          onMapClick={handleMapPin}
        />

        {flyTarget && <FlyTo center={flyTarget} />}

        {/* OSRM road-snapped segment lines */}
        {roadSegments.map((seg) => {
          if (!seg.geometry || seg.geometry.length < 2) return null;
          const style = SEGMENT_STYLES[seg.status];
          return (
            <Polyline
              key={seg.key}
              positions={seg.geometry}
              pathOptions={style}
            />
          );
        })}

        {/* Safe route highlight (road-snapped) */}
        {routeGeometry.length > 1 && (
          <>
            {/* Outer soft glow line */}
            <Polyline
              positions={routeGeometry}
              pathOptions={{
                color: '#2D5A27',
                weight: 10,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Core crisp safe route line */}
            <Polyline
              positions={routeGeometry}
              pathOptions={{
                color: '#2D5A27',
                weight: 6,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* Origin Pin Marker */}
        {originPoint && (
          <Marker
            position={[originPoint.lat, originPoint.lng]}
            icon={makePinIcon('origin')}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                const name = getNearestLocationName(
                  position.lat,
                  position.lng,
                  stations
                );
                setOriginPoint({
                  lat: position.lat,
                  lng: position.lng,
                  name,
                  isCustom: true,
                });
                setRouteGeometry([]);
                setRouteDetails(null);
                setRouteMessage('');
              },
            }}
          >
            <Popup>
              <div className="p-1 min-w-[170px]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-forest">
                  <span className="w-4 h-4 rounded-full bg-forest text-white flex items-center justify-center text-[10px]">
                    A
                  </span>
                  Starting Point (Drag to Move)
                </div>
                <p className="text-xs text-dark mt-1 font-medium">
                  {originPoint.name}
                </p>
                <p className="text-[10px] text-dark/50 font-mono mt-0.5">
                  {originPoint.lat.toFixed(4)}, {originPoint.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination Pin Marker */}
        {destPoint && (
          <Marker
            position={[destPoint.lat, destPoint.lng]}
            icon={makePinIcon('destination')}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                const name = getNearestLocationName(
                  position.lat,
                  position.lng,
                  stations
                );
                setDestPoint({
                  lat: position.lat,
                  lng: position.lng,
                  name,
                  isCustom: true,
                });
                setRouteGeometry([]);
                setRouteDetails(null);
                setRouteMessage('');
              },
            }}
          >
            <Popup>
              <div className="p-1 min-w-[170px]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-danger">
                  <span className="w-4 h-4 rounded-full bg-danger text-white flex items-center justify-center text-[10px]">
                    B
                  </span>
                  Destination (Drag to Move)
                </div>
                <p className="text-xs text-dark mt-1 font-medium">
                  {destPoint.name}
                </p>
                <p className="text-[10px] text-dark/50 font-mono mt-0.5">
                  {destPoint.lat.toFixed(4)}, {destPoint.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Station markers */}
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={makeMarkerIcon(station.status)}
            eventHandlers={{
              click: () => {
                setSelectedStation(station);
                setFlyTarget([station.latitude, station.longitude]);
              },
            }}
          >
            <Popup>
              <div className="min-w-[200px] p-1">
                <p className="font-semibold text-sm text-dark">{station.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={station.status} />
                  <span className="text-xs text-dark/60 font-medium">
                    {station.water_level_cm} cm
                  </span>
                </div>
                {/* Quick route buttons in popup */}
                <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-sand">
                  <button
                    onClick={() => setStationAsOrigin(station)}
                    className="px-2 py-1 rounded bg-forest/10 hover:bg-forest/20 text-forest text-[11px] font-medium transition-colors text-center"
                  >
                    📍 Set Start
                  </button>
                  <button
                    onClick={() => setStationAsDestination(station)}
                    className="px-2 py-1 rounded bg-danger/10 hover:bg-danger/20 text-danger text-[11px] font-medium transition-colors text-center"
                  >
                    🎯 Set Dest
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Citizen report markers (toggleable) */}
        {showReports &&
          reports.map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={makeReportMarkerIcon(report.verified)}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <p className="font-semibold text-xs text-dark">
                    {report.location_name}
                  </p>
                  <p className="text-xs text-dark/50 mt-0.5">
                    {report.hazard_type}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {report.verified ? (
                      <span className="text-[10px] text-forest font-medium">
                        🟢 Verified by Camera
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber font-medium">
                        🟡 Pending Confirmation
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-dark/40 mt-0.5">
                    {timeAgo(report.created_at)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* Floating Active Pinning Mode Banner */}
      {pinningMode && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1100]">
          <div className="flex items-center gap-3 px-5 py-3 bg-dark text-white rounded-full shadow-2xl border-2 border-amber">
            <div className="w-3 h-3 rounded-full bg-amber animate-ping" />
            <p className="text-xs md:text-sm font-semibold">
              {pinningMode === 'origin'
                ? '📍 Click anywhere on the map to place Starting Point (A)'
                : '🎯 Click anywhere on the map to place Destination Point (B)'}
            </p>
            <button
              onClick={() => setPinningMode(null)}
              className="ml-2 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Top-left controls */}
      <div className="absolute top-4 left-4 z-[1000] space-y-2 max-w-[calc(100vw-32px)]">
        {/* Route Finder Panel */}
        {!routeOpen ? (
          <button
            onClick={() => {
              setRouteOpen(true);
              if (!originPoint) setPinningMode('origin');
            }}
            className="flex items-center gap-2.5 px-4 py-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-sand
                       text-sm font-semibold text-dark hover:shadow-2xl hover:border-forest/40 transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-forest/10 flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-white transition-colors">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <div className="text-left font-bold text-sm">Safe Road Navigation</div>
              <div className="text-[11px] text-dark/50 font-normal">
                {routeGeometry.length > 0
                  ? 'Active Route Displayed'
                  : 'Pin points on map & bypass floods'}
              </div>
            </div>
          </button>
        ) : (
          <div className="w-88 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-sand overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-forest text-cream">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-amber" />
                <span className="font-bold text-sm tracking-wide">
                  Flood-Safe Route Planner
                </span>
              </div>
              <button
                onClick={() => {
                  setRouteOpen(false);
                  setPinningMode(null);
                }}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 max-h-[calc(100vh-220px)] overflow-y-auto">
              {/* Origin Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-dark/70 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-forest text-white text-[10px] font-extrabold flex items-center justify-center">
                      A
                    </span>
                    Starting Location
                  </label>
                  <button
                    onClick={() =>
                      setPinningMode(pinningMode === 'origin' ? null : 'origin')
                    }
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-all ${
                      pinningMode === 'origin'
                        ? 'bg-forest text-white shadow-sm'
                        : 'bg-forest/10 text-forest hover:bg-forest/20'
                    }`}
                  >
                    <LocateFixed className="w-3 h-3" />
                    {pinningMode === 'origin' ? 'Click on Map...' : 'Pin on Map'}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={
                      originPoint
                        ? originPoint.name
                        : pinningMode === 'origin'
                        ? 'Click anywhere on map to pin...'
                        : 'Select from dropdown or pin on map'
                    }
                    placeholder="Set starting point"
                    onClick={() => setPinningMode('origin')}
                    className={`w-full px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                      originPoint
                        ? 'bg-cream border-forest/30 text-dark'
                        : pinningMode === 'origin'
                        ? 'bg-amber/10 border-amber text-amber font-semibold animate-pulse'
                        : 'bg-cream/60 border-sand text-dark/40 hover:border-forest/40'
                    }`}
                  />
                  {originPoint && (
                    <button
                      onClick={() => {
                        setOriginPoint(null);
                        setRouteGeometry([]);
                        setRouteDetails(null);
                        setRouteMessage('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark/40 hover:text-dark"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Preset Dropdown for Start */}
                <select
                  value={originPoint?.stationId || ''}
                  onChange={(e) => {
                    const st = stations.find((s) => s.id === e.target.value);
                    if (st) setStationAsOrigin(st);
                  }}
                  className="mt-1.5 w-full px-2.5 py-1.5 rounded-lg bg-cream/70 border border-sand text-[11px] text-dark/70 focus:outline-none"
                >
                  <option value="">Or choose a camera station / landmark...</option>
                  {stations.map((s) => (
                    <option key={`orig-${s.id}`} value={s.id}>
                      {s.name} ({s.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1">
                <button
                  onClick={handleSwapPoints}
                  disabled={!originPoint && !destPoint}
                  className="p-1.5 rounded-full bg-sand/60 hover:bg-forest/10 hover:text-forest text-dark/60 border border-sand transition-all active:scale-90"
                  title="Swap Start & Destination"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Destination Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-dark/70 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-danger text-white text-[10px] font-extrabold flex items-center justify-center">
                      B
                    </span>
                    Destination Point
                  </label>
                  <button
                    onClick={() =>
                      setPinningMode(pinningMode === 'destination' ? null : 'destination')
                    }
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-all ${
                      pinningMode === 'destination'
                        ? 'bg-danger text-white shadow-sm'
                        : 'bg-danger/10 text-danger hover:bg-danger/20'
                    }`}
                  >
                    <LocateFixed className="w-3 h-3" />
                    {pinningMode === 'destination' ? 'Click on Map...' : 'Pin on Map'}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={
                      destPoint
                        ? destPoint.name
                        : pinningMode === 'destination'
                        ? 'Click anywhere on map to pin...'
                        : 'Select from dropdown or pin on map'
                    }
                    placeholder="Set destination point"
                    onClick={() => setPinningMode('destination')}
                    className={`w-full px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                      destPoint
                        ? 'bg-cream border-danger/30 text-dark'
                        : pinningMode === 'destination'
                        ? 'bg-amber/10 border-amber text-amber font-semibold animate-pulse'
                        : 'bg-cream/60 border-sand text-dark/40 hover:border-danger/40'
                    }`}
                  />
                  {destPoint && (
                    <button
                      onClick={() => {
                        setDestPoint(null);
                        setRouteGeometry([]);
                        setRouteDetails(null);
                        setRouteMessage('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark/40 hover:text-dark"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Preset Dropdown for Destination */}
                <select
                  value={destPoint?.stationId || ''}
                  onChange={(e) => {
                    const st = stations.find((s) => s.id === e.target.value);
                    if (st) setStationAsDestination(st);
                  }}
                  className="mt-1.5 w-full px-2.5 py-1.5 rounded-lg bg-cream/70 border border-sand text-[11px] text-dark/70 focus:outline-none"
                >
                  <option value="">Or choose a camera station / landmark...</option>
                  {stations.map((s) => (
                    <option key={`dest-${s.id}`} value={s.id}>
                      {s.name} ({s.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  onClick={handleFindSafeRoute}
                  disabled={isComputingRoute || !originPoint || !destPoint}
                  className="col-span-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                             bg-forest text-cream text-xs font-bold shadow-md
                             hover:bg-forest/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isComputingRoute ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                      Computing Safe Route...
                    </span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-amber" />
                      Find Safest Route
                    </>
                  )}
                </button>

                <button
                  onClick={handleClearRoute}
                  className="col-span-1 flex items-center justify-center px-2 py-2.5 rounded-xl
                             bg-sand/60 hover:bg-sand text-dark/70 text-xs font-medium transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Route Error */}
              {routeError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 border border-danger/20">
                  <AlertTriangle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-danger font-medium leading-tight">
                    {routeError}
                  </p>
                </div>
              )}

              {/* Active Route Summary Card */}
              {routeDetails && (
                <div className="p-3.5 rounded-2xl bg-forest/5 border border-forest/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-forest font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-forest" />
                      Safe Path Calculated
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-forest text-white">
                      FastAPI + OSRM
                    </span>
                  </div>

                  {routeMessage && (
                    <p className="text-xs text-dark/70 italic bg-white/70 p-2 rounded-lg border border-sand/60">
                      {routeMessage}
                    </p>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-white border border-sand shadow-sm text-center">
                      <div className="text-[10px] font-medium text-dark/50">Total Distance</div>
                      <div className="text-base font-extrabold text-dark mt-0.5">
                        {routeDetails.distanceKm} km
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-sand shadow-sm text-center">
                      <div className="text-[10px] font-medium text-dark/50">Est. Travel Time</div>
                      <div className="text-base font-extrabold text-forest mt-0.5">
                        ~{routeDetails.durationMin} mins
                      </div>
                    </div>
                  </div>

                  {/* Avoided flooded zones */}
                  {routeDetails.avoidedStations.length > 0 && (
                    <div className="pt-1">
                      <div className="text-[11px] font-bold text-danger flex items-center gap-1 mb-1">
                        <AlertOctagon className="w-3 h-3" />
                        Bypassed Flooded Underpasses ({routeDetails.avoidedStations.length}):
                      </div>
                      <div className="space-y-1">
                        {routeDetails.avoidedStations.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between text-[10px] p-1.5 rounded-lg bg-danger/10 border border-danger/20 text-dark/80"
                          >
                            <span className="font-medium truncate pr-1">
                              ⛔ {st.name}
                            </span>
                            <span className="font-bold text-danger flex-shrink-0">
                              {st.water_level_cm} cm flooded
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-dark/50 italic text-center pt-0.5">
                    Tip: You can drag pins <b>A</b> and <b>B</b> directly on the map to readjust.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Community reports toggle */}
        <button
          onClick={() => setShowReports(!showReports)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium
                     transition-all ${
                       showReports
                         ? 'bg-forest text-cream border-forest'
                         : 'bg-white text-dark/70 border-sand hover:shadow-xl'
                     }`}
        >
          <Users className="w-3.5 h-3.5" />
          Community Reports ({reports.length})
        </button>
      </div>

      {/* Station Drawer */}
      {selectedStation && (
        <div className="absolute top-0 right-0 bottom-0 w-96 max-w-full z-[1000] drawer-enter">
          <div className="h-full bg-white border-l border-sand shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-sand">
              <h3 className="font-bold text-dark text-lg truncate pr-4">
                {selectedStation.name}
              </h3>
              <button
                onClick={() => {
                  setSelectedStation(null);
                  setFlyTarget(null);
                }}
                className="w-8 h-8 rounded-lg bg-sand/50 flex items-center justify-center
                           hover:bg-sand transition-colors"
              >
                <X className="w-4 h-4 text-dark" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-3">
                <StatusBadge status={selectedStation.status} />
                <DepthBadge
                  cm={selectedStation.water_level_cm}
                  status={selectedStation.status}
                />
              </div>

              {/* Quick routing actions in drawer */}
              <div className="p-3 rounded-xl bg-sand/40 border border-sand space-y-2">
                <div className="text-xs font-bold text-dark/70">Route Navigation Actions:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setStationAsOrigin(selectedStation);
                      setSelectedStation(null);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-forest text-white text-xs font-bold hover:bg-forest/90 transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Set as Start (A)
                  </button>
                  <button
                    onClick={() => {
                      setStationAsDestination(selectedStation);
                      setSelectedStation(null);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-danger text-white text-xs font-bold hover:bg-danger/90 transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Set as Dest (B)
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cream border border-sand">
                <p className="text-sm text-dark/70 leading-relaxed">
                  {getPassabilityAdvice(
                    selectedStation.status,
                    selectedStation.water_level_cm
                  )}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-dark/50">Hazard</span>
                  <span className="font-medium text-dark">
                    {selectedStation.hazard}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark/50">Water Level</span>
                  <span className="font-medium text-dark">
                    {selectedStation.water_level_cm} cm
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark/50">Last Updated</span>
                  <span className="font-medium text-dark">
                    {timeAgo(selectedStation.last_updated || new Date().toISOString())}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark/50">Coordinates</span>
                  <span className="font-mono text-xs text-dark/70">
                    {selectedStation.latitude.toFixed(4)},{' '}
                    {selectedStation.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Nearby citizen reports */}
              {reports.filter(
                (r) =>
                  haversineDistance(
                    r.latitude,
                    r.longitude,
                    selectedStation.latitude,
                    selectedStation.longitude
                  ) <= 1
              ).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-dark/60 uppercase tracking-wider mb-2">
                    Nearby Reports
                  </h4>
                  <div className="space-y-2">
                    {reports
                      .filter(
                        (r) =>
                          haversineDistance(
                            r.latitude,
                            r.longitude,
                            selectedStation.latitude,
                            selectedStation.longitude
                          ) <= 1
                      )
                      .slice(0, 3)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-start gap-2 p-2 rounded-lg bg-cream border border-sand/60"
                        >
                          <div className="flex-1">
                            <p className="text-xs font-medium text-dark">
                              {r.hazard_type}
                            </p>
                            <p className="text-[10px] text-dark/40">
                              {timeAgo(r.created_at)}
                            </p>
                          </div>
                          {r.verified ? (
                            <span className="text-[10px] text-forest font-medium flex items-center gap-0.5">
                              <Eye className="w-2.5 h-2.5" /> Verified
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber font-medium flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> Pending
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer action */}
            <div className="px-5 py-4 border-t border-sand">
              <Link
                to={`/cameras?id=${selectedStation.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                           bg-forest text-cream font-medium text-sm
                           hover:bg-forest/90 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Camera View →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
