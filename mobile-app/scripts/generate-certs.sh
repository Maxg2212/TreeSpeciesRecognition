#!/usr/bin/env bash
# Regenerates the local dev HTTPS certificate under certs/, covering
# localhost plus every LAN IP currently assigned to this machine. Re-run
# this whenever you switch Wi-Fi networks and the LAN IP changes, or
# whenever the phone reports a certificate name mismatch.
set -euo pipefail

if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert not found. Install it first — see mobile-app/README.md (HTTPS section)." >&2
  exit 1
fi

cd "$(dirname "$0")/.."
mkdir -p certs

lan_ips=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^$' || true)

mkcert -cert-file certs/dev-cert.pem -key-file certs/dev-key.pem \
  localhost 127.0.0.1 ::1 $lan_ips

echo
echo "Certificate covers: localhost 127.0.0.1 ::1 $lan_ips"
