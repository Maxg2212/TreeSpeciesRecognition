import "dotenv/config";
import fs from "node:fs";
import https from "node:https";
import http from "node:http";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT || 3001;
// Reuses the mkcert cert already set up for the mobile app (see
// mobile-app/README.md) — it already covers localhost + the LAN IP, which
// this needs too. The mobile app is served over HTTPS (required for
// navigator.geolocation on iOS Safari), so it can only fetch an HTTPS
// backend: browsers silently block an HTTPS page calling plain HTTP
// ("mixed content"), which is why this isn't optional for phone testing.
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || "../mobile-app/certs/dev-cert.pem";
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || "../mobile-app/certs/dev-key.pem";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
// Static Maps uses a zoom level, not a bbox — ~20 frames roughly a single
// tree's canopy; raise/lower to widen or tighten the crop.
const CANOPY_ZOOM = process.env.CANOPY_ZOOM || "20";

app.use(cors());
app.use(express.json());

// Express 4 doesn't catch a rejected promise from an async handler — it
// becomes an unhandled rejection and crashes the whole process (this is
// what actually happened: a DB error on one request took the entire
// server down, not just that request). Routes below use this wrapper so
// any failure becomes a normal 500 response instead.
function asyncHandler(handler) {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

app.post("/api/identifications", asyncHandler(async (req, res) => {
  const { species, confidence, latitude, longitude } = req.body ?? {};

  if (typeof species !== "string" || species.trim() === "") {
    return res.status(400).json({ error: "species is required" });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ error: "latitude and longitude must be numbers" });
  }
  if (confidence !== undefined && typeof confidence !== "number") {
    return res.status(400).json({ error: "confidence must be a number" });
  }

  const identification = await prisma.identification.create({
    data: { species, confidence, latitude, longitude },
  });

  res.status(201).json(identification);
}));

app.get("/api/identifications", asyncHandler(async (_req, res) => {
  const identifications = await prisma.identification.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(identifications);
}));

app.get("/api/identifications/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id must be an integer" });
  }

  const identification = await prisma.identification.findUnique({ where: { id } });
  if (!identification) {
    return res.status(404).json({ error: "not found" });
  }

  res.json(identification);
}));

app.get("/api/identifications/:id/canopy", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id must be an integer" });
  }

  const identification = await prisma.identification.findUnique({ where: { id } });
  if (!identification) {
    return res.status(404).json({ error: "not found" });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not set" });
  }

  const { latitude, longitude } = identification;

  const staticMapUrl = new URL("https://maps.googleapis.com/maps/api/staticmap");
  staticMapUrl.searchParams.set("center", `${latitude},${longitude}`);
  staticMapUrl.searchParams.set("zoom", CANOPY_ZOOM);
  staticMapUrl.searchParams.set("size", "512x512");
  staticMapUrl.searchParams.set("maptype", "satellite");
  staticMapUrl.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  const upstream = await fetch(staticMapUrl);
  if (!upstream.ok) {
    return res.status(502).json({ error: "failed to fetch canopy image" });
  }

  res.set("Content-Type", upstream.headers.get("content-type") || "image/png");
  res.set("Cache-Control", "public, max-age=86400");
  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.send(buffer);
}));

// Last-resort handler: turns any error asyncHandler forwards (or a
// synchronous throw) into a plain 500 instead of an unhandled exception
// crashing the whole process.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

if (fs.existsSync(HTTPS_CERT_PATH) && fs.existsSync(HTTPS_KEY_PATH)) {
  https
    .createServer(
      { cert: fs.readFileSync(HTTPS_CERT_PATH), key: fs.readFileSync(HTTPS_KEY_PATH) },
      app
    )
    .listen(PORT, () => {
      console.log(`Backend listening on https://localhost:${PORT}`);
    });
} else {
  console.warn(
    `No cert at ${HTTPS_CERT_PATH} — falling back to plain HTTP. The mobile ` +
      `app (served over HTTPS) won't be able to reach this: run ` +
      `mobile-app/scripts/generate-certs.sh first. See README.md.`
  );
  http.createServer(app).listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}
