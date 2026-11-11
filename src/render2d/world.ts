import { BUILD, COLS, ROWS, tiles, TREES, type Building } from "../data/map";
import { shade, withAlpha } from "./color";

/*
 * Static ground layer: textured grass, paving, the concrete assembly court, curbs, drains,
 * buildings with metal roofs and facades, cast shadows, fence and the semicircle garden.
 * Rendered once per tile size / pixel ratio / theme into an offscreen canvas.
 * Light comes from the upper left, so shadows fall to the lower right.
 */

export type Ground = "grass" | "pave" | "court" | "garden" | "build";

/** Assembly court (lapangan upacara), drawn as concrete instead of paving blocks. */
const COURT = { x0: 8, y0: 8, x1: 27, y1: 16 };

export function groundAt(x: number, y: number): Ground | null {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
  const t = tiles[y][x];
  if (t === "b") return "build";
  if (t === "h") return "garden";
  if (t === "p" || t === "f") return x >= COURT.x0 && x <= COURT.x1 && y >= COURT.y0 && y <= COURT.y1 ? "court" : "pave";
  return "grass";
}

/** Deterministic PRNG (mulberry32) so the texture is identical on every render. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = CanvasRenderingContext2D;
type Colors = Record<string, string>;

const isHard = (g: Ground | null) => g === "pave" || g === "court";
const isSoft = (g: Ground | null) => g === "grass" || g === "garden";

export function renderWorld(T: number, DPR: number, C: Colors): HTMLCanvasElement {
  const mw = COLS * T, mh = ROWS * T;
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(mw * DPR); cv.height = Math.ceil(mh * DPR);
  const ctx = cv.getContext("2d")!;
  ctx.scale(DPR, DPR);

  grass(ctx, T, C, mw, mh);
  paving(ctx, T, C);
  court(ctx, T, C);
  curbs(ctx, T, C);
  garden(ctx, T, C);
  ramp(ctx, T, C);
  groundShadows(ctx, T, C);
  BUILD.forEach((b) => drains(ctx, T, C, b));
  BUILD.forEach((b) => castShadow(ctx, T, C, b));
  BUILD.forEach((b) => building(ctx, T, C, b));
  fence(ctx, T, C, mw, mh);
  return cv;
}

function tileClip(ctx: Ctx, T: number, kinds: Ground[]) {
  const p = new Path2D();
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (kinds.includes(groundAt(x, y)!)) p.rect(x * T, y * T, T, T);
  ctx.clip(p);
}

function grass(ctx: Ctx, T: number, C: Colors, mw: number, mh: number) {
  const base = C["map-grass"], R = rng(1);
  ctx.fillStyle = base; ctx.fillRect(0, 0, mw, mh);
  // Broad light/dark patches so the lawn doesn't look flat.
  for (let i = 0; i < 110; i++) {
    const x = R() * mw, y = R() * mh, rad = (1 + R() * 3.2) * T;
    const c = R() < .55 ? shade(base, -.14) : shade(C["map-grass-2"], .1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, withAlpha(c, .5)); g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill();
  }
  const specks = [shade(base, -.2), shade(base, -.1), shade(base, .1), shade(C["map-grass-2"], -.15)];
  const blades = [shade(base, -.25), shade(base, .14)];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const gr = groundAt(x, y);
    if (gr === "pave" || gr === "court" || gr === "build") continue;
    const X = x * T, Y = y * T;
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = specks[(R() * specks.length) | 0];
      const s = .8 + R() * 1.4;
      ctx.fillRect(X + R() * T, Y + R() * T, s, s);
    }
    ctx.lineWidth = 1; ctx.lineCap = "round";
    for (let k = 0; k < 14; k++) {
      const bx = X + R() * T, by = Y + R() * T, h = 2 + R() * 3.5;
      ctx.strokeStyle = blades[k % 2];
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + (R() - .5) * 2.5, by - h); ctx.stroke();
    }
    // A few small wild flowers / clover.
    if (R() < .18) {
      const n = 1 + ((R() * 3) | 0);
      for (let k = 0; k < n; k++) {
        ctx.fillStyle = R() < .6 ? "rgba(255,255,255,.75)" : "rgba(242,201,78,.8)";
        ctx.beginPath(); ctx.arc(X + R() * T, Y + R() * T, .9 + R() * .6, 0, 7); ctx.fill();
      }
    }
  }
}

/** Interlocking paving blocks in a running-bond pattern. */
function paving(ctx: Ctx, T: number, C: Colors) {
  const R = rng(2), base = C["map-pave"];
  ctx.save(); tileClip(ctx, T, ["pave"]);
  ctx.fillStyle = C["map-pave-line"]; ctx.fillRect(0, 0, COLS * T, ROWS * T);
  const bh = T / 4, bw = T / 2;
  for (let r = 0; r * bh < ROWS * T; r++) {
    const off = (r % 2) * bw / 2;
    for (let bx = -off; bx < COLS * T; bx += bw) {
      ctx.fillStyle = shade(base, (R() - .5) * .09);
      ctx.fillRect(bx + .6, r * bh + .6, bw - 1.2, bh - 1.2);
      if (R() < .25) { ctx.fillStyle = withAlpha(shade(base, -.3), .12); ctx.fillRect(bx + .6 + R() * bw * .5, r * bh + .6, bw * .4, bh - 1.2); }
    }
  }
  ctx.restore();
}

