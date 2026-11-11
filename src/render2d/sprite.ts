import type { Dir, Pose } from "./anim";
import { shade } from "./color";

/*
 * RPG-style pixel avatar, generated procedurally (no image assets).
 * Base grid is 16×24; a 1px outline is added around it, giving an 18×26 sprite.
 */
export const SPRITE_W = 18;
export const SPRITE_H = 26;

type Px = string | null;
type Grid = Px[][];

export interface AvatarPalette {
  shirt: string; shirtDark: string;
  skin: string; skinDark: string; cheek: string;
  hair: string; hairLight: string;
  pants: string; pantsDark: string;
  shoes: string; eye: string; outline: string;
}

export function avatarPalette(shirt: string): AvatarPalette {
  return {
    shirt, shirtDark: shade(shirt, -0.3),
    skin: "#E0A872", skinDark: "#BF8455", cheek: "#E88F78",
    hair: "#2B2019", hairLight: "#4A372B",
    pants: "#36435E", pantsDark: "#262F45",
    shoes: "#1C1C22", eye: "#1C1C22", outline: "#191C20",
  };
}

const W = 16, H = 24;

/** Pixel colours for one frame; null = transparent. Pure, so it can be unit-tested. */
export function avatarPixels(dir: Dir, pose: Pose, blink: boolean, p: AvatarPalette): Grid {
  const g: Grid = Array.from({ length: H }, () => Array<Px>(W).fill(null));
  const r = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c;
  };
  const side = dir === "left" || dir === "right";
  const step = pose === 1 ? 1 : pose === 2 ? -1 : 0;

  // Legs
  if (!side) {
    const liftL = step === -1 ? 1 : 0, liftR = step === 1 ? 1 : 0;
    r(5, 18, 7, 21 - liftL, p.pants); r(5, 22 - liftL, 7, 23 - liftL, p.shoes);
    r(8, 18, 10, 21 - liftR, p.pants); r(8, 22 - liftR, 10, 23 - liftR, p.shoes);
    r(7, 18, 7, 21 - liftL, p.pantsDark);
  } else if (step === 0) {
    r(6, 18, 9, 21, p.pants); r(7, 18, 7, 21, p.pantsDark); r(5, 22, 9, 23, p.shoes);
  } else {
    // Drawn facing left (mirrored for right): near leg forward, far leg back and lifted.
    const near = step === 1 ? p.pants : p.pantsDark, far = step === 1 ? p.pantsDark : p.pants;
    r(9, 18, 11, 20, far); r(9, 21, 12, 22, p.shoes);
    r(4, 18, 6, 21, near); r(3, 22, 6, 23, p.shoes);
    r(6, 18, 9, 18, p.pants);
  }

  // Body
  if (!side) {
    r(4, 11, 11, 16, p.shirt); r(11, 11, 11, 16, p.shirtDark); r(4, 17, 11, 17, p.pantsDark);
    if (dir === "down") { r(7, 11, 8, 11, p.skin); r(6, 11, 6, 11, p.shirtDark); r(9, 11, 9, 11, p.shirtDark); }
    // Arms swing opposite to the lifted leg
    const aL = step === 1 ? 1 : step === -1 ? -1 : 0, aR = -aL;
    r(2, 11, 3, 13, p.shirt); r(2, 11, 2, 13, p.shirtDark); r(2, 14 + Math.min(0, aL), 3, 15 + Math.max(0, aL), p.skin);
    r(12, 11, 13, 13, p.shirtDark); r(12, 14 + Math.min(0, aR), 13, 15 + Math.max(0, aR), p.skin);
  } else {
    r(5, 11, 10, 16, p.shirt); r(10, 11, 10, 16, p.shirtDark); r(5, 17, 10, 17, p.pantsDark);
    if (step === 0) { r(7, 11, 8, 14, p.shirtDark); r(7, 15, 8, 16, p.skin); }
    else if (step === 1) { r(6, 11, 7, 13, p.shirtDark); r(5, 14, 6, 15, p.skin); }
    else { r(8, 11, 9, 13, p.shirtDark); r(9, 14, 10, 15, p.skin); }
  }

  // Head: rounded 10×10 block
  r(5, 1, 10, 1, p.skin); r(3, 2, 12, 9, p.skin); r(4, 10, 11, 10, p.skin);
  if (dir === "down") {
    r(5, 1, 10, 1, p.hair); r(3, 2, 12, 4, p.hair); r(3, 5, 3, 7, p.hair); r(12, 5, 12, 7, p.hair);
    r(6, 2, 8, 2, p.hairLight); r(4, 5, 5, 5, p.hair); r(10, 5, 11, 5, p.hair);
    if (blink) { r(5, 8, 5, 8, p.eye); r(10, 8, 10, 8, p.eye); }
    else { r(5, 7, 5, 8, p.eye); r(10, 7, 10, 8, p.eye); }
    r(4, 9, 4, 9, p.cheek); r(11, 9, 11, 9, p.cheek); r(7, 9, 8, 9, p.skinDark);
  } else if (dir === "up") {
    r(5, 1, 10, 1, p.hair); r(3, 2, 12, 9, p.hair); r(6, 2, 9, 3, p.hairLight); r(4, 10, 11, 10, p.skinDark);
  } else {
    r(5, 1, 10, 1, p.hair); r(3, 2, 12, 4, p.hair); r(7, 5, 12, 9, p.hair); r(3, 5, 4, 5, p.hair);
    r(6, 2, 8, 2, p.hairLight); r(8, 7, 8, 8, p.skinDark);
    if (blink) r(4, 8, 4, 8, p.eye); else r(4, 7, 4, 8, p.eye);
    r(2, 8, 2, 8, p.skin); r(4, 9, 4, 9, p.cheek);
  }

  if (dir === "right") g.forEach((row) => row.reverse());
  return outline(g, p.outline);
}

/** Pad by 1px and draw an outline around every opaque pixel. */
function outline(g: Grid, c: string): Grid {
  const o: Grid = Array.from({ length: SPRITE_H }, (_, y) => Array.from({ length: SPRITE_W }, (_, x) => g[y - 1]?.[x - 1] ?? null));
  const filled = (x: number, y: number) => !!o[y]?.[x];
  const res = o.map((row) => row.slice());
  for (let y = 0; y < SPRITE_H; y++) for (let x = 0; x < SPRITE_W; x++) {
    if (!o[y][x] && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) res[y][x] = c;
  }
  return res;
}

const cache = new Map<string, HTMLCanvasElement>();

/** Sprite frame as a 18×26 canvas (cached). Draw it scaled with image smoothing off. */
export function spriteFrame(color: string, dir: Dir, pose: Pose, blink: boolean): HTMLCanvasElement {
  const key = `${color}|${dir}|${pose}|${blink}`;
  let cv = cache.get(key);
  if (cv) return cv;
  cv = document.createElement("canvas");
  cv.width = SPRITE_W; cv.height = SPRITE_H;
  const ctx = cv.getContext("2d")!;
  avatarPixels(dir, pose, blink, avatarPalette(color)).forEach((row, y) =>
    row.forEach((c, x) => { if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } }),
  );
  cache.set(key, cv);
  return cv;
}
