import { useEffect, useState } from "react";
import { fetchIdentifications } from "../lib/api.js";
import IdentificationCard from "../components/IdentificationCard.jsx";

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

  return (
    <div>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!loading && !error && identifications.length === 0 && <p>No identifications yet.</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        {identifications.map((identification) => (
          <IdentificationCard key={identification.id} identification={identification} />
        ))}
      </div>
    </div>
  );
}