/** Concrete court with slab joints, weathering and painted line markings. */
function court(ctx: Ctx, T: number, C: Colors) {
  const R = rng(3), base = C["map-concrete"];
  ctx.save(); tileClip(ctx, T, ["court"]);
  const X0 = COURT.x0 * T, Y0 = COURT.y0 * T, W = (COURT.x1 - COURT.x0 + 1) * T, H = (COURT.y1 - COURT.y0 + 1) * T;
  ctx.fillStyle = base; ctx.fillRect(X0, Y0, W, H);
  for (let i = 0; i < 70; i++) {
    const x = X0 + R() * W, y = Y0 + R() * H, rad = (.5 + R() * 2) * T;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const c = R() < .6 ? shade(base, -.12) : shade(base, .1);
    g.addColorStop(0, withAlpha(c, .35)); g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < W * H / (T * T) * 60; i++) {
    ctx.fillStyle = R() < .5 ? withAlpha(shade(base, -.3), .35) : withAlpha(shade(base, .3), .35);
    ctx.fillRect(X0 + R() * W, Y0 + R() * H, 1, 1);
  }
  // Expansion joints every 2 tiles.
  ctx.strokeStyle = shade(base, -.16); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = X0; x <= X0 + W; x += 2 * T) { ctx.moveTo(x + .5, Y0); ctx.lineTo(x + .5, Y0 + H); }
  for (let y = Y0; y <= Y0 + H; y += 2 * T) { ctx.moveTo(X0, y + .5); ctx.lineTo(X0 + W, y + .5); }
  ctx.stroke();
  // Painted markings (same geometry as the original map).
  ctx.strokeStyle = C["map-court"]; ctx.lineWidth = 2.5; ctx.globalAlpha = .85;
  ctx.strokeRect(9 * T, 9 * T, 18 * T, 6 * T);
  ctx.beginPath(); ctx.moveTo(18 * T, 9 * T); ctx.lineTo(18 * T, 15 * T); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Raised concrete kerb wherever hard surface meets lawn, with a soft shadow on the grass. */
function curbs(ctx: Ctx, T: number, C: Colors) {
  const cw = Math.max(2, T * .07), sw = Math.max(2, T * .09);
  const sh = withAlpha("#000", .13);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!isHard(groundAt(x, y))) continue;
    const X = x * T, Y = y * T;
    const edges: [number, number, number, number, number, number, number, number][] = [
      // neighbour dx, dy, curb rect, shadow rect offset (relative)
      [0, -1, X, Y, T, cw, 0, -sw],
      [0, 1, X, Y + T - cw, T, cw, 0, cw],
      [-1, 0, X, Y, cw, T, -sw, 0],
      [1, 0, X + T - cw, Y, cw, T, cw, 0],
    ];
    for (const [dx, dy, cx, cy, w, h, ox, oy] of edges) {
      if (!isSoft(groundAt(x + dx, y + dy))) continue;
      ctx.fillStyle = sh;
      ctx.fillRect(cx + ox, cy + oy, dx ? sw : w, dy ? sw : h);
      ctx.fillStyle = C["map-curb"]; ctx.fillRect(cx, cy, w, h);
    }
  }
}

