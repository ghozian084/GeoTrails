import { shade, withAlpha } from "../../src/game/color";
import { rng } from "../../src/game/world";
import { buildingAt, objectAt, tileAt, type MapBuilding, type MapDef, type MapObject, type TileKind } from "./mapdef";

/*
 * Realistic top-down rendering of any MapDef, adapted from the original src/game/world.ts and
 * props.ts (which stay unchanged for the original map). Light comes from the upper left.
 * - renderGround(): static layer, drawn once per map / tile size / theme
 * - objectProps(): tall objects drawn every frame, depth-sorted with the avatar
 */

type Ctx = CanvasRenderingContext2D;
export type Colors = Record<string, string>;

export interface Prop { depth: number; draw(ctx: Ctx, now: number): void }

const HARD: TileKind[] = ["p", "c", "k"];
const SOFT: TileKind[] = ["g", "h"];

export function renderGround(m: MapDef, T: number, DPR: number, C: Colors): HTMLCanvasElement {
  const mw = m.cols * T, mh = m.rows * T;
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(mw * DPR); cv.height = Math.ceil(mh * DPR);
  const ctx = cv.getContext("2d")!;
  ctx.scale(DPR, DPR);
  const g = (x: number, y: number) => (buildingAt(m, x, y) ? null : tileAt(m, x, y));

  grass(ctx, m, T, C, g);
  paving(ctx, m, T, C, g);
  court(ctx, m, T, C, g);
  shaded(ctx, m, T, g);
  water(ctx, m, T, g);
  curbs(ctx, m, T, C, g);
  garden(ctx, m, T, C, g);
  m.objects.filter((o) => o.kind === "ramp").forEach((o) => ramp(ctx, m, o, T, C));
  groundShadows(ctx, m, T, C);
  m.buildings.forEach((b) => drains(ctx, b, T, C, g));
  m.buildings.forEach((b) => castShadow(ctx, b, T, C));
  m.buildings.forEach((b) => building(ctx, b, T, C));
  fence(ctx, m, T, C, g);
  return cv;
}

type G = (x: number, y: number) => TileKind | null;

function clipTo(ctx: Ctx, m: MapDef, T: number, g: G, kinds: TileKind[]) {
  const p = new Path2D();
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) if (kinds.includes(g(x, y)!)) p.rect(x * T, y * T, T, T);
  ctx.clip(p);
}

function grass(ctx: Ctx, m: MapDef, T: number, C: Colors, g: G) {
  const base = C["map-grass"], R = rng(1), mw = m.cols * T, mh = m.rows * T;
  ctx.fillStyle = base; ctx.fillRect(0, 0, mw, mh);
  for (let i = 0; i < m.cols * m.rows / 8; i++) {
    const x = R() * mw, y = R() * mh, rad = (1 + R() * 3.2) * T;
    const c = R() < .55 ? shade(base, -.14) : shade(C["map-grass-2"], .1);
    const gr = ctx.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, withAlpha(c, .5)); gr.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
  }
  const specks = [shade(base, -.2), shade(base, -.1), shade(base, .1), shade(C["map-grass-2"], -.15)];
  const blades = [shade(base, -.25), shade(base, .14)];
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    if (!SOFT.includes(g(x, y)!)) continue;
    const X = x * T, Y = y * T;
    for (let k = 0; k < 40; k++) { ctx.fillStyle = specks[(R() * specks.length) | 0]; const s = .8 + R() * 1.4; ctx.fillRect(X + R() * T, Y + R() * T, s, s); }
    ctx.lineWidth = 1; ctx.lineCap = "round";
    for (let k = 0; k < 14; k++) {
      const bx = X + R() * T, by = Y + R() * T, h = 2 + R() * 3.5;
      ctx.strokeStyle = blades[k % 2];
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (R() - .5) * 2.5, by - h); ctx.stroke();
    }
    if (R() < .18) for (let k = 0; k < 1 + ((R() * 3) | 0); k++) {
      ctx.fillStyle = R() < .6 ? "rgba(255,255,255,.75)" : "rgba(242,201,78,.8)";
      ctx.beginPath(); ctx.arc(X + R() * T, Y + R() * T, .9 + R() * .6, 0, 7); ctx.fill();
    }
  }
}

