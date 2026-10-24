import * as THREE from "three";
import { COLS, ROWS } from "../../src/data/map";
import { groundAt } from "../../src/game/world";

/* Procedural canvas textures: studded baseplate, avatar face, text labels. No image assets. */

export const PALETTE = {
  grass: "#4B974B", grass2: "#3F8A41", pave: "#A3A2A5", court: "#D8D6CE", courtLine: "#F8F8F8", soil: "#8A6A4B",
};

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!];
}

const hex = (c: string, f: number) => {
  // Lighten (f > 0) or darken (f < 0) a #rrggbb colour.
  const n = parseInt(c.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
  return `rgb(${ch.map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))).join(",")})`;
};

/** One stud: a raised disc lit from the top-left. */
function stud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, base: string) {
  ctx.fillStyle = hex(base, -0.18); ctx.beginPath(); ctx.arc(x + r * .12, y + r * .16, r, 0, 7); ctx.fill();
  ctx.fillStyle = hex(base, 0.08); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = hex(base, 0.22); ctx.beginPath(); ctx.arc(x - r * .25, y - r * .3, r * .45, 0, 7); ctx.fill();
}

/** Whole-map ground texture: studded grass, grey paving, light court with painted lines. */
export function groundTexture(): THREE.CanvasTexture {
  const P = 64, [c, ctx] = canvas(COLS * P, ROWS * P);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const g = groundAt(x, y);
    const base = g === "pave" ? PALETTE.pave : g === "court" ? PALETTE.court : (x + y) % 2 ? PALETTE.grass : PALETTE.grass2;
    ctx.fillStyle = base; ctx.fillRect(x * P, y * P, P, P);
    ctx.strokeStyle = hex(base, -0.08); ctx.lineWidth = 2; ctx.strokeRect(x * P + 1, y * P + 1, P - 2, P - 2);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) stud(ctx, x * P + P / 4 + i * P / 2, y * P + P / 4 + j * P / 2, P * .13, base);
  }
  // Assembly court markings (same geometry as the 2D map).
  ctx.strokeStyle = PALETTE.courtLine; ctx.lineWidth = 6;
  ctx.strokeRect(9 * P, 9 * P, 18 * P, 6 * P);
  ctx.beginPath(); ctx.moveTo(18 * P, 9 * P); ctx.lineTo(18 * P, 15 * P); ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Small repeating stud texture for roofs and plinths. */
export function studTile(base: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  ctx.fillStyle = base; ctx.fillRect(0, 0, 64, 64);
  stud(ctx, 32, 32, 11, base);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Classic smiley face on the head colour. */
export function faceTexture(skin: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = skin; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#1B1B1F";
  ctx.beginPath(); ctx.ellipse(44, 52, 7, 13, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(84, 52, 7, 13, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "#1B1B1F"; ctx.lineWidth = 7; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(64, 70, 26, Math.PI * .18, Math.PI * .82); ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Billboard label (building names, name tags, post numbers). World height `h`. */
export function label(text: string, opts: { h: number; bg: string; fg: string; font?: string; pad?: number }): THREE.Sprite {
  const font = opts.font ?? '700 56px "Chakra Petch", sans-serif', pad = opts.pad ?? 22;
  const [, m] = canvas(1, 1);
  m.font = font;
  const w = Math.ceil(m.measureText(text).width) + pad * 2, hpx = 84;
  const [c, ctx] = canvas(w, hpx);
  ctx.fillStyle = opts.bg;
  ctx.beginPath(); ctx.roundRect(0, 0, w, hpx, 18); ctx.fill();
  ctx.fillStyle = opts.fg; ctx.font = font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, hpx / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  s.scale.set(opts.h * w / hpx, opts.h, 1);
  return s;
}
