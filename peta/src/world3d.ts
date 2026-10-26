import * as THREE from "three";
import { label, studTile } from "../../blox/src/textures";
import type { Post } from "../../src/types";
import { buildingAt, tileAt, type MapBuilding, type MapDef, type TileKind } from "./mapdef";

/*
 * Blocky 3D scene for any MapDef (adapted from blox/src/world3d.ts, which stays as is for
 * the original map). 1 tile = U world units; world X = tile x, world Z = tile y.
 */

export const U = 4;
const FLOOR_H = 4;

export interface Marker {
  post: Post;
  group: THREE.Group;
  hit: THREE.Object3D[];
  set(state: "locked" | "open" | "green" | "orange"): void;
}

export interface World {
  ground: THREE.Mesh;
  markers: Marker[];
  update(now: number): void;
  setNight(night: boolean): void;
}

const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

function box(w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x: number, y: number, z: number, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  return mesh;
}

const BASE: Record<TileKind, string> = { g: "#4B974B", p: "#A3A2A5", c: "#D8D6CE", k: "#7F7E82", h: "#5DB84A", a: "#3F8FB0" };

const hex = (c: string, f: number) => {
  const n = parseInt(c.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255];
  return `rgb(${ch.map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))).join(",")})`;
};

function stud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, base: string) {
  ctx.fillStyle = hex(base, -0.18); ctx.beginPath(); ctx.arc(x + r * .12, y + r * .16, r, 0, 7); ctx.fill();
  ctx.fillStyle = hex(base, 0.08); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = hex(base, 0.22); ctx.beginPath(); ctx.arc(x - r * .25, y - r * .3, r * .45, 0, 7); ctx.fill();
}

/** Studded baseplate texture from the map tiles; water is flat with ripples. */
/** `P` = pixels per tile (phones use a smaller texture to save GPU memory). */
function groundTexture(m: MapDef, P: number): THREE.CanvasTexture {
  const c = document.createElement("canvas"), k = P / 64;
  c.width = m.cols * P; c.height = m.rows * P;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    const t = tileAt(m, x, y)!;
    const base = t === "g" && (x + y) % 2 ? "#3F8A41" : BASE[t];
    ctx.fillStyle = base; ctx.fillRect(x * P, y * P, P, P);
    if (t === "a") {
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 3 * k;
      ctx.beginPath(); ctx.moveTo(x * P + 12 * k, y * P + 22 * k); ctx.quadraticCurveTo(x * P + 24 * k, y * P + 16 * k, x * P + 36 * k, y * P + 22 * k); ctx.stroke();
      continue;
    }
    ctx.strokeStyle = hex(base, -0.08); ctx.lineWidth = 2 * k; ctx.strokeRect(x * P + k, y * P + k, P - 2 * k, P - 2 * k);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) stud(ctx, x * P + P / 4 + i * P / 2, y * P + P / 4 + j * P / 2, P * .13, base);
  }
  // Court markings, as in 2D: inside each sufficiently large court area.
  const seen = new Uint8Array(m.cols * m.rows);
  ctx.strokeStyle = "#F8F8F8"; ctx.lineWidth = 6 * k;
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    if (seen[y * m.cols + x] || tileAt(m, x, y) !== "c") continue;
    const b = { x0: x, y0: y, x1: x, y1: y }, q: [number, number][] = [[x, y]];
    seen[y * m.cols + x] = 1;
    while (q.length) {
      const [cx, cy] = q.pop()!;
      b.x0 = Math.min(b.x0, cx); b.x1 = Math.max(b.x1, cx); b.y0 = Math.min(b.y0, cy); b.y1 = Math.max(b.y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (tileAt(m, nx, ny) === "c" && !seen[ny * m.cols + nx]) { seen[ny * m.cols + nx] = 1; q.push([nx, ny]); }
      }
    }
    if (b.x1 - b.x0 < 5 || b.y1 - b.y0 < 3) continue;
    ctx.strokeRect((b.x0 + 1) * P, (b.y0 + 1) * P, (b.x1 - b.x0 - 1) * P, (b.y1 - b.y0 - 1) * P);
    const mx = Math.round((b.x0 + b.x1 + 1) / 2) * P;
    ctx.beginPath(); ctx.moveTo(mx, (b.y0 + 1) * P); ctx.lineTo(mx, b.y1 * P); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const HARD: (TileKind | null)[] = ["p", "c", "k"];

