import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FloodLensProvider } from "./context/FloodLensContext";
import Landing from "./pages/Landing";
import LiveIntelligence from "./pages/LiveIntelligence";
import RoadAccessibility from "./pages/RoadAccessibility";
import SafeRoutes from "./pages/SafeRoutes";
import CitizenHazards from "./pages/CitizenHazards";
import About from "./pages/About";

export default function App() {
  return (
    <FloodLensProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/live" element={<LiveIntelligence />} />
          <Route path="/roads" element={<RoadAccessibility />} />
          <Route path="/routes" element={<SafeRoutes />} />
          <Route path="/video" element={<RoadAccessibility />} />
          <Route path="/hazards" element={<CitizenHazards />} />
          <Route path="/report" element={<CitizenHazards />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </FloodLensProvider>
  );
}
