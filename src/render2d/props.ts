import { TREES } from "../data/map";
import { shade, withAlpha } from "./color";
import { rng } from "./world";

/*
 * Tall map objects drawn every frame, depth-sorted with the avatar so it can walk behind them.
 * Each prop reports a depth (tile row of its base) and a draw function.
 */

type Ctx = CanvasRenderingContext2D;
type Colors = Record<string, string>;

export interface Prop {
  depth: number;
  draw(ctx: Ctx, now: number): void;
}

const treeCache = new Map<string, HTMLCanvasElement>();
const TREE_W = 2.2, TREE_H = 2.5;

/** Tree canopy seen from above at an angle: clustered, sun-lit foliage over a short trunk. */
function treeSprite(T: number, DPR: number, C: Colors, variant: number): HTMLCanvasElement {
  const key = `${T}|${DPR}|${C["map-tree"]}|${variant}`;
  const hit = treeCache.get(key);
  if (hit) return hit;
  const W = T * TREE_W, H = T * TREE_H;
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(W * DPR); cv.height = Math.ceil(H * DPR);
  const ctx = cv.getContext("2d")!;
  ctx.scale(DPR, DPR);
  const R = rng(100 + variant), leaf = C["map-tree"];
  const cx = W / 2, base = H - T * .22, cy = base - T * 1.02, rad = T * (.76 + variant * .05);

  // Trunk
  const tg = ctx.createLinearGradient(cx - T * .08, 0, cx + T * .08, 0);
  tg.addColorStop(0, "#7A5A3C"); tg.addColorStop(1, "#4E3824");
  ctx.fillStyle = tg; ctx.fillRect(cx - T * .07, cy, T * .14, base - cy);
  // Canopy: dark core, then shaded leaf clusters, then highlights
  ctx.fillStyle = shade(leaf, -.32); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
  const blobs: [number, number, number][] = [];
  const n = 7 + variant;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * .5, d = rad * (.42 + R() * .18);
    blobs.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * .9, rad * (.42 + R() * .14)]);
  }
  blobs.push([cx - rad * .1, cy - rad * .12, rad * .55]);
  // Lower-right blobs first so the lit upper-left ones overlap them.
  blobs.sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]));
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x - r * .4, y - r * .45, r * .1, x, y, r);
    g.addColorStop(0, shade(leaf, .3)); g.addColorStop(.55, leaf); g.addColorStop(1, shade(leaf, -.28));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (1 + R() * .9), d = R() * rad * .85;
    ctx.fillStyle = withAlpha(shade(leaf, .42), .55);
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, T * (.025 + R() * .03), 0, 7); ctx.fill();
  }
  for (let i = 0; i < 18; i++) {
    const a = R() * Math.PI * .9, d = rad * (.5 + R() * .45);
    ctx.fillStyle = withAlpha(shade(leaf, -.45), .5);
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, T * (.02 + R() * .03), 0, 7); ctx.fill();
  }
  treeCache.set(key, cv);
  return cv;
}

function flag(ctx: Ctx, T: number, now: number) {
  const bx = 17.5 * T, by = 11.5 * T, top = by - T * 1.9, pw = Math.max(2, T * .06);
  const pg = ctx.createLinearGradient(bx - pw, 0, bx + pw, 0);
  pg.addColorStop(0, "#E6EAEC"); pg.addColorStop(.5, "#B9C1C6"); pg.addColorStop(1, "#7E878D");
  ctx.fillStyle = pg; ctx.fillRect(bx - pw / 2, top, pw, by - top);
  ctx.fillStyle = "#D9B44A"; ctx.beginPath(); ctx.arc(bx, top - 2, Math.max(2.5, T * .07), 0, 7); ctx.fill();
  // Merah-putih, waving: amplitude grows toward the free end.
  const L = T * .8, Hh = T * .26, segs = 12, fy = top + T * .06;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const w0 = Math.sin(now / 240 - t0 * 5) * T * .07 * t0, w1 = Math.sin(now / 240 - t1 * 5) * T * .07 * t1;
    const x0 = bx + pw / 2 + L * t0, x1 = bx + pw / 2 + L * t1;
    const light = Math.cos(now / 240 - t0 * 5) * .12;
    for (const [c, off] of [["#D7262E", 0], ["#F5F5F2", Hh]] as const) {
      ctx.fillStyle = shade(c, light);
      ctx.beginPath(); ctx.moveTo(x0, fy + off + w0); ctx.lineTo(x1 + .5, fy + off + w1); ctx.lineTo(x1 + .5, fy + off + Hh + w1); ctx.lineTo(x0, fy + off + Hh + w0); ctx.closePath(); ctx.fill();
    }
  }
}

