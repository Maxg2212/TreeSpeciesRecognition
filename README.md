# Tree Species Recognition

Leaf-based tree species recognition system. See
[docs/TECH_CONTEXT.md](docs/TECH_CONTEXT.md) for the full architecture and
decisions.

Three components:

- [`backend/`](backend/) — Node/Express/Prisma API. Stores identification
  attempts and proxies satellite canopy images.
- [`mobile-app/`](mobile-app/) — React/Vite PWA. Captures a leaf photo,
  classifies it on-device (ONNX), captures GPS, submits to the backend.
- [`web-app/`](web-app/) — React/Vite dashboard. Lists stored
  identifications with their canopy views.

## Getting started

One-time setup — install each component's dependencies and the root
dev-runner (each component also has its own `README.md` for details:
`.env` files, the backend's database migration, the mobile app's HTTPS
certs):

```bash
npm install
npm install --prefix backend
npm install --prefix mobile-app
npm install --prefix web-app
```

Then, every time, from the repo root:

```bash
npm run dev
```

This starts all three at once — backend, mobile app, web app — each
labeled and color-coded in one terminal (via `concurrently`). Press
`Ctrl+C` once to stop all three.

No trained model is included yet — see
[`mobile-app/public/model/README.md`](mobile-app/public/model/README.md).
