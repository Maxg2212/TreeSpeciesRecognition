import { useEffect, useState } from "react";
import { fetchIdentifications } from "../lib/api.js";

export default function History() {
  const [identifications, setIdentifications] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIdentifications()
      .then(setIdentifications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (identifications.length === 0) return <p>No identifications yet.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {identifications.map((identification) => (
        <li
          key={identification.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "0.75rem",
          }}
        >
          <p style={{ margin: "0 0 0.25rem", fontWeight: "bold" }}>{identification.species}</p>
          {typeof identification.confidence === "number" && (
            <p style={{ margin: "0 0 0.25rem", color: "#555" }}>
              Confidence: {(identification.confidence * 100).toFixed(1)}%
            </p>
          )}
          <p style={{ margin: "0 0 0.25rem", color: "#555" }}>
            {identification.latitude.toFixed(5)}, {identification.longitude.toFixed(5)}
          </p>
          <p style={{ margin: 0, color: "#999", fontSize: "0.85rem" }}>
            {new Date(identification.createdAt).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
