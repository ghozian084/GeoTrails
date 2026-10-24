/* Avatar animation state: facing direction and walk-cycle pose. */

export type Dir = "down" | "up" | "left" | "right";
/** 0 = standing, 1 = step with one foot, 2 = step with the other. */
export type Pose = 0 | 1 | 2;

/** Walk cycle: stand, step, stand, step. */
const CYCLE: Pose[] = [0, 1, 0, 2];
/** Pose changes per tile walked. */
const POSES_PER_TILE = 2;

export function facing(dx: number, dy: number, prev: Dir): Dir {
  if (dx === 0 && dy === 0) return prev;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

/** Pose for a given walked distance (in tiles); standing when not moving. */
export function walkPose(distance: number, moving: boolean): Pose {
  if (!moving) return 0;
  return CYCLE[Math.floor(distance * POSES_PER_TILE) % CYCLE.length];
}

/** Short blink every few seconds while idle. */
export const blinking = (now: number): boolean => now % 3600 < 140;
