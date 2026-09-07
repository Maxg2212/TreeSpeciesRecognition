// Placeholder gallery. Swap these for real photos from the training
// dataset once it's finalized (see docs/TECH_CONTEXT.md, §10).
const PLACEHOLDER_SPECIES = [
  "Guanacaste",
  "Ceiba",
  "Roble de Sabana",
  "Cedro Amargo",
  "Cortez Amarillo",
  "Malinche",
];

export default function Home() {
  return (
    <div>
      <section style={{ textAlign: "center", padding: "2rem 0" }}>
        <h2 style={{ margin: "0 0 0.5rem" }}>Identify Costa Rican tree species from a leaf</h2>
        <p style={{ color: "#555", maxWidth: 560, margin: "0 auto" }}>
          Tree Identifier is the companion dashboard for the Tree Identifier
          mobile app. Every leaf identified in the field shows up in{" "}
          <strong>History</strong>, paired with a satellite view of the
          tree's canopy.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        {PLACEHOLDER_SPECIES.map((species) => (
          <figure
            key={species}
            style={{
              margin: 0,
              border: "1px solid #ddd",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 140,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.5rem",
                background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
              }}
              aria-hidden="true"
            >
              🌿
            </div>
            <figcaption style={{ padding: "0.5rem 0.75rem", fontSize: "0.9rem", color: "#555" }}>
              {species}
              <br />
              <span style={{ fontSize: "0.75rem", color: "#999" }}>dataset photo coming soon</span>
            </figcaption>
          </figure>
        ))}
      </section>
    </div>
  );
}
