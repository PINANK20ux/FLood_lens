import { useState } from 'react';
import {
  MapPin,
  Send,
  CheckCircle,
  ShieldCheck,
  Camera,
  Upload,
  Droplets,
  TreePine,
  Zap,
  Circle,
  CloudRain,
  Eye,
  Clock,
  Users,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useCameraStations } from '../hooks/useCameraStations';
import { useCitizenReports } from '../hooks/useCitizenReports';
import { DELHI_LANDMARKS, DELHI_CENTER } from '../data/mockData';
import { timeAgo } from '../utils/helpers';
import type { HazardType } from '../types';

const hazardOptions: { type: HazardType; icon: React.ElementType; label: string }[] = [
  { type: 'Deep Water', icon: Droplets, label: 'Deep Water' },
  { type: 'Small Flood', icon: CloudRain, label: 'Small Flood' },
  { type: 'Fallen Tree', icon: TreePine, label: 'Fallen Tree' },
  { type: 'Broken Wire', icon: Zap, label: 'Broken Wire' },
  { type: 'Big Hole in Road', icon: Circle, label: 'Big Hole in Road' },
];

const HAZARD_COLORS: Record<HazardType, string> = {
  'Deep Water': 'bg-danger/10 text-danger border-danger/20',
  'Small Flood': 'bg-amber/10 text-amber border-amber/20',
  'Fallen Tree': 'bg-forest/10 text-forest border-forest/20',
  'Broken Wire': 'bg-danger/10 text-danger border-danger/20',
  'Big Hole in Road': 'bg-amber/10 text-amber border-amber/20',
};

