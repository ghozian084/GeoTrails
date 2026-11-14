import { csvJoin } from "../core/csv";
import type { GroupState } from "../core/types";
import type { MapDef } from "../map/mapdef";

/*
 * What a group sends to its teacher during a session, and how the teacher reads it back
 * (table, CSV, per-post summary). Pure functions, no Firebase. Worksheets and reflections
 * never leave the laptop.
 */

/** One post: result (g = green, o = orange, "" = not done), points, answers tried, hints, seconds. */
export interface PostResult { r: "g" | "o" | ""; s: number; a: number[]; h: number; t: number }
export interface GroupResult { n: string; c: string; s: number; posts: PostResult[] }
export interface SessionResult extends GroupResult { uid: string; updatedAt: number }

const MAX_ANSWERS = 10;

export function resultPayload(S: GroupState): GroupResult {
  const posts = S.posts.slice(0, 12).map((p) => ({
    r: p.result === "green" ? "g" as const : p.result === "orange" ? "o" as const : "" as const,
    s: p.score, a: p.attempts.filter((v) => Number.isFinite(v)).slice(-MAX_ANSWERS), h: p.hints, t: Math.round(p.time),
  }));
  return { n: S.name.slice(0, 30) || "Kelompok", c: S.color, s: Math.min(1200, posts.reduce((t, p) => t + p.s, 0)), posts };
}

/** Results document → SessionResult, ignoring anything malformed. */
export function parseResult(uid: string, d: Record<string, unknown>, updatedAt: number): SessionResult | null {
  if (typeof d.n !== "string" || !Array.isArray(d.posts)) return null;
  const posts = (d.posts as Partial<PostResult>[]).map((p) => ({
    r: p?.r === "g" || p?.r === "o" ? p.r : "" as const, s: Number(p?.s) || 0,
    a: Array.isArray(p?.a) ? p!.a.filter((v) => typeof v === "number") : [], h: Number(p?.h) || 0, t: Number(p?.t) || 0,
  }));
  return { uid, n: d.n, c: typeof d.c === "string" ? d.c : "#888888", s: Number(d.s) || 0, posts, updatedAt };
}

/** Ranked like the live scoreboard: points, then posts done, then name. */
export const rankResults = (rs: SessionResult[]): SessionResult[] =>
  [...rs].sort((a, b) => b.s - a.s || done(b) - done(a) || a.n.localeCompare(b.n));
export const done = (r: GroupResult): number => r.posts.filter((p) => p.r).length;

const fmt = (v: number) => String(v).replace(".", ",");

/** Per post: how many groups finished it (green/orange), average attempts and hints. */
export function postSummary(rs: SessionResult[], m: MapDef) {
  return m.posts.map((p, i) => {
    const rows = rs.map((r) => r.posts[i]).filter(Boolean);
    const tried = rows.filter((x) => x.a.length || x.r);
    const avg = (f: (x: PostResult) => number) => (tried.length ? Math.round(tried.reduce((t, x) => t + f(x), 0) / tried.length * 10) / 10 : 0);
    return { title: p.title, green: rows.filter((x) => x.r === "g").length, orange: rows.filter((x) => x.r === "o").length, tried: tried.length, attempts: avg((x) => x.a.length), hints: avg((x) => x.h) };
  });
}

/** One row per group and post, ready for a spreadsheet. */
export function sessionCsv(rs: SessionResult[], m: MapDef, sessionName: string): string {
  const rows: (string | number)[][] = [["sesi", "kelompok", "total_poin", "pos", "judul", "hasil", "poin", "percobaan", "riwayat_jawaban", "petunjuk", "durasi_detik", "satuan"]];
  for (const r of rankResults(rs)) {
    m.posts.forEach((p, i) => {
      const x = r.posts[i] ?? { r: "", s: 0, a: [], h: 0, t: 0 };
      rows.push([sessionName, r.n, r.s, i, p.title, x.r === "g" ? "hijau" : x.r === "o" ? "oranye" : "belum", x.s, x.a.length, x.a.map(fmt).join(" | "), x.h, x.t, p.unit]);
    });
  }
  return csvJoin(rows);
}
