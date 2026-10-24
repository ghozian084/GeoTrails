import { COLS, ROWS } from "../data/map";
import { gateDone } from "../logic/score";
import type { GroupState, Post } from "../types";
import { blinking, walkPose, type Dir } from "./anim";
import type { Pt } from "./bfs";
import type { Cam } from "./camera";
import { props, type Prop } from "./props";
import { SPRITE_H, SPRITE_W, spriteFrame } from "./sprite";
import { renderWorld } from "./world";

const COLOR_KEYS = ["map-grass", "map-grass-2", "map-pave", "map-pave-line", "map-roof", "map-roof-edge", "map-label", "map-tree", "map-court", "map-shadow", "map-wall", "map-window", "map-curb", "map-soil", "map-concrete", "accent", "tape", "good", "warn", "lock", "ink", "surface"];

/** Map palette, read from CSS custom properties so it follows light/dark mode. */
export const C: Record<string, string> = {};
export function readColors(): void {
  const cs = getComputedStyle(document.documentElement);
  COLOR_KEYS.forEach((k) => (C[k] = cs.getPropertyValue("--" + k).trim()));
}

export interface Avatar {
  /** Target tile. */
  x: number; y: number;
  /** Drawn (interpolated) position. */
  px: number; py: number;
  dir: Dir;
  /** Distance walked in tiles, drives the walk cycle. */
  dist: number;
  /** Timestamp of the last movement, so the cycle doesn't flicker between tiles. */
  movedAt: number;
}

export interface Frame {
  ctx: CanvasRenderingContext2D;
  W: number; H: number; T: number; DPR: number;
  cam: Cam;
  av: Avatar;
  path: Pt[];
  posts: Post[];
  S: GroupState | null;
  /** Demo mode: all posts open. */
  unlocked: boolean;
  now: number;
}

/** Static ground layer, rebuilt only when tile size, pixel ratio or theme colours change. */
let world: { key: string; canvas: HTMLCanvasElement; props: Prop[] } | null = null;
function worldFor(T: number, DPR: number) {
  const key = `${T}|${DPR}|${JSON.stringify(C)}`;
  if (!world || world.key !== key) world = { key, canvas: renderWorld(T, DPR, C), props: props(T, DPR, C) };
  return world;
}

export function draw(f: Frame): void {
  const { ctx, W, H, T, DPR, cam, av, path, posts, S, unlocked, now } = f;
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  };
  const cx = (x: number) => x * T + T / 2;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  const wd = worldFor(T, DPR);
  ctx.drawImage(wd.canvas, 0, 0, COLS * T, ROWS * T);

  // jalur
  if (path.length) { ctx.fillStyle = C.accent; path.forEach(([x, y], i) => { ctx.globalAlpha = .35 + .65 * (1 - i / path.length); ctx.beginPath(); ctx.arc(cx(x), cx(y), T * .08, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1; }

  // Tall objects and the avatar, back to front.
  const layers: Prop[] = [...wd.props];
  const ax = av.px * T + T / 2, ay = av.py * T + T / 2;
  const k = T * 1.3 / SPRITE_H, sw = SPRITE_W * k, sh = SPRITE_H * k, feet = ay + T * .42;
  if (S) {
    layers.push({
      depth: av.py + .5 + 1e-3,
      draw: () => {
        const moving = now - av.movedAt < 120;
        ctx.fillStyle = C["map-shadow"]; ctx.beginPath(); ctx.ellipse(ax, feet - T * .04, T * .3, T * .1, 0, 0, 7); ctx.fill();
        const frame = spriteFrame(S.color, av.dir, walkPose(av.dist, moving), !moving && blinking(now));
        const smooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(frame, ax - sw / 2, feet - sh, sw, sh);
        ctx.imageSmoothingEnabled = smooth;
      },
    });
  }
  layers.sort((a, b) => a.depth - b.depth).forEach((l) => l.draw(ctx, now));

  // penanda pos
  const pulse = (Math.sin(now / 320) + 1) / 2;
  posts.forEach((p, i) => {
    const st = S ? S.posts[i] : null; const locked = !S || (i > 0 && !unlocked && !gateDone(S.posts));
    const mx = cx(p.tile[0]), my = cx(p.tile[1]) - T * .62, R = T * .34;
    const col = st && st.result === "green" ? C.good : st && st.result === "orange" ? C.warn : locked ? C.lock : C.accent;
    if (!locked && !(st && st.result)) { ctx.strokeStyle = C.tape; ctx.globalAlpha = .9 - .6 * pulse; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, my, R + 3 + pulse * T * .22, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.fillStyle = C["map-shadow"]; ctx.beginPath(); ctx.arc(mx + 2, my + 3, R, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - R * .4, my + R * .8); ctx.lineTo(mx, my + R * 1.5); ctx.lineTo(mx + R * .4, my + R * .8); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `700 ${T * .34}px "JetBrains Mono",monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(st && st.result ? "✓" : locked ? "·" : String(i), mx, my + 1);
  });

  // Name tag stays on top of trees and markers.
  if (S) {
    ctx.font = `700 ${Math.max(11, T * .3)}px "Atkinson Hyperlegible",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const tw = ctx.measureText(S.name).width + 12, ty = feet - sh - T * .26;
    ctx.fillStyle = C.surface; rr(ax - tw / 2, ty - T * .2, tw, T * .4, 6); ctx.fill(); ctx.fillStyle = C.ink; ctx.fillText(S.name, ax, ty);
  }
  ctx.restore();
}
