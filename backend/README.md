# Backend

Node.js + Express + Prisma (SQLite for local dev/demo, swappable to Postgres).

Stores identification attempts sent by the mobile app and proxies a
satellite canopy image (Esri ArcGIS World Imagery) for each one.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Server listens on `http://localhost:3001` by default.

## Endpoints

### `POST /api/identifications`

Body:

```json
{ "species": "Guanacaste", "confidence": 0.92, "latitude": 9.9281, "longitude": -84.0907 }
```

`confidence` is optional. Returns the created record (`201`).

```bash
curl -X POST http://localhost:3001/api/identifications \
  -H "Content-Type: application/json" \
  -d '{"species":"Guanacaste","confidence":0.92,"latitude":9.9281,"longitude":-84.0907}'
```

### `GET /api/identifications`

Lists all attempts, newest first.

```bash
curl http://localhost:3001/api/identifications
```

### `GET /api/identifications/:id`

Single record, or `404`.

```bash
curl http://localhost:3001/api/identifications/1
```

### `GET /api/identifications/:id/canopy`

Proxies a cropped PNG from Esri ArcGIS World Imagery centered on the
record's GPS coordinates. Crop size is controlled by `CANOPY_BBOX_DEGREES`
in `.env`.

```bash
curl http://localhost:3001/api/identifications/1/canopy --output canopy.png
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
