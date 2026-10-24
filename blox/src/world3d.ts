import * as THREE from "three";
import { BUILD, COLS, ROWS, TREES, type Building } from "../../src/data/map";
import type { Post } from "../../src/types";
import { groundTexture, label, studTile } from "./textures";

/*
 * 3D scene built from the same map data as the 2D version. 1 tile = U world units;
 * world X = tile x, world Z = tile y. The sun (see game3d.ts) is high in the south-west so
 * the sides facing the third-person camera stay lit.
 */

export const U = 4;

/** Bright, blocky palette per building: wall colour, floors. */
const STYLE: Record<string, { wall: string; floors: number; door: "s" | "e" | "w" }> = {
  "Gedung Kelas A": { wall: "#C4281C", floors: 3, door: "s" },
  "Gedung Kelas B": { wall: "#0D69AC", floors: 3, door: "s" },
  "Kantor Guru": { wall: "#789082", floors: 2, door: "s" },
  "Lab & Perpustakaan": { wall: "#DA8541", floors: 2, door: "e" },
  Kantin: { wall: "#F5CD30", floors: 1, door: "w" },
  "Pos Satpam": { wall: "#635F62", floors: 1, door: "w" },
  Gudang: { wall: "#694028", floors: 1, door: "s" },
};
const FLOOR_H = 4;

export interface Marker {
  post: Post;
  group: THREE.Group;
  /** Meshes that respond to clicks. */
  hit: THREE.Object3D[];
  set(state: "locked" | "open" | "green" | "orange"): void;
}

export interface World {
  ground: THREE.Mesh;
  markers: Marker[];
  /** Animate flag and markers. */
  update(now: number): void;
  /** Night look (dark mode): lit windows. */
  setNight(night: boolean): void;
}

const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

function box(w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x: number, y: number, z: number, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  return mesh;
}