/** Semicircle garden (Pos 5): mown lawn, trimmed hedge border and flower clumps. */
function garden(ctx: Ctx, T: number, C: Colors) {
  const R = rng(5), tree = C["map-tree"];
  const shape = () => {
    ctx.beginPath(); ctx.moveTo(31 * T, 19.2 * T); ctx.lineTo(33.5 * T, 19.2 * T);
    ctx.arc(33.5 * T, 21.5 * T, 2.3 * T, -Math.PI / 2, Math.PI / 2); ctx.lineTo(31 * T, 23.8 * T); ctx.closePath();
  };
  // Soil edging
  shape(); ctx.strokeStyle = C["map-soil"]; ctx.lineWidth = T * .32; ctx.stroke();
  // Lawn with mowing stripes
  ctx.save(); shape(); ctx.clip();
  ctx.fillStyle = shade(C["map-grass"], .06); ctx.fillRect(31 * T, 19 * T, 5 * T, 5 * T);
  for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? withAlpha("#fff", .06) : withAlpha("#000", .05); ctx.fillRect(31 * T + i * T * .42, 19 * T, T * .42, 5 * T); }
  for (let k = 0; k < 500; k++) { ctx.fillStyle = withAlpha(shade(tree, R() < .5 ? -.2 : .2), .5); ctx.fillRect(31 * T + R() * 5 * T, 19 * T + R() * 5 * T, 1, 1.5); }
  ctx.restore();
  // Hedge: overlapping shaded bushes along the outline
  const pts: [number, number][] = [];
  for (let x = 31; x <= 33.5; x += .22) pts.push([x * T, 19.2 * T]);
  for (let a = -Math.PI / 2; a <= Math.PI / 2; a += .1) pts.push([33.5 * T + Math.cos(a) * 2.3 * T, 21.5 * T + Math.sin(a) * 2.3 * T]);
  for (let x = 33.5; x >= 31; x -= .22) pts.push([x * T, 23.8 * T]);
  for (let y = 23.8; y >= 19.2; y -= .22) pts.push([31 * T, y * T]);
  for (const [x, y] of pts) {
    const r = T * (.16 + R() * .06);
    ctx.fillStyle = withAlpha("#000", .18); ctx.beginPath(); ctx.arc(x + r * .35, y + r * .45, r, 0, 7); ctx.fill();
  }
  for (const [x, y] of pts) {
    const r = T * (.16 + R() * .06);
    const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
    g.addColorStop(0, shade(tree, .28)); g.addColorStop(.7, tree); g.addColorStop(1, shade(tree, -.25));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  // Flower clumps
  const flowers = ["#E7647A", "#F2C14E", "#F5F1E8", "#C94F7C"];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + R() * Math.PI, d = R() * 1.6 * T;
    const cx = (R() < .5 ? 32 * T + R() * 1.4 * T : 33.5 * T + Math.cos(a) * d), cy = (R() < .5 ? 20 * T + R() * 3 * T : 21.5 * T + Math.sin(a) * d);
    const col = flowers[i % flowers.length];
    ctx.fillStyle = shade(tree, -.1); ctx.beginPath(); ctx.arc(cx, cy, T * .17, 0, 7); ctx.fill();
    for (let k = 0; k < 7; k++) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + (R() - .5) * T * .3, cy + (R() - .5) * T * .3, T * .045, 0, 7); ctx.fill(); }
  }
}

/** Wheelchair ramp in front of Gedung Kelas A (row 7, x 8–10). */
function ramp(ctx: Ctx, T: number, C: Colors) {
  const X = 8 * T, Y = 7 * T + T * .12, W = 3 * T, H = T * .76, base = C["map-concrete"];
  const g = ctx.createLinearGradient(X, 0, X + W, 0);
  g.addColorStop(0, shade(base, .08)); g.addColorStop(1, shade(base, -.12));
  ctx.fillStyle = withAlpha("#000", .15); ctx.fillRect(X + 2, Y + 3, W, H);
  ctx.fillStyle = g; ctx.fillRect(X, Y, W, H);
  ctx.strokeStyle = withAlpha(shade(base, -.35), .5); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = X + T * .15; x < X + W; x += T * .15) { ctx.moveTo(x, Y + 3); ctx.lineTo(x, Y + H - 3); }
  ctx.stroke();
  // Handrail on the open side
  ctx.strokeStyle = "#8E989D"; ctx.lineWidth = Math.max(2, T * .06);
  ctx.beginPath(); ctx.moveTo(X, Y + H); ctx.lineTo(X + W, Y + H); ctx.stroke();
  ctx.fillStyle = "#6F787D";
  for (let x = X + T * .2; x < X + W; x += T * .7) ctx.fillRect(x - 2, Y + H - 2, 4, 4);
  ctx.strokeStyle = C["map-roof-edge"]; ctx.lineWidth = 1; ctx.strokeRect(X + .5, Y + .5, W - 1, H - 1);
}

