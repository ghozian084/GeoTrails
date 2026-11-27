/*
 * Real-world locations for the Jelajah map (pure helpers, no map library).
 */

/**
 * Read "lat, lng" as copied from Google Maps or OpenStreetMap ("-7.0412, 110.3561"), also with
 * spaces or a semicolon between the two numbers. Null when it is not a valid coordinate pair.
 */
export function parseLatLng(text: string): { lat: number; lng: number } | null {
  const m = text.trim().replace(/[−–]/g, "-").match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/** "-7.04120, 110.35610" (5 decimals ≈ 1 m). */
export const formatLatLng = (lat: number, lng: number): string => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** Rounded to 5 decimals, as stored in the map. */
export const roundCoord = (v: number): number => Math.round(v * 1e5) / 1e5;

export interface PinItem { lat: number; lng: number }

/** Items at (almost) the same spot share one pin: groups keyed by position rounded to ~10 m. */
export function groupPins<T extends PinItem>(items: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = `${it.lat.toFixed(4)},${it.lng.toFixed(4)}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(it);
  }
  return [...groups.values()];
}

/** Great-circle distance in km (haversine). */
export function distanceKm(a: PinItem, b: PinItem): number {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "350 m", "1,2 km", "12 km" (Indonesian decimal comma). */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km).toLocaleString("id-ID")} km`;
}

/** The item closest to `at`, with its distance; null for an empty list. */
export function nearest<T extends PinItem>(items: T[], at: PinItem): { item: T; km: number } | null {
  let best: { item: T; km: number } | null = null;
  for (const item of items) {
    const km = distanceKm(at, item);
    if (!best || km < best.km) best = { item, km };
  }
  return best;
}
