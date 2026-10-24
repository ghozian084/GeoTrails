import { BUILD, COLS, ROWS, tiles, TREES } from "../data/map";
import { gateDone } from "../logic/score";
import type { GroupState, Post } from "../types";
import type { Cam } from "./camera";
import type { Pt } from "./bfs";

const COLOR_KEYS = ["map-grass", "map-grass-2", "map-pave", "map-pave-line", "map-roof", "map-roof-edge", "map-label", "map-tree", "map-court", "map-shadow", "accent", "tape", "good", "warn", "lock", "ink", "surface"];

/** Map palette, read from CSS custom properties so it follows light/dark mode. */
export const C: Record<string, string> = {};
export function readColors(): void {
  const cs = getComputedStyle(document.documentElement);
  COLOR_KEYS.forEach((k) => (C[k] = cs.getPropertyValue("--" + k).trim()));
}

export interface Avatar { x: number; y: number; px: number; py: number }

export interface Frame {
  ctx: CanvasRenderingContext2D;
  W: number; H: number; T: number; DPR: number;
  cam: Cam;
  av: Avatar;
  path: Pt[];
  posts: Post[];
  S: GroupState | null;
  now: number;
}

export function draw(f: Frame): void {
  const { ctx, W, H, T, DPR, cam, av, path, posts, S, now } = f;
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  };
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
  const mw = COLS * T, mh = ROWS * T;
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  // tanah
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const t = tiles[y][x]; const X = x * T, Y = y * T;
    if (t === "p") { ctx.fillStyle = C["map-pave"]; ctx.fillRect(X, Y, T, T); ctx.strokeStyle = C["map-pave-line"]; ctx.lineWidth = 1; ctx.strokeRect(X + .5, Y + .5, T - 1, T - 1); }
    else { ctx.fillStyle = (x + y) % 2 ? C["map-grass"] : C["map-grass-2"]; ctx.fillRect(X, Y, T, T); }
  }
  // garis lapangan upacara
  ctx.strokeStyle = C["map-court"]; ctx.lineWidth = 2; ctx.strokeRect(9 * T, 9 * T, 18 * T, 6 * T); ctx.beginPath(); ctx.moveTo(18 * T, 9 * T); ctx.lineTo(18 * T, 15 * T); ctx.stroke();
  // pagar tepi
  ctx.strokeStyle = C["map-roof-edge"]; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(0, mh - 1.5); ctx.lineTo(16 * T, mh - 1.5); ctx.moveTo(20 * T, mh - 1.5); ctx.lineTo(mw, mh - 1.5); ctx.stroke(); ctx.setLineDash([]);
  // gerbang
  ctx.fillStyle = C.accent; ctx.fillRect(15.6 * T, mh - T * .28, T * .4, T * .28); ctx.fillRect(20 * T, mh - T * .28, T * .4, T * .28);
  // taman setengah lingkaran
  ctx.fillStyle = C["map-tree"]; ctx.globalAlpha = .75; ctx.beginPath(); ctx.moveTo(31 * T, 19.2 * T); ctx.lineTo(33.5 * T, 19.2 * T); ctx.arc(33.5 * T, 21.5 * T, 2.3 * T, -Math.PI / 2, Math.PI / 2); ctx.lineTo(31 * T, 23.8 * T); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  // bangunan
  BUILD.forEach((b) => {
    const [x0, y0, x1, y1] = b.r; const X = x0 * T + 3, Y = y0 * T + 3, w = (x1 - x0 + 1) * T - 6, h = (y1 - y0 + 1) * T - 6;
    ctx.fillStyle = C["map-shadow"]; rr(X + 4, Y + 6, w, h, 6); ctx.fill();
    ctx.fillStyle = C["map-roof"]; rr(X, Y, w, h, 6); ctx.fill(); ctx.strokeStyle = C["map-roof-edge"]; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C["map-label"]; ctx.font = `700 ${Math.max(10, T * .36)}px "Chakra Petch",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const words = b.n.split(" "); const fits = ctx.measureText(b.n).width < w - 8;
    if (fits) ctx.fillText(b.n, X + w / 2, Y + h / 2);
    else { const mid = Math.ceil(words.length / 2); ctx.fillText(words.slice(0, mid).join(" "), X + w / 2, Y + h / 2 - T * .22); ctx.fillText(words.slice(mid).join(" "), X + w / 2, Y + h / 2 + T * .22); }
  });
  // pohon
  TREES.forEach(([x, y]) => { ctx.fillStyle = C["map-shadow"]; ctx.beginPath(); ctx.arc(x * T + T / 2 + 3, y * T + T / 2 + 4, T * .42, 0, 7); ctx.fill(); ctx.fillStyle = C["map-tree"]; ctx.beginPath(); ctx.arc(x * T + T / 2, y * T + T / 2, T * .42, 0, 7); ctx.fill(); });
  // objek pos
  const cx = (x: number) => x * T + T / 2;
  // tiang
  ctx.fillStyle = "#A9B1B6"; ctx.beginPath(); ctx.arc(cx(17), cx(11), T * .18, 0, 7); ctx.fill(); ctx.fillStyle = "#D7262E"; ctx.fillRect(cx(17), cx(11) - T * .38, T * .36, T * .16); ctx.fillStyle = "#fff"; ctx.fillRect(cx(17), cx(11) - T * .22, T * .36, T * .16); ctx.strokeStyle = "#6C757B"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx(17), cx(11)); ctx.lineTo(cx(17), cx(11) - T * .42); ctx.stroke();
  // tandon
  ctx.fillStyle = "#2F6F8F"; ctx.beginPath(); ctx.arc(cx(2), cx(22), T * .4, 0, 7); ctx.fill(); ctx.strokeStyle = "#9ECBE0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx(2), cx(22), T * .2, 0, 7); ctx.stroke();
  // pot
  ctx.fillStyle = "#B8643E"; ctx.beginPath(); ctx.arc(cx(11), cx(21), T * .34, 0, 7); ctx.fill(); ctx.fillStyle = "#4F8E45"; ctx.beginPath(); ctx.arc(cx(11), cx(21), T * .18, 0, 7); ctx.fill();
  // ramp
  ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(8 * T, 7 * T, 3 * T, T); ctx.strokeStyle = C["map-roof-edge"]; ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(8 * T + i * T / 2, 8 * T); ctx.lineTo(8 * T + i * T / 2 + T / 2, 7 * T); ctx.stroke(); }
  // bayangan gedung B
  ctx.fillStyle = "rgba(20,30,40,.28)"; ctx.fillRect(15 * T, 6 * T, 13 * T, T);
  // jalur
  if (path.length) { ctx.fillStyle = C.accent; path.forEach(([x, y], i) => { ctx.globalAlpha = .35 + .65 * (1 - i / path.length); ctx.beginPath(); ctx.arc(cx(x), cx(y), T * .08, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1; }
  // penanda pos
  const pulse = (Math.sin(now / 320) + 1) / 2;
  posts.forEach((p, i) => {
    const st = S ? S.posts[i] : null; const locked = !S || (i > 0 && !gateDone(S.posts));
    const mx = cx(p.tile[0]), my = cx(p.tile[1]) - T * .62, R = T * .34;
    const col = st && st.result === "green" ? C.good : st && st.result === "orange" ? C.warn : locked ? C.lock : C.accent;
    if (!locked && !(st && st.result)) { ctx.strokeStyle = C.tape; ctx.globalAlpha = .9 - .6 * pulse; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, my, R + 3 + pulse * T * .22, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.fillStyle = C["map-shadow"]; ctx.beginPath(); ctx.arc(mx + 2, my + 3, R, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - R * .4, my + R * .8); ctx.lineTo(mx, my + R * 1.5); ctx.lineTo(mx + R * .4, my + R * .8); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `700 ${T * .34}px "JetBrains Mono",monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(st && st.result ? "✓" : locked ? "·" : String(i), mx, my + 1);
  });
  // avatar
  if (S) {
    const ax = av.px * T + T / 2, ay = av.py * T + T / 2;
    ctx.fillStyle = C["map-shadow"]; ctx.beginPath(); ctx.ellipse(ax, ay + T * .32, T * .3, T * .11, 0, 0, 7); ctx.fill();
    ctx.fillStyle = S.color; ctx.beginPath(); ctx.arc(ax, ay, T * .34, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `700 ${T * .32}px "Chakra Petch",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText((S.name[0] || "?").toUpperCase(), ax, ay + 1);
    ctx.font = `700 ${Math.max(11, T * .3)}px "Atkinson Hyperlegible",sans-serif`; const tw = ctx.measureText(S.name).width + 12;
    ctx.fillStyle = C.surface; rr(ax - tw / 2, ay - T * .95, tw, T * .4, 6); ctx.fill(); ctx.fillStyle = C.ink; ctx.fillText(S.name, ax, ay - T * .75);
  }
  ctx.restore();
}
