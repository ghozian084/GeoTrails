import type { Post } from "../types";
import { parseCsv } from "./csvParse";
import { grade } from "./grade";

/*
 * Class recap: combine the log CSVs exported from several laptops (see logic/csv.ts).
 * Columns are looked up by header name, so older exports without the newer columns still work.
 */

export interface PostRecord {
  pos: number;
  result: "hijau" | "oranye" | "belum";
  attempts: number;
  history: number[];
  hints: number;
  time: number;
  score: number;
  physical: number | null;
  diff: number | null;
}

export interface GroupRecord {
  name: string;
  posts: PostRecord[];
  reflection: { q: string; a: string }[];
}

const num = (s: string | undefined): number | null => {
  if (s == null || s.trim() === "") return null;
  const v = Number(s.trim());
  return isFinite(v) ? v : null;
};

const isPostHeader = (r: string[]) => r[0] === "kelompok" && r[1] === "pos";
const isReflHeader = (r: string[]) => r[0] === "kelompok" && r[1] === "refleksi";
const blank = (r: string[]) => r.every((c) => c.trim() === "");

export function parseLogs(text: string): { groups: GroupRecord[]; warnings: string[] } {
  const groups = new Map<string, GroupRecord>();
  const seen = new Set<string>();
  const warnings: string[] = [];
  let mode: "none" | "posts" | "refl" = "none";
  let col: Record<string, number> = {};
  /** Names whose post rows were already read in the current block, to detect repeats across blocks. */
  let block = new Set<string>();

  for (const r of parseCsv(text)) {
    if (blank(r)) { mode = "none"; continue; }
    if (isPostHeader(r)) { mode = "posts"; col = Object.fromEntries(r.map((h, i) => [h.trim(), i])); block = new Set(); continue; }
    if (isReflHeader(r)) { mode = "refl"; continue; }
    if (mode === "posts") {
      const name = r[col.kelompok]?.trim(), pos = num(r[col.pos]);
      if (!name || pos == null) continue;
      if (!block.has(name)) {
        if (seen.has(name)) warnings.push(`Kelompok "${name}" muncul lebih dari sekali; data yang terakhir dipakai.`);
        seen.add(name); block.add(name);
        groups.set(name, { name, posts: [], reflection: groups.get(name)?.reflection ?? [] });
      }
      const g = groups.get(name)!;
      const res = r[col.hasil]?.trim();
      g.posts.push({
        pos,
        result: res === "hijau" || res === "oranye" ? res : "belum",
        attempts: num(r[col.percobaan]) ?? 0,
        history: (r[col.riwayat_jawaban] ?? "").split("|").map((x) => num(x)).filter((x): x is number => x != null),
        hints: num(r[col.petunjuk]) ?? 0,
        time: num(r[col.durasi_detik]) ?? 0,
        score: num(r[col.poin]) ?? 0,
        physical: col.fisik != null ? num(r[col.fisik]) : null,
        diff: col.selisih_persen != null ? num(r[col.selisih_persen]) : null,
      });
    } else if (mode === "refl") {
      const name = r[0]?.trim();
      if (!name) continue;
      const g = groups.get(name) ?? { name, posts: [], reflection: [] };
      groups.set(name, g);
      const q = r[1] ?? "", a = (r[2] ?? "").trim();
      g.reflection = g.reflection.filter((x) => x.q !== q);
      if (a) g.reflection.push({ q, a });
    }
  }
  if (!groups.size) warnings.push("Tidak ada data log GeoTrails yang terbaca. Tempel isi CSV dari tombol Salin CSV atau pilih berkas .csv.");
  return { groups: [...groups.values()], warnings };
}

export interface GroupSummary { name: string; total: number; green: number; orange: number; hints: number; time: number }

export interface PostSummary {
  id: number;
  title: string;
  groups: number;
  green: number;
  orange: number;
  open: number;
  avgAttempts: number | null;
  avgHints: number | null;
  avgAbsDiff: number | null;
  /** Error messages matched by wrong attempts, most frequent first. */
  mistakes: { m: string; count: number }[];
}

const avg = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function summarize(groups: GroupRecord[], posts: Post[]): { perGroup: GroupSummary[]; perPost: PostSummary[] } {
  const perGroup = groups.map((g) => ({
    name: g.name,
    total: g.posts.reduce((a, p) => a + p.score, 0),
    green: g.posts.filter((p) => p.result === "hijau").length,
    orange: g.posts.filter((p) => p.result === "oranye").length,
    hints: g.posts.reduce((a, p) => a + p.hints, 0),
    time: g.posts.reduce((a, p) => a + p.time, 0),
  })).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const perPost = posts.map((post) => {
    const recs = groups.map((g) => g.posts.find((p) => p.pos === post.id)).filter((r): r is PostRecord => !!r);
    const tried = recs.filter((r) => r.attempts > 0 || r.result !== "belum");
    const counts = new Map<string, number>();
    for (const r of recs) for (const v of r.history) {
      const e = grade(post, v).error;
      if (e) counts.set(e.m, (counts.get(e.m) ?? 0) + 1);
    }
    return {
      id: post.id,
      title: post.title,
      groups: recs.length,
      green: recs.filter((r) => r.result === "hijau").length,
      orange: recs.filter((r) => r.result === "oranye").length,
      open: recs.filter((r) => r.result === "belum").length,
      avgAttempts: avg(tried.map((r) => r.attempts)),
      avgHints: avg(tried.map((r) => r.hints)),
      avgAbsDiff: avg(recs.filter((r) => r.diff != null).map((r) => Math.abs(r.diff!))),
      mistakes: [...counts].map(([m, count]) => ({ m, count })).sort((a, b) => b.count - a.count),
    };
  });
  return { perGroup, perPost };
}