/** Door side: the side of the building with the most paving in front of it. */
function doorSide(m: MapDef, b: MapBuilding): "s" | "n" | "e" | "w" {
  const count = (cells: [number, number][]) => cells.filter(([x, y]) => HARD.includes(tileAt(m, x, y))).length;
  const xs = Array.from({ length: b.x1 - b.x0 + 1 }, (_, i) => b.x0 + i), ys = Array.from({ length: b.y1 - b.y0 + 1 }, (_, i) => b.y0 + i);
  const sides: ["s" | "n" | "e" | "w", number][] = [
    ["s", count(xs.map((x) => [x, b.y1 + 1]))], ["n", count(xs.map((x) => [x, b.y0 - 1]))],
    ["e", count(ys.map((y) => [b.x1 + 1, y]))], ["w", count(ys.map((y) => [b.x0 - 1, y]))],
  ];
  return sides.reduce((a, c) => (c[1] > a[1] ? c : a))[0];
}

export function buildMapWorld(scene: THREE.Scene, m: MapDef, posts: Post[], tilePx = 64): World {
  const W = m.cols * U, D = m.rows * U;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: groundTexture(m, tilePx) }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, 0, D / 2); ground.receiveShadow = true;
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, D * 4), lambert("#3E7F40"));
  apron.rotation.x = -Math.PI / 2; apron.position.set(W / 2, -0.05, D / 2); apron.receiveShadow = true;
  scene.add(ground, apron);

  // Buildings
  const glass = lambert("#2A4E6C", { emissive: "#000000" });
  const windows: THREE.Matrix4[] = [], doors: THREE.Matrix4[] = [];
  for (const b of m.buildings) addBuilding(b, windows, doors);
  const winMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glass, Math.max(1, windows.length));
  windows.forEach((mx, i) => winMesh.setMatrixAt(i, mx));
  winMesh.count = windows.length;
  const doorMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert("#5A3D2B"), Math.max(1, doors.length));
  doors.forEach((mx, i) => doorMesh.setMatrixAt(i, mx));
  doorMesh.count = doors.length;
  scene.add(winMesh, doorMesh);

  // Garden beds: raised lawn, hedge blocks along the edge, flower cubes.
  const hedge = lambert("#2C6E3A"), lawn = lambert("#6CBF4C");
  const flowers = ["#E7647A", "#F2C14E", "#F5F1E8", "#C94F7C"].map((c) => lambert(c));
  for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
    if (tileAt(m, x, y) !== "h" || buildingAt(m, x, y)) continue;
    const cx = (x + .5) * U, cz = (y + .5) * U;
    scene.add(box(U, 0.4, U, lawn, cx, 0.2, cz, false));
    const edge = (nx: number, ny: number) => tileAt(m, nx, ny) !== "h";
    if (edge(x, y - 1)) scene.add(box(U, 1, 1, hedge, cx, 0.9, y * U + .5));
    if (edge(x, y + 1)) scene.add(box(U, 1, 1, hedge, cx, 0.9, (y + 1) * U - .5));
    if (edge(x - 1, y)) scene.add(box(1, 1, U, hedge, x * U + .5, 0.9, cz));
    if (edge(x + 1, y)) scene.add(box(1, 1, U, hedge, (x + 1) * U - .5, 0.9, cz));
    if ((x * 7 + y * 3) % 3 === 0) scene.add(box(0.5, 0.5, 0.5, flowers[(x + y) % 4], cx - .6, 0.65, cz + .4, false));
  }

  // Objects
  const trunkM = lambert("#7C5C46"), leafA = lambert("#287F47"), leafB = lambert("#4B974B");
  const stone = lambert("#C7C4BB", { map: studTile("#C7C4BB") });
  const flags: THREE.Mesh[] = [];
  m.objects.forEach((o, i) => {
    const cx = (o.x + .5) * U, cz = (o.y + .5) * U;
    if (o.kind === "tree") {
      scene.add(box(0.9, 3.2, 0.9, trunkM, cx, 1.6, cz));
      const big = box(3.6, 2.8, 3.6, i % 2 ? leafA : leafB, cx, 4.4, cz);
      big.rotation.y = (i * 0.7) % 1.5;
      const top = box(2.4, 1.8, 2.4, i % 2 ? leafB : leafA, cx, 6.4, cz);
      top.rotation.y = big.rotation.y + 0.4;
      scene.add(big, top);
    } else if (o.kind === "flag") {
      scene.add(box(3.4, 0.4, 3.4, stone, cx, 0.2, cz), box(2.4, 0.4, 2.4, stone, cx, 0.6, cz));
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 11, 12), lambert("#D9DEE2"));
      pole.position.set(cx, 6.3, cz); pole.castShadow = true;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), lambert("#D9B44A"));
      ball.position.set(cx, 11.9, cz);
      scene.add(pole, ball);
      for (const [color, y0] of [["#D7262E", 10.9], ["#F5F5F2", 9.9]] as const) {
        const g = new THREE.PlaneGeometry(3.2, 1, 12, 1); g.translate(1.6, y0, 0);
        const f = new THREE.Mesh(g, lambert(color, { side: THREE.DoubleSide }));
        f.position.set(cx + 0.12, 0, cz); f.castShadow = true;
        f.userData.base = Float32Array.from(g.attributes.position.array);
        flags.push(f); scene.add(f);
      }
    } else if (o.kind === "tank") {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 4.2, 24), lambert("#2F6F8F"));
      tank.position.set(cx, 2.1, cz); tank.castShadow = true;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), lambert("#245A75"));
      lid.position.set(cx, 4.35, cz);
      scene.add(tank, lid);
    } else if (o.kind === "pot") {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.65, 1.5, 20), lambert("#B8643E"));
      pot.position.set(cx, 0.75, cz); pot.castShadow = true;
      scene.add(pot);
      for (let k = 0; k < 5; k++) {
        const leaf = box(0.35, 1.4, 0.35, leafB, cx + Math.cos(k * 1.26) * 0.4, 2.1, cz + Math.sin(k * 1.26) * 0.4);
        leaf.rotation.set(Math.sin(k * 1.26) * 0.4, 0, -Math.cos(k * 1.26) * 0.4);
        scene.add(leaf);
      }
    } else if (o.kind === "ramp") {
      const ramp = box(U, 0.3, U * 0.7, lambert("#BDBAB2"), cx, 0.3, cz, false);
      scene.add(ramp, box(U, 0.12, 0.12, lambert("#8E989D"), cx, 1.3, cz + U * .35));
    } else if (o.kind === "sign") {
      const wood = lambert("#8A6440");
      scene.add(box(0.25, 2.2, 0.25, wood, cx - 1, 1.1, cz), box(0.25, 2.2, 0.25, wood, cx + 1, 1.1, cz));
      scene.add(box(2.8, 1.4, 0.25, wood, cx, 2.6, cz), box(1.8, 0.5, 0.05, lambert("#F2B705"), cx, 2.6, cz + 0.15, false));
    }
  });

  // Fence along the map edge where it meets lawn; paving reaching the edge leaves a gate.
  const metal = lambert("#4F5B60"), accent = lambert("#0E6B5B");
  const soft = (x: number, y: number) => { const t = tileAt(m, x, y); return (t === "g" || t === "h") && !buildingAt(m, x, y); };
  const edgeRuns: [boolean, (i: number) => [number, number], number, (i: number) => [number, number, number, number]][] = [
    [true, (i) => [i, m.rows - 1], m.cols, (i) => [(i + .5) * U, D - 0.2, U, 0.15]],
    [true, (i) => [i, 0], m.cols, (i) => [(i + .5) * U, 0.2, U, 0.15]],
    [false, (i) => [0, i], m.rows, (i) => [0.2, (i + .5) * U, 0.15, U]],
    [false, (i) => [m.cols - 1, i], m.rows, (i) => [W - 0.2, (i + .5) * U, 0.15, U]],
  ];
  for (const [, at, n, geom] of edgeRuns) for (let i = 0; i < n; i++) {
    const [x, y] = at(i);
    if (!soft(x, y)) continue;
    const [px, pz, sx, sz] = geom(i);
    scene.add(box(sx, 0.15, sz, metal, px, 1.6, pz, false), box(0.18, 1.9, 0.18, metal, px, 0.95, pz, false));
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= n) continue;
      const [nx, ny] = at(j);
      if (!HARD.includes(tileAt(m, nx, ny))) continue;
      const gx = sx > sz ? px + (j > i ? U / 2 : -U / 2) : px, gz = sx > sz ? pz : pz + (j > i ? U / 2 : -U / 2);
      scene.add(box(1.4, 3, 1.4, accent, gx, 1.5, gz));
    }
  }

  // Post markers (as in Blox): beside a flagpole when the post stands on one.
  const COLORS = { locked: "#93A39C", open: "#0E6B5B", green: "#23845A", orange: "#C27A00" };
  const markers: Marker[] = posts.map((post) => {
    const g = new THREE.Group();
    g.position.set((post.tile[0] + .5) * U, 0, (post.tile[1] + .5) * U);
    if (m.objects.some((o) => o.kind === "flag" && o.x === post.tile[0] && o.y === post.tile[1])) g.position.x -= 2.2;
    const gemM = new THREE.MeshLambertMaterial({ color: COLORS.locked, emissive: "#000000" });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), gemM);
    gem.position.y = 7.5; gem.castShadow = true;
    const num = label(`POS ${post.id}`, { h: 1.1, bg: "#F2B705", fg: "#2A2200", font: '700 54px "JetBrains Mono", monospace' });
    num.position.y = gem.position.y + 1.6;
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.1, 32), new THREE.MeshBasicMaterial({ color: "#F2B705", transparent: true, opacity: 0.8 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
    g.add(gem, num, ring);
    g.userData = { gem, ring, base: gem.position.y };
    scene.add(g);
    let current = "";
    return {
      post, group: g, hit: [gem, num],
      set(state) {
        if (state === current) return;
        current = state;
        gemM.color.set(COLORS[state]);
        gemM.emissive.set(state === "open" ? "#0B3F36" : "#000000");
        ring.visible = state === "open";
        num.material.opacity = state === "locked" ? 0.6 : 1;
      },
    };
  });

  return {
    ground, markers,
    update(now) {
      for (const f of flags) {
        const pos = f.geometry.attributes.position as THREE.BufferAttribute, base = f.userData.base as Float32Array;
        for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.setZ(i, Math.sin(now / 260 - x * 1.6) * 0.25 * (x / 3.2)); }
        pos.needsUpdate = true;
        f.geometry.computeVertexNormals();
      }
      for (const mk of markers) {
        const { gem, ring, base } = mk.group.userData as { gem: THREE.Mesh; ring: THREE.Mesh; base: number };
        gem.rotation.y = now / 600;
        gem.position.y = base + Math.sin(now / 400 + mk.post.id) * 0.25;
        const p = (Math.sin(now / 320) + 1) / 2;
        ring.scale.setScalar(1 + p * 0.25);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 - p * 0.6;
      }
    },
    setNight(night) {
      glass.emissive.set(night ? "#E7C36A" : "#000000");
      glass.color.set(night ? "#3A3220" : "#2A4E6C");
    },
  };

  function addBuilding(b: MapBuilding, win: THREE.Matrix4[], door: THREE.Matrix4[]) {
    const w = (b.x1 - b.x0 + 1) * U - 0.6, d = (b.y1 - b.y0 + 1) * U - 0.6, h = b.floors * FLOOR_H + 1;
    const cx = (b.x0 + b.x1 + 1) / 2 * U, cz = (b.y0 + b.y1 + 1) / 2 * U;
    scene.add(box(w, h, d, lambert(b.color), cx, h / 2, cz));
    const roofTex = studTile("#A3A2A5");
    roofTex.repeat.set(w / 2, d / 2);
    const rim = lambert("#7D7B78");
    scene.add(box(w + 0.6, 0.5, d + 0.6, [rim, rim, lambert("#A3A2A5", { map: roofTex }), rim, rim, rim], cx, h + 0.25, cz));
    scene.add(box(w + 0.1, 0.6, d + 0.1, lambert("#5B5A58"), cx, 0.3, cz, false));
    const m4 = (x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
      new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
    const entrance = doorSide(m, b);
    for (const [side, len] of [["s", w], ["n", w], ["e", d], ["w", d]] as const) {
      const n = Math.max(1, Math.floor(len / 3)), doorAt = side === entrance ? Math.floor(n / 2) : -1;
      for (let f = 0; f < b.floors; f++) for (let i = 0; i < n; i++) {
        const t = -len / 2 + (i + 0.5) * (len / n), isDoor = f === 0 && i === doorAt, y = isDoor ? 1.6 : f * FLOOR_H + 2.4;
        const [px, pz, sx, sz] =
          side === "s" ? [cx + t, cz + d / 2 + 0.06, 1.4, 0.12] : side === "n" ? [cx + t, cz - d / 2 - 0.06, 1.4, 0.12] :
          side === "e" ? [cx + w / 2 + 0.06, cz + t, 0.12, 1.4] : [cx - w / 2 - 0.06, cz + t, 0.12, 1.4];
        (isDoor ? door : win).push(m4(px, y, pz, isDoor ? sx * 1.2 : sx, isDoor ? 3 : 1.7, isDoor ? sz * 1.2 : sz));
      }
    }
    const tag = label(b.name, { h: 1.6, bg: "rgba(21,48,42,.85)", fg: "#FFFFFF" });
    tag.position.set(cx, h + 2.2, cz);
    scene.add(tag);
  }
}
