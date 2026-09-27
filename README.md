# 🌊 FloodLens — Real-Time Urban Flood Intelligence & Safe Routing

[![React](https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![YOLOv8](https://img.shields.io/badge/Computer_Vision-YOLOv8_Segmentation-00FFFF?logo=ultralytics&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![Leaflet](https://img.shields.io/badge/Maps-React_Leaflet-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**FloodLens** is an intelligent urban flood monitoring, edge camera vision analytics, and real-time safe routing platform built for Delhi NCR. It bridges the gap between raw CCTV camera feeds, citizen reports, and commuter navigation during heavy monsoon waterlogging events.

---

## 🌟 Key Features

### 1. 👁️ Edge Vision & AI Water Segmentation
- **YOLOv8 Instance Segmentation**: Automated water accumulation detection from CCTV snapshots.
- **Dynamic Telemetry HUD**: Generates visual overlays with water masks, contour outlines, water level estimates (cm), and severity classifications (*Clear*, *Caution*, *Impassable*).
- **Simulated & Real Feeds**: Ingests camera streams or tests edge segmentation with real underpass datasets.

### 2. 🗺️ Live Safe Roads Map & Interactive Radar
- **Live Home Radar Preview**: Modern 2-column hero preview with pulsing live telemetry, quick stats, road search, and interactive mini-map.
- **Road-Snapped Safe Routing**: Computes detour routes via OSRM (Open Source Routing Machine) and graph traversal that dynamically skirt flooded underpasses and hazardous junctions (e.g. Minto Bridge, ITO Crossing, Pul Prahladpur).
- **Interactive Map Pinning**: Click or drag origin (`A`) and destination (`B`) pins anywhere on the map to calculate flood-avoiding paths in real time.

### 3. 👥 Citizen Crowdsourced Reports
- **Real-Time Reporting**: Citizens can submit geotagged flood hazards, water depth observations, and descriptions.
- **Community Verification**: Automated cross-referencing with nearby camera telemetry and administrative verification workflows.

### 4. 🚨 Emergency Services & Admin Control Center
- **Municipal Command Dashboard**: Role-based access for emergency responders and traffic police.
- **Manual Overrides & Broadcasting**: Push real-time advisories, update station statuses, and manage critical transit corridors.

---

## 📁 Repository Structure

```
floodlens/
├── .gitignore                   # Comprehensive root exclusions (env, venv, node_modules)
├── README.md                    # Project documentation & architecture overview
│
├── backend/                     # FastAPI Python Backend
│   ├── app/
│   │   ├── api/                 # API routers:
│   │   │   ├── routes_admin.py        # Municipal alerts & admin controls
│   │   │   ├── routes_cameras.py      # Camera stations & telemetry feeds
│   │   │   ├── routes_citizen.py      # Citizen crowdsourced reporting
│   │   │   ├── routes_edge.py         # AI camera snapshot analysis
│   │   │   └── routes_navigation.py   # Safe routing & detour calculations
│   │   ├── core/                # App config, database clients, CORS
│   │   ├── schemas/             # Pydantic schemas for requests/responses
│   │   ├── services/            # Core business logic:
│   │   │   ├── router.py              # Flood graph pathfinding & OSRM client
│   │   │   ├── verifier.py            # Citizen report verification algorithms
│   │   │   └── water_seg_service.py   # YOLOv8 segmentation & HUD renderer
│   │   ├── static/              # Edge camera snapshots & static assets
│   │   ├── weights/             # AI model weights (water_seg.pt)
│   │   ├── __init__.py
│   │   └── main.py              # Application entrypoint & middleware
│   ├── .env.example             # Backend environment template
│   ├── requirements.txt         # Python dependencies
│   ├── schema.sql               # PostgreSQL / Supabase schema definition
│   ├── seed_data.py             # Database seeder for Delhi camera stations
│   ├── test_backend.py          # FastAPI endpoint integration test suite
│   ├── test_images/             # Sample monsoon camera test images
│   └── test_water_model.py      # CLI benchmark & test tool for segmentation
│
└── frontend/                    # React 19 + TypeScript + Vite Frontend
    ├── public/                  # Static assets & camera preview mocks
    ├── src/
    │   ├── assets/              # Branding and icons
    │   ├── components/          # Reusable UI components:
    │   │   ├── CameraCard.tsx         # Camera telemetry & snapshot card
    │   │   ├── CameraWebcamModal.tsx  # Edge webcam test simulator
    │   │   ├── DepthBadge.tsx         # Water depth indicator badge
    │   │   ├── MiniMapPreview.tsx     # Hero live radar preview map
    │   │   ├── Navbar.tsx / Footer    # Navigation & layout chrome
    │   │   └── StatusBadge.tsx        # Standardized status tags
    │   ├── context/             # AuthContext (Emergency Admin session)
    │   ├── data/                # Fallback mock datasets & Delhi coordinates
    │   ├── hooks/               # Custom hooks (telemetry polling, reports)
    │   ├── lib/                 # API client & Supabase connector
    │   ├── pages/               # App views:
    │   │   ├── Home.tsx               # 2-Column hero, mini-map, search & stats
    │   │   ├── MapPage.tsx            # Full GIS Safe Roads Map & Routing
    │   │   ├── CamerasPage.tsx        # CCTV monitoring station grid
    │   │   ├── ReportPage.tsx         # Citizen incident report form
    │   │   ├── AboutPage.tsx          # Architecture and methodology
    │   │   └── admin/                 # Admin login & dispatch dashboard
    │   ├── types/               # TypeScript interfaces
    │   ├── utils/               # Haversine distance, time utilities, colors
    │   ├── App.tsx              # Router configuration
    │   ├── index.css            # Tailwind CSS v4 styling & animations
    │   └── main.tsx             # React entrypoint
    ├── .env.example             # Frontend environment template
    ├── package.json             # NPM dependencies & scripts
    └── vite.config.ts           # Vite bundler configuration
```

---

## 🛠️ Tech Stack

| Domain | Technologies |
|---|---|
| **Frontend Framework** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com/), Glassmorphism, HSL earth palette |
| **Maps & GIS** | [Leaflet](https://leafletjs.com/), [React-Leaflet](https://react-leaflet.js.org/), [OSRM API](https://project-osrm.org/) |
| **Backend API** | [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), [Pydantic v2](https://docs.pydantic.dev/) |
| **Computer Vision** | [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics), [OpenCV](https://opencv.org/), [NumPy](https://numpy.org/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL), In-Memory Fallback Engine |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or later) & **npm**
- **Python** (v3.10 or later) & **pip**
- *(Optional)* Git LFS or direct weights placement (`backend/app/weights/water_seg.pt`)

---

### 1. Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a Python virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env if configuring Supabase credentials (optional; fallback engine works out of the box)

# 5. Start the FastAPI server with auto-reload
uvicorn app.main:app --reload --port 8000
```

- **API Documentation (Swagger UI):** `http://localhost:8000/docs`
- **Alternative ReDoc UI:** `http://localhost:8000/redoc`

---

### 2. Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Start the Vite development server
npm run dev
```

- **Web Application URL:** `http://localhost:5173`

---

## 🧪 Testing & Verification

### Running Backend Unit & Integration Tests
```bash
cd backend
python test_backend.py
```

### Testing the AI Water Segmentation Model
```bash
cd backend
python test_water_model.py
```
This tests the YOLOv8 segmentation on sample underpass images in `test_images/` and outputs telemetry metrics to the terminal.

### Building & Type-Checking Frontend
```bash
cd frontend
npm run build
npm run lint
```

---

## 📡 Core API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cameras` | List all monitored camera stations & real-time telemetry |
| `GET` | `/api/cameras/{id}` | Detailed telemetry and latest analyzed snapshot for a station |
| `POST` | `/api/navigation/safe-route` | Calculate a flood-avoiding safe route between two points |
| `POST` | `/api/edge/segment` | Run YOLOv8 segmentation on uploaded image with visual HUD |
| `GET` | `/api/citizen/reports` | Retrieve active citizen waterlogging hazard reports |
| `POST` | `/api/citizen/reports` | Submit a new crowdsourced flood observation |
| `GET` | `/api/admin/dashboard` | Emergency services situational summary and alert feeds |
| `POST` | `/api/admin/broadcast` | Broadcast municipal flood warning advisories |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or file an issue:
1. Fork the project
2. Create your feature branch (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add NewFeature'`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
