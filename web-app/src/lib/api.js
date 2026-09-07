const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function fetchIdentifications() {
  const response = await fetch(`${API_URL}/api/identifications`);
  if (!response.ok) {
    throw new Error(`Failed to fetch identifications: ${response.status}`);
  }
  return response.json();
}

export function canopyImageUrl(id) {
  return `${API_URL}/api/identifications/${id}/canopy`;
}
