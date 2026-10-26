import type { ErrorPattern, Post } from "../../src/types";

/*
 * Teacher-made maps for the "Peta" app. A map is plain JSON so it can be stored in
 * localStorage, exported and imported. Tile (x, y) has x = column, y = row.
 */

/** Ground tiles: rumput, paving, lapangan, paving teduh, taman, kolam. */
export type TileKind = "g" | "p" | "c" | "k" | "h" | "a";
export const TILE_KINDS: TileKind[] = ["g", "p", "c", "k", "h", "a"];
export const TILE_LABEL: Record<TileKind, string> = { g: "Rumput", p: "Paving", c: "Lapangan", k: "Paving teduh", h: "Taman", a: "Kolam" };
const WALK_TILE: Record<TileKind, boolean> = { g: true, p: true, c: true, k: true, h: false, a: false };

export type ObjectKind = "tree" | "flag" | "tank" | "pot" | "ramp" | "sign";
export const OBJECT_KINDS: ObjectKind[] = ["tree", "flag", "tank", "pot", "ramp", "sign"];
export const OBJECT_LABEL: Record<ObjectKind, string> = { tree: "Pohon", flag: "Tiang bendera", tank: "Tandon", pot: "Pot", ramp: "Ramp", sign: "Papan" };
/** Objects you can walk over (the ramp lies flat on the path). */
const WALK_OBJECT: Record<ObjectKind, boolean> = { tree: false, flag: false, tank: false, pot: false, ramp: true, sign: false };

export interface MapObject { kind: ObjectKind; x: number; y: number }

export interface MapBuilding {
  name: string;
  /** Inclusive tile rectangle. */
  x0: number; y0: number; x1: number; y1: number;
  /** Wall colour in 3D. */
  color: string;
  /** Number of floors in 3D. */
  floors: number;
}

/** A post: its position and everything a student reads or is graded on. */
export interface MapPost {
  /** Stable identifier (photos are stored under it). */
  uid: string;
  x: number; y: number;
  title: string; place: string; concept: string; task: string; unit: string; note: string;
  green: [number, number]; orange: [number, number]; key: string;
  errors: ErrorPattern[]; hints: string[];
  /** Built-in illustration to show when there is no photo (Basic map only). */
  scene?: number;
  media?: "pano" | "img";
  focus?: number;
}

export interface MapDef {
  format: "geotrails-map";
  version: 1;
  id: string;
  name: string;
  cols: number;
  rows: number;
  /** rows × cols characters, row by row (TileKind). */
  tiles: string;
  buildings: MapBuilding[];
  objects: MapObject[];
  posts: MapPost[];
  start: [number, number];
  /** Shown in the students' map list. */
  published: boolean;
  /** The built-in Basic map (read-only; duplicate it to edit). */
  builtIn?: boolean;
}

export const BUILDING_COLORS = ["#C4281C", "#0D69AC", "#789082", "#DA8541", "#F5CD30", "#635F62", "#694028", "#4B974B"];

export const newId = (prefix: string): string => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function tileAt(m: MapDef, x: number, y: number): TileKind | null {
  if (x < 0 || y < 0 || x >= m.cols || y >= m.rows) return null;
  return m.tiles[y * m.cols + x] as TileKind;
}

export function setTile(m: MapDef, x: number, y: number, t: TileKind): void {
  if (x < 0 || y < 0 || x >= m.cols || y >= m.rows) return;
  const i = y * m.cols + x;
  m.tiles = m.tiles.slice(0, i) + t + m.tiles.slice(i + 1);
}

export const buildingAt = (m: MapDef, x: number, y: number): MapBuilding | undefined =>
  m.buildings.find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);

export const objectAt = (m: MapDef, x: number, y: number): MapObject | undefined =>
  m.objects.find((o) => o.x === x && o.y === y);

/** Precomputed walkability grid for a map (called every frame, so cached per map version). */
export function walker(m: MapDef): (x: number, y: number) => boolean {
  const ok = new Uint8Array(m.cols * m.rows);
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    const t = tileAt(m, x, y)!;
    ok[y * m.cols + x] = WALK_TILE[t] ? 1 : 0;
  }
  for (const b of m.buildings) for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (x >= 0 && y >= 0 && x < m.cols && y < m.rows) ok[y * m.cols + x] = 0;
  for (const o of m.objects) if (!WALK_OBJECT[o.kind] && o.x >= 0 && o.y >= 0 && o.x < m.cols && o.y < m.rows) ok[o.y * m.cols + o.x] = 0;
  return (x, y) => x >= 0 && y >= 0 && x < m.cols && y < m.rows && ok[y * m.cols + x] === 1;
}

/** Posts in the shape the grading, scoring and log code expects (id = index). */
export function toPosts(m: MapDef): Post[] {
  return m.posts.map((p, id) => ({
    id, title: p.title, place: p.place, concept: p.concept, task: p.task, unit: p.unit, note: p.note,
    green: p.green, orange: p.orange, key: p.key, errors: p.errors, hints: p.hints,
    tile: [p.x, p.y], media: p.media ?? "img", focus: p.focus,
  }));
}

/** An empty grass map. */
export function blankMap(name: string, cols: number, rows: number): MapDef {
  return {
    format: "geotrails-map", version: 1, id: newId("m-"), name, cols, rows,
    tiles: "g".repeat(cols * rows), buildings: [], objects: [], posts: [],
    start: [Math.floor(cols / 2), rows - 2], published: false,
  };
}

/** A blank post at (x, y), to be filled in by the teacher. */
export function blankPost(x: number, y: number): MapPost {
  return {
    uid: newId("p-"), x, y, title: "Pos baru", place: "", concept: "", task: "", unit: "m", note: "",
    green: [0, 0], orange: [0, 0], key: "", errors: [], hints: [""],
  };
}

export const cloneMap = (m: MapDef): MapDef => JSON.parse(JSON.stringify(m));