function paving(ctx: Ctx, m: MapDef, T: number, C: Colors, g: G) {
  const R = rng(2), base = C["map-pave"];
  ctx.save(); clipTo(ctx, m, T, g, ["p", "k"]);
  ctx.fillStyle = C["map-pave-line"]; ctx.fillRect(0, 0, m.cols * T, m.rows * T);
  const bh = T / 4, bw = T / 2;
  for (let r = 0; r * bh < m.rows * T; r++) {
    const off = (r % 2) * bw / 2;
    for (let bx = -off; bx < m.cols * T; bx += bw) {
      ctx.fillStyle = shade(base, (R() - .5) * .09);
      ctx.fillRect(bx + .6, r * bh + .6, bw - 1.2, bh - 1.2);
    }
  }
  ctx.restore();
}

/** Connected groups of tiles of one kind, as bounding boxes. */
function regions(m: MapDef, g: G, kind: TileKind): { x0: number; y0: number; x1: number; y1: number }[] {
  const seen = new Uint8Array(m.cols * m.rows), out = [];
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    if (seen[y * m.cols + x] || g(x, y) !== kind) continue;
    const box = { x0: x, y0: y, x1: x, y1: y }, q: [number, number][] = [[x, y]];
    seen[y * m.cols + x] = 1;
    while (q.length) {
      const [cx, cy] = q.pop()!;
      box.x0 = Math.min(box.x0, cx); box.x1 = Math.max(box.x1, cx); box.y0 = Math.min(box.y0, cy); box.y1 = Math.max(box.y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx >= 0 && ny >= 0 && nx < m.cols && ny < m.rows && !seen[ny * m.cols + nx] && g(nx, ny) === kind) { seen[ny * m.cols + nx] = 1; q.push([nx, ny]); }
      }
    }
    out.push(box);
  }
  return out;
}

function court(ctx: Ctx, m: MapDef, T: number, C: Colors, g: G) {
  const R = rng(3), base = C["map-concrete"];
  ctx.save(); clipTo(ctx, m, T, g, ["c"]);
  ctx.fillStyle = base; ctx.fillRect(0, 0, m.cols * T, m.rows * T);
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    if (g(x, y) !== "c") continue;
    if (R() < .2) {
      const cx = (x + R()) * T, cy = (y + R()) * T, rad = (.5 + R() * 1.5) * T, c = R() < .6 ? shade(base, -.12) : shade(base, .1);
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      gr.addColorStop(0, withAlpha(c, .35)); gr.addColorStop(1, withAlpha(c, 0));
      ctx.fillStyle = gr; ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    for (let k = 0; k < 60; k++) { ctx.fillStyle = R() < .5 ? withAlpha(shade(base, -.3), .35) : withAlpha(shade(base, .3), .35); ctx.fillRect((x + R()) * T, (y + R()) * T, 1, 1); }
  }
  ctx.strokeStyle = shade(base, -.16); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= m.cols; x += 2) { ctx.moveTo(x * T + .5, 0); ctx.lineTo(x * T + .5, m.rows * T); }
  for (let y = 0; y <= m.rows; y += 2) { ctx.moveTo(0, y * T + .5); ctx.lineTo(m.cols * T, y * T + .5); }
  ctx.stroke();
  // Painted markings inside each sufficiently large court area.
  ctx.strokeStyle = C["map-court"]; ctx.lineWidth = 2.5; ctx.globalAlpha = .85;
  for (const r of regions(m, g, "c")) {
    if (r.x1 - r.x0 < 5 || r.y1 - r.y0 < 3) continue;
    ctx.strokeRect((r.x0 + 1) * T, (r.y0 + 1) * T, (r.x1 - r.x0 - 1) * T, (r.y1 - r.y0 - 1) * T);
    const mx = Math.round((r.x0 + r.x1 + 1) / 2) * T;
    ctx.beginPath(); ctx.moveTo(mx, (r.y0 + 1) * T); ctx.lineTo(mx, r.y1 * T); ctx.stroke();
  }
  ctx.restore();
}

