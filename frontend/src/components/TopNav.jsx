import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Droplets, Plus, Menu, X, Shield } from "lucide-react";
import { useFloodLens } from "../context/FloodLensContext";

const NAV_LINKS = [
  { to: "/live", label: "Live Map" },
  { to: "/roads", label: "Roads & CCTV Feeds" },
  { to: "/routes", label: "Safe Routes" },
  { to: "/hazards", label: "Citizen Reports" },
  { to: "/about", label: "About" },
];

export default function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsPlacingPin } = useFloodLens();

  const handleOpenReport = () => {
    setIsPlacingPin(true);
    if (location.pathname !== "/live" && location.pathname !== "/hazards") {
      navigate("/live");
    }
  };

  const isAuthority = location.pathname.startsWith("/authority") || location.pathname.startsWith("/admin");

  return (
    <div className="select-none">
      {/* Main Header */}
      <header className="sticky top-0 z-40 border-b border-ink-800/60 bg-ink-950/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 h-16 flex items-center justify-between">
          {/* Brand identity */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-paper-50 group"
            onClick={() => setMobileOpen(false)}
          >
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-channel-600 text-paper-50 shadow-sm transition-transform group-hover:scale-105">
              <Droplets size={17} strokeWidth={2.2} />
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg tracking-tight text-paper-50">FloodLens</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-xs font-medium tracking-wide transition-colors whitespace-nowrap py-1 ${
                    isActive
                      ? "text-channel-400 font-semibold border-b-2 border-channel-500"
                      : "text-ink-300 hover:text-paper-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action Pills & Authority Portal */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={handleOpenReport}
              className="flex items-center gap-1.5 rounded-full border border-channel-500/40 text-channel-400 hover:bg-channel-500/10 text-xs font-semibold px-4 py-2 transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              <Plus size={14} /> Report Hazard
            </button>

            {/* Authority Command Center Button */}
            <Link
              to="/authority"
              className={`flex items-center gap-1.5 rounded-full text-xs font-semibold px-4 py-2 transition-all active:scale-95 shadow-sm border ${
                isAuthority
                  ? "bg-red-500/20 text-red-300 border-red-500/50 shadow-red-500/10"
                  : "bg-ink-900 hover:bg-ink-800 text-ink-300 hover:text-paper-50 border-ink-800"
              }`}
            >
              <Shield size={14} className={isAuthority ? "text-red-400" : "text-channel-400"} />
              <span>Authority Panel</span>
            </Link>

            <button
              onClick={() => navigate("/live")}
              className="rounded-full bg-channel-500 hover:bg-channel-400 text-ink-950 text-xs font-semibold px-4 py-2 transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              Open Live Map
            </button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            className="lg:hidden text-paper-50 p-2 -mr-2 cursor-pointer"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-ink-800/60 bg-ink-950 px-5 py-4 flex flex-col gap-3 animate-fade-in">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm py-1.5 transition-colors ${
                    isActive ? "text-channel-400 font-semibold" : "text-ink-300 hover:text-paper-50"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}

            <Link
              to="/authority"
              className={`text-sm py-1.5 flex items-center gap-2 font-semibold transition-colors ${
                isAuthority ? "text-red-400" : "text-channel-300"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              <Shield size={15} />
              <span>Authority Command Dashboard</span>
            </Link>

            <div className="pt-3 border-t border-ink-800/50 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleOpenReport();
                }}
                className="flex items-center justify-center gap-1.5 rounded-full border border-channel-500/40 text-channel-400 text-xs font-semibold py-2.5"
              >
                <Plus size={14} /> Report Hazard
              </button>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/live");
                }}
                className="rounded-full bg-channel-500 text-ink-950 text-xs font-semibold py-2.5 text-center font-bold"
              >
                Open Live Map
              </button>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