function tank(ctx: Ctx, T: number) {
  const cx = 2.5 * T, bottom = 22.5 * T + T * .3, top = bottom - T * .95, rw = T * .4, ry = T * .13, blue = "#2F6F8F";
  const g = ctx.createLinearGradient(cx - rw, 0, cx + rw, 0);
  g.addColorStop(0, shade(blue, -.3)); g.addColorStop(.32, shade(blue, .22)); g.addColorStop(.6, blue); g.addColorStop(1, shade(blue, -.4));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - rw, top); ctx.lineTo(cx - rw, bottom); ctx.ellipse(cx, bottom, rw, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rw, top); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade(blue, -.35); ctx.lineWidth = 1.5;
  for (const f of [.3, .55, .8]) { ctx.beginPath(); ctx.ellipse(cx, top + (bottom - top) * f, rw, ry, 0, 0, Math.PI); ctx.stroke(); }
  ctx.fillStyle = shade(blue, .15); ctx.beginPath(); ctx.ellipse(cx, top, rw, ry, 0, 0, 7); ctx.fill();
  ctx.fillStyle = shade(blue, -.2); ctx.beginPath(); ctx.ellipse(cx, top - 1, rw * .42, ry * .45, 0, 0, 7); ctx.fill();
  // Pipe running up from the tank
  ctx.strokeStyle = "#9AA3A8"; ctx.lineWidth = Math.max(2, T * .07); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx + rw * .6, top); ctx.lineTo(cx + rw * .6, top - T * .2); ctx.lineTo(cx + T * .9, top - T * .2); ctx.stroke();
}

function pot(ctx: Ctx, T: number, C: Colors) {
  const cx = 11.5 * T, bottom = 21.5 * T + T * .25, h = T * .42, tw = T * .34, bw = T * .2, top = bottom - h, clay = "#B8643E";
  const g = ctx.createLinearGradient(cx - tw, 0, cx + tw, 0);
  g.addColorStop(0, shade(clay, -.25)); g.addColorStop(.35, shade(clay, .2)); g.addColorStop(1, shade(clay, -.35));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - tw, top); ctx.lineTo(cx - bw, bottom); ctx.lineTo(cx + bw, bottom); ctx.lineTo(cx + tw, top); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(clay, -.1); ctx.beginPath(); ctx.ellipse(cx, top, tw + 1.5, T * .09, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#4A3424"; ctx.beginPath(); ctx.ellipse(cx, top, tw - 2, T * .065, 0, 0, 7); ctx.fill();
  // Plant
  const leaf = shade(C["map-tree"], .1);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * .42;
    ctx.save(); ctx.translate(cx, top); ctx.rotate(a + Math.PI / 2);
    const lg = ctx.createLinearGradient(0, 0, 0, -T * .4);
    lg.addColorStop(0, shade(leaf, -.2)); lg.addColorStop(1, shade(leaf, .2));
    ctx.fillStyle = lg; ctx.beginPath(); ctx.ellipse(0, -T * .2, T * .06, T * .2, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}

export function props(T: number, DPR: number, C: Colors): Prop[] {
  const list: Prop[] = TREES.map(([x, y], i) => ({
    depth: y + .5,
    draw: (ctx) => { ctx.drawImage(treeSprite(T, DPR, C, i % 3), x * T + T / 2 - T * TREE_W / 2, y * T + T / 2 + T * .44 - T * TREE_H, T * TREE_W, T * TREE_H); },
  }));
  list.push({ depth: 11.5, draw: (ctx, now) => flag(ctx, T, now) });
  list.push({ depth: 22.5, draw: (ctx) => tank(ctx, T) });
  list.push({ depth: 21.5, draw: (ctx) => pot(ctx, T, C) });
  return list;
}
