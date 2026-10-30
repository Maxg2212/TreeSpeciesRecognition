# Technical Context — Leaf-based Tree Species Recognition System

> Lean, code-focused context for Claude Code. Assumes the reader is picking
> up implementation work, not writing the thesis narrative. Drop this in
> the repo (e.g. `docs/TECH_CONTEXT.md`) and update it as decisions change.

## 1. Architecture (two components)

**Mobile app (PWA)** — three pages (Home / History / About), shared
"Tree Identifier" header, `react-router-dom`.
- Home: captures a photo of a single leaf (camera or gallery).
- Runs a TinyML model **fully on-device, in-browser** (see §2 — this is a
  PWA, not a native-installed app).
- Captures GPS coordinates automatically at capture time.
- Sends the identification attempt to the web backend when online:
  predicted species, confidence, GPS coordinates, timestamp.
- History: lists past identifications. About: static copy.

**Web app** — same three-page structure (Home / History / About), same
shared header, same router.
- Stores every identification attempt sent by the mobile app: species
  (predicted), confidence, GPS coordinates, timestamp.
- History page: for each stored record, fetches and displays a
  **satellite view of the tree canopy** at those GPS coordinates, pulled
  from an external imagery API (not a user-taken photo — see §4).
- Home page: hero + placeholder species gallery (real dataset photos to
  come later, see §10). Acts as the sync target / dashboard for records
  collected across users.

## 2. Model format & inference stack

**Decision: ONNX + `onnxruntime-web`** (not TensorFlow Lite). Implemented
and verified working end-to-end against a real trained model.

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
- Pipeline used: fine-tuned classifier (TF/Keras) → exported to `.onnx`
  via `tf2onnx` → loaded and run with `onnxruntime-web` in the PWA.
- If the distribution model changes later (e.g., enrolling as an Apple
  Developer and shipping a real native app via Xcode/TestFlight instead
  of a browser PWA), TensorFlow Lite + the CoreML execution provider would
  likely give better on-device latency — but that's a different
  distribution path than the one currently in use.

**The actual model in use** (`mobile-app/public/model/model.onnx`):
Keras **Xception**, 16-class classifier. Its real input/output contract —
inspected directly from the ONNX file, not assumed — matters a lot if
this is ever re-exported or swapped:
- Input: `224×224×3`, **channels-last (NHWC)** — not NCHW. The model
  rejects NCHW outright.
- Preprocessing: Xception's own `preprocess_input`, i.e. scale pixels to
  **`[-1, 1]`** (`pixel/127.5 - 1`) — *not* ImageNet mean/std
  normalization.
- Output is **already softmax probabilities**
  (`Dense(16, activation="softmax")`) — do not re-apply softmax
  client-side; doing so silently distorts every confidence score without
  ever throwing an error.
- Input/output tensor names (`src/lib/classifier.js`) are read dynamically
  from the ONNX session rather than hardcoded, since they're
  auto-generated Keras IDs (e.g. `keras_tensor_432`) that differ per
  export.
- Labels: `mobile-app/src/lib/class_names.json` — 16 species names, in
  the exact order the model was trained on (index 0 = first output
  logit).
- A second model, `densenet_model.onnx` (same 16 classes, different
  preprocessing — ImageNet mean/std instead of `[-1, 1]`), was trained
  alongside this one but was never wired up. It and a duplicate
  `class_names.json` are sitting unused at the repo root.
- `model.onnx` is committed directly to git (~85 MB) rather than via Git
  LFS — a deliberate simplicity tradeoff for this project. Under GitHub's
  100 MB hard limit, but triggers its "large file" push warning.