/** Shaded paving: same blocks, darkened (e.g. a building's shadow). */
function shaded(ctx: Ctx, m: MapDef, T: number, g: G) {
  ctx.fillStyle = "rgba(20,30,40,.28)";
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) if (g(x, y) === "k") ctx.fillRect(x * T, y * T, T, T);
}

function water(ctx: Ctx, m: MapDef, T: number, g: G) {
  const R = rng(9);
  ctx.save(); clipTo(ctx, m, T, g, ["a"]);
  const gr = ctx.createLinearGradient(0, 0, 0, m.rows * T);
  gr.addColorStop(0, "#3F8FB0"); gr.addColorStop(1, "#2C6E8E");
  ctx.fillStyle = gr; ctx.fillRect(0, 0, m.cols * T, m.rows * T);
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    if (g(x, y) !== "a") continue;
    for (let k = 0; k < 3; k++) { const cx = (x + R()) * T, cy = (y + R()) * T, w = T * (.15 + R() * .2); ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.quadraticCurveTo(cx, cy - T * .06, cx + w, cy); ctx.stroke(); }
  }
  ctx.restore();
  // Stone rim where water meets land.
  edges(m, g, (k) => k === "a", (k) => k !== "a" && k !== null, (x, y, w, h) => { ctx.fillStyle = "#9C9586"; ctx.fillRect(x, y, w, h); }, T, Math.max(2, T * .09));
}

/** Calls paint() for every edge strip of `inner` tiles that borders an `outer` tile. */
function edges(m: MapDef, g: G, inner: (k: TileKind | null) => boolean, outer: (k: TileKind | null) => boolean, paint: (x: number, y: number, w: number, h: number) => void, T: number, cw: number) {
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    if (!inner(g(x, y))) continue;
    const X = x * T, Y = y * T;
    if (outer(g(x, y - 1))) paint(X, Y, T, cw);
    if (outer(g(x, y + 1))) paint(X, Y + T - cw, T, cw);
    if (outer(g(x - 1, y))) paint(X, Y, cw, T);
    if (outer(g(x + 1, y))) paint(X + T - cw, Y, cw, T);
  }
}

function curbs(ctx: Ctx, m: MapDef, T: number, C: Colors, g: G) {
  const cw = Math.max(2, T * .07);
  ctx.fillStyle = C["map-curb"];
  edges(m, g, (k) => HARD.includes(k!), (k) => SOFT.includes(k!), (x, y, w, h) => ctx.fillRect(x, y, w, h), T, cw);
}

/** Garden beds: mown lawn with a trimmed hedge along the edge and flower clumps. */
function garden(ctx: Ctx, m: MapDef, T: number, C: Colors, g: G) {
  const R = rng(5), tree = C["map-tree"];
  ctx.save(); clipTo(ctx, m, T, g, ["h"]);
  ctx.fillStyle = shade(C["map-grass"], .06); ctx.fillRect(0, 0, m.cols * T, m.rows * T);
  for (let i = 0; i < m.cols * 2.4; i++) { ctx.fillStyle = i % 2 ? withAlpha("#fff", .06) : withAlpha("#000", .05); ctx.fillRect(i * T * .42, 0, T * .42, m.rows * T); }
  ctx.restore();
  const pts: [number, number][] = [];
  edges(m, g, (k) => k === "h", (k) => k !== "h", (x, y, w, h) => {
    const n = Math.round(Math.max(w, h) / (T * .22));
    for (let i = 0; i <= n; i++) pts.push(w > h ? [x + (w * i) / n, y + h / 2] : [x + w / 2, y + (h * i) / n]);
  }, T, T * .2);
  for (const [x, y] of pts) { const r = T * (.15 + R() * .06); ctx.fillStyle = withAlpha("#000", .18); ctx.beginPath(); ctx.arc(x + r * .35, y + r * .45, r, 0, 7); ctx.fill(); }
  for (const [x, y] of pts) {
    const r = T * (.15 + R() * .06), gr = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    gr.addColorStop(0, shade(tree, .28)); gr.addColorStop(.7, tree); gr.addColorStop(1, shade(tree, -.25));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  const flowers = ["#E7647A", "#F2C14E", "#F5F1E8", "#C94F7C"];
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    if (g(x, y) !== "h" || R() < .45) continue;
    const cx = (x + .25 + R() * .5) * T, cy = (y + .25 + R() * .5) * T, col = flowers[(R() * 4) | 0];
    ctx.fillStyle = shade(tree, -.1); ctx.beginPath(); ctx.arc(cx, cy, T * .17, 0, 7); ctx.fill();
    for (let k = 0; k < 7; k++) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + (R() - .5) * T * .3, cy + (R() - .5) * T * .3, T * .045, 0, 7); ctx.fill(); }
  }
}

