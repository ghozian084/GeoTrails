import { facing, blinking, walkPose } from "../../src/game/anim";
import { bfs, type Pt } from "../../src/game/bfs";
import type { Cam } from "../../src/game/camera";
import { readColors, C, type Avatar } from "../../src/game/render";
import type { Game, GameHooks } from "../../src/game/game";
import { SPRITE_H, SPRITE_W, spriteFrame } from "../../src/game/sprite";
import { gateDone } from "../../src/logic/score";
import { dominantDir } from "../../src/ui/stick";
import { objectProps, renderGround, type Prop } from "./draw2d";
import { toPosts, walker, type MapDef } from "./mapdef";

/*
 * Top-down game on any MapDef (same contract as the original src/game/game.ts, so the
 * post modal, log and touch controls plug in unchanged).
 */

const SPEED = 7;
const DIRS: Record<string, Pt> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };

/** Tile size: as in the original, but never so small that the map leaves an empty band. */
export const tileSizeFor = (m: MapDef, W: number, H: number): number =>
  Math.max(26, Math.min(46, Math.floor(Math.min(W / 17, H / 11))), Math.ceil(H / m.rows), Math.ceil(W / m.cols));

export function follow(m: MapDef, cam: Cam, px: number, py: number, T: number, W: number, H: number): void {
  const mw = m.cols * T, mh = m.rows * T;
  cam.x = mw < W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, px * T + T / 2 - W / 2));
  cam.y = mh < H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, py * T + T / 2 - H / 2));
}

