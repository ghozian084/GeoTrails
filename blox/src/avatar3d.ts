import * as THREE from "three";
import { faceTexture, label } from "./textures";

/*
 * Blocky R6-style character: head, torso, two arms and two legs, pivoting at the
 * shoulders and hips. Faces local +Z. Height ≈ 5.2 world units.
 */

const SKIN = "#F5CD30", PANTS = "#2F3B52";

export class BlockAvatar {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private armL: THREE.Group; private armR: THREE.Group;
  private legL: THREE.Group; private legR: THREE.Group;
  private phase = 0;

  constructor(shirt: string, name: string) {
    const mat = (c: string) => new THREE.MeshLambertMaterial({ color: c });
    const box = (w: number, h: number, d: number, m: THREE.Material | THREE.Material[]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.castShadow = true;
      return mesh;
    };
    const limb = (x: number, y: number, m: THREE.Material) => {
      // Pivot at the top so the limb swings from the shoulder/hip.
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      const b = box(0.98, 2, 1, m);
      b.position.y = -1;
      g.add(b);
      this.body.add(g);
      return g;
    };
    const skin = mat(SKIN), shirtM = mat(shirt), pants = mat(PANTS);

    const torso = box(2, 2, 1, shirtM);
    torso.position.y = 3;
    const headMats = [skin, skin, skin, skin, new THREE.MeshLambertMaterial({ map: faceTexture(SKIN) }), skin];
    const head = box(1.2, 1.2, 1.2, headMats);
    head.position.y = 4.6;
    this.body.add(torso, head);
    this.armL = limb(-1.5, 4, skin); this.armR = limb(1.5, 4, skin);
    this.legL = limb(-0.5, 2, pants); this.legR = limb(0.5, 2, pants);
    // Short sleeves in the shirt colour.
    for (const a of [this.armL, this.armR]) { const s = box(1.02, 0.7, 1.04, shirtM); s.position.y = -0.35; a.add(s); }

    const tag = label(name, { h: 0.9, bg: "rgba(255,255,255,.92)", fg: "#15302A", font: '700 52px "Atkinson Hyperlegible", sans-serif' });
    tag.position.y = 6.1;
    this.root.add(this.body, tag);
  }

  /** Walk cycle while moving, arms up while airborne. */
  update(dt: number, speed: number, airborne: boolean): void {
    this.phase += dt * speed * 2.2;
    const target = airborne ? 0 : Math.sin(this.phase) * Math.min(1, speed / 3) * 0.9;
    const k = Math.min(1, dt * 14);
    const lerp = (g: THREE.Group, v: number) => (g.rotation.x += (v - g.rotation.x) * k);
    lerp(this.legL, target); lerp(this.legR, -target);
    if (airborne) { lerp(this.armL, -2.6); lerp(this.armR, -2.6); }
    else { lerp(this.armL, -target); lerp(this.armR, target); }
    if (speed < 0.05 && !airborne) this.phase = 0;
  }
}
