import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Activity, Flame, ShieldAlert, HeartPulse } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { AgencyRole } from '../../types';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/admin';
  const { login, loginAsDemo, isLoading, error: authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email) {
      setLocalError('Please enter your official agency email.');
      return;
    }

    const success = await login(email, password);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  const handleDemoClick = (role: AgencyRole) => {
    loginAsDemo(role);
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Tactical background grid & glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Badge */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono mb-4 tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Official Emergency Gateway
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl flex items-center justify-center text-emerald-400 mb-4 ring-4 ring-emerald-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Flood<span className="text-emerald-400">Lens</span> <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-normal">COMMAND</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-sm">
            Restricted access for verified emergency services, quick response teams & municipal disaster units.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {(authError || localError) && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError || localError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Official Agency Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. fire@delhifire.gov.in"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Access Key / Password
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Optional for demo</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Authenticate & Enter Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switchers */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Quick Demo Responders:
              </span>
              <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                1-Click Access
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoClick('police')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">Delhi Police</p>
                  <p className="text-[10px] text-slate-400 font-mono">PCR #DP-8842</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('fire')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">Fire Service</p>
                  <p className="text-[10px] text-slate-400 font-mono">Rescue #DFS-301</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('hospital')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/40 text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">AIIMS Trauma</p>
                  <p className="text-[10px] text-slate-400 font-mono">ER #AIIMS-09</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoClick('superadmin')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">DDMA Ops</p>
                  <p className="text-[10px] text-slate-400 font-mono">Command #01</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security advisory footer */}
        <div className="mt-8 text-center text-[11px] text-slate-500 font-mono">
          <p>RESTRICTED OFFICIAL SYSTEM • ALL ACTIONS & DISPATCHES LOGGED</p>
          <p className="mt-1 text-slate-600">FloodLens Incident Telemetry v1.0.0</p>
        </div>
      </div>
    </div>
  );
}
