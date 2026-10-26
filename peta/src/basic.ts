import { BUILD, COLS, ROWS, START, tiles, TREES } from "../../src/data/map";
import { POSTS } from "../../src/data/posts";
import { newId, type MapBuilding, type MapDef, type MapObject, type TileKind } from "./mapdef";

/*
 * The original school map and its six posts as the read-only "Basic" map. Built from the
 * original project's data at load time, so the original files stay untouched.
 */

const STYLE: Record<string, [string, number]> = {
  "Gedung Kelas A": ["#C4281C", 3], "Gedung Kelas B": ["#0D69AC", 3], "Kantor Guru": ["#789082", 2],
  "Lab & Perpustakaan": ["#DA8541", 2], Kantin: ["#F5CD30", 1], "Pos Satpam": ["#635F62", 1], Gudang: ["#694028", 1],
};

export const BASIC_ID = "basic";

export function basicMap(): MapDef {
  const inCourt = (x: number, y: number) => x >= 8 && x <= 27 && y >= 8 && y <= 16;
  let t = "";
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const c = tiles[y][x];
    let k: TileKind = "g";
    if (c === "p" || c === "f") k = inCourt(x, y) ? "c" : y === 6 && x >= 15 && x <= 27 ? "k" : "p";
    else if (c === "h") k = "h";
    t += k;
  }
  const buildings: MapBuilding[] = BUILD.map((b) => ({
    name: b.n, x0: b.r[0], y0: b.r[1], x1: b.r[2], y1: b.r[3], color: STYLE[b.n]?.[0] ?? "#A3A2A5", floors: STYLE[b.n]?.[1] ?? 1,
  }));
  const objects: MapObject[] = [
    ...TREES.map(([x, y]) => ({ kind: "tree" as const, x, y })),
    { kind: "flag", x: 17, y: 11 }, { kind: "tank", x: 2, y: 22 }, { kind: "pot", x: 11, y: 21 },
    { kind: "ramp", x: 8, y: 7 }, { kind: "ramp", x: 9, y: 7 }, { kind: "ramp", x: 10, y: 7 },
  ];
  return {
    format: "geotrails-map", version: 1, id: BASIC_ID, name: "Basic", cols: COLS, rows: ROWS, tiles: t,
    buildings, objects,
    posts: POSTS.map((p) => ({
      uid: `basic-${p.id}`, x: p.tile[0], y: p.tile[1],
      title: p.title, place: p.place, concept: p.concept, task: p.task, unit: p.unit, note: p.note,
      green: [...p.green], orange: [...p.orange], key: p.key, errors: p.errors.map((e) => ({ ...e })), hints: [...p.hints],
      scene: p.id, media: p.media, focus: p.focus,
    })),
    start: [...START], published: true, builtIn: true,
  };
}

/** A fresh editable copy of Basic (new id, unpublished). */
export function copyOfBasic(name: string): MapDef {
  return { ...basicMap(), id: newId("m-"), name, builtIn: undefined, published: false };
}
