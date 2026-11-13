import { normalize } from "../core/store";
import type { GroupState } from "../core/types";
import { basicMap, BASIC_ID } from "./basic";
import { classMaps, publicMaps } from "../cloud/cache";
import { walker, type MapDef } from "./mapdef";
import { mapProblems } from "./validate";

/*
 * Storage for the Peta app, under its own keys so the original app's data is untouched:
 * - localStorage "geotrails.peta.maps": teacher-made maps
 * - localStorage "geotrails.peta.deleted": maps deleted here that the teacher's account must still forget
 * - localStorage "geotrails.peta.progress.<mapId>": a group's progress on one map
 * - IndexedDB "geotrails-peta" / "photos": post photos keyed "<mapId>:<postUid>"
 */

const MAPS_KEY = "geotrails.peta.maps", DELETED_KEY = "geotrails.peta.deleted";

/** Tell the portal (account sync) that teacher maps changed on this device. */
const changed = (): void => { if (typeof window !== "undefined") window.dispatchEvent(new Event("geotrails:maps")); };
const progressKey = (id: string) => `geotrails.peta.progress.${id}`;

export function customMaps(): MapDef[] {
  try {
    const v = JSON.parse(localStorage.getItem(MAPS_KEY) || "[]");
    return Array.isArray(v) ? v.filter((m) => m && m.format === "geotrails-map" && typeof m.id === "string") : [];
  } catch {
    return [];
  }
}

/** Basic first, then the teacher's maps. */
export const allMaps = (): MapDef[] => [basicMap(), ...customMaps()];

export const getMap = (id: string): MapDef | undefined =>
  allMaps().find((m) => m.id === id) ?? classMaps().find((m) => m.id === id) ?? publicMaps().find((m) => m.id === id);

/** Maps students can choose: published local maps without problems, the joined class's maps, then public maps picked here. */
export function studentMaps(): MapDef[] {
  const out = allMaps().filter((m) => m.published && mapProblems(m).length === 0);
  const ids = new Set(out.map((m) => m.id));
  for (const m of [...classMaps(), ...publicMaps()]) if (!ids.has(m.id)) { ids.add(m.id); out.push(m); }
  return out;
}

/** Save a teacher map. `touch` marks it as changed now (false for copies coming from the account). */
export function saveMap(m: MapDef, touch = true): void {
  if (m.id === BASIC_ID) throw new Error("Peta Basic tidak bisa diubah. Duplikat dulu.");
  if (touch) m.updatedAt = Date.now();
  const list = customMaps();
  const i = list.findIndex((x) => x.id === m.id);
  if (i >= 0) list[i] = m; else list.push(m);
  localStorage.setItem(MAPS_KEY, JSON.stringify(list));
  if (touch) changed();
}

/** Delete a map here; it is also removed from the teacher's account at the next sync. */
export function deleteMap(id: string): void {
  removeLocalMap(id);
  const t = tombstones().filter((x) => x.id !== id);
  t.push({ id, at: Date.now() });
  localStorage.setItem(DELETED_KEY, JSON.stringify(t));
  changed();
}

/** Delete only this device's copy (e.g. the map was deleted on another device). */
export function removeLocalMap(id: string): void {
  localStorage.setItem(MAPS_KEY, JSON.stringify(customMaps().filter((m) => m.id !== id)));
  clearProgress(id);
}

export interface Tombstone { id: string; at: number }

export function tombstones(): Tombstone[] {
  try {
    const v = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
    return Array.isArray(v) ? v.filter((t) => t && typeof t.id === "string" && typeof t.at === "number") : [];
  } catch {
    return [];
  }
}

export function clearTombstone(id: string): void {
  localStorage.setItem(DELETED_KEY, JSON.stringify(tombstones().filter((t) => t.id !== id)));
}

export function freshGroup(name: string, color: string, map: MapDef): GroupState {
  return {
    name, color, pos: [...map.start],
    posts: map.posts.map((_, id) => ({ id, result: null, answer: null, attempts: [], hints: 0, time: 0, score: 0, work: "", physical: null })),
    started: Date.now(), finShown: false, reflection: [],
  };
}

/**
 * Bring saved progress in line with the map as it is now: one entry per post (new posts
 * start empty, removed ones are dropped) and the avatar back on the start tile if its
 * tile is no longer walkable.
 */
export function align(S: GroupState, map: MapDef): GroupState {
  normalize(S);
  const blank = freshGroup(S.name, S.color, map).posts;
  S.posts = map.posts.map((_, i) => (S.posts[i] ? { ...S.posts[i], id: i } : blank[i]));
  if (!walker(map)(S.pos?.[0], S.pos?.[1])) S.pos = [...map.start];
  if (S.posts.length && !S.posts.every((p) => p.result)) S.finShown = false;
  return S;
}

export function loadProgress(map: MapDef): GroupState | null {
  try {
    const v = JSON.parse(localStorage.getItem(progressKey(map.id)) || "null");
    return v && Array.isArray(v.posts) && typeof v.name === "string" ? align(v, map) : null;
  } catch {
    return null;
  }
}

export function saveProgress(mapId: string, S: GroupState | null): void {
  try { localStorage.setItem(progressKey(mapId), JSON.stringify(S)); } catch { /* storage unavailable */ }
}

export function clearProgress(mapId: string): void {
  try { localStorage.removeItem(progressKey(mapId)); } catch { /* storage unavailable */ }
}

/* Post photos */
const DB = "geotrails-peta", STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const photoKey = (mapId: string, uid: string): string => `${mapId}:${uid}`;
export const getPhoto = (key: string): Promise<Blob | undefined> => tx("readonly", (s) => s.get(key));
export const putPhoto = (key: string, blob: Blob): Promise<IDBValidKey> => tx("readwrite", (s) => s.put(blob, key));
export const deletePhoto = (key: string): Promise<undefined> => tx("readwrite", (s) => s.delete(key));
