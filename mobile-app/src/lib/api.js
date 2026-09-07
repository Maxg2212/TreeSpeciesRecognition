const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function submitIdentification({ species, confidence, latitude, longitude }) {
  const response = await fetch(`${API_URL}/api/identifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ species, confidence, latitude, longitude }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit identification: ${response.status}`);
  }

  return response.json();
}

export async function fetchIdentifications() {
  const response = await fetch(`${API_URL}/api/identifications`);
  if (!response.ok) {
    throw new Error(`Failed to fetch identifications: ${response.status}`);
  }
  return response.json();
}