- Excluded from the PWA's service-worker precache list
  (`vite.config.js`'s `workbox.globPatterns`) — it's tens of MB, well
  past workbox's default 2 MB precache budget, and there's no
  offline-first requirement anyway (see §7). The browser's normal HTTP
  cache still serves it after the first load.

## 3. iOS distribution constraint (confirmed)

- Target test device: **iPhone 15**. iOS blocks installing apps outside
  the App Store without a signed build (Apple Developer enrollment).
- Current workaround: serve the app from a computer and open it from the
  iPhone's Safari browser via the computer's **local network IP**
  (e.g. `192.168.x.x:port` — find it with `ifconfig`/`ip addr`; it
  changes when you switch Wi-Fi networks, see §6).
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
- **Decision: Google Maps Static API** (`maptype=satellite`) — center +
  zoom static image endpoint. Requires a Google Cloud project with the
  Maps Static API enabled and **billing turned on** (a card on file is
  required even within the free monthly allowance — unlike the earlier
  options below). Key is kept in `backend/.env` as `GOOGLE_MAPS_API_KEY`
  (gitignored — never commit the actual key value).
- Earlier options, tried in order before settling here:
  - **Esri ArcGIS World Imagery** (`World_Imagery/MapServer`) — free
    public REST tile service, no auth required, ~1 m resolution for most
    of the world including Central America. First choice; worked, no
    account needed.
  - **MapTiler Static Maps API** — free tier (100,000 requests / 5,000
    sessions per month, non-commercial use), no billing required. Tried
    second; implemented but never shipped (superseded by Google before
    being tested live).
  - Both remain viable fallbacks if Google's billing requirement or
    quota ever becomes a problem.
- Ruled out: Sentinel Hub (~10 m/px — too coarse for an individual tree
  canopy) and USGS EarthExplorer (batch/download-oriented, high-res
  coverage mostly US-only via NAIP).

## 5. Data model (per identification attempt, stored by the backend)

- Predicted species name (model output)
- Confidence score (model output, active field — not just a future
  possibility)
- GPS coordinates (lat/lon) at capture time
- Timestamp
- Satellite canopy image: not stored — fetched live via the backend's
  Google Maps Static API proxy, keyed by the record's coordinates (see
  §4, §7)
- *(possible future field)* device/user identifier — no auth/multi-user
  concept exists yet; all identifications are in one shared list

## 6. Mobile app stack

- **Decision: React + Vite**, built as a PWA via `vite-plugin-pwa`.
- **Pages**: `react-router-dom`, a shared `Header` component titled
  "Tree Identifier" with Home/History/About nav links
  (`src/components/Header.jsx`, `src/pages/*.jsx`).
  - **Home** (`/`) — capture flow: two separate
    `<input type="file" accept="image/*">` elements — one with
    `capture="environment"` for the camera, one without for the
    gallery/photo library picker. A single input with `capture` set
    forces most mobile browsers straight into the camera and hides the
    gallery option, so both are needed to offer a real choice. On
    selection: classify → geolocate → submit, then shows the captured
    image + result (species, confidence, location).
  - **History** (`/history`) — fetches `GET /api/identifications` and
    lists past identifications (species, confidence, location) — no
    canopy image here, that's the web app's job.
  - **About** (`/about`) — static copy explaining the app.
- Inference: `onnxruntime-web`, model loaded from `public/model/model.onnx`
  (see §2 for the model's actual input/output contract and why ONNX over
  TF Lite here).
