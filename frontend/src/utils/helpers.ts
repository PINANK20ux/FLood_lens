import type { StationStatus } from '../types';

/** Haversine distance between two lat/lon pairs in km */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const STATUS_COLORS: Record<StationStatus, string> = {
  safe: '#4F5B2A',
  caution: '#B8892D',
  danger: '#C2410C',
};

export const STATUS_BG_CLASSES: Record<StationStatus, string> = {
  safe: 'bg-forest text-cream',
  caution: 'bg-amber text-dark',
  danger: 'bg-danger text-cream',
};

export const STATUS_LABELS: Record<StationStatus, string> = {
  safe: 'Safe',
  caution: 'Caution',
  danger: 'Danger',
};

export function getDepthLabel(cm: number): string {
  if (cm <= 0) return 'Dry (0 cm)';
  if (cm <= 5) return `Trace (${cm} cm)`;
  if (cm <= 15) return `Ankle Deep (${cm} cm)`;
  if (cm <= 30) return `Shin Deep (${cm} cm)`;
  if (cm <= 45) return `Wheel Deep (${cm} cm)`;
  return `Submerged (${cm} cm)`;
}

export function getPassabilityAdvice(status: StationStatus, cm: number): string {
  if (status === 'safe') return 'Road is clear. Drive normally.';
  if (status === 'caution')
    return `Minor water on road (${cm} cm). Drive slowly and avoid stopping.`;
  if (cm >= 45)
    return `Road is heavily flooded (${cm} cm). Do not attempt to drive through.`;
  return `Significant flooding (${cm} cm). Avoid this route if possible.`;
}

export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}
