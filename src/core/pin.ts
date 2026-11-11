/*
 * Local teacher PIN. This only keeps students out of the teacher panel on a shared laptop;
 * it is not real security (everything lives in the browser).
 */

export const validPin = (pin: string): boolean => /^\d{4,8}$/.test(pin);

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode("geotrails:" + pin);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest("SHA-256", data);
    return "s256:" + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for non-secure contexts: FNV-1a.
  let h = 0x811c9dc5;
  for (const b of data) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return "fnv:" + h.toString(16);
}

export async function checkPin(pin: string, stored: string | null): Promise<boolean> {
  return !!stored && (await hashPin(pin)) === stored;
}
