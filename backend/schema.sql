-- Schema for FloodLens Supabase PostgreSQL Database

-- 1. Camera Stations Table
CREATE TABLE IF NOT EXISTS camera_stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    water_level_cm DOUBLE PRECISION DEFAULT 0.0,
    status TEXT CHECK (status IN ('safe', 'caution', 'danger')) DEFAULT 'safe',
    hazard TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    image_url TEXT
);

-- 2. Citizen Reports Table
CREATE TABLE IF NOT EXISTS citizen_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    hazard_type TEXT NOT NULL,
    description TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verification_status TEXT CHECK (verification_status IN ('verified_camera', 'rejected_clear', 'pending_community')) DEFAULT 'pending_community',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Hazard Logs (Edge telemetry audit trail)
CREATE TABLE IF NOT EXISTS hazard_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id TEXT NOT NULL REFERENCES camera_stations(id) ON DELETE CASCADE,
    water_depth_cm DOUBLE PRECISION NOT NULL,
    state INTEGER NOT NULL,
    status TEXT NOT NULL,
    hazard TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Agency Responder Profiles
CREATE TABLE IF NOT EXISTS agency_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    agency_name TEXT NOT NULL, -- e.g., 'Delhi Police', 'Delhi Fire Service', 'AIIMS Emergency Ward'
    role TEXT CHECK (role IN ('police', 'fire', 'hospital', 'superadmin')) NOT NULL,
    badge_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Emergency Dispatch Log Table
CREATE TABLE IF NOT EXISTS emergency_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id TEXT REFERENCES camera_stations(id),
    dispatched_by UUID REFERENCES agency_users(id),
    agency_type TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'high',
    notes TEXT,
    status TEXT CHECK (status IN ('dispatched', 'en_route', 'resolved')) DEFAULT 'dispatched',
    dispatched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE emergency_dispatches;

-- RLS: Only authenticated responders can view/create dispatches
ALTER TABLE agency_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read agency profiles"
    ON agency_users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow agency dispatch insert"
    ON emergency_dispatches FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow agency dispatch select"
    ON emergency_dispatches FOR SELECT TO authenticated USING (true);

-- Indexes for performant spatial and temporal queries
CREATE INDEX IF NOT EXISTS idx_camera_stations_status ON camera_stations(status);
CREATE INDEX IF NOT EXISTS idx_citizen_reports_created_at ON citizen_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hazard_logs_camera_id ON hazard_logs(camera_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_dispatches_created_at ON emergency_dispatches(dispatched_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_dispatches_status ON emergency_dispatches(status);
