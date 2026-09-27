import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Map,
  Camera,
  AlertTriangle,
  Info,
  Search,
  ShieldCheck,
  TriangleAlert,
  OctagonX,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { useCameraStations } from '../hooks/useCameraStations';
import StatusBadge from '../components/StatusBadge';
import MiniMapPreview from '../components/MiniMapPreview';

export default function Home() {
  const { stations } = useCameraStations();
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const safe = stations.filter((s) => s.status === 'safe').length;
    const caution = stations.filter((s) => s.status === 'caution').length;
    const danger = stations.filter((s) => s.status === 'danger').length;
    return { total: stations.length, safe, caution, danger };
  }, [stations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.hazard || '').toLowerCase().includes(q)
    );
  }, [search, stations]);

  const navCards = [
    {
      to: '/map',
      icon: Map,
      title: 'Safe Roads Map',
      desc: 'View flooded and clear roads on a live Delhi map.',
      color: 'bg-forest',
    },
    {
      to: '/cameras',
      icon: Camera,
      title: 'Street Cameras',
      desc: 'Check real-time camera snapshots from key junctions.',
      color: 'bg-amber',
    },
    {
      to: '/report',
      icon: AlertTriangle,
      title: 'Report an Issue',
      desc: 'Spotted a flood or hazard? Let us know instantly.',
      color: 'bg-danger',
    },
    {
      to: '/about',
      icon: Info,
      title: 'How It Works',
      desc: "Learn how FloodLens keeps Delhi's roads safe.",
      color: 'bg-dark',
    },
  ];

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forest/5 via-transparent to-amber/5 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-forest/10 border border-forest/20 w-fit">
                <Radio className="w-3.5 h-3.5 text-forest animate-pulse" />
                <span className="text-xs font-medium text-forest">
                  Live monitoring across Delhi
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-dark leading-tight tracking-tight">
                Clear paths when{' '}
                <span className="text-forest">waters rise.</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg md:text-xl text-dark/70 leading-relaxed max-w-2xl">
                Live flood tracking across Delhi's key roads and underpasses using
                camera intelligence. Know which roads are safe before you leave.
              </p>

              {/* Search */}
              <div className="mt-7 relative max-w-xl z-30">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search a Delhi road — e.g. "Minto Bridge", "ITO"'
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white border border-sand
                             text-dark placeholder-dark/40 text-sm
                             focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest
                             transition-all shadow-sm"
                />
                {filtered.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-sand shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto">
                    {filtered.map((s) => (
                      <Link
                        key={s.id}
                        to={`/cameras?id=${s.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-sand/30 transition-colors border-b border-sand/50 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-dark">{s.name}</p>
                          <p className="text-xs text-dark/50">{s.hazard}</p>
                        </div>
                        <StatusBadge status={s.status} size="sm" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Cards */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Monitored Roads',
                    value: stats.total,
                    icon: Radio,
                    bg: 'bg-dark/5 border-dark/10',
                    text: 'text-dark',
                  },
                  {
                    label: 'Open & Dry',
                    value: stats.safe,
                    icon: ShieldCheck,
                    bg: 'bg-forest/10 border-forest/20',
                    text: 'text-forest',
                  },
                  {
                    label: 'Caution',
                    value: stats.caution,
                    icon: TriangleAlert,
                    bg: 'bg-amber/10 border-amber/20',
                    text: 'text-amber',
                  },
                  {
                    label: 'Impassable',
                    value: stats.danger,
                    icon: OctagonX,
                    bg: 'bg-danger/10 border-danger/20',
                    text: 'text-danger',
                  },
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border ${pill.bg} transition-transform hover:scale-[1.02] shadow-xs`}
                  >
                    <pill.icon className={`w-6 h-6 shrink-0 ${pill.text}`} strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className={`text-xl sm:text-2xl font-bold leading-tight ${pill.text}`}>
                        {pill.value}
                      </p>
                      <p className="text-[11px] text-dark/60 font-medium truncate">
                        {pill.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Mini-Map Preview Card */}
            <div className="lg:col-span-5 w-full">
              <MiniMapPreview stations={stations} />
            </div>
          </div>
        </div>
      </section>

      {/* Quick nav cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-dark mb-6">Explore FloodLens</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {navCards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="group flex flex-col p-6 rounded-2xl bg-white border border-sand/60
                         shadow-sm hover:shadow-lg hover:border-forest/30
                         transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className={`w-11 h-11 rounded-xl ${card.color} flex items-center justify-center mb-4
                            transition-transform group-hover:scale-110`}
              >
                <card.icon className="w-5 h-5 text-cream" />
              </div>
              <h3 className="text-lg font-semibold text-dark mb-1">
                {card.title}
              </h3>
              <p className="text-sm text-dark/50 leading-relaxed flex-1">
                {card.desc}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-forest opacity-0 group-hover:opacity-100 transition-opacity">
                Explore <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
