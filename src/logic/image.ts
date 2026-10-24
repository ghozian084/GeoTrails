/* Sizing rules for post photos. */

/** Photos at least this wide (width / height) are shown as a draggable panorama. */
export const PANO_RATIO = 2.5;

export const isPanorama = (w: number, h: number): boolean => h > 0 && w / h >= PANO_RATIO;

/** Scale (w, h) down so the longer side is at most `max`; never scales up. */
export function fitWithin(w: number, h: number, max: number): [number, number] {
  const k = Math.min(1, max / Math.max(w, h));
  return [Math.round(w * k), Math.round(h * k)];
}

/** Longest side kept for uploads: panoramas need more width than ordinary photos. */
export const maxSide = (w: number, h: number): number => (isPanorama(w, h) ? 4096 : 1600);
