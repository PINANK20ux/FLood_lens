import React from "react";
import { Link } from "react-router-dom";
import { Droplets } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-ink-950 border-t border-ink-800/60 py-10 text-paper-50 select-none">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-ink-400">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-6 h-6 rounded-md bg-channel-600/30 text-channel-400 border border-channel-500/30">
            <Droplets size={13} strokeWidth={2.2} />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <Link to="/live" className="hover:text-paper-50 transition-colors">
            Live Map
          </Link>
          <Link to="/roads" className="hover:text-paper-50 transition-colors">
            Roads &amp; CCTV Feeds
          </Link>
          <Link to="/routes" className="hover:text-paper-50 transition-colors">
            Safe Routes
          </Link>
          <Link to="/hazards" className="hover:text-paper-50 transition-colors">
            Citizen Reports
          </Link>
          <Link to="/about" className="hover:text-paper-50 transition-colors">
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
