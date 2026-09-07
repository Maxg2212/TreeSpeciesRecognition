# Web app

React + Vite dashboard. Reads identification attempts from the backend and
displays them, each paired with a satellite canopy view fetched via the
backend's Esri proxy.

## Setup

```bash
cd web-app
npm install
cp .env.example .env
npm run dev
```

Requires the backend running (see `../backend/README.md`).
