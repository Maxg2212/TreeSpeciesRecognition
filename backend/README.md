# Backend

Node.js + Express + Prisma (SQLite for local dev/demo, swappable to Postgres).

Stores identification attempts sent by the mobile app and proxies a
satellite canopy image (Google Maps Static API) for each one.

> To run all three components (backend, mobile app, web app) with one
> command, see the [repo root README](../README.md) instead.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Server listens on `https://localhost:3001` by default — it reuses the
mkcert cert from `mobile-app/certs/` (see `mobile-app/README.md` for the
one-time mkcert setup), so **generate that cert first** or this falls back
to plain HTTP with a startup warning. HTTPS here isn't optional if you're
testing the mobile app: it's served over HTTPS (required for geolocation
on iOS Safari), and a browser will silently block an HTTPS page from
fetching a plain-HTTP backend ("mixed content") — this is the actual
cause behind a `fetch`/`Load failed` error in the mobile app right after
granting location access.

### Google Maps API key

The canopy endpoint requires a Google Cloud project with the **Maps
Static API** enabled and **billing turned on** — unlike the alternatives
considered earlier (Esri, MapTiler), Google requires a card on file even
to stay within the free monthly allowance. Set a budget alert in [Google
Cloud Console](https://console.cloud.google.com/billing) once billing is
on. Grab the key from [console.cloud.google.com/google/maps-apis](https://console.cloud.google.com/google/maps-apis)
and set `GOOGLE_MAPS_API_KEY` in `.env`.

## Endpoints

### `POST /api/identifications`

Body:

```json
{ "species": "Guanacaste", "confidence": 0.92, "latitude": 9.9281, "longitude": -84.0907 }
```

`confidence` is optional. Returns the created record (`201`).

```bash
curl -X POST https://localhost:3001/api/identifications \
  -H "Content-Type: application/json" \
  -d '{"species":"Guanacaste","confidence":0.92,"latitude":9.9281,"longitude":-84.0907}'
```

### `GET /api/identifications`

Lists all attempts, newest first.

```bash
curl https://localhost:3001/api/identifications
```

### `GET /api/identifications/:id`

Single record, or `404`.

```bash
curl https://localhost:3001/api/identifications/1
```

### `GET /api/identifications/:id/canopy`

Proxies a PNG from Google's Maps Static API centered on the record's GPS
coordinates. Crop tightness is controlled by `CANOPY_ZOOM` in `.env`
(Static Maps uses a zoom level, not a bounding box).

```bash
curl https://localhost:3001/api/identifications/1/canopy --output canopy.png
```

## Switching to PostgreSQL

Change in `.env`:

```
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

And in `prisma/schema.prisma`:

```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then `npx prisma migrate dev`. No application code changes needed.
