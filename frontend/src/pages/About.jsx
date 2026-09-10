import React from "react";
import { useNavigate } from "react-router-dom";
import { Satellite, Layers, Users, ShieldCheck } from "lucide-react";
import TopNav from "../components/TopNav";
import Footer from "../components/Footer";

const PILLARS = [
  {
    icon: Satellite,
    title: "Sensing in the background",
    body: "Satellite radar SAR segmentation, dual YOLOv8 optical depth estimation, and continuous video inference do the heavy technical work. None of it burdens the person using the map.",
  },
  {
    icon: Layers,
    title: "One question, answered plainly",
    body: "Every screen exists to answer one thing: can I safely get where I'm going, and if a road is flooded, what is the best dynamically routed alternative?",
  },
  {
    icon: Users,
    title: "Built with people on the ground",
    body: "AI-verified citizen reports fill the gaps between municipal CCTV sensors, so road network conditions update instantly in real time.",
  },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="bg-ink-950 text-paper-50 min-h-screen flex flex-col">
      <TopNav />

      <section className="mx-auto max-w-4xl px-5 sm:px-8 pt-16 pb-20 flex-1">

        <h1 className="font-display text-4xl sm:text-5xl mb-6 leading-tight text-paper-50">
          FloodLens turns flood intelligence into a travel decision.
        </h1>
        <p className="text-ink-300 text-base sm:text-lg leading-relaxed mb-14 max-w-2xl">
          FloodLens is a hyperlocal flood intelligence and road
          accessibility platform. It takes complex computer vision segmentation, tire submersion
          physics, and OSM street networks, placing actionable safety decisions directly in front of
          citizens before they get stranded.
        </p>

        {/* 3 Pillars */}
        <div className="flex flex-col gap-8 mb-16">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex items-start gap-4 p-6 rounded-3xl bg-ink-900 border border-ink-800/80 shadow-panel">
              <span className="shrink-0 grid place-items-center w-12 h-12 rounded-2xl bg-ink-950 border border-ink-800 text-channel-400">
                <p.icon size={22} strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="font-display text-xl mb-1.5 text-paper-50">{p.title}</h3>
                <p className="text-ink-300 text-sm leading-relaxed">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Note on architecture */}
        <div className="rounded-3xl bg-ink-900/60 border border-ink-800/60 p-7 mb-12 space-y-3">
          <h3 className="font-display text-lg text-paper-50">Technical Architecture Overview</h3>
          <p className="text-xs sm:text-sm text-ink-300 leading-relaxed">
            FloodLens pairs a dual YOLOv8 pipeline (water segmentation at 640px/320px + multi-class
            vehicle anchor detection) running on FastAPI, real OpenStreetMap road networks with dynamic
            viewport bounds fetching, hybrid Dijkstra and OSRM safe emergency routing with flood avoidance
            penalties, and an interactive Leaflet front-end with live MJPEG streams and Supabase PostgreSQL persistence.
          </p>
        </div>

        <button
          onClick={() => navigate("/live")}
          className="rounded-full bg-channel-500 hover:bg-channel-400 text-ink-950 text-sm font-semibold px-7 py-3.5 transition-all shadow-sm active:scale-95"
        >
          Open Live Map
        </button>
      </section>

      <Footer />
    </div>
  );
}
