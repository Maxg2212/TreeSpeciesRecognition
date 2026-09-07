import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT || 3001;
const CANOPY_BBOX_DEGREES = Number(process.env.CANOPY_BBOX_DEGREES || 0.0015);
const ESRI_WORLD_IMAGERY_URL =
  process.env.ESRI_WORLD_IMAGERY_URL ||
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export";

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

  const { latitude, longitude } = identification;
  const half = CANOPY_BBOX_DEGREES / 2;
  const bbox = [longitude - half, latitude - half, longitude + half, latitude + half].join(",");

  const exportUrl = new URL(ESRI_WORLD_IMAGERY_URL);
  exportUrl.searchParams.set("bbox", bbox);
  exportUrl.searchParams.set("bboxSR", "4326");
  exportUrl.searchParams.set("imageSR", "4326");
  exportUrl.searchParams.set("size", "512,512");
  exportUrl.searchParams.set("format", "png");
  exportUrl.searchParams.set("f", "image");

  const upstream = await fetch(exportUrl);
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
