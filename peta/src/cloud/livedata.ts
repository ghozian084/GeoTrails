import type { GroupState } from "../../../src/types";

/*
 * Shape of one group in a live room (Realtime Database, see firebase/database.rules.json),
 * and the pure helpers used by the room client and the UI. Kept free of Firebase imports
 * so they can be unit-tested.
 */

export interface LivePlayer {
  uid: string;
  /** Group name and avatar colour (the only identity, as in the rest of GeoTrails). */
  n: string; c: string;
  /** Position in tile units (tile centre = index + 0.5) and facing (radians, 0 = down/south). */
  x: number; y: number; d: number;
  /** Score and post states: one character per post, g = green, o = orange, - = not done. */
  s: number; p: string;
  on: boolean;
  /** Server time of the last update (ms). */
  t: number;
}

export const STALE_MS = 24 * 3600_000;

export const postString = (S: GroupState): string =>
  S.posts.slice(0, 12).map((p) => (p.result === "green" ? "g" : p.result === "orange" ? "o" : "-")).join("") || "-";

export const doneCount = (p: string): number => [...p].filter((ch) => ch !== "-").length;

/** Scoreboard order: score, then posts done, then name. */
export const ranked = (ps: LivePlayer[]): LivePlayer[] =>
  [...ps].sort((a, b) => b.s - a.s || doneCount(b.p) - doneCount(a.p) || a.n.localeCompare(b.n));

/** Drop offline entries of a group that is online again under the same name (e.g. another browser). */
export const deduped = (ps: LivePlayer[]): LivePlayer[] => {
  const online = new Set(ps.filter((p) => p.on).map((p) => p.n));
  return ps.filter((p) => p.on || !online.has(p.n));
};

/** Room snapshot → players, dropping anything malformed. */
export function parseRoom(val: unknown): LivePlayer[] {
  if (!val || typeof val !== "object") return [];
  const out: LivePlayer[] = [];
  for (const [uid, v] of Object.entries(val as Record<string, Partial<LivePlayer>>)) {
    if (!v || typeof v.n !== "string" || typeof v.x !== "number" || typeof v.y !== "number") continue;
    out.push({ uid, n: v.n, c: typeof v.c === "string" ? v.c : "#888888", x: v.x, y: v.y, d: typeof v.d === "number" ? v.d : 0,
      s: typeof v.s === "number" ? v.s : 0, p: typeof v.p === "string" ? v.p : "-", on: v.on !== false, t: typeof v.t === "number" ? v.t : 0 });
  }
  return out;
}

/** Facing in radians from a 2D sprite direction, and back (0 = down, as atan2(dx, dy)). */
const DIR_ANGLE = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 } as const;
export type Dir4 = keyof typeof DIR_ANGLE;
export const angleOf = (dir: Dir4): number => DIR_ANGLE[dir];
export function dirOf(a: number): Dir4 {
  const n = Math.round(((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (Math.PI / 2)) % 4;
  return (["down", "right", "up", "left"] as const)[n];
}

/** Round to 0.01 tile: enough for smooth movement, and fewer changes to send. */
export const round2 = (v: number): number => Math.round(v * 100) / 100;
