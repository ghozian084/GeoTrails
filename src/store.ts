import { START } from "./data/map";
import type { GroupState, Post, TeacherSettings } from "./types";

/*
 * Persistence. Only the group name, avatar colour and trail progress (answers, worksheet notes,
 * physical measurements, reflection) are stored; no personal data.
 * Teacher-uploaded images will go to IndexedDB; not used yet.
 */
export const KEY = "geotrails.v1";

export const COLORS = ["#E4572E", "#2E86AB", "#7B2CBF", "#F2A541", "#17BEBB", "#D6336C"];

export function fresh(name: string, color: string, posts: Post[]): GroupState {
  return {
    name,
    color,
    pos: [...START],
    posts: posts.map((p) => ({ id: p.id, result: null, answer: null, attempts: [], hints: 0, time: 0, score: 0, work: "", physical: null })),
    started: Date.now(),
    finShown: false,
    reflection: [],
  };
}

/** Fill fields added after a save was written, so older progress keeps working. */
export function normalize(v: GroupState): GroupState {
  v.reflection = Array.isArray(v.reflection) ? v.reflection : [];
  v.posts.forEach((p) => {
    p.work = typeof p.work === "string" ? p.work : "";
    p.physical = typeof p.physical === "number" ? p.physical : null;
  });
  return v;
}

export function save(S: GroupState | null): void {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage unavailable */ }
}

export function loadSaved(postCount: number): GroupState | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && v.posts && v.posts.length === postCount ? normalize(v) : null;
  } catch {
    return null;
  }
}

export function clearSaved(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export const TEACHER_KEY = "geotrails.guru";

export function loadTeacher(): TeacherSettings {
  try {
    const v = JSON.parse(localStorage.getItem(TEACHER_KEY) || "null");
    return { pinHash: typeof v?.pinHash === "string" ? v.pinHash : null, demo: v?.demo === true };
  } catch {
    return { pinHash: null, demo: false };
  }
}

export function saveTeacher(t: TeacherSettings): void {
  try { localStorage.setItem(TEACHER_KEY, JSON.stringify(t)); } catch { /* storage unavailable */ }
}

/* Teacher-uploaded post photos live in IndexedDB (too large for localStorage). */
const DB_NAME = "geotrails", PHOTO_STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(PHOTO_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function photoTx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(PHOTO_STORE, mode).objectStore(PHOTO_STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const getPhoto = (id: number): Promise<Blob | undefined> => photoTx("readonly", (s) => s.get(id));
export const putPhoto = (id: number, blob: Blob): Promise<IDBValidKey> => photoTx("readwrite", (s) => s.put(blob, id));
export const deletePhoto = (id: number): Promise<undefined> => photoTx("readwrite", (s) => s.delete(id));
