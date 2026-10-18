import type { PickupPoint } from "./types";

const STORAGE_KEY = "campusswap.nearPoint";
export const DEFAULT_POINT_ID = "totem";

/** Browser geolocation with a 5 s timeout. Resolves null if denied or unavailable. */
export function getBrowserLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 },
    );
  });
}

export function loadFallbackPointId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_POINT_ID;
  } catch {
    return DEFAULT_POINT_ID;
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
