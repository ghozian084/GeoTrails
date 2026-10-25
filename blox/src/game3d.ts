import * as THREE from "three";
import { COLS, ROWS, walk } from "../../src/data/map";
import { bfs, type Pt } from "../../src/game/bfs";
import type { Game, GameHooks } from "../../src/game/game";
import { gateDone } from "../../src/logic/score";
import type { Post } from "../../src/types";
import { BlockAvatar } from "./avatar3d";
import { angleDelta, free, inputDir, slide, tileOf } from "./movement";
import { buildWorld, U } from "./world3d";

/*
 * 3D third-person version of the map game. Same contract as the 2D canvas game
 * (src/game/game.ts), so the post modal, log, finish screen and teacher mode are reused.
 * Positions are kept in tile units; S.pos stores the tile the avatar stands on.
 */

const SPEED = 4.5;            // tiles per second
const JUMP_V = 13, GRAVITY = 38; // world units
const KEYS: Record<string, [number, number]> = {
  w: [1, 0], arrowup: [1, 0], s: [-1, 0], arrowdown: [-1, 0],
  a: [0, -1], arrowleft: [0, -1], d: [0, 1], arrowright: [0, 1],
};

export function createGame3D(canvas: HTMLCanvasElement, stage: HTMLElement, posts: Post[], hooks: GameHooks): Game {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvas.tabIndex = 0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 600);
  const hemi = new THREE.HemisphereLight("#DDEEFF", "#5A7A48", 1.7);
  const sun = new THREE.DirectionalLight("#FFF4DC", 2.8);
  // High sun from the south-west: faces seen by the third-person camera stay lit.
  sun.position.set(20, 130, 110);
  sun.target.position.set(COLS * U / 2, 0, ROWS * U / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -100, right: 100, top: 90, bottom: -90, near: 10, far: 260 });
  sun.shadow.bias = -0.0008;
  scene.add(hemi, sun, sun.target);

  const world = buildWorld(scene, posts);

  // Light / dark follows the system like the rest of the app.
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const applyTheme = () => {
    const forced = document.documentElement.dataset.theme;
    const night = forced ? forced === "dark" : dark.matches;
    scene.background = new THREE.Color(night ? "#0E1A24" : "#9ED4F0");
    scene.fog = new THREE.Fog(night ? "#0E1A24" : "#9ED4F0", 140, 320);
    hemi.intensity = night ? 0.45 : 1.7;
    sun.intensity = night ? 0.5 : 2.8;
    sun.color.set(night ? "#9FB6FF" : "#FFF4DC");
    world.setNight(night);
  };
  dark.addEventListener("change", applyTheme);
  applyTheme();

  function resize() {
    const r = stage.getBoundingClientRect();
    // Phones and tablets have weaker GPUs: render a little below their full pixel density.
    renderer.setPixelRatio(Math.min(matchMedia("(pointer: coarse)").matches ? 1.5 : 2, window.devicePixelRatio || 1));
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // Avatar state (tile units for x/z, world units for height)
  let x = 0, z = 0, y = 0, vy = 0, facing = Math.PI;
  let avatar: BlockAvatar | null = null;
  let yaw = 0, pitch = 0.55, dist = 22;
  const held = new Set<string>();
  /** Touch joystick vector, screen axes (+x right, +y down). */
  let stick: [number, number] = [0, 0];
  let path: Pt[] = [], pendingOpen: number | null = null;
  let lastTile = "", lastPrompt = -1, t0 = performance.now();

  const nearPost = () => posts.find((p) => Math.max(Math.abs(p.tile[0] - Math.floor(x)), Math.abs(p.tile[1] - Math.floor(z))) <= 1);

  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    const S = hooks.getState();
    let speed = 0;

    if (S && avatar && !hooks.modalOpen()) {
      let fwd = 0, right = 0;
      for (const k of held) { const v = KEYS[k]; if (v) { fwd += v[0]; right += v[1]; } }
      // The joystick is analog: a light push walks slower.
      const analog = !held.size && (stick[0] || stick[1]) ? Math.min(1, Math.hypot(stick[0], stick[1])) : 1;
      if (!held.size) { fwd = -stick[1]; right = stick[0]; }
      let [dx, dz] = inputDir(fwd, right, yaw);
      if (dx || dz) { path = []; pendingOpen = null; }
      else if (path.length) {
        // Follow the tapped route tile by tile.
        const [tx, tz] = path[0], ex = tx + .5 - x, ez = tz + .5 - z, d = Math.hypot(ex, ez);
        if (d < 0.12) path.shift();
        else { dx = ex / d; dz = ez / d; }
      } else if (pendingOpen != null) {
        const id = pendingOpen; pendingOpen = null;
        const p = posts.find((q) => q.id === id)!;
        facing = Math.atan2(p.tile[0] + .5 - x, p.tile[1] + .5 - z);
        hooks.openPost(id);
      }
      if (dx || dz) {
        const step = Math.min(SPEED * analog * dt, path.length ? Math.hypot(path[0][0] + .5 - x, path[0][1] + .5 - z) : Infinity);
        const [nx, nz] = slide(x, z, dx * step, dz * step);
        speed = Math.hypot(nx - x, nz - z) / Math.max(dt, 1e-6);
        x = nx; z = nz;
        facing += angleDelta(facing, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
      }
      // Jump (cosmetic)
      if (y > 0 || vy > 0) { vy -= GRAVITY * dt; y = Math.max(0, y + vy * dt); if (y === 0) vy = 0; }

      const [tx, tz] = tileOf(x, z), key = tx + "," + tz;
      if (key !== lastTile) { lastTile = key; S.pos = [tx, tz]; }
      else if (Math.random() < .02) hooks.save();
      const p = nearPost(), id = p ? p.id : -1;
      if (id !== lastPrompt) { lastPrompt = id; hooks.onNearPost(p); }
    }

    if (avatar) {
      avatar.root.position.set(x * U, y, z * U);
      avatar.root.rotation.y = facing;
      avatar.update(dt, speed, y > 0.01);
    }

    // Post markers reflect progress and the Pos 0 gate.
    const unlocked = hooks.allOpen() || (!!S && gateDone(S.posts));
    for (const m of world.markers) {
      const st = S?.posts[m.post.id];
      m.set(st?.result === "green" ? "green" : st?.result === "orange" ? "orange" : !S || (m.post.id > 0 && !unlocked) ? "locked" : "open");
    }
    world.update(now);

    // Third-person camera; slow orbit over the court before a group starts.
    if (!avatar) yaw += dt * 0.08;
    const target = avatar ? new THREE.Vector3(x * U, 3 + y * 0.5, z * U) : new THREE.Vector3(18 * U, 0, 12 * U);
    const dd = avatar ? dist : 95;
    camera.position.set(
      target.x + Math.sin(yaw) * Math.cos(pitch) * dd,
      target.y + Math.sin(pitch) * dd,
      target.z + Math.cos(yaw) * Math.cos(pitch) * dd,
    );
    camera.lookAt(target);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  // Tap to walk / tap a marker to go to that post; drag to orbit; wheel to zoom.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let drag: { x: number; y: number; moved: number } | null = null;
  // Two fingers on the canvas pinch-zoom instead of rotating.
  const touches = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener("pointerdown", (e) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (touches.size === 2) { pinch = spread(); if (drag) drag.moved = Infinity; return; }
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
  });
  canvas.addEventListener("pointermove", (e) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size >= 2) {
      const now = spread();
      if (pinch && now) dist = Math.min(45, Math.max(9, dist * pinch / now));
      pinch = now;
      return;
    }
    if (!drag) return;
    const mx = e.clientX - drag.x, my = e.clientY - drag.y;
    drag.moved += Math.abs(mx) + Math.abs(my);
    drag.x = e.clientX; drag.y = e.clientY;
    yaw -= mx * 0.006;
    pitch = Math.min(1.35, Math.max(0.12, pitch + my * 0.004));
  });
  const lift = (e: PointerEvent) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = 0;
  };
  canvas.addEventListener("pointercancel", (e) => { lift(e); drag = null; });
  canvas.addEventListener("pointerup", (e) => {
    lift(e);
    if (touches.size) return; // still pinching with the other finger
    const wasClick = drag && drag.moved < 6;
    drag = null;
    if (wasClick && hooks.getState() && avatar) tap(e.clientX, e.clientY);
  });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); dist = Math.min(45, Math.max(9, dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });

  function tap(cx: number, cy: number) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(world.markers.flatMap((m) => m.hit), false)[0];
    const marker = hit && world.markers.find((m) => m.hit.includes(hit.object));
    const from: Pt = tileOf(x, z);
    if (marker) {
      const p = marker.post;
      const route = bfs(from, (tx, tz) => Math.max(Math.abs(p.tile[0] - tx), Math.abs(p.tile[1] - tz)) <= 1, walk);
      if (route) { path = route; pendingOpen = p.id; }
      return;
    }
    const g = ray.intersectObject(world.ground, false)[0];
    if (!g) return;
    const tx = Math.floor(g.point.x / U), tz = Math.floor(g.point.z / U);
    pendingOpen = null;
    const route = bfs(from, (a, b) => a === tx && b === tz, walk) || bfs(from, (a, b) => Math.abs(a - tx) + Math.abs(b - tz) <= 1, walk);
    if (route) path = route;
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { hooks.closeAll(); return; }
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (!hooks.getState() || hooks.modalOpen() || tag === "INPUT" || tag === "TEXTAREA") return;
    const k = e.key.toLowerCase();
    if (KEYS[k]) { e.preventDefault(); held.add(k); }
    if (k === " ") { e.preventDefault(); jump(); }
    if (k === "e" || k === "enter") { const p = nearPost(); if (p) hooks.openPost(p.id); }
  });
  document.addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));
  function jump() { if (y === 0 && avatar && !hooks.modalOpen()) vy = JUMP_V; }
  window.addEventListener("blur", () => held.clear());

  requestAnimationFrame(frame);

  return {
    begin(pos) {
      x = pos[0] + .5; z = pos[1] + .5;
      if (!free(x, z)) { x = 17.5; z = 22.5; }
      facing = Math.PI; yaw = 0; pitch = 0.55; path = []; pendingOpen = null;
      dist = camera.aspect < 1 ? 30 : 22; // pull back on portrait phone screens
      const S = hooks.getState()!;
      if (avatar) scene.remove(avatar.root);
      avatar = new BlockAvatar(S.color, S.name);
      scene.add(avatar.root);
      canvas.focus();
    },
    stop() { held.clear(); stick = [0, 0]; path = []; pendingOpen = null; },
    move(sx, sy) { stick = [sx, sy]; if (sx || sy) { path = []; pendingOpen = null; } },
    jump,
    nearPost,
    resetPrompt() { lastPrompt = -1; },
    focus() { canvas.focus(); },
  };
}
