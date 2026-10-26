import { tileAt, type MapDef, type ObjectKind, type TileKind } from "../mapdef";

/* Flat, fast drawing of a map for the editor (redrawn on every brush stroke). */

export const TILE_COLOR: Record<TileKind, string> = { g: "#8DB873", p: "#D9D5C9", c: "#ECEAE3", k: "#ADA99E", h: "#5E9E4E", a: "#4A93B5" };

export interface EditorView {
  zoom: number;
  hover: [number, number] | null;
  /** Building being dragged out. */
  rect: [number, number, number, number] | null;
  selPost: number | null;
  selBuilding: number | null;
  movingPost: number | null;
}

function glyph(ctx: CanvasRenderingContext2D, kind: ObjectKind, cx: number, cy: number, Z: number) {
  const r = Z * .36;
  if (kind === "tree") {
    ctx.fillStyle = "#2F6B33"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.fillStyle = "#4C9A4F"; ctx.beginPath(); ctx.arc(cx - r * .25, cy - r * .25, r * .55, 0, 7); ctx.fill();
  } else if (kind === "flag") {
    ctx.fillStyle = "#8C9399"; ctx.fillRect(cx - Z * .05, cy - r, Z * .1, r * 2);
    ctx.fillStyle = "#D7262E"; ctx.fillRect(cx + Z * .05, cy - r, r * 1.1, r * .45);
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(cx + Z * .05, cy - r + r * .45, r * 1.1, r * .45);
  } else if (kind === "tank") {
    ctx.fillStyle = "#2F6F8F"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = "#9ECBE0"; ctx.lineWidth = Math.max(1, Z * .06); ctx.beginPath(); ctx.arc(cx, cy, r * .5, 0, 7); ctx.stroke();
  } else if (kind === "pot") {
    ctx.fillStyle = "#B8643E"; ctx.beginPath(); ctx.moveTo(cx - r, cy - r * .5); ctx.lineTo(cx + r, cy - r * .5); ctx.lineTo(cx + r * .6, cy + r); ctx.lineTo(cx - r * .6, cy + r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#4F8E45"; ctx.beginPath(); ctx.arc(cx, cy - r * .6, r * .45, 0, 7); ctx.fill();
  } else if (kind === "ramp") {
    ctx.fillStyle = "#BDBAB2"; ctx.fillRect(cx - Z / 2, cy - Z * .35, Z, Z * .7);
    ctx.strokeStyle = "#7E786C"; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * Z * .18, cy - Z * .35); ctx.lineTo(cx + i * Z * .18, cy + Z * .35); ctx.stroke(); }
  } else if (kind === "sign") {
    ctx.fillStyle = "#6B4D30"; ctx.fillRect(cx - Z * .05, cy, Z * .1, r);
    ctx.fillStyle = "#8A6440"; ctx.fillRect(cx - r, cy - r * .8, r * 2, r * 1.1);
    ctx.fillStyle = "#F2B705"; ctx.fillRect(cx - r * .55, cy - r * .45, r * 1.1, r * .35);
  }
}

export function drawEditor(cv: HTMLCanvasElement, m: MapDef, v: EditorView): void {
  const Z = v.zoom, DPR = Math.min(2, window.devicePixelRatio || 1);
  const W = m.cols * Z, H = m.rows * Z;
  if (cv.width !== Math.round(W * DPR) || cv.height !== Math.round(H * DPR)) {
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + "px"; cv.style.height = H + "px";
  }
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) { ctx.fillStyle = TILE_COLOR[tileAt(m, x, y)!]; ctx.fillRect(x * Z, y * Z, Z, Z); }
  ctx.strokeStyle = "rgba(0,0,0,.09)"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= m.cols; x++) { ctx.moveTo(x * Z + .5, 0); ctx.lineTo(x * Z + .5, H); }
  for (let y = 0; y <= m.rows; y++) { ctx.moveTo(0, y * Z + .5); ctx.lineTo(W, y * Z + .5); }
  ctx.stroke();

  m.buildings.forEach((b, i) => {
    const X = b.x0 * Z, Y = b.y0 * Z, w = (b.x1 - b.x0 + 1) * Z, h = (b.y1 - b.y0 + 1) * Z;
    ctx.fillStyle = b.color; ctx.globalAlpha = .85; ctx.fillRect(X + 1, Y + 1, w - 2, h - 2); ctx.globalAlpha = 1;
    ctx.strokeStyle = i === v.selBuilding ? "#F2B705" : "#1E2A26"; ctx.lineWidth = i === v.selBuilding ? 4 : 2;
    ctx.strokeRect(X + 2, Y + 2, w - 4, h - 4);
    ctx.fillStyle = "#FFFFFF"; ctx.font = `700 ${Math.max(10, Math.min(16, Z * .45))}px "Chakra Petch", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 3;
    ctx.fillText(b.name, X + w / 2, Y + h / 2, w - 6);
    ctx.shadowBlur = 0;
  });

  for (const o of m.objects) glyph(ctx, o.kind, (o.x + .5) * Z, (o.y + .5) * Z, Z);

  // Start tile
  const [sx, sy] = m.start;
  ctx.fillStyle = "#0E6B5B"; ctx.fillRect(sx * Z + Z * .15, sy * Z + Z * .15, Z * .7, Z * .7);
  ctx.fillStyle = "#FFFFFF"; ctx.font = `700 ${Z * .42}px "JetBrains Mono", monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("M", (sx + .5) * Z, (sy + .52) * Z);

  m.posts.forEach((p, i) => {
    const cx = (p.x + .5) * Z, cy = (p.y + .5) * Z, r = Z * .42;
    ctx.fillStyle = "#F2B705"; ctx.strokeStyle = "#2A2200"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2A2200"; ctx.font = `700 ${Z * (i > 9 ? .34 : .44)}px "JetBrains Mono", monospace`;
    ctx.fillText(String(i), cx, cy + 1);
    if (i === v.selPost) {
      ctx.strokeStyle = "#0E6B5B"; ctx.lineWidth = 3;
      if (i === v.movingPost) ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
  });

  if (v.rect) {
    const [x0, y0, x1, y1] = v.rect;
    ctx.fillStyle = "rgba(14,107,91,.25)"; ctx.strokeStyle = "#0E6B5B"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.fillRect(x0 * Z, y0 * Z, (x1 - x0 + 1) * Z, (y1 - y0 + 1) * Z);
    ctx.strokeRect(x0 * Z + 1, y0 * Z + 1, (x1 - x0 + 1) * Z - 2, (y1 - y0 + 1) * Z - 2);
    ctx.setLineDash([]);
  }
  if (v.hover) {
    ctx.strokeStyle = "#F2B705"; ctx.lineWidth = 2;
    ctx.strokeRect(v.hover[0] * Z + 1, v.hover[1] * Z + 1, Z - 2, Z - 2);
  }
}
