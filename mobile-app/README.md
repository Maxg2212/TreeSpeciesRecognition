# Mobile app (PWA)

React + Vite PWA. Captures a leaf photo, classifies it on-device with
`onnxruntime-web`, captures GPS coordinates, and submits the result to the
backend.

## Setup

```bash
cd mobile-app
npm install
cp .env.example .env
npm run dev
```

Vite prints a local URL and a network URL (`server.host: true`). Open the
network URL from the phone's browser — it's served over **HTTPS** with a
self-signed cert (`@vitejs/plugin-basic-ssl`); Safari will show a one-time
"not private connection" warning, which is safe to accept for local dev.

### Adding the model

No trained model is included yet. See `public/model/README.md` — drop a
`model.onnx` there and adjust the input size/normalization/labels in
`src/lib/classifier.js` to match how it was exported.

### iPhone testing over the same Wi-Fi only

The phone and the computer serving the dev server must be on the same
Wi-Fi / local subnet — a LAN IP isn't reachable over cellular data. To
test outside the LAN, use a tunnel (ngrok, Cloudflare Tunnel, Tailscale)
or an actual deployment.

### Why HTTPS is required

iOS Safari silently fails `navigator.geolocation` calls
(`PERMISSION_DENIED`) unless the page is served over HTTPS, even when
accessed via a local LAN IP. Camera capture via the file input works fine
over plain HTTP; only geolocation needs HTTPS.
