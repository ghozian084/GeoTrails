import { START } from "./data/map";
import type { GroupState, Post } from "./types";

/*
 * Persistence. Only the group name, avatar colour and trail progress are stored (no personal data).
 * Teacher-uploaded images will go to IndexedDB; not used yet.
 */
export const KEY = "geotrails.v1";

export const COLORS = ["#E4572E", "#2E86AB", "#7B2CBF", "#F2A541", "#17BEBB", "#D6336C"];

export function fresh(name: string, color: string, posts: Post[]): GroupState {
  return {
    name,
    color,
    pos: [...START],
    posts: posts.map((p) => ({ id: p.id, result: null, answer: null, attempts: [], hints: 0, time: 0, score: 0 })),
    started: Date.now(),
    finShown: false,
  };
}

export function save(S: GroupState | null): void {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage unavailable */ }
}

export function loadSaved(postCount: number): GroupState | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && v.posts && v.posts.length === postCount ? v : null;
  } catch {
    return null;
  }
}

export function clearSaved(): void {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