export function createMapGame(canvas: HTMLCanvasElement, stage: HTMLElement, map: MapDef, hooks: GameHooks): Game {
  const ctx = canvas.getContext("2d")!;
  canvas.tabIndex = 0;
  const posts = toPosts(map), walk = walker(map);
  let W = 0, H = 0, T = 36, DPR = 1;
  const cam: Cam = { x: 0, y: 0 };

  readColors();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);

  function resize() {
    const r = stage.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    T = tileSizeFor(map, W, H);
  }
  window.addEventListener("resize", resize);
  resize();

  const av: Avatar = { x: map.start[0], y: map.start[1], px: map.start[0], py: map.start[1], dir: "down", dist: 0, movedAt: -1e9 };
  let path: Pt[] = [], pendingOpen: number | null = null, held: Pt | null = null, stickHeld: Pt | null = null, t0 = performance.now();
  let layer: { key: string; ground: HTMLCanvasElement; props: Prop[] } | null = null;

  const nearPost = () => posts.find((p) => Math.max(Math.abs(p.tile[0] - av.x), Math.abs(p.tile[1] - av.y)) <= 1);
  let lastPrompt = -1;

  function step(dt: number, now: number) {
    const S = hooks.getState();
    if (!S || hooks.modalOpen()) return;
    if (av.px !== av.x || av.py !== av.y) {
      const dx = av.x - av.px, dy = av.y - av.py, d = Math.hypot(dx, dy), m = SPEED * dt;
      av.dir = facing(dx, dy, av.dir); av.dist += Math.min(d, m); av.movedAt = now;
      if (d <= m) { av.px = av.x; av.py = av.y; } else { av.px += dx / d * m; av.py += dy / d * m; }
      return;
    }
    if (path.length) { const [nx, ny] = path.shift()!; av.x = nx; av.y = ny; S.pos = [nx, ny]; return; }
    if (pendingOpen != null) {
      const id = pendingOpen; pendingOpen = null;
      const p = posts[id];
      av.dir = facing(p.tile[0] - av.x, p.tile[1] - av.y, av.dir);
      hooks.openPost(id); return;
    }
    if (held) { const [dx, dy] = held; av.dir = facing(dx, dy, av.dir); if (walk(av.x + dx, av.y + dy)) { av.x += dx; av.y += dy; S.pos = [av.x, av.y]; } }
    else if (Math.random() < .02) hooks.save();
    const p = nearPost(), id = p ? p.id : -1;
    if (id !== lastPrompt) { lastPrompt = id; hooks.onNearPost(p); }
  }

  function frame(now: number) {
    const dt = Math.min(.05, (now - t0) / 1000); t0 = now;
    step(dt, now);
    follow(map, cam, av.px, av.py, T, W, H);
    const S = hooks.getState();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    const key = `${T}|${DPR}|${JSON.stringify(C)}`;
    if (!layer || layer.key !== key) layer = { key, ground: renderGround(map, T, DPR, C), props: objectProps(map, T, DPR, C) };
    ctx.drawImage(layer.ground, 0, 0, map.cols * T, map.rows * T);
    const cx = (x: number) => x * T + T / 2;

    if (path.length) { ctx.fillStyle = C.accent; path.forEach(([x, y], i) => { ctx.globalAlpha = .35 + .65 * (1 - i / path.length); ctx.beginPath(); ctx.arc(cx(x), cx(y), T * .08, 0, 7); ctx.fill(); }); ctx.globalAlpha = 1; }

    const layers: Prop[] = [...layer.props];
    const ax = av.px * T + T / 2, ay = av.py * T + T / 2;
    const k = T * 1.3 / SPRITE_H, sw = SPRITE_W * k, sh = SPRITE_H * k, feet = ay + T * .42;
    if (S) layers.push({
      depth: av.py + .5 + 1e-3,
      draw: () => {
        const moving = now - av.movedAt < 120;
        ctx.fillStyle = C["map-shadow"]; ctx.beginPath(); ctx.ellipse(ax, feet - T * .04, T * .3, T * .1, 0, 0, 7); ctx.fill();
        const fr = spriteFrame(S.color, av.dir, walkPose(av.dist, moving), !moving && blinking(now));
        const smooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(fr, ax - sw / 2, feet - sh, sw, sh);
        ctx.imageSmoothingEnabled = smooth;
      },
    });
    layers.sort((a, b) => a.depth - b.depth).forEach((l) => l.draw(ctx, now));

    // Post markers: the first post is the gate; the others open once it is done.
    const unlocked = hooks.allOpen() || (!!S && gateDone(S.posts));
    const pulse = (Math.sin(now / 320) + 1) / 2;
    posts.forEach((p, i) => {
      const st = S ? S.posts[i] : null, locked = !S || (i > 0 && !unlocked);
      const mx = cx(p.tile[0]), my = cx(p.tile[1]) - T * .62, R = T * .34;
      const col = st?.result === "green" ? C.good : st?.result === "orange" ? C.warn : locked ? C.lock : C.accent;
      if (!locked && !st?.result) { ctx.strokeStyle = C.tape; ctx.globalAlpha = .9 - .6 * pulse; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, my, R + 3 + pulse * T * .22, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.fillStyle = C["map-shadow"]; ctx.beginPath(); ctx.arc(mx + 2, my + 3, R, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx - R * .4, my + R * .8); ctx.lineTo(mx, my + R * 1.5); ctx.lineTo(mx + R * .4, my + R * .8); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `700 ${T * (i > 9 ? .28 : .34)}px "JetBrains Mono",monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(st?.result ? "✓" : locked ? "·" : String(i), mx, my + 1);
    });

    if (S) {
      ctx.font = `700 ${Math.max(11, T * .3)}px "Atkinson Hyperlegible",sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = ctx.measureText(S.name).width + 12, ty = feet - sh - T * .26;
      ctx.fillStyle = C.surface; ctx.beginPath(); ctx.roundRect(ax - tw / 2, ty - T * .2, tw, T * .4, 6); ctx.fill();
      ctx.fillStyle = C.ink; ctx.fillText(S.name, ax, ty);
    }
    ctx.restore();
    requestAnimationFrame(frame);
  }

  const route = (goal: (x: number, y: number) => boolean) => bfs([av.x, av.y], goal, walk);

  canvas.addEventListener("pointerdown", (e) => {
    if (!hooks.getState()) return;
    const r = canvas.getBoundingClientRect();
    const wx = (e.clientX - r.left + cam.x) / T, wy = (e.clientY - r.top + cam.y) / T;
    const hit = posts.find((p) => Math.hypot(wx - (p.tile[0] + .5), wy - (p.tile[1] + .5 - .62)) < .55 || (Math.floor(wx) === p.tile[0] && Math.floor(wy) === p.tile[1]));
    if (hit) {
      const r2 = route((x, y) => Math.max(Math.abs(hit.tile[0] - x), Math.abs(hit.tile[1] - y)) <= 1);
      if (r2) { path = r2; pendingOpen = hit.id; }
      return;
    }
    const tx = Math.floor(wx), ty = Math.floor(wy); pendingOpen = null;
    const r2 = route((x, y) => x === tx && y === ty) || route((x, y) => Math.abs(x - tx) + Math.abs(y - ty) <= 1);
    if (r2) path = r2;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { hooks.closeAll(); return; }
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (!hooks.getState() || hooks.modalOpen() || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (DIRS[e.key]) { e.preventDefault(); held = DIRS[e.key]; path = []; pendingOpen = null; }
    if (e.key === "e" || e.key === "E" || e.key === "Enter") { const p = nearPost(); if (p) hooks.openPost(p.id); }
  });
  document.addEventListener("keyup", (e) => { if (DIRS[e.key] && held === DIRS[e.key]) held = null; });

  requestAnimationFrame(frame);

  return {
    begin(pos) {
      const [x, y] = walk(pos[0], pos[1]) ? pos : map.start;
      av.x = x; av.y = y; av.px = x; av.py = y; av.dir = "down"; path = []; canvas.focus();
    },
    stop() { held = stickHeld = null; path = []; },
    nearPost,
    resetPrompt() { lastPrompt = -1; },
    focus() { canvas.focus(); },
    move(x, y) {
      const d = dominantDir(x, y);
      if (d && (!stickHeld || d[0] !== stickHeld[0] || d[1] !== stickHeld[1])) { held = stickHeld = d; path = []; pendingOpen = null; }
      else if (!d && stickHeld) { if (held === stickHeld) held = null; stickHeld = null; }
    },
  };
}
