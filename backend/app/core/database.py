import datetime
import logging
import threading
import uuid
from typing import Any, Dict, List, Optional
from .config import settings

logger = logging.getLogger("floodlens.database")

# Seed data for Delhi flood monitoring stations
INITIAL_CAMERA_STATIONS: List[Dict[str, Any]] = [
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
        "image_url": "/test_cameras/cam_01.png",
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
        "image_url": "/test_cameras/cam_02.png",
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
        "image_url": "/test_cameras/cam_03.png",
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
        "image_url": "/test_cameras/cam_04.png",
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
        "image_url": "/test_cameras/cam_05.png",
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
        "image_url": "/test_cameras/cam_01.png",
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
        "image_url": "/test_cameras/cam_02.png",
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
        "image_url": "/test_cameras/cam_03.png",
    },
    {
        "id": "CAM-09",
        "name": "Live Demo Edge Node (Laptop Webcam)",
        "area": "Field Test / Demo Rig",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "water_level_cm": 0.0,
        "status": "safe",
        "hazard": "Edge Webcam Sensor Ready",
        "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "image_url": "/test_cameras/cam_01.png",
    },
]

INITIAL_CITIZEN_REPORTS: List[Dict[str, Any]] = [
    {
        "id": str(uuid.uuid4()),
        "location_name": "Near Minto Bridge Underpass",
        "latitude": 28.6335,
        "longitude": 77.2220,
        "hazard_type": "Deep Water",
        "description": "Water rising above car wheels near the railway bridge exit.",
        "verified": True,
        "verification_status": "verified_camera",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=30)).isoformat(),
    },
    {
        "id": str(uuid.uuid4()),
        "location_name": "Pul Prahladpur Road",
        "latitude": 28.4975,
        "longitude": 77.2890,
        "hazard_type": "Deep Water",
        "description": "Entire underpass is flooded, buses turning back.",
        "verified": True,
        "verification_status": "verified_camera",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=45)).isoformat(),
    },
    {
        "id": str(uuid.uuid4()),
        "location_name": "Zakhira Flyover Side",
        "latitude": 28.6715,
        "longitude": 77.1590,
        "hazard_type": "Big Hole in Road",
        "description": "Severe pothole cluster under water near the flyover ramp.",
        "verified": True,
        "verification_status": "verified_camera",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=60)).isoformat(),
    },
    {
        "id": str(uuid.uuid4()),
        "location_name": "Karol Bagh Market Entry",
        "latitude": 28.6510,
        "longitude": 77.1900,
        "hazard_type": "Small Flood",
        "description": "Waterlogging along the shopping lane curb.",
        "verified": False,
        "verification_status": "pending_community",
        "created_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)).isoformat(),
    },
]

