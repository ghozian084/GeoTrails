/**
 * Parse a number written Indonesian style.
 * "12,6" → 12.6, "2.307" → 2307, "2.307,5" → 2307.5. Returns NaN when nothing numeric is left.
 */
export function parseNumber(input: string): number {
  let s = String(input).trim().replace(/[^\d.,\-]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  return parseFloat(s);
}
