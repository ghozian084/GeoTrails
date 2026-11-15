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