function LocationPicker({
  position,
  setPosition,
}: {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  if (!position) return null;

  const icon = L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;background:#C2410C;border:3px solid #F5EFE3;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return <Marker position={position} icon={icon} />;
}

export default function ReportPage() {
  const { stations } = useCameraStations();
  const { reports, submitReport } = useCitizenReports(stations);
  const [selectedLandmark, setSelectedLandmark] = useState('');
  const [customPosition, setCustomPosition] = useState<[number, number] | null>(null);
  const [hazardType, setHazardType] = useState<HazardType | ''>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hazardType) return;

    setSubmitting(true);

    let lat = DELHI_CENTER[0];
    let lng = DELHI_CENTER[1];
    let locationName = 'Unknown Location';

    if (selectedLandmark) {
      const lm = DELHI_LANDMARKS.find((l) => l.name === selectedLandmark);
      if (lm) {
        lat = lm.lat;
        lng = lm.lng;
        locationName = lm.name;
      }
    } else if (customPosition) {
      lat = customPosition[0];
      lng = customPosition[1];
      locationName = `Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }

    await submitReport({
      location_name: locationName,
      latitude: lat,
      longitude: lng,
      hazard_type: hazardType,
    });

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="page-enter flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-forest/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-forest" />
          </div>
          <h2 className="text-2xl font-bold text-dark mb-2">
            Report Submitted!
          </h2>
          <p className="text-dark/60 mb-6">
            Thank you for helping keep Delhi's roads safe. We'll verify your
            report using nearby cameras.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setHazardType('');
              setSelectedLandmark('');
              setCustomPosition(null);
              setImagePreview(null);
            }}
            className="px-6 py-3 bg-forest text-cream rounded-xl font-medium
                       hover:bg-forest/90 transition-colors"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-dark">Report an Issue</h1>
        <p className="mt-2 text-dark/60 mb-8">
          Spotted flooding or a road hazard? Help us update the map for
          everyone.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Where is the problem?
              </label>
              <select
                value={selectedLandmark}
                onChange={(e) => {
                  setSelectedLandmark(e.target.value);
                  setCustomPosition(null);
                }}
                className="w-full px-4 py-3 rounded-xl bg-white border border-sand
                           text-dark text-sm focus:outline-none focus:ring-2
                           focus:ring-forest/30 focus:border-forest transition-all"
              >
                <option value="">Pick a Delhi landmark or drop a pin below</option>
                {DELHI_LANDMARKS.map((lm) => (
                  <option key={lm.name} value={lm.name}>
                    {lm.name}
                  </option>
                ))}
              </select>

              {/* Mini map for pin-drop */}
              {!selectedLandmark && (
                <div className="mt-3 rounded-xl overflow-hidden border border-sand h-48">
                  <MapContainer
                    center={DELHI_CENTER}
                    zoom={11}
                    className="h-full w-full"
                    zoomControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker
                      position={customPosition}
                      setPosition={(pos) => {
                        setCustomPosition(pos);
                        setSelectedLandmark('');
                      }}
                    />
                  </MapContainer>
                </div>
              )}
              {customPosition && !selectedLandmark && (
                <p className="mt-1 text-xs text-dark/50">
                  <MapPin className="inline w-3 h-3 mr-1" />
                  Pin: {customPosition[0].toFixed(4)}, {customPosition[1].toFixed(4)}
                </p>
              )}
            </div>

            {/* Hazard type */}
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                What do you see?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {hazardOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setHazardType(opt.type)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium
                               transition-all ${
                                 hazardType === opt.type
                                   ? 'bg-forest text-cream border-forest shadow-sm'
                                   : 'bg-white text-dark/70 border-sand hover:border-forest/40'
                               }`}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">
                Upload a photo (optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center gap-2 px-4 py-8 rounded-xl border-2
                             border-dashed border-sand bg-white cursor-pointer
                             hover:border-forest/40 transition-colors group"
                >
                  <Upload className="w-5 h-5 text-dark/30 group-hover:text-forest transition-colors" />
                  <span className="text-sm text-dark/40 group-hover:text-dark/60">
                    Click to upload an image
                  </span>
                </label>
              </div>
              {imagePreview && (
                <div className="mt-3 relative w-32 h-32 rounded-xl overflow-hidden border border-sand">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-dark/70
                               text-cream flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!hazardType || submitting || (!selectedLandmark && !customPosition)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                         bg-forest text-cream font-medium text-sm
                         hover:bg-forest/90 active:scale-[0.98]
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>

          {/* Verification callout */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              <div className="p-6 rounded-2xl bg-forest/5 border border-forest/15">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-forest" />
                  <h3 className="font-semibold text-dark text-sm">
                    Auto-Verified Reports
                  </h3>
                </div>
                <p className="text-sm text-dark/60 leading-relaxed mb-4">
                  FloodLens checks Delhi's nearby junction cameras to
                  auto-verify public reports. When you submit a report, we look
                  at all cameras within <strong>500 meters</strong> of your
                  location.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Camera className="w-4 h-4 text-amber mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-dark/50">
                      If a camera confirms flooding, the road color updates on the
                      map automatically.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-forest mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-dark/50">
                      Verified reports get a green check badge and are shown to
                      other users immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Community Hazard Watch ── */}
        <section className="mt-16 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-forest" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark">
                Community Hazard Watch
              </h2>
              <p className="text-sm text-dark/50">
                Recent reports from citizens across Delhi
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-12 text-dark/40">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reports yet. Be the first to report!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-xl bg-white border border-sand/60 shadow-sm
                             hover:shadow-md hover:border-forest/20 transition-all"
                >
                  {/* Header: location + time */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-dark/40 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">
                          {report.location_name}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-dark/30" />
                          <span className="text-xs text-dark/40">
                            {timeAgo(report.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hazard tag */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                  text-xs font-medium border ${HAZARD_COLORS[report.hazard_type]}`}
                    >
                      {report.hazard_type}
                    </span>
                  </div>

                  {/* Verification badge */}
                  <div className="flex items-center gap-2">
                    {report.verified ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                      bg-forest/10 border border-forest/20">
                        <Eye className="w-3 h-3 text-forest" />
                        <span className="text-xs font-medium text-forest">
                          🟢 Verified by Nearby Camera
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                                      bg-amber/10 border border-amber/20">
                        <Clock className="w-3 h-3 text-amber" />
                        <span className="text-xs font-medium text-amber">
                          🟡 Pending Confirmation
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
