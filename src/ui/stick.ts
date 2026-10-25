/* Virtual joystick maths, kept pure for unit tests. Screen axes: +x right, +y down. */

/**
 * Finger offset from the joystick centre (px) → vector with length ≤ 1.
 * Inside the dead zone the result is [0, 0]; beyond it the length is rescaled to 0..1.
 */
export function stickVector(dx: number, dy: number, radius: number, dead = 0.18): [number, number] {
  const d = Math.hypot(dx, dy) / radius;
  if (d <= dead) return [0, 0];
  const mag = Math.min(1, (d - dead) / (1 - dead));
  const k = mag / d / radius;
  return [dx * k, dy * k];
}

/** Grid step along the stronger axis (for the tile-based 2D map), or null near the centre. */
export function dominantDir(x: number, y: number, threshold = 0.35): [number, number] | null {
  if (Math.hypot(x, y) < threshold) return null;
  return Math.abs(x) > Math.abs(y) ? [Math.sign(x), 0] : [0, Math.sign(y)];
}
