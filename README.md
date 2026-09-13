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

## Quickstart

Requires Node.js 24.x (>= 24.14.0) or 26.x and Git.

```bash
# 1. Clone both upstream repositories
npm run clone:all

# 2. Install all dependencies across apps and root
npm run install:all

# 3. Start everything concurrently
npm run dev:all
```

Navigate to `http://localhost:5000` to access the Unified Console.

### Standalone Usage

Each app remains 100% functional on its own:

```bash
# Run World Monitor standalone (port 3000)
npm run dev:world

# Run God's Eye View standalone (port 4173)
npm run dev:gev
```

## Production Deployment

A production Nginx reverse proxy template is provided in `deploy/nginx.conf`:
- Serves `landing/` at `/`
- Routes `/world/` to World Monitor's static build (`dist/`)
- Routes `/gev/` to God's Eye View's static build (`dist/`)
- Proxies `/world/api/` and `/gev/api/` to respective backend processes
