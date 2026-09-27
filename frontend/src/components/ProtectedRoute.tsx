import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, agencyProfile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse">
              <Shield className="w-7 h-7" />
            </div>
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin absolute -top-1 -right-1" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-base text-slate-100 font-mono tracking-wide">
              AUTHENTICATING AGENCY SECURE LINK...
            </h3>
            <p className="text-xs text-slate-400 mt-1">Verifying credentials against Delhi Emergency Services Gateway</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !agencyProfile) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(agencyProfile.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
        <div className="max-w-md p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-center">
          <Shield className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-rose-200">Access Restricted</h2>
          <p className="text-sm text-rose-300/80 mt-2">
            Your agency profile ({agencyProfile.agency_name}) does not have clearance for this operation.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
