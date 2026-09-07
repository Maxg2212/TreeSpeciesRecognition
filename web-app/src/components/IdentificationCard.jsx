import { canopyImageUrl } from "../lib/api.js";

export default function IdentificationCard({ identification }) {
  const { id, species, confidence, latitude, longitude, createdAt } = identification;

  return (
    <article
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <img
        src={canopyImageUrl(id)}
        alt={`Satellite canopy view for ${species}`}
        style={{ width: "100%", height: 180, objectFit: "cover", background: "#eee" }}
      />
      <div style={{ padding: "0.75rem" }}>
        <h3 style={{ margin: "0 0 0.25rem" }}>{species}</h3>
        {typeof confidence === "number" && (
          <p style={{ margin: "0 0 0.25rem", color: "#555" }}>
            Confidence: {(confidence * 100).toFixed(1)}%
          </p>
        )}
        <p style={{ margin: "0 0 0.25rem", color: "#555" }}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
        <p style={{ margin: 0, color: "#999", fontSize: "0.85rem" }}>
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
    </article>
  );
}
