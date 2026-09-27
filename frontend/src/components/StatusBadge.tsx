import type { StationStatus } from '../types';
import { STATUS_LABELS } from '../utils/helpers';

interface Props {
  status: StationStatus | 'Flooded' | 'Caution' | 'Clear';
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

const colorClasses: Record<StationStatus, string> = {
  safe: 'bg-emerald-950/85 text-emerald-300 border-emerald-500/50 backdrop-blur-md shadow-sm',
  caution: 'bg-amber-950/85 text-amber-300 border-amber-500/50 backdrop-blur-md shadow-sm',
  danger: 'bg-rose-950/90 text-rose-300 border-rose-500/50 backdrop-blur-md shadow-sm',
};

export default function StatusBadge({ status, size = 'md' }: Props) {
  const normalizedKey: StationStatus =
    status === 'Flooded'
      ? 'danger'
      : status === 'Caution'
      ? 'caution'
      : status === 'Clear'
      ? 'safe'
      : status;

  const displayLabel =
    status === 'Flooded'
      ? 'Flooded'
      : status === 'Caution'
      ? 'Caution'
      : status === 'Clear'
      ? 'Clear'
      : STATUS_LABELS[status] || status;

  const dot = normalizedKey === 'safe' ? '🟢' : normalizedKey === 'caution' ? '🟡' : '🔴';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses[size]} ${colorClasses[normalizedKey]}`}
    >
      <span className="text-[0.65em]">{dot}</span>
      {displayLabel}
    </span>
  );
}
