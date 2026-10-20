import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT || 3001;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
// Static Maps uses a zoom level, not a bbox — ~20 frames roughly a single
// tree's canopy; raise/lower to widen or tighten the crop.
const CANOPY_ZOOM = process.env.CANOPY_ZOOM || "20";

app.use(cors());
app.use(express.json());

app.post("/api/identifications", async (req, res) => {
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
});

app.get("/api/identifications", async (_req, res) => {
  const identifications = await prisma.identification.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(identifications);
});

app.get("/api/identifications/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id must be an integer" });
  }

  const identification = await prisma.identification.findUnique({ where: { id } });
  if (!identification) {
    return res.status(404).json({ error: "not found" });
  }

  res.json(identification);
});

app.get("/api/identifications/:id/canopy", async (req, res) => {
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
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
