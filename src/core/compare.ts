/*
 * Compare the group's virtual answer (estimated from photos) with the value
 * measured on the physical trail.
 */

export type Closeness = "dekat" | "cukup" | "jauh";

/** Signed difference of the virtual answer relative to the physical value, in percent. */
export function percentDiff(virtual: number | null, physical: number | null): number | null {
  if (virtual == null || physical == null || physical === 0) return null;
  return ((virtual - physical) / Math.abs(physical)) * 100;
}

export function closeness(diff: number): Closeness {
  const d = Math.abs(diff);
  return d <= 5 ? "dekat" : d <= 15 ? "cukup" : "jauh";
}

export const CLOSENESS_MSG: Record<Closeness, string> = {
  dekat: "Sangat dekat. Taksiranmu dari foto hampir sama dengan hasil ukur di lapangan.",
  cukup: "Cukup dekat. Data mana yang taksirannya paling meleset?",
  jauh: "Selisihnya besar. Bandingkan data yang kamu taksir dari foto dengan ukuran sebenarnya.",
};
