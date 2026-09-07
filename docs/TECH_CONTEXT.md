# Technical Context — Leaf-based Tree Species Recognition System

> Lean, code-focused context for Claude Code. Assumes the reader is picking
> up implementation work, not writing the thesis narrative. Drop this in
> the repo (e.g. `docs/TECH_CONTEXT.md`) and update it as decisions change.

## 1. Architecture (two components)

**Mobile app (PWA)**
- Captures a photo of a single leaf.
- Runs a TinyML model **fully on-device, in-browser** (see §2 — this is a
  PWA, not a native-installed app).
- Captures GPS coordinates automatically at capture time.
- Sends the identification attempt to the web backend when online:
  predicted species, GPS coordinates, timestamp.

**Web app**
- Stores every identification attempt sent by the mobile app: species
  (predicted), GPS coordinates, timestamp.
- For each stored record, fetches and displays a **satellite view of the
  tree canopy** at those GPS coordinates, pulled from an external imagery
  API (not a user-taken photo — see §4).
- Acts as the sync target / dashboard for records collected across users.

## 2. Model format & inference stack

**Decision: ONNX + `onnxruntime-web`** (not TensorFlow Lite).

Reasoning:
- The mobile app is a **PWA** running in Safari, because iOS restricts
  installing apps outside the App Store without an Apple Developer
  enrollment (see §3). This means inference must happen **in-browser**,
  not as a compiled native binary.
- `onnxruntime-web` runs `.onnx` models directly in-browser via
  WebAssembly/WebGPU — no native install, works in Safari on iPhone,
  accepts models exported from either TensorFlow/Keras or PyTorch.
- TensorFlow Lite is optimized for native mobile app binaries
  (Android/iOS with a real installed app); running it in a browser
  requires a TensorFlow.js bridge layer, adding friction with no clear
  upside here.
