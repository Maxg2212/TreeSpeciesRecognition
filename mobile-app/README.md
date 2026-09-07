# Mobile app (PWA)

React + Vite PWA. Captures a leaf photo, classifies it on-device with
`onnxruntime-web`, captures GPS coordinates, and submits the result to the
backend.

## Setup

```bash
cd mobile-app
npm install
cp .env.example .env
npm run certs   # one-time per machine / per LAN IP change, see below
npm run dev
```

Vite prints a local URL and a network URL (`server.host: true`). Open the
network URL from the phone's browser.

### HTTPS trust setup (one-time per machine)

The dev server uses [mkcert](https://github.com/FiloSottile/mkcert) to
generate a certificate for `localhost` and your current LAN IP
(`npm run certs` → `scripts/generate-certs.sh`), signed by a local
certificate authority. Unlike a plain self-signed cert, browsers will
trust it automatically — but only once that local CA itself is trusted,
which needs one-time setup with root access:

```bash
sudo apt install -y mkcert libnss3-tools   # mkcert + certutil (NSS trust store for Chrome/Firefox)
mkcert -install                            # installs the local CA into your system + browser trust stores
```

Run these two commands yourself in a real terminal (they prompt for your
sudo password, which an agent can't supply). After that, `npm run certs`
regenerates the leaf certificate any time your LAN IP changes (e.g. a
different Wi-Fi network) — re-run it and restart `npm run dev` if the
phone reports a hostname mismatch.

### Trusting the CA on the iPhone

The computer trusting the CA doesn't make the *phone* trust it — iOS
needs the CA's root certificate installed as a profile:

1. On the computer, find the CA file: `mkcert -CAROOT` prints the folder;
   the file is `rootCA.pem` inside it.
2. Get that file onto the phone while it's on the same Wi-Fi, e.g.:
   ```bash
   cd "$(mkcert -CAROOT)" && python3 -m http.server 8000
   ```
   then open `http://<your-computer's-LAN-IP>:8000/rootCA.pem` in Safari
   on the phone.
3. Safari will show "Profile Downloaded" — go to **Settings → General →
   VPN & Device Management** and install it.
4. Then go to **Settings → General → About → Certificate Trust
   Settings** and enable full trust for the mkcert root certificate.

After that, the app's HTTPS URL loads on the phone with no warning at
all, exactly like a normal site.

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
