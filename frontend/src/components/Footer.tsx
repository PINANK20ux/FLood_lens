import { NavLink } from 'react-router-dom';
import { Droplets, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark text-cream/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-forest flex items-center justify-center">
                <Droplets className="w-4 h-4 text-cream" />
              </div>
              <span className="text-lg font-bold text-cream">
                Flood<span className="text-amber">Lens</span>
              </span>
            </div>
            <p className="text-sm text-cream/60 leading-relaxed">
              Clear paths when waters rise. Live flood tracking across Delhi's
              key roads and underpasses using camera intelligence.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold text-cream mb-3 uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {[
                { to: '/map', label: 'Safe Roads Map' },
                { to: '/cameras', label: 'Street Cameras' },
                { to: '/report', label: 'Report an Issue' },
                { to: '/about', label: 'How It Works' },
              ].map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className="text-sm text-cream/60 hover:text-amber transition-colors"
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Built for Delhi */}
          <div>
            <h4 className="text-sm font-semibold text-cream mb-3 uppercase tracking-wider">
              Coverage
            </h4>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-forest/30 rounded-full border border-forest/50">
              <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
              <span className="text-sm text-cream/80">Built for Delhi</span>
            </div>
            <p className="mt-3 text-sm text-cream/50">
              Monitoring 8 key junctions across the NCR region. More coverage
              coming soon.
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream/40">
            © {new Date().getFullYear()} FloodLens. Open-source flood safety
            platform.
          </p>
          <div className="flex items-center gap-4">
            <NavLink
              to="/admin/login"
              className="text-xs text-cream/40 hover:text-amber transition-colors font-mono flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
              Official Portal
            </NavLink>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-cream/40 hover:text-amber transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Source
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
