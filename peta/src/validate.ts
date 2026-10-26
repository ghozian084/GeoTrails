import { bfs } from "../../src/game/bfs";
import { LIMITS, MAX_ERRORS, MAX_HINTS } from "../../src/logic/trail";
import { buildingAt, OBJECT_KINDS, TILE_KINDS, walker, type MapDef, type MapPost } from "./mapdef";

/* Checks a map before it is saved or shown to students. Messages are in Indonesian for the teacher. */

export const SIZE = { minCols: 12, maxCols: 60, minRows: 10, maxRows: 40 };
export const MAX_POSTS = 12;

const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);
const inside = (m: MapDef, x: number, y: number) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < m.cols && y < m.rows;

/** Problems with one post's content (texts, ranges, hints, error patterns). */
export function postProblems(p: MapPost, label: string): string[] {
  const out: string[] = [];
  const text = (v: unknown, name: string, lim: number, required: boolean) => {
    if (typeof v !== "string") { out.push(`${label}: ${name} harus berupa teks.`); return; }
    if (required && !v.trim()) out.push(`${label}: ${name} wajib diisi.`);
    if (v.trim().length > lim) out.push(`${label}: ${name} maksimal ${lim} karakter.`);
  };
  text(p.title, "judul", LIMITS.title, true);
  text(p.place, "tempat", LIMITS.place, false);
  text(p.concept, "konsep", LIMITS.concept, false);
  text(p.task, "soal", LIMITS.task, true);
  text(p.unit, "satuan", LIMITS.unit, true);
  text(p.note, "catatan", LIMITS.note, false);
  text(p.key, "model rujukan", LIMITS.key, true);
  const range = (r: unknown, name: string) => {
    if (!Array.isArray(r) || r.length !== 2 || !isNum(r[0]) || !isNum(r[1])) { out.push(`${label}: rentang ${name} harus berisi dua angka.`); return false; }
    if (r[0] > r[1]) { out.push(`${label}: batas bawah rentang ${name} lebih besar dari batas atas.`); return false; }
    return true;
  };
  const okG = range(p.green, "hijau"), okO = range(p.orange, "oranye");
  if (okG && okO && (p.orange[0] > p.green[0] || p.orange[1] < p.green[1])) out.push(`${label}: rentang hijau harus berada di dalam rentang oranye.`);
  if (!Array.isArray(p.hints) || p.hints.length < 1 || p.hints.length > MAX_HINTS) out.push(`${label}: petunjuk harus 1–${MAX_HINTS} butir.`);
  else p.hints.forEach((h, i) => text(h, `petunjuk ${i + 1}`, LIMITS.hint, true));
  if (!Array.isArray(p.errors) || p.errors.length > MAX_ERRORS) out.push(`${label}: kesalahan umum maksimal ${MAX_ERRORS} butir.`);
  else p.errors.forEach((e, i) => {
    const name = `kesalahan ${i + 1}`;
    if (!e || !isNum(e.v) || !isNum(e.t) || e.t < 0) { out.push(`${label}: ${name} perlu nilai dan toleransi (angka, toleransi ≥ 0).`); return; }
    text(e.m, `pesan ${name}`, LIMITS.msg, true);
    if (okG && e.v + e.t >= p.green[0] && e.v - e.t <= p.green[1]) out.push(`${label}: ${name} bertumpang dengan rentang hijau, jadi pesannya tidak akan pernah muncul.`);
  });
  return out;
}

/** Every problem that stops a map from being used. Empty array = valid. */
export function mapProblems(m: MapDef): string[] {
  const out: string[] = [];
  if (!m || m.format !== "geotrails-map") return ["Berkas ini bukan peta GeoTrails."];
  if (typeof m.name !== "string" || !m.name.trim()) out.push("Nama peta wajib diisi.");
  else if (m.name.trim().length > 40) out.push("Nama peta maksimal 40 karakter.");
  if (!Number.isInteger(m.cols) || !Number.isInteger(m.rows) || m.cols < SIZE.minCols || m.cols > SIZE.maxCols || m.rows < SIZE.minRows || m.rows > SIZE.maxRows)
    return [...out, `Ukuran peta harus ${SIZE.minCols}–${SIZE.maxCols} kolom dan ${SIZE.minRows}–${SIZE.maxRows} baris.`];
  if (typeof m.tiles !== "string" || m.tiles.length !== m.cols * m.rows || [...m.tiles].some((c) => !TILE_KINDS.includes(c as never)))
    return [...out, "Data petak peta rusak."];
  if (!Array.isArray(m.buildings) || !Array.isArray(m.objects) || !Array.isArray(m.posts)) return [...out, "Data peta tidak lengkap."];

  m.buildings.forEach((b, i) => {
    const label = `Gedung "${b.name || i + 1}"`;
    if (!b.name?.trim()) out.push(`Gedung ${i + 1}: nama wajib diisi.`);
    else if (b.name.length > 40) out.push(`${label}: nama maksimal 40 karakter.`);
    if (!inside(m, b.x0, b.y0) || !inside(m, b.x1, b.y1) || b.x0 > b.x1 || b.y0 > b.y1) out.push(`${label}: berada di luar peta.`);
    if (!Number.isInteger(b.floors) || b.floors < 1 || b.floors > 5) out.push(`${label}: jumlah lantai harus 1–5.`);
    m.buildings.slice(i + 1).forEach((c) => {
      if (b.x0 <= c.x1 && c.x0 <= b.x1 && b.y0 <= c.y1 && c.y0 <= b.y1) out.push(`${label} bertumpuk dengan gedung "${c.name}".`);
    });
  });
  const seen = new Set<string>();
  m.objects.forEach((o) => {
    if (!OBJECT_KINDS.includes(o.kind) || !inside(m, o.x, o.y)) { out.push("Ada objek yang tidak dikenal atau di luar peta."); return; }
    const k = o.x + "," + o.y;
    if (seen.has(k)) out.push(`Ada dua objek di petak (${o.x}, ${o.y}).`);
    seen.add(k);
    if (buildingAt(m, o.x, o.y)) out.push(`Objek di petak (${o.x}, ${o.y}) berada di dalam gedung.`);
  });

  const walk = walker(m);
  if (!Array.isArray(m.start) || !inside(m, m.start[0], m.start[1]) || !walk(m.start[0], m.start[1])) out.push("Titik mulai harus berada di petak yang bisa dilalui.");

  if (m.posts.length < 1) out.push("Peta perlu minimal 1 pos.");
  if (m.posts.length > MAX_POSTS) out.push(`Peta maksimal ${MAX_POSTS} pos.`);
  const postAt = new Set<string>();
  m.posts.forEach((p, i) => {
    const label = `Pos ${i}${p.title ? ` (${p.title})` : ""}`;
    if (!inside(m, p.x, p.y)) { out.push(`${label}: berada di luar peta.`); return; }
    const k = p.x + "," + p.y;
    if (postAt.has(k)) out.push(`${label}: ada pos lain di petak yang sama.`);
    postAt.add(k);
    if (buildingAt(m, p.x, p.y)) out.push(`${label}: berada di dalam gedung.`);
    else if (walk(m.start[0], m.start[1]) && !bfs(m.start, (x, y) => Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= 1, walk))
      out.push(`${label}: tidak bisa dicapai dari titik mulai.`);
    out.push(...postProblems(p, label));
  });
  return out;
}
