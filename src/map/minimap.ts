import { tileAt, type MapDef, type TileKind } from "./mapdef";

/* Small flat-colour preview of a map (map list cards, editor overview). */

const COLORS: Record<TileKind, string> = { g: "#8DB873", p: "#D9D5C9", c: "#E8E6DF", k: "#B7B3A8", h: "#5E9E4E", a: "#4A93B5" };

export function minimap(m: MapDef, px = 6): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = m.cols * px; cv.height = m.rows * px;
  const ctx = cv.getContext("2d")!;
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) { ctx.fillStyle = COLORS[tileAt(m, x, y)!]; ctx.fillRect(x * px, y * px, px, px); }
  ctx.fillStyle = "#4F6F66";
  for (const b of m.buildings) ctx.fillRect(b.x0 * px, b.y0 * px, (b.x1 - b.x0 + 1) * px, (b.y1 - b.y0 + 1) * px);
  for (const o of m.objects) {
    if (o.kind === "ramp") continue;
    ctx.fillStyle = o.kind === "tree" ? "#2F6B33" : "#6B5A44";
    ctx.beginPath(); ctx.arc((o.x + .5) * px, (o.y + .5) * px, px * .45, 0, 7); ctx.fill();
  }
  ctx.fillStyle = "#F2B705"; ctx.strokeStyle = "#2A2200"; ctx.lineWidth = Math.max(1, px / 5);
  for (const p of m.posts) { ctx.beginPath(); ctx.arc((p.x + .5) * px, (p.y + .5) * px, px * .7, 0, 7); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = "#0E6B5B";
  ctx.fillRect(m.start[0] * px + px * .2, m.start[1] * px + px * .2, px * .6, px * .6);
  return cv;
}
