export const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

if (import.meta.env.PROD && !apiUrl.startsWith("https://")) {
  throw new Error("VITE_API_URL must use HTTPS in production.");
}

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
    error.fieldErrors = data.fieldErrors;
    throw error;
  }
  return data;
}

export async function downloadDatabaseBackup() {
  const response = await fetch(`${apiUrl}/admin/database/backup`, { credentials: "include" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error || "Database backup could not be downloaded.");
    error.status = response.status;
    throw error;
  }

  const backup = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = backup;
  link.download = `milk-villa-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(backup), 1000);
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
