import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import CamerasPage from './pages/CamerasPage';
import ReportPage from './pages/ReportPage';
import AboutPage from './pages/AboutPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppLayout() {
  const { pathname } = useLocation();
  const isMapPage = pathname === '/map' || pathname === '/safe-roads';
  const isAdmin = pathname.startsWith('/admin');

  return (
    <div className={`flex flex-col min-h-screen ${isAdmin ? 'bg-slate-950' : ''}`}>
      {!isAdmin && <Navbar />}
      <ScrollToTop />
      <main className="flex-1">
        <Routes>
          {/* Public Citizen Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/safe-roads" element={<MapPage />} />
          <Route path="/cameras" element={<CamerasPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/about" element={<AboutPage />} />

          {/* Emergency Services Admin Portal */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      {!isMapPage && !isAdmin && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
