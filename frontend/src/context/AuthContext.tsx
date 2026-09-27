import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { AgencyUser, AgencyRole } from '../types';

export const DEMO_AGENCIES: Record<AgencyRole, AgencyUser> = {
  police: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'police@delhipolice.gov.in',
    agency_name: 'Delhi Police (PCR Command)',
    role: 'police',
    badge_number: 'DP-8842',
    token: 'demo-police-token',
  },
  fire: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'fire@delhifire.gov.in',
    agency_name: 'Delhi Fire Service (Rescue Unit 4)',
    role: 'fire',
    badge_number: 'DFS-301',
    token: 'demo-fire-token',
  },
  hospital: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'trauma@aiims.edu',
    agency_name: 'AIIMS Emergency & Trauma Ward',
    role: 'hospital',
    badge_number: 'AIIMS-ER-09',
    token: 'demo-hospital-token',
  },
  superadmin: {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'ddma.ops@delhi.gov.in',
    agency_name: 'DDMA Central Disaster Command',
    role: 'superadmin',
    badge_number: 'DDMA-01',
    token: 'demo-superadmin-token',
  },
};

const SESSION_STORAGE_KEY = 'floodlens_agency_session';

interface AuthContextType {
  user: any | null;
  agencyProfile: AgencyUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password?: string) => Promise<boolean>;
  loginAsDemo: (role: AgencyRole) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [agencyProfile, setAgencyProfile] = useState<AgencyUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load persisted session on initial mount
  useEffect(() => {
    async function initAuth() {
      try {
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setUser(data.session.user);
            setToken(data.session.access_token);
            
            // Check if profile exists in user metadata
            const meta = data.session.user.user_metadata || {};
            setAgencyProfile({
              id: data.session.user.id,
              email: data.session.user.email || '',
              agency_name: meta.agency_name || 'Emergency Responder',
              role: (meta.role as AgencyRole) || 'police',
              badge_number: meta.badge_number || 'EMG-01',
              token: data.session.access_token,
            });
            setIsLoading(false);
            return;
          }
        }

        // Check local storage demo session
        const rawSaved = localStorage.getItem(SESSION_STORAGE_KEY);
        if (rawSaved) {
          const saved: AgencyUser = JSON.parse(rawSaved);
          if (saved && saved.role && saved.token) {
            setAgencyProfile(saved);
            setUser({ id: saved.id, email: saved.email });
            setToken(saved.token);
          }
        }
      } catch (err) {
        console.warn('Auth initialization fallback:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth state changes if active
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          setUser(session.user);
          setToken(session.access_token);
          const meta = session.user.user_metadata || {};
          const profile: AgencyUser = {
            id: session.user.id,
            email: session.user.email || '',
            agency_name: meta.agency_name || 'Emergency Responder',
            role: (meta.role as AgencyRole) || 'police',
            badge_number: meta.badge_number || 'EMG-01',
            token: session.access_token,
          };
          setAgencyProfile(profile);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
        } else if (!localStorage.getItem(SESSION_STORAGE_KEY)) {
          setUser(null);
          setAgencyProfile(null);
          setToken(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const login = useCallback(async (email: string, password?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    // 1. Check matching demo agency email
    const trimmed = email.trim().toLowerCase();
    for (const demoRole of Object.keys(DEMO_AGENCIES) as AgencyRole[]) {
      const demo = DEMO_AGENCIES[demoRole];
      if (demo.email.toLowerCase() === trimmed) {
        setAgencyProfile(demo);
        setUser({ id: demo.id, email: demo.email });
        setToken(demo.token || 'demo-token');
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(demo));
        setIsLoading(false);
        return true;
      }
    }

    // 2. Try Supabase Auth
    if (supabase && password) {
      try {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });

        if (sbError) {
          throw sbError;
        }

        if (data.session) {
          const meta = data.session.user.user_metadata || {};
          const profile: AgencyUser = {
            id: data.session.user.id,
            email: data.session.user.email || trimmed,
            agency_name: meta.agency_name || 'Delhi Emergency Services',
            role: (meta.role as AgencyRole) || 'police',
            badge_number: meta.badge_number || 'EMG-99',
            token: data.session.access_token,
          };
          setAgencyProfile(profile);
          setUser(data.session.user);
          setToken(data.session.access_token);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
          setIsLoading(false);
          return true;
        }
      } catch (err: any) {
        setError(err.message || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
        return false;
      }
    }

    // 3. Fallback for custom agency email in dev
    if (trimmed.includes('@')) {
      const isFire = trimmed.includes('fire');
      const isHosp = trimmed.includes('hospital') || trimmed.includes('aiims');
      const isAdmin = trimmed.includes('admin') || trimmed.includes('ddma');
      const role: AgencyRole = isAdmin ? 'superadmin' : (isFire ? 'fire' : (isHosp ? 'hospital' : 'police'));
      
      const customProfile: AgencyUser = {
        id: 'cust-' + Math.random().toString(36).substring(2, 9),
        email: trimmed,
        agency_name: isFire ? 'Delhi Fire Service' : (isHosp ? 'Emergency Medical Services' : (isAdmin ? 'DDMA Operations' : 'Delhi Police Command')),
        role,
        badge_number: `AUTH-${Math.floor(1000 + Math.random() * 9000)}`,
        token: `demo-${role}-token`,
      };
      setAgencyProfile(customProfile);
      setUser({ id: customProfile.id, email: customProfile.email });
      setToken(customProfile.token || 'demo-token');
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(customProfile));
      setIsLoading(false);
      return true;
    }

    setError('Invalid agency credentials or unrecognized agency email.');
    setIsLoading(false);
    return false;
  }, []);

  const loginAsDemo = useCallback((role: AgencyRole) => {
    const demo = DEMO_AGENCIES[role];
    if (demo) {
      setAgencyProfile(demo);
      setUser({ id: demo.id, email: demo.email });
      setToken(demo.token || 'demo-token');
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(demo));
      setError(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore
    } finally {
      setUser(null);
      setAgencyProfile(null);
      setToken(null);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        agencyProfile,
        token,
        isLoading,
        error,
        login,
        loginAsDemo,
        logout,
        isAuthenticated: !!agencyProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
