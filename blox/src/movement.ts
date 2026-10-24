import { walk } from "../../src/data/map";

/*
 * Continuous movement on the 2D tile grid (tile units: tile (i, j) spans [i, i+1] × [j, j+1]).
 * World X = tile x, world Z = tile y (south is +Z). Pure functions, unit-tested.
 */

/** Half-width of the avatar's footprint, in tiles. */
export const RADIUS = 0.28;

/** True when a square footprint of half-size r centred at (x, z) touches only walkable tiles. */
export function free(x: number, z: number, r = RADIUS): boolean {
  for (const cx of [x - r, x + r]) for (const cz of [z - r, z + r]) if (!walk(Math.floor(cx), Math.floor(cz))) return false;
  return true;
}

/** Move by (dx, dz), sliding along walls instead of stopping dead. */
export function slide(x: number, z: number, dx: number, dz: number, r = RADIUS): [number, number] {
  let nx = x + dx;
  if (!free(nx, z, r)) nx = x;
  let nz = z + dz;
  if (!free(nx, nz, r)) nz = z;
  return [nx, nz];
}

/**
 * Camera-relative input to a unit world direction. `yaw` = 0 means the camera sits south
 * of the avatar looking north, so "forward" is −Z.
 */
export function inputDir(forward: number, right: number, yaw: number): [number, number] {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const dx = fx * forward + rx * right, dz = fz * forward + rz * right;
  const len = Math.hypot(dx, dz);
  return len < 1e-9 ? [0, 0] : [dx / len, dz / len];
}

export const tileOf = (x: number, z: number): [number, number] => [Math.floor(x), Math.floor(z)];

/** Shortest signed angle from a to b, in (−π, π]. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