INITIAL_AGENCY_USERS: List[Dict[str, Any]] = [
    {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "police@delhipolice.gov.in",
        "agency_name": "Delhi Police - PCR Command Unit 12",
        "role": "police",
        "badge_number": "DP-8842",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
    {
        "id": "22222222-2222-2222-2222-222222222222",
        "email": "fire@delhifire.gov.in",
        "agency_name": "Delhi Fire Service - Rescue 4",
        "role": "fire",
        "badge_number": "DFS-301",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
    {
        "id": "33333333-3333-3333-3333-333333333333",
        "email": "trauma@aiims.edu",
        "agency_name": "AIIMS Emergency & Trauma Center",
        "role": "hospital",
        "badge_number": "AIIMS-ER-09",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
    {
        "id": "44444444-4444-4444-4444-444444444444",
        "email": "ddma.ops@delhi.gov.in",
        "agency_name": "Delhi Disaster Management Authority",
        "role": "superadmin",
        "badge_number": "DDMA-01",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    },
]

INITIAL_EMERGENCY_DISPATCHES: List[Dict[str, Any]] = [
    {
        "id": "d1111111-1111-1111-1111-111111111111",
        "camera_id": "CAM-01",
        "dispatched_by": "22222222-2222-2222-2222-222222222222",
        "agency_type": "Rescue Boat Unit",
        "priority": "critical",
        "notes": "Water level at 42cm under Minto Bridge. 2 civilian cars stalled in underpass.",
        "status": "en_route",
        "dispatched_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=18)).isoformat(),
    },
    {
        "id": "d2222222-2222-2222-2222-222222222222",
        "camera_id": "CAM-04",
        "dispatched_by": "11111111-1111-1111-1111-111111111111",
        "agency_type": "Heavy Crane / Tow",
        "priority": "high",
        "notes": "Pul Prahladpur underpass deep water (50cm). Diverting traffic and clearing lane.",
        "status": "dispatched",
        "dispatched_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=8)).isoformat(),
    },
    {
        "id": "d3333333-3333-3333-3333-333333333333",
        "camera_id": "CAM-02",
        "dispatched_by": "44444444-4444-4444-4444-444444444444",
        "agency_type": "Water Pump Team",
        "priority": "high",
        "notes": "ITO Crossing drain overflow. High-flow dewatering pumps activated.",
        "status": "resolved",
        "dispatched_at": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=55)).isoformat(),
    },
]


def normalize_station_id(station_id: str) -> str:
    """Helper to normalize station IDs across CAM-0X and station-X formats."""
    s = station_id.strip()
    if s.lower().startswith("station-"):
        num = s.split("-")[-1]
        return f"CAM-{int(num):02d}"
    if s.upper().startswith("CAM-"):
        try:
            num = int(s[4:])
            return f"CAM-{num:02d}"
        except ValueError:
            return s.upper()
    return s


class MockDatabase:
    """Thread-safe in-memory database fallback with seed data."""

    def __init__(self):
        self._lock = threading.Lock()
        self.camera_stations: Dict[str, Dict[str, Any]] = {}
        for station in INITIAL_CAMERA_STATIONS:
            self.camera_stations[station["id"]] = dict(station)
            num = int(station["id"].split("-")[1])
            self.camera_stations[f"station-{num}"] = self.camera_stations[station["id"]]

        self.citizen_reports: List[Dict[str, Any]] = [dict(r) for r in INITIAL_CITIZEN_REPORTS]
        self.hazard_logs: List[Dict[str, Any]] = []
        self.agency_users: Dict[str, Dict[str, Any]] = {u["id"]: dict(u) for u in INITIAL_AGENCY_USERS}
        self.emergency_dispatches: List[Dict[str, Any]] = [dict(d) for d in INITIAL_EMERGENCY_DISPATCHES]

    def get_camera_stations(self) -> List[Dict[str, Any]]:
        with self._lock:
            unique = {}
            for k, v in self.camera_stations.items():
                canon_id = normalize_station_id(v["id"])
                if canon_id not in unique:
                    unique[canon_id] = dict(v)
            return list(unique.values())

    def get_camera_station(self, station_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            canon = normalize_station_id(station_id)
            if canon in self.camera_stations:
                return dict(self.camera_stations[canon])
            if station_id in self.camera_stations:
                return dict(self.camera_stations[station_id])
            return None

    def upsert_camera_station(self, station_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            station_id = normalize_station_id(station_data["id"])
            existing = self.camera_stations.get(station_id, {})
            merged = {**existing, **station_data, "id": station_id}
            if "last_updated" not in station_data:
                merged["last_updated"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.camera_stations[station_id] = merged
            
            try:
                num = int(station_id.split("-")[1])
                self.camera_stations[f"station-{num}"] = merged
            except Exception:
                pass
            return dict(merged)

    def get_citizen_reports(self) -> List[Dict[str, Any]]:
        with self._lock:
            return sorted(
                [dict(r) for r in self.citizen_reports],
                key=lambda x: x.get("created_at", ""),
                reverse=True
            )

    def add_citizen_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            report = dict(report_data)
            if "id" not in report or not report["id"]:
                report["id"] = str(uuid.uuid4())
            if "created_at" not in report or not report["created_at"]:
                report["created_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.citizen_reports.insert(0, report)
            return dict(report)

    def log_hazard(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            log_item = dict(log_data)
            if "id" not in log_item:
                log_item["id"] = str(uuid.uuid4())
            if "recorded_at" not in log_item:
                log_item["recorded_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.hazard_logs.append(log_item)
            return dict(log_item)

    def get_agency_user(self, identifier: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for u in self.agency_users.values():
                if u["id"] == identifier or u["email"].lower() == identifier.lower():
                    return dict(u)
            return None

    def create_agency_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            user = dict(user_data)
            if "id" not in user or not user["id"]:
                user["id"] = str(uuid.uuid4())
            if "created_at" not in user:
                user["created_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.agency_users[user["id"]] = user
            return dict(user)

    def get_emergency_dispatches(self) -> List[Dict[str, Any]]:
        with self._lock:
            return sorted(
                [dict(d) for d in self.emergency_dispatches],
                key=lambda x: x.get("dispatched_at", ""),
                reverse=True
            )

    def add_emergency_dispatch(self, dispatch_data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            disp = dict(dispatch_data)
            if "id" not in disp or not disp["id"]:
                disp["id"] = str(uuid.uuid4())
            if "dispatched_at" not in disp or not disp["dispatched_at"]:
                disp["dispatched_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            if "status" not in disp:
                disp["status"] = "dispatched"
            self.emergency_dispatches.insert(0, disp)
            return dict(disp)

    def update_emergency_dispatch_status(self, dispatch_id: str, status: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for d in self.emergency_dispatches:
                if d["id"] == dispatch_id:
                    d["status"] = status
                    return dict(d)
            return None


class DatabaseManager:
    """Manages Supabase client connection or transparent in-memory fallback."""

    def __init__(self):
        self._supabase_client = None
        self._mock_db = MockDatabase()
        self._use_supabase = False
        self._init_client()

    def _init_client(self):
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                from supabase import create_client, Client
                self._supabase_client: Client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY
                )
                self._use_supabase = True
                logger.info("Connected to Supabase PostgreSQL using service role key.")
            except Exception as e:
                logger.warning(f"Failed to initialize Supabase client: {e}. Falling back to in-memory mock store.")
                self._use_supabase = False
        else:
            logger.info("Supabase credentials not fully configured. Using in-memory mock database.")
            self._use_supabase = False

    @property
    def is_mock(self) -> bool:
        return not self._use_supabase

    @property
    def supabase_client(self):
        return self._supabase_client

    async def get_camera_stations(self) -> List[Dict[str, Any]]:
        if self._use_supabase and self._supabase_client:
            try:
                res = self._supabase_client.table("camera_stations").select("*").execute()
                data = res.data if res.data is not None else []
                existing_ids = {s.get("id") for s in data}
                
                # Check if any seed station (e.g. CAM-09) is missing from Supabase
                seed_stations = self._mock_db.get_camera_stations()
                missing = [st for st in seed_stations if st["id"] not in existing_ids]
                
                if missing:
                    logger.info(f"Syncing {len(missing)} missing camera station(s) to Supabase: {[m['id'] for m in missing]}")
                    for st in missing:
                        try:
                            self._supabase_client.table("camera_stations").upsert(st).execute()
                            data.append(st)
                        except Exception as up_err:
                            logger.warning(f"Error seeding station {st['id']} to Supabase: {up_err}")
                            data.append(st)
                
                if data:
                    return sorted(data, key=lambda x: x.get("id", ""))
            except Exception as e:
                logger.error(f"Supabase error fetching camera_stations: {e}. Falling back to mock store.")
        return self._mock_db.get_camera_stations()

    async def get_camera_station(self, station_id: str) -> Optional[Dict[str, Any]]:
        if self._use_supabase and self._supabase_client:
            try:
                canon_id = normalize_station_id(station_id)
                res = self._supabase_client.table("camera_stations").select("*").eq("id", canon_id).execute()
                if res.data:
                    return res.data[0]
                res2 = self._supabase_client.table("camera_stations").select("*").eq("id", station_id).execute()
                if res2.data:
                    return res2.data[0]
            except Exception as e:
                logger.error(f"Supabase error fetching station {station_id}: {e}")
        return self._mock_db.get_camera_station(station_id)

    async def update_camera_station_telemetry(
        self,
        camera_id: str,
        water_depth_cm: float,
        status: str,
        hazard: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        state_int: int = 0
    ) -> Dict[str, Any]:
        canon_id = normalize_station_id(camera_id)
        existing = await self.get_camera_station(canon_id) or {}
        update_data: Dict[str, Any] = {
            "id": canon_id,
            "name": existing.get("name", f"Station {canon_id}"),
            "area": existing.get("area", "Delhi NCR"),
            "water_level_cm": water_depth_cm,
            "status": status,
            "last_updated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        if hazard is not None:
            update_data["hazard"] = hazard
        if latitude is not None:
            update_data["latitude"] = latitude
        elif "latitude" in existing:
            update_data["latitude"] = existing["latitude"]
        if longitude is not None:
            update_data["longitude"] = longitude
        elif "longitude" in existing:
            update_data["longitude"] = existing["longitude"]
        if "image_url" in existing:
            update_data["image_url"] = existing["image_url"]

        if self._use_supabase and self._supabase_client:
            try:
                res = self._supabase_client.table("camera_stations").upsert(update_data).execute()
                self._supabase_client.table("hazard_logs").insert({
                    "camera_id": canon_id,
                    "water_depth_cm": water_depth_cm,
                    "state": state_int,
                    "status": status,
                    "hazard": hazard,
                }).execute()
                if res.data:
                    self._mock_db.upsert_camera_station(res.data[0])
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase telemetry update failed: {e}. Writing to mock store.")

        updated = self._mock_db.upsert_camera_station(update_data)
        self._mock_db.log_hazard({
            "camera_id": canon_id,
            "water_depth_cm": water_depth_cm,
            "state": state_int,
            "status": status,
            "hazard": hazard,
        })
        return updated

    async def get_citizen_reports(self) -> List[Dict[str, Any]]:
        if self._use_supabase and self._supabase_client:
            try:
                res = (
                    self._supabase_client.table("citizen_reports")
                    .select("*")
                    .order("created_at", desc=True)
                    .execute()
                )
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.error(f"Supabase error fetching citizen_reports: {e}")
        return self._mock_db.get_citizen_reports()

    async def create_citizen_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        if self._use_supabase and self._supabase_client:
            try:
                res = self._supabase_client.table("citizen_reports").insert(report_data).execute()
                if res.data:
                    saved = res.data[0]
                    self._mock_db.add_citizen_report(saved)
                    return saved
            except Exception as e:
                logger.error(f"Supabase error saving citizen report: {e}")
        return self._mock_db.add_citizen_report(report_data)

    async def get_agency_user(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Retrieve agency user profile by UUID id or email."""
        if self._use_supabase and self._supabase_client:
            try:
                is_uuid = False
                try:
                    uuid.UUID(identifier)
                    is_uuid = True
                except ValueError:
                    is_uuid = False

                if is_uuid:
                    res = self._supabase_client.table("agency_users").select("*").eq("id", identifier).execute()
                else:
                    res = self._supabase_client.table("agency_users").select("*").eq("email", identifier).execute()

                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase error fetching agency_user {identifier}: {e}")
        return self._mock_db.get_agency_user(identifier)

    async def create_agency_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        if self._use_supabase and self._supabase_client:
            try:
                res = self._supabase_client.table("agency_users").upsert(user_data).execute()
                if res.data:
                    saved = res.data[0]
                    self._mock_db.create_agency_user(saved)
                    return saved
            except Exception as e:
                logger.error(f"Supabase error creating agency user: {e}")
        return self._mock_db.create_agency_user(user_data)

    async def get_emergency_dispatches(self) -> List[Dict[str, Any]]:
        if self._use_supabase and self._supabase_client:
            try:
                res = (
                    self._supabase_client.table("emergency_dispatches")
                    .select("*, camera_stations(name, area), agency_users(agency_name, badge_number, role)")
                    .order("dispatched_at", desc=True)
                    .execute()
                )
                if res.data is not None and len(res.data) > 0:
                    # Flatten relations for convenience
                    formatted = []
                    for item in res.data:
                        d = dict(item)
                        cam = d.pop("camera_stations", None) or {}
                        user = d.pop("agency_users", None) or {}
                        d["camera_name"] = cam.get("name") or d.get("camera_id")
                        d["camera_area"] = cam.get("area")
                        d["responder_agency"] = user.get("agency_name")
                        d["responder_badge"] = user.get("badge_number")
                        formatted.append(d)
                    return formatted
            except Exception as e:
                logger.error(f"Supabase error fetching emergency_dispatches: {e}")
        
        # In-memory enriched return
        dispatches = self._mock_db.get_emergency_dispatches()
        enriched = []
        stations = {s["id"]: s for s in self._mock_db.get_camera_stations()}
        users = self._mock_db.agency_users
        for d in dispatches:
            item = dict(d)
            st = stations.get(item.get("camera_id"), {})
            usr = users.get(item.get("dispatched_by"), {})
            item["camera_name"] = st.get("name", item.get("camera_id"))
            item["camera_area"] = st.get("area", "")
            item["responder_agency"] = usr.get("agency_name", item.get("agency_type", "Emergency Unit"))
            item["responder_badge"] = usr.get("badge_number", "")
            enriched.append(item)
        return enriched

    async def create_emergency_dispatch(self, dispatch_data: Dict[str, Any]) -> Dict[str, Any]:
        if self._use_supabase and self._supabase_client:
            try:
                res = self._supabase_client.table("emergency_dispatches").insert(dispatch_data).execute()
                if res.data and len(res.data) > 0:
                    saved = res.data[0]
                    self._mock_db.add_emergency_dispatch(saved)
                    return saved
            except Exception as e:
                logger.error(f"Supabase error creating emergency dispatch: {e}")
        return self._mock_db.add_emergency_dispatch(dispatch_data)

    async def update_emergency_dispatch_status(self, dispatch_id: str, status: str) -> Optional[Dict[str, Any]]:
        if self._use_supabase and self._supabase_client:
            try:
                res = self._supabase_client.table("emergency_dispatches").update({"status": status}).eq("id", dispatch_id).execute()
                if res.data and len(res.data) > 0:
                    saved = res.data[0]
                    self._mock_db.update_emergency_dispatch_status(dispatch_id, status)
                    return saved
            except Exception as e:
                logger.error(f"Supabase error updating emergency dispatch status: {e}")
        return self._mock_db.update_emergency_dispatch_status(dispatch_id, status)


db = DatabaseManager()
