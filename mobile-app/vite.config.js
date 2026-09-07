import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

// HTTPS is required for iOS Safari to allow navigator.geolocation, even on a
// local LAN IP over what would otherwise be plain HTTP. basicSsl serves a
// self-signed cert for local dev; server.host exposes the dev server on the
// LAN so it's reachable from a phone.
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Tree Species Recognition",
        short_name: "TreeID",
        start_url: ".",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2e7d32",
        icons: [],
      },
      workbox: {
        // model.onnx can be large; make sure it's precached for offline use
        // once inference has run at least once.
        globPatterns: ["**/*.{js,css,html,onnx}"],
      },
    }),
  ],
  server: {
    host: true,
    https: true,
  },
});
