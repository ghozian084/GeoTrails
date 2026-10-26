import { RADIUS } from "../../blox/src/movement";

/* Continuous movement against any map's walkable grid (blox/src/movement.ts is fixed to the original map). */

type Walk = (x: number, y: number) => boolean;

export function freeOn(walk: Walk, x: number, z: number, r = RADIUS): boolean {
  for (const cx of [x - r, x + r]) for (const cz of [z - r, z + r]) if (!walk(Math.floor(cx), Math.floor(cz))) return false;
  return true;
}

export function slideOn(walk: Walk, x: number, z: number, dx: number, dz: number, r = RADIUS): [number, number] {
  let nx = x + dx;
  if (!freeOn(walk, nx, z, r)) nx = x;
  let nz = z + dz;
  if (!freeOn(walk, nx, nz, r)) nz = z;
  return [nx, nz];
}
