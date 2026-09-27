import { NavLink } from 'react-router-dom';
import { Droplets, Menu, X } from 'lucide-react';
import { useState } from 'react';

const links = [
  { to: '/', label: 'Home' },
  { to: '/map', label: 'Safe Roads Map' },
  { to: '/cameras', label: 'Cameras' },
  { to: '/report', label: 'Report' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-[1000] bg-cream/90 backdrop-blur-md border-b border-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-forest flex items-center justify-center transition-transform group-hover:scale-105">
              <Droplets className="w-5 h-5 text-cream" />
            </div>
            <span className="text-xl font-bold text-dark tracking-tight">
              Flood<span className="text-forest">Lens</span>
            </span>
          </NavLink>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-forest text-cream shadow-sm'
                      : 'text-dark/70 hover:text-dark hover:bg-sand/60'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-dark hover:bg-sand/60 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-sand bg-cream/95 backdrop-blur-md">
          <div className="px-4 py-3 space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-forest text-cream'
                      : 'text-dark/70 hover:text-dark hover:bg-sand/60'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
