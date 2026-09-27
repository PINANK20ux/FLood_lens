import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Camera } from 'lucide-react';
import type { CameraStation, StationStatus } from '../types';
import StatusBadge from './StatusBadge';
import DepthBadge from './DepthBadge';
import { DELHI_CENTER } from '../data/mockData';

interface Props {
  stations: CameraStation[];
}

function makeMiniMarkerIcon(status: StationStatus) {
  const color =
    status === 'danger'
      ? '#C2410C'
      : status === 'caution'
      ? '#B8892D'
      : '#4F5B2A';

  const pulseRing =
    status === 'danger'
      ? `<div style="position:absolute;inset:-5px;border-radius:50%;background:rgba(194,65,12,0.45);animation:pulse-ring 2s ease-out infinite;"></div>`
      : '';

  return L.divIcon({
    className: 'mini-map-pin',
    html: `
      <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
        ${pulseRing}
        <div style="
          width:24px;height:24px;border-radius:50%;
          background:${color};
          border:2.5px solid #F5EFE3;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          display:flex;align-items:center;justify-content:center;
          z-index:2;
        ">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="#F5EFE3">
            <path d="M8 1s-5 6.5-5 10a5 5 0 0 0 10 0C13 7.5 8 1 8 1z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

export default function MiniMapPreview({ stations }: Props) {
  const { hasDanger, safeCount, cautionCount, dangerCount } = useMemo(() => {
    let safe = 0;
    let caution = 0;
    let danger = 0;
    for (const s of stations) {
      if (s.status === 'danger') danger++;
      else if (s.status === 'caution') caution++;
      else safe++;
    }
    return {
      hasDanger: danger > 0,
      safeCount: safe,
      cautionCount: caution,
      dangerCount: danger,
    };
  }, [stations]);

  return (
    <div className="relative w-full h-[400px] sm:h-[440px] lg:h-[470px] min-h-[380px] rounded-2xl border border-sand bg-white shadow-lg overflow-hidden flex flex-col">
      {/* Top Header Badge Overlay */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-[400] flex items-center justify-between gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-cream/90 backdrop-blur-md border border-sand/80 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                hasDanger ? 'bg-danger' : 'bg-forest'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                hasDanger ? 'bg-danger' : 'bg-forest'
              }`}
            />
          </span>
          <span className="text-xs sm:text-sm font-bold text-dark tracking-tight truncate">
            Delhi Flood Radar (Live)
          </span>
        </div>

        <Link
          to="/safe-roads"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-forest hover:bg-forest/90 text-cream text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] shrink-0"
        >
          <span>Open Full Map</span>
          <span className="text-sm leading-none font-bold">↗</span>
        </Link>
      </div>

      {/* Mini Leaflet Map */}
      <div className="relative flex-1 w-full h-full">
        <MapContainer
          center={DELHI_CENTER}
          zoom={11}
          scrollWheelZoom={false}
          zoomControl={false}
          className="h-full w-full z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />

          <ZoomControl position="bottomright" />

          {stations.map((station) => (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={makeMiniMarkerIcon(station.status)}
            >
              <Popup>
                <div className="p-1 min-w-[190px] text-dark">
                  <p className="font-bold text-sm leading-snug">{station.name}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <DepthBadge cm={station.water_level_cm} status={station.status} />
                    <StatusBadge status={station.status} size="sm" />
                  </div>
                  {station.hazard && (
                    <p className="text-[11px] text-dark/70 mt-1.5 font-medium">
                      <span className="text-dark/50">Hazard:</span> {station.hazard}
                    </p>
                  )}
                  <div className="mt-3 pt-2 border-t border-sand/60">
                    <Link
                      to={`/cameras?id=${station.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest hover:bg-forest/90 text-cream text-xs font-semibold shadow-xs transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>View Camera Details</span>
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom Summary Legend Bar */}
      <div className="absolute bottom-3 left-3 right-14 sm:right-16 z-[400] flex items-center justify-between px-3 py-1.5 rounded-lg bg-cream/90 backdrop-blur-md border border-sand/80 shadow-xs text-[11px] text-dark/70 pointer-events-none">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-forest" />
            <span className="hidden xs:inline">Clear</span>
            <span>({safeCount})</span>
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber" />
            <span className="hidden xs:inline">Caution</span>
            <span>({cautionCount})</span>
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span className="hidden xs:inline">Flooded</span>
            <span>({dangerCount})</span>
          </span>
        </div>
      </div>
    </div>
  );
}