/** Soft contact shadows for trees, the flag plinth, water tank and pot (tall props are drawn later). */
function groundShadows(ctx: Ctx, T: number, C: Colors) {
  ctx.save();
  ctx.filter = `blur(${Math.max(1, T * .06)}px)`;
  ctx.fillStyle = C["map-shadow"];
  TREES.forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x * T + T * .85, y * T + T * .8, T * .82, T * .6, -.35, 0, 7); ctx.fill(); });
  // Flag pole shadow
  ctx.strokeStyle = C["map-shadow"]; ctx.lineWidth = Math.max(2, T * .06); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(17.5 * T, 11.5 * T); ctx.lineTo(17.5 * T + 1.5 * T, 11.5 * T + 1.0 * T); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(2.5 * T + T * .3, 22.5 * T + T * .35, T * .5, T * .32, -.35, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11.5 * T + T * .2, 21.5 * T + T * .3, T * .38, T * .22, -.35, 0, 7); ctx.fill();
  ctx.restore();
  // Flag plinth: stepped concrete base
  const cx = 17.5 * T, cy = 11.5 * T, base = C["map-concrete"];
  [[.86, -.12], [.62, .02], [.38, .14]].forEach(([s, a]) => {
    ctx.fillStyle = shade(base, a); ctx.fillRect(cx - s * T / 2, cy - s * T / 2, s * T, s * T);
    ctx.strokeStyle = shade(base, -.3); ctx.lineWidth = 1; ctx.strokeRect(cx - s * T / 2 + .5, cy - s * T / 2 + .5, s * T - 1, s * T - 1);
  });
}

function rect(b: Building, T: number) {
  const [x0, y0, x1, y1] = b.r;
  return { X: x0 * T + 2, Y: y0 * T + 2, w: (x1 - x0 + 1) * T - 4, h: (y1 - y0 + 1) * T - 4 };
}

/** Covered drain channel along the front (south) wall where it meets paving. */
function drains(ctx: Ctx, T: number, C: Colors, b: Building) {
  const [x0, , x1, y1] = b.r;
  const dh = Math.max(3, T * .13), Y = (y1 + 1) * T;
  for (let x = x0; x <= x1; x++) {
    if (!isHard(groundAt(x, y1 + 1))) continue;
    ctx.fillStyle = shade(C["map-concrete"], -.38); ctx.fillRect(x * T, Y, T, dh);
    ctx.fillStyle = withAlpha(shade(C["map-concrete"], .2), .6);
    for (let gx = x * T + 2; gx < (x + 1) * T; gx += 3) ctx.fillRect(gx, Y + 1, 1, dh - 2);
  }
}