export function buildWorld(scene: THREE.Scene, posts: Post[]): World {
  const W = COLS * U, D = ROWS * U;

  // Studded baseplate
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshLambertMaterial({ map: groundTexture() }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(W / 2, 0, D / 2);
  ground.receiveShadow = true;
  scene.add(ground);
  // Wide grass apron around the school so the edges don't float in the sky
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, D * 4), lambert("#3E7F40"));
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(W / 2, -0.05, D / 2);
  apron.receiveShadow = true;
  scene.add(apron);

  // Buildings
  const glass = lambert("#2A4E6C", { emissive: "#000000" });
  const windows: THREE.Matrix4[] = [];
  const doors: THREE.Matrix4[] = [];
  for (const b of BUILD) addBuilding(scene, b, windows, doors);
  const winMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), glass, windows.length);
  windows.forEach((m, i) => winMesh.setMatrixAt(i, m));
  const doorMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lambert("#5A3D2B"), doors.length);
  doors.forEach((m, i) => doorMesh.setMatrixAt(i, m));
  scene.add(winMesh, doorMesh);

  // Trees: blocky trunk and two stacked leaf blocks
  const trunkM = lambert("#7C5C46"), leafA = lambert("#287F47"), leafB = lambert("#4B974B");
  TREES.forEach(([x, y], i) => {
    const cx = (x + .5) * U, cz = (y + .5) * U;
    scene.add(box(0.9, 3.2, 0.9, trunkM, cx, 1.6, cz));
    const big = box(3.6, 2.8, 3.6, i % 2 ? leafA : leafB, cx, 4.4, cz);
    big.rotation.y = (i * 0.7) % 1.5;
    const top = box(2.4, 1.8, 2.4, i % 2 ? leafB : leafA, cx, 6.4, cz);
    top.rotation.y = big.rotation.y + 0.4;
    scene.add(big, top);
  });

  // Flagpole on a stepped plinth with a waving merah-putih flag
  const fx = 17.5 * U, fz = 11.5 * U;
  const stone = lambert("#C7C4BB", { map: studTile("#C7C4BB") });
  scene.add(box(3.4, 0.4, 3.4, stone, fx, 0.2, fz), box(2.4, 0.4, 2.4, stone, fx, 0.6, fz));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 11, 12), lambert("#D9DEE2"));
  pole.position.set(fx, 6.3, fz); pole.castShadow = true;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), lambert("#D9B44A"));
  ball.position.set(fx, 11.9, fz);
  scene.add(pole, ball);
  const flagGeo = (y0: number) => { const g = new THREE.PlaneGeometry(3.2, 1, 12, 1); g.translate(1.6, y0, 0); return g; };
  const red = new THREE.Mesh(flagGeo(10.9), lambert("#D7262E", { side: THREE.DoubleSide }));
  const white = new THREE.Mesh(flagGeo(9.9), lambert("#F5F5F2", { side: THREE.DoubleSide }));
  for (const f of [red, white]) { f.position.set(fx + 0.12, 0, fz); f.castShadow = true; scene.add(f); }
  const flagBase = [red, white].map((f) => Float32Array.from(f.geometry.attributes.position.array));

  // Water tank (Pos 1)
  const blue = lambert("#2F6F8F");
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 4.2, 24), blue);
  tank.position.set(2.5 * U, 2.1, 22.5 * U); tank.castShadow = true;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16), lambert("#245A75"));
  lid.position.set(2.5 * U, 4.35, 22.5 * U);
  scene.add(tank, lid);

  // Plant pot (Pos 4): truncated cone with a few leaves
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.65, 1.5, 20), lambert("#B8643E"));
  pot.position.set(11.5 * U, 0.75, 21.5 * U); pot.castShadow = true;
  scene.add(pot);
  for (let i = 0; i < 5; i++) {
    const leaf = box(0.35, 1.4, 0.35, leafB, 11.5 * U + Math.cos(i * 1.26) * 0.4, 2.1, 21.5 * U + Math.sin(i * 1.26) * 0.4);
    leaf.rotation.set(Math.sin(i * 1.26) * 0.4, 0, -Math.cos(i * 1.26) * 0.4);
    scene.add(leaf);
  }

  // Ramp in front of Gedung Kelas A (Pos 2): a gentle wedge with a rail
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(3 * U, 0.3, U * 0.7), lambert("#BDBAB2"));
  ramp.position.set(9.5 * U, 0.3, 7.25 * U); ramp.rotation.z = -0.04; ramp.receiveShadow = true;
  const rail = box(3 * U, 0.12, 0.12, lambert("#8E989D"), 9.5 * U, 1.3, 7.6 * U);
  rail.rotation.z = -0.04;
  scene.add(ramp, rail);

  // Semicircle garden (Pos 5)
  const shape = new THREE.Shape();
  shape.moveTo(31 * U, 19.2 * U); shape.lineTo(33.5 * U, 19.2 * U);
  shape.absarc(33.5 * U, 21.5 * U, 2.3 * U, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(31 * U, 23.8 * U); shape.closePath();
  const bed = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: false }), lambert("#6CBF4C"));
  bed.rotation.x = Math.PI / 2; bed.position.y = 0.4; bed.receiveShadow = true;
  scene.add(bed);
  const hedge = lambert("#2C6E3A");
  shape.getSpacedPoints(46).forEach(({ x, y }) => scene.add(box(1.1, 1, 1.1, hedge, x, 0.9, y)));
  const flowers = ["#E7647A", "#F2C14E", "#F5F1E8", "#C94F7C"];
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI / 2 + (i / 18) * Math.PI, r = (0.6 + (i % 3) * 0.5) * U;
    scene.add(box(0.5, 0.5, 0.5, lambert(flowers[i % 4]), 32.5 * U + Math.cos(a) * r * 0.8, 0.65, 21.5 * U + Math.sin(a) * r));
  }

  // South fence with the gate gap and accent pillars
  const metal = lambert("#4F5B60");
  for (const [x0, x1] of [[0, 15.6], [20.4, COLS]]) {
    scene.add(box((x1 - x0) * U, 0.15, 0.15, metal, (x0 + x1) / 2 * U, 1.6, D - 0.2, false));
    for (let x = x0 * U; x <= x1 * U; x += 2) scene.add(box(0.18, 1.9, 0.18, metal, x, 0.95, D - 0.2, false));
  }
  const accent = lambert("#0E6B5B");
  scene.add(box(1.6, 3, 1.6, accent, 15.8 * U, 1.5, D - 0.4), box(1.6, 3, 1.6, accent, 20.2 * U, 1.5, D - 0.4));

  // Post markers: spinning gem + number, ring on the ground
  const COLORS = { locked: "#93A39C", open: "#0E6B5B", green: "#23845A", orange: "#C27A00" };
  const markers: Marker[] = posts.map((post) => {
    const g = new THREE.Group();
    g.position.set((post.tile[0] + .5) * U, 0, (post.tile[1] + .5) * U);
    // Pos 0 stands on the flagpole: hang its marker beside the pole instead of above the flag.
    if (post.id === 0) g.position.x -= 2.2;
    const gemM = new THREE.MeshLambertMaterial({ color: COLORS.locked, emissive: "#000000" });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), gemM);
    gem.position.y = 7.5;
    gem.castShadow = true;
    const num = label(`POS ${post.id}`, { h: 1.1, bg: "#F2B705", fg: "#2A2200", font: '700 54px "JetBrains Mono", monospace' });
    num.position.y = gem.position.y + 1.6;
    const ringM = new THREE.MeshBasicMaterial({ color: "#F2B705", transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.1, 32), ringM);
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
    ground,
    markers,
    update(now) {
      // Flag wave: amplitude grows toward the free end.
      [red, white].forEach((f, k) => {
        const pos = f.geometry.attributes.position as THREE.BufferAttribute, base = flagBase[k];
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3];
          pos.setZ(i, Math.sin(now / 260 - x * 1.6) * 0.25 * (x / 3.2));
        }
        pos.needsUpdate = true;
        f.geometry.computeVertexNormals();
      });
      for (const m of markers) {
        const { gem, ring, base } = m.group.userData as { gem: THREE.Mesh; ring: THREE.Mesh; base: number };
        gem.rotation.y = now / 600;
        gem.position.y = base + Math.sin(now / 400 + m.post.id) * 0.25;
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

  function addBuilding(scene: THREE.Scene, b: Building, win: THREE.Matrix4[], door: THREE.Matrix4[]) {
    const s = STYLE[b.n] ?? { wall: "#A3A2A5", floors: 1, door: "s" as const };
    const [x0, y0, x1, y1] = b.r;
    const w = (x1 - x0 + 1) * U - 0.6, d = (y1 - y0 + 1) * U - 0.6, h = s.floors * FLOOR_H + 1;
    const cx = (x0 + x1 + 1) / 2 * U, cz = (y0 + y1 + 1) / 2 * U;
    scene.add(box(w, h, d, lambert(s.wall), cx, h / 2, cz));
    // Roof slab with studs and a parapet lip
    const roofTex = studTile("#A3A2A5");
    roofTex.repeat.set(w / 2, d / 2);
    scene.add(box(w + 0.6, 0.5, d + 0.6, [lambert("#7D7B78"), lambert("#7D7B78"), lambert("#A3A2A5", { map: roofTex }), lambert("#7D7B78"), lambert("#7D7B78"), lambert("#7D7B78")], cx, h + 0.25, cz));
    // Base stripe
    scene.add(box(w + 0.1, 0.6, d + 0.1, lambert("#5B5A58"), cx, 0.3, cz, false));
    // Windows on every side, one row per floor; a door on the entrance side
    const m4 = (x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
      new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
    const sides: ["s" | "n" | "e" | "w", number][] = [["s", w], ["n", w], ["e", d], ["w", d]];
    for (const [side, len] of sides) {
      const n = Math.max(1, Math.floor(len / 3));
      const doorAt = side === s.door ? Math.floor(n / 2) : -1;
      for (let f = 0; f < s.floors; f++) for (let i = 0; i < n; i++) {
        const t = -len / 2 + (i + 0.5) * (len / n);
        const isDoor = f === 0 && i === doorAt;
        const y = isDoor ? 1.6 : f * FLOOR_H + 2.4;
        const [px, pz, sx, sz] =
          side === "s" ? [cx + t, cz + d / 2 + 0.06, 1.4, 0.12] :
          side === "n" ? [cx + t, cz - d / 2 - 0.06, 1.4, 0.12] :
          side === "e" ? [cx + w / 2 + 0.06, cz + t, 0.12, 1.4] : [cx - w / 2 - 0.06, cz + t, 0.12, 1.4];
        (isDoor ? door : win).push(m4(px, y, pz, isDoor ? sx * 1.2 : sx, isDoor ? 3 : 1.7, isDoor ? sz * 1.2 : sz));
      }
    }
    const tag = label(b.n, { h: 1.6, bg: "rgba(21,48,42,.85)", fg: "#FFFFFF" });
    tag.position.set(cx, h + 2.2, cz);
    scene.add(tag);
  }
}
