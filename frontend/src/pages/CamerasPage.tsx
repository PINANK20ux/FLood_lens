import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera as CamIcon } from 'lucide-react';
import { useCameraStations } from '../hooks/useCameraStations';
import { useSnapshotRateLimit } from '../hooks/useSnapshotRateLimit';
import CameraCard from '../components/CameraCard';

type Filter = 'all' | 'danger' | 'caution' | 'safe';

export default function CamerasPage() {
  const { stations, refetch } = useCameraStations();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('id');

  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  const { requestsLeft, formattedCountdown, triggerRequest } = useSnapshotRateLimit();

  const filtered = useMemo(() => {
    if (filter === 'all') return stations;
    return stations.filter((s) => s.status === filter);
  }, [stations, filter]);

  const handleSnapshot = async (id: string) => {
    const allowed = triggerRequest();
    if (!allowed) {
      return;
    }

    // Trigger refresh state and update camera data
    setRefreshing((prev) => ({ ...prev, [id]: true }));
    try {
      if (refetch) {
        await refetch();
      }
    } catch {
      // Ignored - fallback station state will remain
    } finally {
      setTimeout(() => {
        setRefreshing((prev) => ({ ...prev, [id]: false }));
      }, 1500);
    }
  };

  const filters: { label: string; value: Filter }[] = [
    { label: 'All Locations', value: 'all' },
    { label: '🔴 Flooded Only', value: 'danger' },
    { label: '🟡 Caution Only', value: 'caution' },
    { label: '🟢 Clear / Safe', value: 'safe' },
  ];

  return (
    <div className="page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark">Street Cameras</h1>
          <p className="mt-2 text-dark/60">
            Live camera snapshots from monitored junctions across Delhi.
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                filter === f.value
                  ? 'bg-forest text-cream border-forest shadow-sm'
                  : 'bg-white text-dark/70 border-sand hover:border-forest/40 hover:text-dark'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Camera grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((station) => (
            <CameraCard
              key={station.id}
              station={station}
              isHighlighted={highlightId === station.id}
              isRefreshing={!!refreshing[station.id]}
              requestsLeft={requestsLeft}
              formattedCountdown={formattedCountdown}
              onRequestSnapshot={handleSnapshot}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-dark/40">
            <CamIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No cameras match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
