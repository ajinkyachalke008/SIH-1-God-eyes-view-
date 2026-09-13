# Unified Intel Platform — World Monitor + God's Eye View

A unified operations console serving two independent open-source intelligence platforms side by side under one domain without modifying either codebase:

- **World Monitor** (`koala73/worldmonitor`, AGPL-3.0-only): Real-time geopolitical aggregator, 3D globe (globe.gl) and flat map (deck.gl/MapLibre), conflict feeds, macro signals, and flight/vessel tracking.
- **God's Eye View** (`bilawalsidhu/gods-eye-view`, MIT): 4D geospatial sensor fusion engine, CesiumJS 3D terrain and orbital tracking (satellites, wildfires, earthquakes, live CCTV, radio streams, tactical NVG mode).

```
unified-intel-platform/
├── apps/
│   ├── worldmonitor/          # Pristine clone of koala73/worldmonitor (AGPL-3.0)
│   └── gods-eye-view/         # Pristine clone of bilawalsidhu/gods-eye-view (MIT)
├── deploy/
│   └── nginx.conf             # Production path-based reverse proxy template
├── landing/
│   └── index.html             # Unified switcher console served at /
├── scripts/
│   └── dev-proxy.mjs          # Lightweight Node/Express dev reverse proxy
├── package.json               # Unified orchestration scripts
└── README.md
```

## Architecture & License Separation

- **Isolated Rendering Engines**: World Monitor uses `globe.gl` (Three.js) & `deck.gl`. God's Eye View uses `CesiumJS`. Rather than attempting to mount multiple heavy WebGL engines on one DOM canvas, both run independently on dedicated routes (`/world/` and `/gev/`).
- **Clean License Boundary**: World Monitor is AGPL-3.0; God's Eye View is MIT. Neither codebase is modified or intermixed.
- **Separate Backends & Proxies**: World Monitor's API services and God's Eye View's key-broker proxy run independently and are routed via path prefixes.

## Port Map

| Component | Port | Route |
|---|---|---|
| Unified Dev Proxy (Front Door) | `5000` | `http://localhost:5000/` |
| World Monitor Frontend | `3000` | `http://localhost:5000/world/` |
| God's Eye View Frontend | `4173` | `http://localhost:5000/gev/` |

## Prerequisites

- **Node.js** 24.x (>= 24.14.0) or 26.x
- **npm** (comes with Node.js)
- **Git**
- A modern browser with **WebGL 2.0** support (Chrome / Edge recommended)

## Quickstart (Fresh Setup)

```bash
# 1. Clone the repository
git clone https://github.com/ajinkyachalke008/SIH-1-God-eyes-view-.git
cd SIH-1-God-eyes-view-

# 2. Install root dependencies
npm install

# 3. Install World Monitor dependencies
npm install --prefix apps/worldmonitor

# 4. Install God's Eye View dependencies
npm install --prefix apps/gods-eye-view

# 5. Start all services concurrently
npm run dev:all
```

Navigate to **http://localhost:5000** to access the Unified Console.

| Page | URL |
|------|-----|
| 🏠 Unified Console | http://localhost:5000 |
| 🌍 World Monitor | http://localhost:5000/world/ |
| 👁️ God's Eye View | http://localhost:5000/gev/ |

### One-Command Install (Alternative)

```bash
# Install everything at once
npm run install:all

# Start everything
npm run dev:all
```

### Standalone Usage

Each app remains 100% functional on its own:

```bash
# Run World Monitor standalone (port 3000)
npm run dev:world

# Run God's Eye View standalone (port 4173)
npm run dev:gev
```

## API Keys & Configuration

God's Eye View uses a `.env` file at `apps/gods-eye-view/.env` for API keys:

| Key | Required? | Purpose |
|-----|-----------|---------|
| `CESIUM_ION_TOKEN` | ✅ Included | CesiumJS 3D globe, terrain & satellite imagery |
| `GOOGLE_MAPS_API_KEY` | Optional | Google Photorealistic 3D Tiles & place search |
| `OPENAI_API_KEY` | Optional | Voice control & HUD summaries |
| `FIRMS_MAP_KEY` | Optional | NASA FIRMS live active wildfire data |
| `AISSTREAM_API_KEY` | Optional | Live AIS vessel tracking |
| `TOMTOM_API_KEY` | Optional | Live traffic flow overlay |

> **Note:** The app works without any optional keys — it falls back to Esri World Imagery + OSM.
> To get a free Cesium Ion token: https://ion.cesium.com/tokens

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm install` fails | Ensure Node.js >= 24.14.0: `node -v` |
| Blank/black globe | Check WebGL support at `chrome://gpu` or try Chrome/Edge |
| Port already in use | Kill existing processes: `lsof -i :5000 -t \| xargs kill` |
| God's Eye View not loading | Try direct access at http://localhost:4173/gev/ |
| World Monitor API warnings | ACLED/feed warnings are normal without API keys |

## Production Deployment

A production Nginx reverse proxy template is provided in `deploy/nginx.conf`:

```bash
# Build both apps for production
npm run build:all
```

The Nginx config:
- Serves `landing/` at `/`
- Routes `/world/` to World Monitor's static build (`dist/`)
- Routes `/gev/` to God's Eye View's static build (`dist/`)
- Proxies `/world/api/` and `/gev/api/` to respective backend processes
