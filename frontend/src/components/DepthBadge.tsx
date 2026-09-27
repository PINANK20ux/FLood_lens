import type { StationStatus } from '../types';
import { getDepthLabel } from '../utils/helpers';

interface Props {
  cm?: number;
  status: StationStatus | 'Flooded' | 'Caution' | 'Clear';
  label?: string;
}

const bgClasses: Record<StationStatus, string> = {
  safe: 'bg-forest text-cream',
  caution: 'bg-amber text-dark',
  danger: 'bg-danger text-cream',
};

export default function DepthBadge({ cm = 0, status, label }: Props) {
  const normalizedStatus: StationStatus =
    status === 'Flooded'
      ? 'danger'
      : status === 'Caution'
      ? 'caution'
      : status === 'Clear'
      ? 'safe'
      : status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${bgClasses[normalizedStatus]}`}
    >
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
        <path d="M8 1s-5 6.5-5 10a5 5 0 0 0 10 0C13 7.5 8 1 8 1z" />
      </svg>
      {label || getDepthLabel(cm)}
    </span>
  );
}
