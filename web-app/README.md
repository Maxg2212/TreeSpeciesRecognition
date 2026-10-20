# Web app

React + Vite dashboard. Reads identification attempts from the backend and
displays them, each paired with a satellite canopy view fetched via the
backend's Google Maps proxy.

> To run all three components (backend, mobile app, web app) with one
> command, see the [repo root README](../README.md) instead.

## Setup

```bash
cd web-app
npm install
cp .env.example .env
npm run dev
```

Requires the backend running (see `../backend/README.md`).