function castShadow(ctx: Ctx, T: number, C: Colors, b: Building) {
  if (b.n === "Gedung Kelas B") {
    // Pos 3 measures this shadow: keep it as the full paved strip in front of the building.
    ctx.fillStyle = "rgba(20,30,40,.28)"; ctx.fillRect(15 * T, 6 * T, 13 * T, T);
    return;
  }
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

/** Building in 3/4 top-down view: hipped metal roof plus the front wall with windows and a door. */
function building(ctx: Ctx, T: number, C: Colors, b: Building) {
  const { X, Y, w, h } = rect(b, T);
  const fh = Math.min(T * .8, h * .32);
  const rh = h - fh;

  // Front wall
  const wx = X + T * .06, ww = w - T * .12, wy = Y + rh - 2, wall = C["map-wall"];
  ctx.fillStyle = wall; ctx.fillRect(wx, wy, ww, fh + 2);
  const wg = ctx.createLinearGradient(0, wy, 0, wy + fh * .45);
  wg.addColorStop(0, withAlpha("#000", .28)); wg.addColorStop(1, withAlpha("#000", 0));
  ctx.fillStyle = wg; ctx.fillRect(wx, wy, ww, fh * .45);
  ctx.fillStyle = shade(wall, -.25); ctx.fillRect(wx, wy + fh - fh * .14 + 2, ww, fh * .14);
  const n = Math.max(1, Math.floor(ww / (T * .85)));
  const step = ww / n, door = n >= 3 ? Math.floor(n / 2) : -1;
  for (let i = 0; i < n; i++) {
    const cx = wx + step * (i + .5);
    if (i === door) {
      const dw = Math.min(step * .7, T * .55), dh = fh * .78;
      ctx.fillStyle = shade(wall, -.55); ctx.fillRect(cx - dw / 2, wy + fh + 2 - dh, dw, dh);
      ctx.fillStyle = "#6B5240"; ctx.fillRect(cx - dw / 2 + 1.5, wy + fh + 2 - dh + 1.5, dw / 2 - 2, dh - 1.5); ctx.fillRect(cx + .5, wy + fh + 2 - dh + 1.5, dw / 2 - 2, dh - 1.5);
      continue;
    }
    const gw = Math.min(step * .6, T * .48), gh = fh * .42, gy = wy + fh * .3;
    ctx.fillStyle = shade(wall, -.4); ctx.fillRect(cx - gw / 2 - 1.5, gy - 1.5, gw + 3, gh + 3);
    const glass = C["map-window"];
    const gg = ctx.createLinearGradient(cx - gw / 2, gy, cx + gw / 2, gy + gh);
    gg.addColorStop(0, shade(glass, .25)); gg.addColorStop(.5, glass); gg.addColorStop(1, shade(glass, -.2));
    ctx.fillStyle = gg; ctx.fillRect(cx - gw / 2, gy, gw, gh);
    ctx.fillStyle = shade(wall, -.4); ctx.fillRect(cx - .75, gy, 1.5, gh);
  }

  // Hipped roof
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
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (vertical) for (let x = X + ribs / 2; x < X + w; x += ribs) { ctx.moveTo(x, Y); ctx.lineTo(x, Y + rh); }
    else for (let y = Y + ribs / 2; y < Y + rh; y += ribs) { ctx.moveTo(X, y); ctx.lineTo(X + w, y); }
    ctx.strokeStyle = shade(c, -.14); ctx.stroke();
    ctx.translate(1, 1); ctx.strokeStyle = withAlpha(shade(c, .3), .35); ctx.stroke();
    ctx.restore();
  };
  face(N, .1, true); face(S, -.12, true); face(Wf, .18, false); face(E, -.2, false);
  // Ridge and hip caps
  ctx.strokeStyle = shade(roof, .3); ctx.lineWidth = Math.max(1.5, T * .05); ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(X + a, Y + a); ctx.lineTo(X + w - a, Y + rh - a);
  ctx.moveTo(X, Y); ctx.lineTo(X + a, Y + a); ctx.moveTo(X + w, Y); ctx.lineTo(X + w - a, Y + a);
  ctx.moveTo(X, Y + rh); ctx.lineTo(X + a, Y + rh - a); ctx.moveTo(X + w, Y + rh); ctx.lineTo(X + w - a, Y + rh - a);
  ctx.stroke();
  ctx.strokeStyle = C["map-roof-edge"]; ctx.lineWidth = 2; ctx.strokeRect(X, Y, w, rh);

  // Label
  ctx.save();
  ctx.fillStyle = C["map-label"]; ctx.font = `700 ${Math.max(10, T * .36)}px "Chakra Petch",sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
  const cx = X + w / 2, cy = Y + rh / 2, words = b.n.split(" ");
  if (ctx.measureText(b.n).width < w - 8) ctx.fillText(b.n, cx, cy);
  else { const mid = Math.ceil(words.length / 2); ctx.fillText(words.slice(0, mid).join(" "), cx, cy - T * .22); ctx.fillText(words.slice(mid).join(" "), cx, cy + T * .22); }
  ctx.restore();
}

/** Boundary fence along the south edge with the main gate between x 16 and 20. */
function fence(ctx: Ctx, T: number, C: Colors, mw: number, mh: number) {
  const y = mh - T * .14, metal = shade(C["map-roof-edge"], -.1);
  const run = (x0: number, x1: number) => {
    ctx.strokeStyle = withAlpha("#000", .2); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0 + 2, y + 3); ctx.lineTo(x1 + 2, y + 3); ctx.stroke();
    ctx.strokeStyle = metal; ctx.lineWidth = Math.max(2, T * .06);
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.fillStyle = shade(metal, -.2);
    for (let x = x0; x <= x1; x += T / 2) ctx.fillRect(x - 2, y - 2.5, 4, 5);
  };
  run(0, 15.6 * T); run(20.4 * T, mw);
  // Gate pillars
  for (const px of [15.6 * T, 20 * T]) {
    const s = T * .4;
    ctx.fillStyle = withAlpha("#000", .25); ctx.fillRect(px + 3, mh - s + 3, s, s - 3);
    ctx.fillStyle = C.accent; ctx.fillRect(px, mh - s, s, s);
    ctx.fillStyle = shade(C.accent, .25); ctx.fillRect(px + 2, mh - s + 2, s - 4, s * .3);
  }
  // Open sliding gate tucked beside the right pillar
  ctx.strokeStyle = metal; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(20.4 * T, mh - T * .3); ctx.lineTo(22.5 * T, mh - T * .3); ctx.stroke();
  for (let x = 20.4 * T; x <= 22.5 * T; x += T * .18) { ctx.beginPath(); ctx.moveTo(x, mh - T * .36); ctx.lineTo(x, mh - T * .24); ctx.stroke(); }
}
