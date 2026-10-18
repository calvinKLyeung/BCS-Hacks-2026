import type { PickupPoint } from "./types";

const STORAGE_KEY = "campusswap.nearPoint";
export const DEFAULT_POINT_ID = "totem";
/** Picker value meaning "measure from the device's own location". */
export const MY_LOCATION = "me";

/**
 * Browser geolocation. Resolves null if denied or unavailable.
 * `fresh` asks for a new high-accuracy reading (for the "my location" button) instead of a cached one.
 */
export function getBrowserLocation(fresh = false): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      fresh ? { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } : { timeout: 5000, maximumAge: 60000 },
    );
  });
}

export function loadFallbackPointId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || MY_LOCATION;
  } catch {
    return MY_LOCATION;
  }
}

export function saveFallbackPointId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

export function pointById(points: PickupPoint[], id: string): PickupPoint | undefined {
  return points.find((p) => p.id === id) || points.find((p) => p.id === DEFAULT_POINT_ID);
}
