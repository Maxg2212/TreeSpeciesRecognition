import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default marker icon references relative image paths that break
// under a bundler (Vite doesn't serve leaflet's own image directory at the
// URL the CSS expects) — same class of issue as onnxruntime-web's wasm
// asset in classifier.js. Fix: point the default icon at the actual
// bundled asset URLs.
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Roughly centers on Costa Rica, the project's target region.
const DEFAULT_CENTER = [9.9281, -84.0907];
const DEFAULT_ZOOM = 8;

function ClickToPlaceMarker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({ value, onChange }) {
  const [hasInteracted, setHasInteracted] = useState(false);

  function handlePick(position) {
    setHasInteracted(true);
    onChange(position);
  }

  return (
    <div>
      <p style={{ margin: "0 0 0.5rem", color: "#555" }}>
        {hasInteracted
          ? "Tap again to move the pin."
          : "Tap the map where this tree is located."}
      </p>
      <div style={{ height: 300, borderRadius: 8, overflow: "hidden" }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlaceMarker onPick={handlePick} />
          {value && <Marker position={[value.latitude, value.longitude]} />}
        </MapContainer>
      </div>
    </div>
  );
}
