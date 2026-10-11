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
  safe: 'bg-emerald-50 text-emerald-800 border-emerald-400 backdrop-blur-md shadow-xs font-semibold',
  caution: 'bg-yellow-50 text-yellow-900 border-yellow-400 backdrop-blur-md shadow-xs font-bold',
  danger: 'bg-rose-50 text-rose-800 border-rose-400 backdrop-blur-md shadow-xs font-semibold',
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
