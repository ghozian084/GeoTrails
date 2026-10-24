import { START, walk } from "../data/map";
import type { GroupState, Post } from "../types";
import { facing } from "./anim";
import { bfs, type Pt } from "./bfs";
import { follow, tileSize, type Cam } from "./camera";
import { draw, readColors, type Avatar } from "./render";

export interface GameHooks {
  getState(): GroupState | null;
  modalOpen(): boolean;
  openPost(id: number): void;
  closeAll(): void;
  save(): void;
  onNearPost(p: Post | undefined): void;
  /** True when every post is open (teacher demo mode). */
  allOpen(): boolean;
}

export interface Game {
  /** Place the avatar at the saved position and focus the map. */
  begin(pos: [number, number]): void;
  /** Cancel any held key or planned path (e.g. when a post opens). */
  stop(): void;
  nearPost(): Post | undefined;
  /** Force the proximity prompt to refresh on the next frame. */
  resetPrompt(): void;
  focus(): void;
}

const SPEED = 7; // tiles per second
const DIRS: Record<string, Pt> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };

export function createGame(canvas: HTMLCanvasElement, stage: HTMLElement, posts: Post[], hooks: GameHooks): Game {
  const ctx = canvas.getContext("2d")!;
  canvas.tabIndex = 0;
  let W = 0, H = 0, T = 36, DPR = 1;
  const cam: Cam = { x: 0, y: 0 };

  readColors();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  function resize() {
    const r = stage.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = W * DPR; canvas.height = H * DPR;
    T = tileSize(W, H);
  }
  window.addEventListener("resize", resize);
  resize();

  const av: Avatar = { x: START[0], y: START[1], px: START[0], py: START[1], dir: "down", dist: 0, movedAt: -1e9 };
  let path: Pt[] = [], pendingOpen: number | null = null, held: Pt | null = null, t0 = performance.now();

  function frame(now: number) {
    const dt = Math.min(.05, (now - t0) / 1000); t0 = now;
    step(dt, now);
    follow(cam, av.px, av.py, T, W, H);
    draw({ ctx, W, H, T, DPR, cam, av, path, posts, S: hooks.getState(), unlocked: hooks.allOpen(), now });
    requestAnimationFrame(frame);
  }

  function step(dt: number, now: number) {
    const S = hooks.getState();
    if (!S || hooks.modalOpen()) return;
    const moving = av.px !== av.x || av.py !== av.y;
    if (moving) {
      const dx = av.x - av.px, dy = av.y - av.py, d = Math.hypot(dx, dy), m = SPEED * dt;
      av.dir = facing(dx, dy, av.dir); av.dist += Math.min(d, m); av.movedAt = now;
      if (d <= m) { av.px = av.x; av.py = av.y; } else { av.px += dx / d * m; av.py += dy / d * m; }
      return;
    }
    if (path.length) { const [nx, ny] = path.shift()!; av.x = nx; av.y = ny; S.pos = [nx, ny]; return; }
    if (pendingOpen != null) {
      const id = pendingOpen; pendingOpen = null;
      const p = posts.find((q) => q.id === id)!;
      av.dir = facing(p.tile[0] - av.x, p.tile[1] - av.y, av.dir);
      hooks.openPost(id); return;
    }
    if (held) { const [dx, dy] = held; av.dir = facing(dx, dy, av.dir); if (walk(av.x + dx, av.y + dy)) { av.x += dx; av.y += dy; S.pos = [av.x, av.y]; } }
    else if (Math.random() < .02) hooks.save();
    updatePrompt();
  }

  const nearPost = () => posts.find((p) => Math.max(Math.abs(p.tile[0] - av.x), Math.abs(p.tile[1] - av.y)) <= 1);

  let lastPrompt = -1;
  function updatePrompt() {
    const p = nearPost(); const id = p ? p.id : -1;
    if (id === lastPrompt) return;
    lastPrompt = id;
    hooks.onNearPost(p);
  }

  const route = (goal: (x: number, y: number) => boolean) => bfs([av.x, av.y], goal, walk);

  function goToPost(p: Post) {
    const r = route((x, y) => Math.max(Math.abs(p.tile[0] - x), Math.abs(p.tile[1] - y)) <= 1);
    if (r) { path = r; pendingOpen = p.id; }
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!hooks.getState()) return;
    const r = canvas.getBoundingClientRect();
    const wx = (e.clientX - r.left + cam.x) / T, wy = (e.clientY - r.top + cam.y) / T;
    const hit = posts.find((p) => Math.hypot(wx - (p.tile[0] + .5), wy - (p.tile[1] + .5 - .62)) < .55 || (Math.floor(wx) === p.tile[0] && Math.floor(wy) === p.tile[1]));
    if (hit) { goToPost(hit); return; }
    const tx = Math.floor(wx), ty = Math.floor(wy); pendingOpen = null;
    const r2 = route((x, y) => x === tx && y === ty) || route((x, y) => Math.abs(x - tx) + Math.abs(y - ty) <= 1);
    if (r2) path = r2;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { hooks.closeAll(); return; }
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (!hooks.getState() || hooks.modalOpen() || tag === "INPUT" || tag === "TEXTAREA") return;
    if (DIRS[e.key]) { e.preventDefault(); held = DIRS[e.key]; path = []; pendingOpen = null; }
    if (e.key === "e" || e.key === "E" || e.key === "Enter") { const p = nearPost(); if (p) hooks.openPost(p.id); }
  });
  document.addEventListener("keyup", (e) => { if (DIRS[e.key] && held === DIRS[e.key]) held = null; });

  requestAnimationFrame(frame);

  return {
    begin(pos) { av.x = pos[0]; av.y = pos[1]; av.px = av.x; av.py = av.y; av.dir = "down"; path = []; canvas.focus(); },
    stop() { held = null; path = []; },
    nearPost,
    resetPrompt() { lastPrompt = -1; },
    focus() { canvas.focus(); },
  };
}
