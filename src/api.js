const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong.");
    error.status = response.status;
    error.retryAfter = data.retryAfter;
    throw error;
  }
  return data;
}

export const locationConfig = {
  latitude: Number(import.meta.env.VITE_DAIRY_LATITUDE),
  longitude: Number(import.meta.env.VITE_DAIRY_LONGITUDE),
};

export function calculateDistanceKm(latitude, longitude) {
  const radians = (value) => (value * Math.PI) / 180;
  const a = Math.sin(radians(locationConfig.latitude - latitude) / 2) ** 2 + Math.sin(radians(locationConfig.longitude - longitude) / 2) ** 2 * Math.cos(radians(latitude)) * Math.cos(radians(locationConfig.latitude));
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
