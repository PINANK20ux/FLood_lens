"""
FloodLens Database Seeding Script.
Populates Supabase PostgreSQL tables or verifies initial Delhi flood datasets.

Usage:
    python seed_data.py
"""
import os
import sys
import datetime
from dotenv import load_dotenv

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

INITIAL_CAMERA_STATIONS = [
    {
        "id": "CAM-01",
        "name": "Minto Bridge Railway Underpass",
        "area": "Central Delhi",
        "latitude": 28.6328,
        "longitude": 77.2215,
        "water_level_cm": 42.0,
        "status": "danger",
        "hazard": "High Water Accumulation",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "/cameras/minto-bridge.jpg",
    },
    {
        "id": "CAM-02",
        "name": "ITO Crossing / Vikas Marg",
        "area": "East/Central Delhi",
        "latitude": 28.6297,
        "longitude": 77.2425,
        "water_level_cm": 35.0,
        "status": "danger",
        "hazard": "Drain Overflow",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "/cameras/ito-crossing.jpg",
    },
    {
        "id": "CAM-03",
        "name": "Zakhira Underpass",
        "area": "West Delhi",
        "latitude": 28.6720,
        "longitude": 77.1585,
        "water_level_cm": 14.0,
        "status": "caution",
        "hazard": "Pothole Cluster",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "/cameras/zakhira.jpg",
    },
    {
        "id": "CAM-04",
        "name": "Pul Prahladpur Underpass",
        "area": "South Delhi",
        "latitude": 28.4980,
        "longitude": 77.2882,
        "water_level_cm": 50.0,
        "status": "danger",
        "hazard": "Submerged Lane",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "/cameras/pul-prahladpur.jpg",
    },
    {
        "id": "CAM-05",
        "name": "Moolchand Underpass (Ring Road)",
        "area": "South Delhi",
        "latitude": 28.5672,
        "longitude": 77.2340,
        "water_level_cm": 10.0,
        "status": "caution",
        "hazard": "Slow Traffic / Slush",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "/cameras/moolchand.jpg",
    },
    {
        "id": "CAM-06",
        "name": "Dhaula Kuan Flyover Loop",
        "area": "South-West Delhi",
        "latitude": 28.5921,
        "longitude": 77.1616,
        "water_level_cm": 0.0,
        "status": "safe",
        "hazard": "None",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "/cameras/dhaula-kuan.jpg",
    },
    {
        "id": "CAM-07",
        "name": "Connaught Place Outer Circle",
        "area": "Central Delhi",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "water_level_cm": 0.0,
        "status": "safe",
        "hazard": "None",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "/cameras/connaught-place.jpg",
    },
    {
        "id": "CAM-08",
        "name": "AIIMS - Ring Road Corridor",
        "area": "South Delhi",
        "latitude": 28.5684,
        "longitude": 77.2088,
        "water_level_cm": 2.0,
        "status": "safe",
        "hazard": "None",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "/cameras/aiims.jpg",
    },
]

INITIAL_CITIZEN_REPORTS = [
    {
        "location_name": "Near Minto Bridge Underpass",
        "latitude": 28.6335,
        "longitude": 77.2220,
        "hazard_type": "Deep Water",
        "description": "Water rising above car wheels near the railway bridge exit.",
        "verified": True,
        "verification_status": "verified_camera",
    },
    {
        "location_name": "Pul Prahladpur Road",
        "latitude": 28.4975,
        "longitude": 77.2890,
        "hazard_type": "Deep Water",
        "description": "Entire underpass is flooded, buses turning back.",
        "verified": True,
        "verification_status": "verified_camera",
    },
    {
        "location_name": "Zakhira Flyover Side",
        "latitude": 28.6715,
        "longitude": 77.1590,
        "hazard_type": "Big Hole in Road",
        "description": "Severe pothole cluster under water near the flyover ramp.",
        "verified": True,
        "verification_status": "verified_camera",
    },
    {
        "location_name": "Karol Bagh Market Entry",
        "latitude": 28.6510,
        "longitude": 77.1900,
        "hazard_type": "Small Flood",
        "description": "Waterlogging along the shopping lane curb.",
        "verified": False,
        "verification_status": "pending_community",
    },
]


def seed():
    print("=" * 60)
    print("FloodLens Database Seeder")
    print("=" * 60)

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("[INFO] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.")
        print("[INFO] The FloodLens FastAPI backend will use its in-memory store seeded with these 8 hotspots automatically.")
        print("[INFO] To persist to Supabase, configure .env with valid credentials.")
        return

    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print(f"[OK] Connected to Supabase at: {SUPABASE_URL}")

        print("\n[+] Seeding Camera Stations...")
        for station in INITIAL_CAMERA_STATIONS:
            res = supabase.table("camera_stations").upsert(station).execute()
            print(f"  ✓ Upserted: {station['id']} - {station['name']} ({station['status']})")

        print("\n[+] Seeding Initial Citizen Reports...")
        for report in INITIAL_CITIZEN_REPORTS:
            res = supabase.table("citizen_reports").insert(report).execute()
            print(f"  ✓ Added report: {report['location_name']} [{report['hazard_type']}]")

        print("\n[SUCCESS] Supabase database seeded successfully.")
    except Exception as e:
        print(f"[ERROR] Seeding failed: {e}")


if __name__ == "__main__":
    seed()
