import type { MapDef } from "../mapdef";
import { mapProblems } from "../validate";

/*
 * Class code and the last downloaded copy of a class's maps, kept in localStorage so the
 * maps still work offline. Photos go into the Peta photo store (IndexedDB) like uploads.
 */

const CODE_KEY = "geotrails.peta.class";
const mapsKey = (code: string) => `geotrails.peta.classmaps.${code}`;

/** Class codes: 6 characters without look-alikes (no 0/O, 1/I/L). */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const isClassCode = (c: string): boolean => /^[A-HJKMNP-Z2-9]{6}$/.test(c);
export const normalizeCode = (c: string): string => c.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function newClassCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return s;
}

export interface ClassCache { code: string; name: string; maps: MapDef[]; fetchedAt: number }

export function joinedClass(): string | null {
  try { return localStorage.getItem(CODE_KEY); } catch { return null; }
}

export function setJoinedClass(code: string | null): void {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else { const old = localStorage.getItem(CODE_KEY); if (old) localStorage.removeItem(mapsKey(old)); localStorage.removeItem(CODE_KEY); }
  } catch { /* storage unavailable */ }
}

export function cachedClass(code: string): ClassCache | null {
  try {
    const v = JSON.parse(localStorage.getItem(mapsKey(code)) || "null");
    return v && Array.isArray(v.maps) ? v : null;
  } catch {
    return null;
  }
}

/** Store a downloaded class; maps are marked as published, read-only copies. */
export function cacheClass(code: string, name: string, maps: MapDef[]): ClassCache {
  const c: ClassCache = { code, name, fetchedAt: Date.now(), maps: maps.map((m) => ({ ...m, published: true, builtIn: undefined })) };
  localStorage.setItem(mapsKey(code), JSON.stringify(c));
  return c;
}

/** Valid class maps from the joined class's cache. */
export function classMaps(): MapDef[] {
  const code = joinedClass();
  const c = code ? cachedClass(code) : null;
  return c ? c.maps.filter((m) => mapProblems(m).length === 0) : [];
}