function ramp(ctx: Ctx, m: MapDef, o: MapObject, T: number, C: Colors) {
  const X = o.x * T, Y = o.y * T + T * .12, W = T, H = T * .76, base = C["map-concrete"];
  const left = objectAt(m, o.x - 1, o.y)?.kind === "ramp", right = objectAt(m, o.x + 1, o.y)?.kind === "ramp";
  ctx.fillStyle = withAlpha("#000", .15); ctx.fillRect(X + 2, Y + 3, W, H);
  ctx.fillStyle = shade(base, .04); ctx.fillRect(X, Y, W, H);
  ctx.strokeStyle = withAlpha(shade(base, -.35), .5); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = X + T * .15; x < X + W; x += T * .15) { ctx.moveTo(x, Y + 3); ctx.lineTo(x, Y + H - 3); }
  ctx.stroke();
  ctx.strokeStyle = "#8E989D"; ctx.lineWidth = Math.max(2, T * .06);
  ctx.beginPath(); ctx.moveTo(X, Y + H); ctx.lineTo(X + W, Y + H); ctx.stroke();
  ctx.fillStyle = "#6F787D"; ctx.fillRect(X + T * .5 - 2, Y + H - 2, 4, 4);
  ctx.strokeStyle = C["map-roof-edge"]; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(X, Y + .5); ctx.lineTo(X + W, Y + .5);
  if (!left) { ctx.moveTo(X + .5, Y); ctx.lineTo(X + .5, Y + H); }
  if (!right) { ctx.moveTo(X + W - .5, Y); ctx.lineTo(X + W - .5, Y + H); }
  ctx.stroke();
}

function groundShadows(ctx: Ctx, m: MapDef, T: number, C: Colors) {
  ctx.save();
  ctx.filter = `blur(${Math.max(1, T * .06)}px)`;
  ctx.fillStyle = C["map-shadow"]; ctx.strokeStyle = C["map-shadow"];
  for (const o of m.objects) {
    const x = o.x * T, y = o.y * T;
    if (o.kind === "tree") { ctx.beginPath(); ctx.ellipse(x + T * .85, y + T * .8, T * .82, T * .6, -.35, 0, 7); ctx.fill(); }
    else if (o.kind === "flag") { ctx.lineWidth = Math.max(2, T * .06); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + T / 2, y + T / 2); ctx.lineTo(x + T / 2 + 1.5 * T, y + T / 2 + T); ctx.stroke(); }
    else if (o.kind === "tank") { ctx.beginPath(); ctx.ellipse(x + T * .8, y + T * .85, T * .5, T * .32, -.35, 0, 7); ctx.fill(); }
    else if (o.kind === "pot") { ctx.beginPath(); ctx.ellipse(x + T * .7, y + T * .8, T * .38, T * .22, -.35, 0, 7); ctx.fill(); }
    else if (o.kind === "sign") { ctx.beginPath(); ctx.ellipse(x + T * .75, y + T * .8, T * .4, T * .14, -.35, 0, 7); ctx.fill(); }
  }
  ctx.restore();
  const base = C["map-concrete"];
  for (const o of m.objects.filter((q) => q.kind === "flag")) {
    const cx = (o.x + .5) * T, cy = (o.y + .5) * T;
    [[.86, -.12], [.62, .02], [.38, .14]].forEach(([s, a]) => {
      ctx.fillStyle = shade(base, a); ctx.fillRect(cx - s * T / 2, cy - s * T / 2, s * T, s * T);
      ctx.strokeStyle = shade(base, -.3); ctx.lineWidth = 1; ctx.strokeRect(cx - s * T / 2 + .5, cy - s * T / 2 + .5, s * T - 1, s * T - 1);
    });
  }
}

