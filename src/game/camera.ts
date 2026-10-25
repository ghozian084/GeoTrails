import { COLS, ROWS } from "../data/map";

export interface Cam { x: number; y: number }

/** Centre the camera on the avatar, clamped to the map; centre the map if it is smaller than the view. */
export function follow(cam: Cam, px: number, py: number, T: number, W: number, H: number): void {
  const mw = COLS * T, mh = ROWS * T;
  cam.x = mw < W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, px * T + T / 2 - W / 2));
  cam.y = mh < H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, py * T + T / 2 - H / 2));
}

/**
 * Tile size in px for a given view size. Never smaller than needed for the map to fill the
 * view, so tall phone screens get no empty band below the map.
 */
export const tileSize = (W: number, H: number): number =>
  Math.max(26, Math.min(46, Math.floor(Math.min(W / 17, H / 11))), Math.ceil(H / ROWS), Math.ceil(W / COLS));
