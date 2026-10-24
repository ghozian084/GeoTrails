import type { ErrorPattern, Post } from "../types";

/*
 * Teacher-edited trail content. Map position, media type and panorama focus stay tied
 * to the built-in post with the same id; everything a student reads or is graded on
 * can be edited, exported and imported as JSON.
 */

export const TRAIL_FORMAT = "geotrails-trail";
export const TRAIL_VERSION = 1;

/** Fields a teacher can edit. */
export type PostContent = Pick<Post, "id" | "title" | "place" | "concept" | "task" | "unit" | "note" | "green" | "orange" | "key" | "errors" | "hints">;

export interface TrailFile {
  format: typeof TRAIL_FORMAT;
  version: number;
  posts: PostContent[];
}

export function toTrailFile(posts: Post[]): TrailFile {
  return {
    format: TRAIL_FORMAT,
    version: TRAIL_VERSION,
    posts: posts.map(({ id, title, place, concept, task, unit, note, green, orange, key, errors, hints }) =>
      ({ id, title, place, concept, task, unit, note, green: [...green], orange: [...orange], key, errors: errors.map((e) => ({ ...e })), hints: [...hints] })),
  };
}

export const LIMITS = { title: 60, place: 60, concept: 80, task: 300, unit: 10, note: 400, key: 200, hint: 300, msg: 300 };
export const MAX_HINTS = 5;
export const MAX_ERRORS = 6;

const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);

/**
 * Validate trail JSON against the built-in posts (which supply map positions).
 * Returns the merged posts, or the list of problems in Indonesian.
 */
export function validateTrail(input: unknown, base: Post[]): { trail: Post[] | null; errors: string[] } {
  const errs: string[] = [];
  const obj = input as Partial<TrailFile> | null;
  if (!obj || typeof obj !== "object" || obj.format !== TRAIL_FORMAT) return { trail: null, errors: ["Berkas ini bukan berkas isi pos GeoTrails."] };
  if (!Array.isArray(obj.posts) || obj.posts.length !== base.length) return { trail: null, errors: [`Harus ada tepat ${base.length} pos.`] };

  const out: Post[] = [];
  for (const b of base) {
    const p = obj.posts.find((q) => q && (q as PostContent).id === b.id) as Partial<PostContent> | undefined;
    const at = `Pos ${b.id}`;
    if (!p) { errs.push(`${at}: tidak ditemukan.`); continue; }
    const text = (field: keyof typeof LIMITS, v: unknown, label: string, required: boolean) => {
      if (typeof v !== "string") { errs.push(`${at}: ${label} harus berupa teks.`); return ""; }
      const s = v.trim();
      if (required && !s) errs.push(`${at}: ${label} wajib diisi.`);
      if (s.length > LIMITS[field]) errs.push(`${at}: ${label} maksimal ${LIMITS[field]} karakter.`);
      return s;
    };
    const range = (v: unknown, label: string): [number, number] => {
      if (!Array.isArray(v) || v.length !== 2 || !isNum(v[0]) || !isNum(v[1])) { errs.push(`${at}: rentang ${label} harus berisi dua angka.`); return [0, 0]; }
      if (v[0] > v[1]) errs.push(`${at}: batas bawah rentang ${label} lebih besar dari batas atas.`);
      return [v[0], v[1]];
    };
    const title = text("title", p.title, "judul", true);
    const place = text("place", p.place, "tempat", true);
    const concept = text("concept", p.concept, "konsep", false);
    const task = text("task", p.task, "soal", true);
    const unit = text("unit", p.unit, "satuan", true);
    const note = text("note", p.note, "catatan", false);
    const key = text("key", p.key, "model rujukan", true);
    const green = range(p.green, "hijau"), orange = range(p.orange, "oranye");
    if (orange[0] > green[0] || orange[1] < green[1]) errs.push(`${at}: rentang hijau harus berada di dalam rentang oranye.`);

    const hints: string[] = [];
    if (!Array.isArray(p.hints) || p.hints.length < 1 || p.hints.length > MAX_HINTS) errs.push(`${at}: petunjuk harus 1–${MAX_HINTS} butir.`);
    else p.hints.forEach((h, i) => hints.push(text("hint", h, `petunjuk ${i + 1}`, true)));

    const errors: ErrorPattern[] = [];
    if (!Array.isArray(p.errors) || p.errors.length > MAX_ERRORS) errs.push(`${at}: kesalahan umum maksimal ${MAX_ERRORS} butir.`);
    else p.errors.forEach((e, i) => {
      const label = `kesalahan ${i + 1}`;
      if (!e || !isNum(e.v) || !isNum(e.t) || e.t < 0) { errs.push(`${at}: ${label} perlu nilai dan toleransi (angka, toleransi ≥ 0).`); return; }
      const m = text("msg", e.m, `pesan ${label}`, true);
      if (e.v + e.t >= green[0] && e.v - e.t <= green[1]) errs.push(`${at}: ${label} bertumpang dengan rentang hijau, jadi pesannya tidak akan pernah muncul.`);
      errors.push({ v: e.v, t: e.t, m });
    });

    out.push({ ...b, title, place, concept, task, unit, note, key, green, orange, hints, errors });
  }
  return errs.length ? { trail: null, errors: errs } : { trail: out, errors: [] };
}
