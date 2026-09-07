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

Each component has its own `README.md` with setup steps. Order:

1. `backend/` — start the API first, the other two depend on it.
2. `mobile-app/` and `web-app/` — can be started in either order once the
   backend is running.

No trained model is included yet — see
[`mobile-app/public/model/README.md`](mobile-app/public/model/README.md).
