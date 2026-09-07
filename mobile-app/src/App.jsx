import { useRef, useState } from "react";
import { classifyImage } from "./lib/classifier.js";
import { getCurrentPosition } from "./lib/geolocation.js";
import { submitIdentification } from "./lib/api.js";

const STATUS = {
  IDLE: "idle",
  CLASSIFYING: "classifying",
  LOCATING: "locating",
  SUBMITTING: "submitting",
  DONE: "done",
  ERROR: "error",
};

export default function App() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const imageRef = useRef(null);

  async function handleCapture(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const image = imageRef.current;
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

  return (
    <main style={{ fontFamily: "sans-serif", padding: "1.5rem", maxWidth: 480, margin: "0 auto" }}>
      <h1>Tree Species Recognition</h1>

      <label
        htmlFor="capture-input"
        style={{
          display: "block",
          padding: "1rem",
          textAlign: "center",
          border: "2px dashed #2e7d32",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        Take a photo of a leaf
      </label>
      <input
        id="capture-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        style={{ display: "none" }}
      />

      {previewUrl && (
        <img
          ref={imageRef}
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
    </main>
  );
}