function rect(b: MapBuilding, T: number) {
  return { X: b.x0 * T + 2, Y: b.y0 * T + 2, w: (b.x1 - b.x0 + 1) * T - 4, h: (b.y1 - b.y0 + 1) * T - 4 };
}

function drains(ctx: Ctx, b: MapBuilding, T: number, C: Colors, g: G) {
  const dh = Math.max(3, T * .13), Y = (b.y1 + 1) * T;
  for (let x = b.x0; x <= b.x1; x++) {
    if (!HARD.includes(g(x, b.y1 + 1)!)) continue;
    ctx.fillStyle = shade(C["map-concrete"], -.38); ctx.fillRect(x * T, Y, T, dh);
    ctx.fillStyle = withAlpha(shade(C["map-concrete"], .2), .6);
    for (let gx = x * T + 2; gx < (x + 1) * T; gx += 3) ctx.fillRect(gx, Y + 1, 1, dh - 2);
  }
}

function castShadow(ctx: Ctx, b: MapBuilding, T: number, C: Colors) {
  const { X, Y, w, h } = rect(b, T), sx = T * .32, sy = T * .4;
  ctx.save();
  ctx.filter = `blur(${Math.max(1, T * .05)}px)`;
  ctx.fillStyle = C["map-shadow"];
  ctx.beginPath(); ctx.moveTo(X + w, Y); ctx.lineTo(X + w + sx, Y + sy); ctx.lineTo(X + w + sx, Y + h + sy); ctx.lineTo(X + sx, Y + h + sy); ctx.lineTo(X, Y + h); ctx.lineTo(X + w, Y + h); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function poly(ctx: Ctx, pts: number[][]) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

function building(ctx: Ctx, b: MapBuilding, T: number, C: Colors) {
  const { X, Y, w, h } = rect(b, T);
  const fh = Math.min(T * .8, h * .32), rh = h - fh;
  const wx = X + T * .06, ww = w - T * .12, wy = Y + rh - 2, wall = C["map-wall"];
  ctx.fillStyle = wall; ctx.fillRect(wx, wy, ww, fh + 2);
  const wg = ctx.createLinearGradient(0, wy, 0, wy + fh * .45);
  wg.addColorStop(0, withAlpha("#000", .28)); wg.addColorStop(1, withAlpha("#000", 0));
  ctx.fillStyle = wg; ctx.fillRect(wx, wy, ww, fh * .45);
  ctx.fillStyle = shade(wall, -.25); ctx.fillRect(wx, wy + fh - fh * .14 + 2, ww, fh * .14);
  const n = Math.max(1, Math.floor(ww / (T * .85))), step = ww / n, door = n >= 3 ? Math.floor(n / 2) : -1;
  for (let i = 0; i < n; i++) {
    const cx = wx + step * (i + .5);
    if (i === door) {
      const dw = Math.min(step * .7, T * .55), dh = fh * .78;
      ctx.fillStyle = shade(wall, -.55); ctx.fillRect(cx - dw / 2, wy + fh + 2 - dh, dw, dh);
      ctx.fillStyle = "#6B5240"; ctx.fillRect(cx - dw / 2 + 1.5, wy + fh + 2 - dh + 1.5, dw / 2 - 2, dh - 1.5); ctx.fillRect(cx + .5, wy + fh + 2 - dh + 1.5, dw / 2 - 2, dh - 1.5);
      continue;
    }
    const gw = Math.min(step * .6, T * .48), gh = fh * .42, gy = wy + fh * .3, glass = C["map-window"];
    ctx.fillStyle = shade(wall, -.4); ctx.fillRect(cx - gw / 2 - 1.5, gy - 1.5, gw + 3, gh + 3);
    const gg = ctx.createLinearGradient(cx - gw / 2, gy, cx + gw / 2, gy + gh);
    gg.addColorStop(0, shade(glass, .25)); gg.addColorStop(.5, glass); gg.addColorStop(1, shade(glass, -.2));
    ctx.fillStyle = gg; ctx.fillRect(cx - gw / 2, gy, gw, gh);
    ctx.fillStyle = shade(wall, -.4); ctx.fillRect(cx - .75, gy, 1.5, gh);
  }
  const roof = C["map-roof"], a = Math.min(w, rh) / 2;
  const N = [[X, Y], [X + w, Y], [X + w - a, Y + a], [X + a, Y + a]];
  const S = [[X, Y + rh], [X + w, Y + rh], [X + w - a, Y + rh - a], [X + a, Y + rh - a]];
  const Wf = [[X, Y], [X + a, Y + a], [X + a, Y + rh - a], [X, Y + rh]];
  const E = [[X + w, Y], [X + w - a, Y + a], [X + w - a, Y + rh - a], [X + w, Y + rh]];
  const ribs = Math.max(4, T * .17);
  const face = (pts: number[][], amt: number, vertical: boolean) => {
    const c = shade(roof, amt);
    poly(ctx, pts); ctx.fillStyle = c; ctx.fill();
    ctx.save(); poly(ctx, pts); ctx.clip();
    ctx.lineWidth = 1; ctx.beginPath();
    if (vertical) for (let x = X + ribs / 2; x < X + w; x += ribs) { ctx.moveTo(x, Y); ctx.lineTo(x, Y + rh); }
    else for (let y = Y + ribs / 2; y < Y + rh; y += ribs) { ctx.moveTo(X, y); ctx.lineTo(X + w, y); }
    ctx.strokeStyle = shade(c, -.14); ctx.stroke();
    ctx.translate(1, 1); ctx.strokeStyle = withAlpha(shade(c, .3), .35); ctx.stroke();
    ctx.restore();
  };
  face(N, .1, true); face(S, -.12, true); face(Wf, .18, false); face(E, -.2, false);
  ctx.strokeStyle = shade(roof, .3); ctx.lineWidth = Math.max(1.5, T * .05); ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(X + a, Y + a); ctx.lineTo(X + w - a, Y + rh - a);
  ctx.moveTo(X, Y); ctx.lineTo(X + a, Y + a); ctx.moveTo(X + w, Y); ctx.lineTo(X + w - a, Y + a);
  ctx.moveTo(X, Y + rh); ctx.lineTo(X + a, Y + rh - a); ctx.moveTo(X + w, Y + rh); ctx.lineTo(X + w - a, Y + rh - a);
  ctx.stroke();
  ctx.strokeStyle = C["map-roof-edge"]; ctx.lineWidth = 2; ctx.strokeRect(X, Y, w, rh);
  ctx.save();
  ctx.fillStyle = C["map-label"]; ctx.font = `700 ${Math.max(10, T * .36)}px "Chakra Petch",sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
  const cx = X + w / 2, cy = Y + rh / 2, words = b.name.split(" ");
  if (ctx.measureText(b.name).width < w - 8) ctx.fillText(b.name, cx, cy);
  else { const mid = Math.ceil(words.length / 2); ctx.fillText(words.slice(0, mid).join(" "), cx, cy - T * .22); ctx.fillText(words.slice(mid).join(" "), cx, cy + T * .22); }
  ctx.restore();
}

/** Fence along the map edge; paths that reach the edge become gates with pillars. */
function fence(ctx: Ctx, m: MapDef, T: number, C: Colors, g: G) {
  const metal = shade(C["map-roof-edge"], -.1);
  type Side = { cells: number; at: (i: number) => [number, number]; line: (i: number) => [number, number, number, number] };
  const inset = T * .14;
  const sides: Side[] = [
    { cells: m.cols, at: (i) => [i, m.rows - 1], line: (i) => [i * T, m.rows * T - inset, (i + 1) * T, m.rows * T - inset] },
    { cells: m.cols, at: (i) => [i, 0], line: (i) => [i * T, inset, (i + 1) * T, inset] },
    { cells: m.rows, at: (i) => [0, i], line: (i) => [inset, i * T, inset, (i + 1) * T] },
    { cells: m.rows, at: (i) => [m.cols - 1, i], line: (i) => [m.cols * T - inset, i * T, m.cols * T - inset, (i + 1) * T] },
  ];
  const fenced = (x: number, y: number) => { const k = g(x, y); return k !== null && SOFT.includes(k); };
  for (const s of sides) {
    for (let i = 0; i < s.cells; i++) {
      const [x, y] = s.at(i);
      if (!fenced(x, y)) continue;
      const [x0, y0, x1, y1] = s.line(i);
      ctx.strokeStyle = withAlpha("#000", .2); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0 + 2, y0 + 3); ctx.lineTo(x1 + 2, y1 + 3); ctx.stroke();
      ctx.strokeStyle = metal; ctx.lineWidth = Math.max(2, T * .06);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.fillStyle = shade(metal, -.2);
      ctx.fillRect(x0 - 2, y0 - 2.5, 4, 5); ctx.fillRect((x0 + x1) / 2 - 2, (y0 + y1) / 2 - 2.5, 4, 5);
      // Gate pillar where the fence meets a path.
      const prev = i > 0 ? s.at(i - 1) : null, next = i < s.cells - 1 ? s.at(i + 1) : null;
      for (const [nb, px, py] of [[prev, x0, y0], [next, x1, y1]] as const) {
        if (!nb || !HARD.includes(g(nb[0], nb[1])!)) continue;
        const sz = T * .4;
        ctx.fillStyle = withAlpha("#000", .25); ctx.fillRect(px - sz / 2 + 3, py - sz / 2 + 3, sz, sz);
        ctx.fillStyle = C.accent; ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
        ctx.fillStyle = shade(C.accent, .25); ctx.fillRect(px - sz / 2 + 2, py - sz / 2 + 2, sz - 4, sz * .3);
      }
    }
  }
}

/* ---------- Tall objects (drawn every frame, depth-sorted) ---------- */

const treeCache = new Map<string, HTMLCanvasElement>();
const TREE_W = 2.2, TREE_H = 2.5;

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
  const tg = ctx.createLinearGradient(cx - T * .08, 0, cx + T * .08, 0);
  tg.addColorStop(0, "#7A5A3C"); tg.addColorStop(1, "#4E3824");
  ctx.fillStyle = tg; ctx.fillRect(cx - T * .07, cy, T * .14, base - cy);
  ctx.fillStyle = shade(leaf, -.32); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();
  const blobs: [number, number, number][] = [];
  const n = 7 + variant;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * .5, d = rad * (.42 + R() * .18);
    blobs.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * .9, rad * (.42 + R() * .14)]);
  }
  blobs.push([cx - rad * .1, cy - rad * .12, rad * .55]);
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
  treeCache.set(key, cv);
  return cv;
}

function flag(ctx: Ctx, T: number, bx: number, by: number, now: number) {
  const top = by - T * 1.9, pw = Math.max(2, T * .06);
  const pg = ctx.createLinearGradient(bx - pw, 0, bx + pw, 0);
  pg.addColorStop(0, "#E6EAEC"); pg.addColorStop(.5, "#B9C1C6"); pg.addColorStop(1, "#7E878D");
  ctx.fillStyle = pg; ctx.fillRect(bx - pw / 2, top, pw, by - top);
  ctx.fillStyle = "#D9B44A"; ctx.beginPath(); ctx.arc(bx, top - 2, Math.max(2.5, T * .07), 0, 7); ctx.fill();
  const L = T * .8, Hh = T * .26, segs = 12, fy = top + T * .06;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const w0 = Math.sin(now / 240 - t0 * 5) * T * .07 * t0, w1 = Math.sin(now / 240 - t1 * 5) * T * .07 * t1;
    const x0 = bx + pw / 2 + L * t0, x1 = bx + pw / 2 + L * t1, light = Math.cos(now / 240 - t0 * 5) * .12;
    for (const [c, off] of [["#D7262E", 0], ["#F5F5F2", Hh]] as const) {
      ctx.fillStyle = shade(c, light);
      ctx.beginPath(); ctx.moveTo(x0, fy + off + w0); ctx.lineTo(x1 + .5, fy + off + w1); ctx.lineTo(x1 + .5, fy + off + Hh + w1); ctx.lineTo(x0, fy + off + Hh + w0); ctx.closePath(); ctx.fill();
    }
  }
}

function tank(ctx: Ctx, T: number, cx: number, cy: number) {
  const bottom = cy + T * .3, top = bottom - T * .95, rw = T * .4, ry = T * .13, blue = "#2F6F8F";
  const g = ctx.createLinearGradient(cx - rw, 0, cx + rw, 0);
  g.addColorStop(0, shade(blue, -.3)); g.addColorStop(.32, shade(blue, .22)); g.addColorStop(.6, blue); g.addColorStop(1, shade(blue, -.4));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - rw, top); ctx.lineTo(cx - rw, bottom); ctx.ellipse(cx, bottom, rw, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rw, top); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = shade(blue, -.35); ctx.lineWidth = 1.5;
  for (const f of [.3, .55, .8]) { ctx.beginPath(); ctx.ellipse(cx, top + (bottom - top) * f, rw, ry, 0, 0, Math.PI); ctx.stroke(); }
  ctx.fillStyle = shade(blue, .15); ctx.beginPath(); ctx.ellipse(cx, top, rw, ry, 0, 0, 7); ctx.fill();
  ctx.fillStyle = shade(blue, -.2); ctx.beginPath(); ctx.ellipse(cx, top - 1, rw * .42, ry * .45, 0, 0, 7); ctx.fill();
}

function pot(ctx: Ctx, T: number, cx: number, cy: number, C: Colors) {
  const bottom = cy + T * .25, h = T * .42, tw = T * .34, bw = T * .2, top = bottom - h, clay = "#B8643E";
  const g = ctx.createLinearGradient(cx - tw, 0, cx + tw, 0);
  g.addColorStop(0, shade(clay, -.25)); g.addColorStop(.35, shade(clay, .2)); g.addColorStop(1, shade(clay, -.35));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - tw, top); ctx.lineTo(cx - bw, bottom); ctx.lineTo(cx + bw, bottom); ctx.lineTo(cx + tw, top); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(clay, -.1); ctx.beginPath(); ctx.ellipse(cx, top, tw + 1.5, T * .09, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#4A3424"; ctx.beginPath(); ctx.ellipse(cx, top, tw - 2, T * .065, 0, 0, 7); ctx.fill();
  const leaf = shade(C["map-tree"], .1);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * .42;
    ctx.save(); ctx.translate(cx, top); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = shade(leaf, (i % 2) * .15); ctx.beginPath(); ctx.ellipse(0, -T * .2, T * .06, T * .2, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
}

/** Wooden signboard on two posts. */
function sign(ctx: Ctx, T: number, cx: number, cy: number) {
  const wood = "#8A6440", w = T * .78, h = T * .42, top = cy - T * .75;
  ctx.fillStyle = shade(wood, -.3);
  ctx.fillRect(cx - w * .32, top + h - 2, T * .07, T * .55); ctx.fillRect(cx + w * .32 - T * .07, top + h - 2, T * .07, T * .55);
  const g = ctx.createLinearGradient(0, top, 0, top + h);
  g.addColorStop(0, shade(wood, .15)); g.addColorStop(1, shade(wood, -.15));
  ctx.fillStyle = g; ctx.fillRect(cx - w / 2, top, w, h);
  ctx.strokeStyle = shade(wood, -.4); ctx.lineWidth = 1.5; ctx.strokeRect(cx - w / 2 + .75, top + .75, w - 1.5, h - 1.5);
  ctx.fillStyle = "#F2B705"; ctx.fillRect(cx - w * .3, top + h * .35, w * .6, h * .3);
}

export function objectProps(m: MapDef, T: number, DPR: number, C: Colors): Prop[] {
  const out: Prop[] = [];
  m.objects.forEach((o, i) => {
    const cx = (o.x + .5) * T, cy = (o.y + .5) * T, depth = o.y + .5;
    if (o.kind === "tree") out.push({ depth, draw: (ctx) => ctx.drawImage(treeSprite(T, DPR, C, i % 3), cx - T * TREE_W / 2, cy + T * .44 - T * TREE_H, T * TREE_W, T * TREE_H) });
    else if (o.kind === "flag") out.push({ depth, draw: (ctx, now) => flag(ctx, T, cx, cy, now) });
    else if (o.kind === "tank") out.push({ depth, draw: (ctx) => tank(ctx, T, cx, cy) });
    else if (o.kind === "pot") out.push({ depth, draw: (ctx) => pot(ctx, T, cx, cy, C) });
    else if (o.kind === "sign") out.push({ depth, draw: (ctx) => sign(ctx, T, cx, cy) });
  });
  return out;
}