- Suggested pipeline: train/fine-tune the classifier (TF/Keras, per the
  parent project's existing approach) → export to `.onnx` via `tf2onnx` →
  load and run with `onnxruntime-web` in the PWA.
- If the distribution model changes later (e.g., enrolling as an Apple
  Developer and shipping a real native app via Xcode/TestFlight instead
  of a browser PWA), TensorFlow Lite + the CoreML execution provider would
  likely give better on-device latency — but that's a different
  distribution path than the one currently in use.

## 3. iOS distribution constraint (confirmed)

- Target test device: **iPhone 15**. iOS blocks installing apps outside
  the App Store without a signed build (Apple Developer enrollment).
- Current workaround: serve the app from a computer and open it from the
  iPhone's Safari browser via the computer's **local network IP**
  (e.g. `192.168.x.x:port`).
- **Confirmed constraint:** this only works while both devices are on the
  **same Wi-Fi / local subnet**. A private LAN IP is not reachable from
  outside that network (e.g., over cellular data) unless one of these is
  added:
  - Router port forwarding (exposes the dev server publicly — not
    recommended as a default setup)
  - A tunneling service (ngrok, Cloudflare Tunnel, Tailscale, etc.)
  - An actual public deployment of the web/mobile app (e.g. Vercel,
    Render, a cloud VM)
- This is standard local-dev-server behavior, not something specific to
  this app — but worth stating explicitly so it isn't mistaken for a bug
  during testing.

## 4. Satellite imagery for the canopy view

- The canopy image shown in the web app is **fetched from an external
  provider**, not captured by the user.
- **Decision: Esri ArcGIS World Imagery**
  (`World_Imagery/MapServer`) — free public REST tile service, ~1 m
  resolution for most of the world including Central America (up to
  0.3–0.5 m in some urban areas), no auth required for basic use.
- **Fallback option: MapTiler** (tile-based, decent resolution, easy
  integration) if Esri has coverage/quota issues.
- Ruled out: Sentinel Hub (~10 m/px — too coarse for an individual tree
  canopy) and USGS EarthExplorer (batch/download-oriented, high-res
  coverage mostly US-only via NAIP).

## 5. Data model (per identification attempt, stored by the web app)

- Predicted species name (model output)
- GPS coordinates (lat/lon) at capture time
- Timestamp
- Satellite canopy image reference (fetched via Esri, keyed by
  coordinates — not stored as a user upload)
- *(possible future fields)* confidence score, device/user identifier

## 6. Mobile app stack

- **Decision: React + Vite**, built as a PWA via `vite-plugin-pwa`.
- Capture flow: `<input type="file" accept="image/*" capture="environment">`
  (simplest cross-browser way to open the native camera from a web app;
  works fine over plain HTTP).
- Inference: `onnxruntime-web`, model loaded from `public/model/model.onnx`
  (see §2 for why ONNX over TF Lite here).
- **Critical gotcha (confirmed): iOS Safari requires HTTPS for
  `navigator.geolocation`**, even when accessed via a local LAN IP over
  plain HTTP — the call silently fails with `PERMISSION_DENIED`. Camera
  capture via the file input is unaffected, only geolocation is blocked.
  - Fix implemented: [mkcert](https://github.com/FiloSottile/mkcert)
    generates a locally-trusted HTTPS certificate for `localhost` + the
    LAN IP (`mobile-app/scripts/generate-certs.sh`, consumed directly by
    `vite.config.js`), replacing an earlier `@vitejs/plugin-basic-ssl`
    self-signed cert that triggered a "not private connection" warning on
    every device. Trusting mkcert's local CA is a one-time, per-machine
    setup (`mkcert -install`, root required) — see `mobile-app/README.md`
    for that and for trusting the CA on the iPhone itself (installing
    `rootCA.pem` as a configuration profile).
  - `server.host = true` in `vite.config.js` exposes the dev server on the
    LAN (not just localhost), needed to reach it from the iPhone.
- Scaffolded mobile app code already exists at `mobile-app/` (Vite config,
  `App.jsx` with the full capture → classify → geolocate → submit flow,
  `lib/classifier.js`, `lib/geolocation.js`, `lib/api.js`, README with
  setup instructions and notes on adjusting model input size/normalization
  to match however the `.onnx` model was actually exported).

## 7. Mobile ↔ web connection (backend stack)

- The mobile app always requires network access anyway (it's served from a
  computer via local IP, see §3), so there is **no real offline-first
  requirement** to design around — a plain online REST API is enough; a
  sync-capable DB (e.g. Firestore) was considered and dropped for this
  reason.
- **Decision: Node.js + Express + Prisma ORM + SQL** (SQLite for local
  dev/demo, trivially swappable to PostgreSQL via `.env` + one line in
  `prisma/schema.prisma`, no code changes needed elsewhere).
  - Keeps the whole stack in one language (JS), matching the mobile PWA.
  - Matches the "SQL backend" already stated in the original anteproyecto.
- Endpoints implemented (see `backend/` in the repo):
  - `POST /api/identifications` — mobile app sends `{ species, confidence?, latitude, longitude }` after each on-device classification.
  - `GET /api/identifications` — web app lists all attempts.
  - `GET /api/identifications/:id` — single record detail.
  - `GET /api/identifications/:id/canopy` — proxies/generates a PNG canopy
    view from Esri ArcGIS World Imagery's `/export` operation, cropped
    around the record's GPS coordinates (bbox size configurable via
    `CANOPY_BBOX_DEGREES`).
- Scaffolded backend code already exists at `backend/` (package.json,
  prisma schema, `src/index.js`, README with setup + curl examples).

## 9. Web app stack

- **Decision: React + Vite** (plain, no PWA/HTTPS needed — this app only
  reads data, no camera/geolocation involved).
- Fetches `GET /api/identifications` from the backend and renders one
  card per record (species, confidence, GPS coords, timestamp), each
  card's canopy image pointed at `GET /api/identifications/:id/canopy`.
- Scaffolded code already exists at `web-app/` (`App.jsx`,
  `components/IdentificationCard.jsx`, `lib/api.js`, README).

## 10. Dataset (training)

- Combination of an existing leaf-image dataset + own field collection of
  leaf photos of Costa Rican tree species (exact source dataset(s) to
  combine: not finalized yet).
