/*
 * School map: 36×24 tile grid.
 * Tile codes: g grass, p pavement, b building, t tree, f flagpole, x water tank, o pot, h semicircle garden.
 * Only g and p are walkable.
 */
export type Tile = "g" | "p" | "b" | "t" | "f" | "x" | "o" | "h";

export interface Building {
  n: string;
  /** Inclusive tile rect [x0, y0, x1, y1]. */
  r: [number, number, number, number];
}

export const COLS = 36;
export const ROWS = 24;

export const tiles: Tile[][] = [...Array(ROWS)].map(() => Array<Tile>(COLS).fill("g"));
const fill = (x0: number, y0: number, x1: number, y1: number, t: Tile) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[y][x] = t;
};
fill(0, 7, 35, 7, "p"); fill(6, 7, 7, 23, "p"); fill(28, 7, 29, 22, "p"); fill(6, 18, 29, 18, "p");
fill(8, 8, 27, 16, "p"); fill(16, 17, 19, 23, "p"); fill(15, 6, 27, 6, "p");

export const BUILD: Building[] = [
  { n: "Gedung Kelas A", r: [0, 0, 13, 6] }, { n: "Gedung Kelas B", r: [15, 0, 27, 5] }, { n: "Kantor Guru", r: [29, 0, 35, 6] },
  { n: "Lab & Perpustakaan", r: [0, 8, 5, 16] }, { n: "Kantin", r: [30, 8, 35, 15] }, { n: "Pos Satpam", r: [20, 20, 22, 22] }, { n: "Gudang", r: [0, 19, 4, 20] },
];
BUILD.forEach((b) => fill(...b.r, "b"));

export const TREES: [number, number][] = [[11, 17], [24, 17], [33, 17], [1, 18], [5, 23], [9, 23], [13, 19], [26, 23], [14, 22], [35, 18]];
TREES.forEach(([x, y]) => (tiles[y][x] = "t"));

tiles[11][17] = "f"; tiles[22][2] = "x"; tiles[21][11] = "o";
fill(31, 19, 35, 23, "h");

export const START: [number, number] = [17, 22];

export const walk = (x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < COLS && y < ROWS && (tiles[y][x] === "g" || tiles[y][x] === "p");
