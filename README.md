# SWE (Smart Traffic Safety Intelligence Dashboard)

React + Vite based traffic safety information web application utilizing Open Data Portal (data.go.kr) and KoROAD (opendata.koroad.or.kr) public APIs to visualize accident clusters and surrounding safety facilities in Cheonan-si.

## Tech Stack

- **Frontend**: React 19, Leaflet (OpenStreetMap)
- **Tooling**: Vite 8, ESLint
- **Deployment**: Vercel (API Rewrites / Serverless Proxy)

## Key Features

- **Accident Cluster Analysis**: Displays child protection zones, elderly pedestrian accidents, and traffic law violation clusters.
- **Interactive Map View**: Dark-themed Leaflet map with cluster markers, radius circles, and detailed popups.
- **Safety Facilities Checklist**: Integrates CCTV and speed bump data within cluster radius.
- **Responsive Layout**: Tailored UI supporting desktop, tablet, and mobile screen sizes.

## Responsive Design Breakpoints

- **Desktop (> 1024px)**: 2-column split view (interactive map + detail panel), full control bar with KPI metrics.
- **Tablet (<= 1024px)**: Compact 2-column layout, scrollable tab navigation, responsive status indicators.
- **Mobile (<= 768px)**: Vertical stack layout (dedicated map view + scrollable detail panel), 2x2 grid KPI cards, touch-optimized dialogs.
- **Compact Mobile (<= 480px)**: Compact header typography, optimized map height (320px), streamlined padding.

## Getting Started

```bash
npm install
cp .env.example .env   # Fill in your API keys
npm run dev
```

## Environment Variables

| Variable | Description |
| --- | --- |
| `VITE_KOROAD_AUTH_KEY` | KoROAD Traffic Accident Information System Auth Key |
| `VITE_DATA_GO_KR_API_KEY` | Public Data Portal (data.go.kr) Service Key |

Do not commit `.env`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run build` | Production build (`dist/`) |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## API Proxy Configuration

CORS issues are addressed via `/api` proxies.

| Route | Target |
| --- | --- |
| `/api/koroad/*` | `https://opendata.koroad.or.kr` |
| `/api/datagokr/*` | `https://apis.data.go.kr` |

- **Development**: Handled by `vite.config.js` (`server.proxy`)
- **Production (Vercel)**: Handled by `vercel.json` (`rewrites`)

## Deployment (Vercel)

Connect the GitHub repository directly to Vercel. Deploying via GitHub ensures `vercel.json` is automatically included and proxy rewrite rules work as intended.