- **Confirmed gotcha: iOS Safari requires HTTPS for
  `navigator.geolocation`**, even when accessed via a local LAN IP over
  plain HTTP — the call silently fails with `PERMISSION_DENIED`. Camera
  capture via the file input is unaffected, only geolocation is blocked.
  - Fix: [mkcert](https://github.com/FiloSottile/mkcert) generates a
    locally-trusted HTTPS certificate for `localhost` + the LAN IP
    (`mobile-app/scripts/generate-certs.sh`, consumed directly by
    `vite.config.js`). Trusting mkcert's local CA is a one-time,
    per-machine setup (`mkcert -install`, root required) — see
    `mobile-app/README.md` for that and for trusting the CA on the
    iPhone itself (installing `rootCA.pem` as a configuration profile,
    then separately enabling **full trust** for it under Settings →
    General → About → Certificate Trust Settings — easy to miss, since
    installing the profile alone isn't enough).
  - `server.host = true` in `vite.config.js` exposes the dev server on the
    LAN (not just localhost), needed to reach it from the iPhone.
  - **The backend needs this too, not just the mobile app** — see §7's
    mixed-content note.
- **Confirmed gotcha: `onnxruntime-web` + Vite's dev server.** The
  package's default entry point pulls in the full multi-backend bundle
  (WebGPU/WebNN's "jsep" runtime), whose WASM asset doesn't resolve
  correctly under Vite dev (404 → SPA fallback → wrong MIME type, or
  esbuild's dependency pre-bundling rewrites the WASM reference to a path
  that ends up empty). Fixed in `src/lib/classifier.js` /
  `vite.config.js` by:
  - importing the CPU-only entry (`onnxruntime-web/wasm`) instead of the
    default — this app only needs CPU inference, not WebGPU/WebNN;
  - pinning the WASM binary via an explicit `?url` import
    (`onnxruntime-web/ort-wasm-simd-threaded.wasm?url`) so Vite tracks it
    as a real asset in both dev and prod;
  - excluding `onnxruntime-web` from Vite's dependency pre-bundling
    (`optimizeDeps.exclude`).
  - Side benefit: smaller production bundle (~14 MB wasm instead of
    ~28 MB), since the unused WebGPU/WebNN runtime is dropped.
- **Confirmed gotcha: a `ref` isn't mounted the instant you set the state
  that renders it.** The original Home page read `imageRef.current`
  synchronously right after `setPreviewUrl(...)`, before React had
  mounted the conditionally-rendered `<img>` — always `null`, threw
  immediately. Fixed by decoding the selected file off-DOM via
  `new Image()` instead of depending on a ref to an element React hasn't
  painted yet.
- Scaffolded mobile app code lives at `mobile-app/` (Vite config,
  `src/pages/*.jsx`, `src/lib/classifier.js`, `src/lib/geolocation.js`,
  `src/lib/api.js`, README with setup instructions).

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
  - `GET /api/identifications/:id/canopy` — proxies a PNG canopy view from
    Google's Maps Static API (see §4), centered on the record's GPS
    coordinates (zoom configurable via `CANOPY_ZOOM`).
- **Backend serves HTTPS**, reusing the mkcert cert already set up for the
  mobile app (§6) — not just a nicety. The mobile app is served over HTTPS
  (required for geolocation), so a browser silently blocks it from
  fetching a plain-HTTP backend ("mixed content") — this surfaced as a
  `fetch`/`Load failed` error on-device right after granting location
  access, with no clearer error anywhere. Falls back to plain HTTP (with
  a startup warning) if the mkcert cert files aren't found — fine for
  `web-app` alone, not for mobile testing.
- **Confirmed gotcha: Express 4 doesn't catch a rejected promise from an
  async route handler.** An uncaught error (DB issue, a failed upstream
  fetch, etc.) becomes an unhandled promise rejection, and Node
  terminates the *entire process* — confirmed live: a corrupted/empty
  SQLite file took the whole backend down on the very first query, not
  just that one request. Fixed with a small `asyncHandler` wrapper around
  every route plus a catch-all Express error middleware (`src/index.js`),
  so any single request failure now returns a plain `500` instead of
  crashing the server. (Express 5 fixes this natively; this project is
  still on Express 4.)
- Scaffolded backend code lives at `backend/` (package.json, prisma
  schema, `src/index.js`, README with setup + curl examples).

## 8. Local dev orchestration

- Root-level `package.json` + [`concurrently`](https://www.npmjs.com/package/concurrently):
  `npm run dev` from the repo root starts backend, mobile app, and web
  app together in one terminal (color-coded, labeled output per
  component), instead of three separate terminals/commands.
- One-time setup is still per-component: `npm install` in each of
  `backend/`, `mobile-app/`, `web-app/`, plus the root; each component's
  own README documents running it standalone if needed.

## 9. Web app stack

- **Decision: React + Vite** (plain, no PWA/HTTPS needed for the page
  itself — this app only reads data, no camera/geolocation involved;
  HTTPS is still needed backend-side, see §7).
- **Pages**: same `react-router-dom` + shared "Tree Identifier" header
  pattern as the mobile app (§6).
  - **Home** (`/`) — hero + placeholder species gallery (real dataset
    photos to come later, see §10).
  - **History** (`/history`) — the original dashboard: fetches
    `GET /api/identifications` and renders one card per record (species,
    confidence, GPS coords, timestamp), each card's canopy image pointed
    at `GET /api/identifications/:id/canopy`.
  - **About** (`/about`) — static copy explaining the site.
- Scaffolded code lives at `web-app/` (`src/pages/*.jsx`,
  `src/components/IdentificationCard.jsx`, `src/lib/api.js`, README).

## 10. Dataset (training)

- Combination of an existing leaf-image dataset + own field collection of
  leaf photos of Costa Rican tree species (exact source dataset(s)
  combined: not documented here — the trained model's 16 classes are in
  `mobile-app/src/lib/class_names.json`).
