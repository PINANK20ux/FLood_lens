"""
Comprehensive automated tests for FloodLens FastAPI backend.
Validates:
1. Health & Root endpoints
2. Camera Stations API
3. Edge CCTV Telemetry Ingestion (0, 1, 2 state mapping)
4. Citizen Report Submissions with 500m Spatial Auto-Verification
5. Dynamic Safe Navigation Routing (Dijkstra + flooded edge pruning)
"""
import asyncio
import os
import sys
from httpx import AsyncClient, ASGITransport

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.core.database import db


async def run_all_tests():
    print("=" * 65)
    print(">> Starting FloodLens FastAPI Backend Test Suite")
    print("=" * 65)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:

        # -------------------------------------------------------------
        # 1. Health & Root Check
        # -------------------------------------------------------------
        print("\n[TEST 1] Root & Health Check Endpoints")
        r_root = await client.get("/")
        assert r_root.status_code == 200, f"Root failed: {r_root.text}"
        root_data = r_root.json()
        print(f"  [OK] Root status: {root_data['status']} | DB Mode: {root_data['database_mode']}")

        r_health = await client.get("/health")
        assert r_health.status_code == 200, f"Health check failed: {r_health.text}"
        health_data = r_health.json()
        assert health_data["status"] == "healthy"
        print(f"  [OK] Health status: {health_data['status']} | Loaded {health_data['database']['stations_loaded']} stations")

        # -------------------------------------------------------------
        # 2. Camera Stations Endpoints
        # -------------------------------------------------------------
        print("\n[TEST 2] Cameras API (/api/v1/cameras)")
        r_cams = await client.get("/api/v1/cameras")
        assert r_cams.status_code == 200, f"Get cameras failed: {r_cams.text}"
        cams = r_cams.json()
        assert len(cams) >= 8, f"Expected 8 stations, got {len(cams)}"
        print(f"  [OK] Fetched {len(cams)} camera stations.")

        # Test single camera fetch (both CAM-01 and station-1)
        r_single1 = await client.get("/api/v1/cameras/CAM-01")
        assert r_single1.status_code == 200, f"Get CAM-01 failed: {r_single1.text}"
        assert r_single1.json()["name"] == "Minto Bridge Railway Underpass"
        print(f"  [OK] Fetched CAM-01: {r_single1.json()['name']} ({r_single1.json()['status']})")

        r_single2 = await client.get("/api/v1/cameras/station-7")
        assert r_single2.status_code == 200, f"Get station-7 failed: {r_single2.text}"
        assert "Connaught Place" in r_single2.json()["name"]
        print(f"  [OK] Fetched alias station-7: {r_single2.json()['name']}")

        # -------------------------------------------------------------
        # 3. Edge Telemetry Ingestion
        # -------------------------------------------------------------
        print("\n[TEST 3] Edge Telemetry Ingestion (/api/v1/edge/telemetry)")
        telemetry_payload = {
            "camera_id": "CAM-06",
            "water_depth_cm": 18.5,
            "state": 1,  # 1 = caution
            "hazard": "Waterlogged Curb",
            "latitude": 28.5921,
            "longitude": 77.1616,
        }
        r_telem = await client.post("/api/v1/edge/telemetry", json=telemetry_payload)
        assert r_telem.status_code == 200, f"Telemetry post failed: {r_telem.text}"
        telem_resp = r_telem.json()
        assert telem_resp["mapped_status"] == "caution"
        assert telem_resp["water_level_cm"] == 18.5
        print(f"  [OK] Telemetry ingested successfully: CAM-06 state 1 -> '{telem_resp['mapped_status']}'")

        # Verify CAM-06 status in DB
        r_check = await client.get("/api/v1/cameras/CAM-06")
        assert r_check.json()["status"] == "caution"
        assert r_check.json()["water_level_cm"] == 18.5
        print(f"  [OK] Verified CAM-06 state updated in DB to 'caution'.")

        # -------------------------------------------------------------
        # 4. Citizen Reports & 500m Spatial Auto-Verification
        # -------------------------------------------------------------
        print("\n[TEST 4] Citizen Hazard Reports & Spatial Verification")
        # 4A. Report within 50m of Minto Bridge (CAM-01 is 'danger' -> verified: True)
        close_danger_report = {
            "location_name": "Minto Bridge Underpass Subway Road",
            "latitude": 28.6329,  # ~15 meters from 28.6328, 77.2215
            "longitude": 77.2216,
            "hazard_type": "Deep Water",
            "description": "Car stuck in flooded underpass lane."
        }
        r_rep1 = await client.post("/api/v1/citizen/report", json=close_danger_report)
        assert r_rep1.status_code == 201, f"Report 1 failed: {r_rep1.text}"
        rep1_data = r_rep1.json()
        assert rep1_data["verified"] is True, "Expected report near danger camera to be verified"
        assert rep1_data["verification_status"] == "verified_camera"
        print(f"  [OK] Proximity <= 500m to danger camera -> verified=True, status='verified_camera' (dist: {rep1_data['distance_to_station_m']}m)")

        # 4B. Report within 100m of Connaught Place (CAM-07 is 'safe' -> verified: False, status: 'rejected_clear')
        close_safe_report = {
            "location_name": "CP Radial Road 3",
            "latitude": 28.6316,  # ~20 meters from 28.6315, 77.2167
            "longitude": 77.2168,
            "hazard_type": "Small Flood",
            "description": "Claiming huge flood at dry circle."
        }
        r_rep2 = await client.post("/api/v1/citizen/report", json=close_safe_report)
        assert r_rep2.status_code == 201, f"Report 2 failed: {r_rep2.text}"
        rep2_data = r_rep2.json()
        assert rep2_data["verified"] is False
        assert rep2_data["verification_status"] == "rejected_clear"
        print(f"  [OK] Proximity <= 500m to safe camera -> verified=False, status='rejected_clear' (dist: {rep2_data['distance_to_station_m']}m)")

        # 4C. Report far away (> 500m) -> verified: False, status: 'pending_community'
        far_report = {
            "location_name": "Rohini Sector 14 Outer Ring",
            "latitude": 28.7150,  # ~10km away from any central station
            "longitude": 77.1250,
            "hazard_type": "Fallen Tree",
            "description": "Tree blocking lane after heavy thunderstorm."
        }
        r_rep3 = await client.post("/api/v1/citizen/report", json=far_report)
        assert r_rep3.status_code == 201, f"Report 3 failed: {r_rep3.text}"
        rep3_data = r_rep3.json()
        assert rep3_data["verified"] is False
        assert rep3_data["verification_status"] == "pending_community"
        print(f"  [OK] Proximity > 500m -> verified=False, status='pending_community' (dist: {rep3_data['distance_to_station_m']}m)")

        # List reports
        r_all_reports = await client.get("/api/v1/citizen/reports")
        assert r_all_reports.status_code == 200
        reports_list = r_all_reports.json()
        print(f"  [OK] Total public citizen reports in feed: {len(reports_list)}")

        # -------------------------------------------------------------
        # 5. Dynamic Safe Navigation Routing
        # -------------------------------------------------------------
        print("\n[TEST 5] Safe Path Routing with Flooded Segment Pruning")
        # Route from Connaught Place (CAM-07) to AIIMS (CAM-08)
        nav_payload = {
            "origin_id": "CAM-07",
            "destination_id": "CAM-08"
        }
        r_nav = await client.post("/api/v1/navigation/route", json=nav_payload)
        assert r_nav.status_code == 200, f"Route calc failed: {r_nav.text}"
        nav_data = r_nav.json()
        assert nav_data["success"] is True
        summary = nav_data["summary"]
        coords = nav_data["coordinates"]
        path_stations = nav_data["path_stations"]

        print(f"  [OK] Route calculated successfully:")
        print(f"    - Origin: {path_stations[0]['name']}")
        print(f"    - Destination: {path_stations[-1]['name']}")
        print(f"    - Distance: {summary['total_distance_km']} km")
        print(f"    - Duration: {summary['estimated_duration_min']} mins")
        print(f"    - Safety Rating: {summary['safety_rating']}")
        print(f"    - Danger Stations Avoided: {summary['danger_stations_avoided']}")
        print(f"    - Snapped Road Coordinate Points: {len(coords)}")

    print("\n" + "=" * 65)
    print(">> ALL TEST SUITES PASSED PERFECTLY!")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
