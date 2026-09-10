-- ============================================================
-- FloodLens — PostgreSQL / Supabase Database Schema
-- Real-Time Urban Flood Monitoring & Dynamic Routing
-- ============================================================

-- Enable pgcrypto / uuid extensions if not already enabled
create extension if not exists "pgcrypto";

-- 1. Citizen Hazard Reports
-- Stores crowdsourced flood incident reports validated by YOLOv8-seg
create table if not exists citizen_reports (
    id uuid primary key default gen_random_uuid(),
    lat double precision not null,
    lng double precision not null,
    severity text check (severity in ('Low', 'Moderate', 'High')),
    image_url text,
    water_ratio double precision default 0.0,
    status text default 'pending' check (status in ('pending', 'verified', 'rejected')),
    created_at timestamptz default now()
);

-- Indexes for fast geospatial / status queries
create index if not exists idx_citizen_reports_status on citizen_reports(status);
create index if not exists idx_citizen_reports_created_at on citizen_reports(created_at desc);
create index if not exists idx_citizen_reports_lat_lng on citizen_reports(lat, lng);

-- 2. Dynamic Road Status Overrides
-- Stores real-time overrides for the NetworkX routing graph and Leaflet UI
create table if not exists road_overrides (
    road_id text primary key,
    status text check (status in ('SAFE', 'CAUTION', 'BLOCKED')),
    depth_cm integer default 0,
    updated_at timestamptz default now()
);

-- Index for status filtering
create index if not exists idx_road_overrides_status on road_overrides(status);
create index if not exists idx_road_overrides_updated_at on road_overrides(updated_at desc);

-- ============================================================
-- Helpful Views & Functions (Optional)
-- ============================================================

-- View: Active Verified Flooded Road Segments
create or replace view active_flood_hazards as
select 
    ro.road_id,
    ro.status,
    ro.depth_cm,
    ro.updated_at,
    count(cr.id) as verified_report_count
from road_overrides ro
left join citizen_reports cr on cr.status = 'verified'
where ro.status in ('CAUTION', 'BLOCKED')
group by ro.road_id, ro.status, ro.depth_cm, ro.updated_at;
