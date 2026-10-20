import { useState } from "react";
import { classifyImage } from "../lib/classifier.js";
import { getCurrentPosition } from "../lib/geolocation.js";
import { submitIdentification } from "../lib/api.js";

const STATUS = {
  IDLE: "idle",
  CLASSIFYING: "classifying",
  LOCATING: "locating",
  SUBMITTING: "submitting",
  DONE: "done",
  ERROR: "error",
};

export default function Home() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      // Decoded off-DOM so classification doesn't depend on the preview
      // <img> having already mounted from the setPreviewUrl above.
      const image = new Image();
      image.src = objectUrl;
      await image.decode();

      setStatus(STATUS.CLASSIFYING);
      const classification = await classifyImage(image);

      setStatus(STATUS.LOCATING);
      const position = await getCurrentPosition();

      setStatus(STATUS.SUBMITTING);
      await submitIdentification({
        species: classification.species,
        confidence: classification.confidence,
        latitude: position.latitude,
        longitude: position.longitude,
      });

      setResult({ ...classification, ...position });
      setStatus(STATUS.DONE);
    } catch (err) {
      setError(err.message);
      setStatus(STATUS.ERROR);
    } finally {
      event.target.value = "";
    }
  }

  const buttonStyle = {
    display: "block",
    padding: "1rem",
    textAlign: "center",
    border: "2px dashed #2e7d32",
    borderRadius: 8,
    cursor: "pointer",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <label htmlFor="camera-input" style={{ ...buttonStyle, flex: 1 }}>
          Take a photo
        </label>
        <label htmlFor="gallery-input" style={{ ...buttonStyle, flex: 1 }}>
          Choose from gallery
        </label>
      </div>
      <input
        id="camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />
      <input
        id="gallery-input"
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />

      {previewUrl && (
        <img
          src={previewUrl}
          alt="Captured leaf"
          style={{ width: "100%", marginTop: "1rem", borderRadius: 8 }}
        />
      )}

      {status === STATUS.CLASSIFYING && <p>Classifying leaf…</p>}
      {status === STATUS.LOCATING && <p>Getting GPS location…</p>}
      {status === STATUS.SUBMITTING && <p>Sending result…</p>}

      {status === STATUS.DONE && result && (
        <div style={{ marginTop: "1rem" }}>
          <p>
            <strong>Species:</strong> {result.species}
          </p>
          <p>
            <strong>Confidence:</strong> {(result.confidence * 100).toFixed(1)}%
          </p>
          <p>
            <strong>Location:</strong> {result.latitude.toFixed(5)}, {result.longitude.toFixed(5)}
          </p>
        </div>
      )}

      {status === STATUS.ERROR && (
        <p style={{ color: "crimson", marginTop: "1rem" }}>{error}</p>
      )}
    </div>
  );
}
