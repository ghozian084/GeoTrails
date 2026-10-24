/* Small colour helpers for procedural drawing. Accepts #rgb, #rrggbb and rgb()/rgba(). */

export type RGBA = [number, number, number, number];

export function parseColor(c: string): RGBA {
  const s = c.trim();
  if (s[0] === "#") {
    const h = s.length === 4 ? [...s.slice(1)].map((d) => d + d).join("") : s.slice(1, 7);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a] = m[1].split(",").map((v) => parseFloat(v));
    return [r, g, b, a ?? 1];
  }
  return [0, 0, 0, 1];
}

const css = ([r, g, b, a]: RGBA): string =>
  a >= 1 ? `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})` : `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+a.toFixed(3)})`;

/** Linear mix of two colours, t = 0 → a, t = 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const x = parseColor(a), y = parseColor(b);
  return css([0, 1, 2, 3].map((i) => x[i] + (y[i] - x[i]) * t) as RGBA);
}

/** amt > 0 lightens toward white, amt < 0 darkens toward black. */
export const shade = (c: string, amt: number): string => (amt >= 0 ? mix(c, "#ffffff", amt) : mix(c, "#000000", -amt));

/** Same colour with a different alpha. */
export function withAlpha(c: string, a: number): string {
  const [r, g, b] = parseColor(c);
  return css([r, g, b, a]);
}
