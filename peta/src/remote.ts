import type { Game, GameHooks } from "../../src/game/game";

/*
 * Other groups in a live room, as the 2D and 3D games see them. The games only draw them;
 * peta/src/ui/live.ts talks to Firebase and feeds `others()`.
 */

export interface Remote { uid: string; name: string; color: string; x: number; y: number; d: number }

export interface MapGameHooks extends GameHooks {
  /** Other online groups on this map (tile units, tile centre = index + 0.5). */
  others?(): Remote[];
}

export interface MapGame extends Game {
  /** This group's position (tile units, tile centre = index + 0.5) and facing (radians, 0 = down). */
  pose(): { x: number; y: number; d: number };
}

export interface Smoothed extends Remote { rx: number; ry: number; dist: number; moving: boolean }

/**
 * Glide each remote avatar towards its last reported position, so updates a few times
 * per second still look like walking. Far jumps (e.g. a group that reloaded) snap.
 */
export function smoother(speed = 8) {
  const seen = new Map<string, Smoothed>();
  return (list: Remote[], dt: number): Smoothed[] => {
    const live = new Set<string>();
    for (const r of list) {
      live.add(r.uid);
      let s = seen.get(r.uid);
      if (!s) { s = { ...r, rx: r.x, ry: r.y, dist: 0, moving: false }; seen.set(r.uid, s); }
      Object.assign(s, r);
      const dx = r.x - s.rx, dy = r.y - s.ry, d = Math.hypot(dx, dy), m = speed * dt;
      if (d > 6 || d <= m) { s.rx = r.x; s.ry = r.y; s.moving = d > 0.001 && d <= 6; if (s.moving) s.dist += d; }
      else { s.rx += dx / d * m; s.ry += dy / d * m; s.dist += m; s.moving = true; }
    }
    for (const k of seen.keys()) if (!live.has(k)) seen.delete(k);
    return [...seen.values()];
  };
}
