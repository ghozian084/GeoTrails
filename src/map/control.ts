/*
 * The teacher's live controls for a class room (see firebase/database.rules.json, live/{code}/control):
 * hold everyone, a synchronised start, a message to all groups, all posts open, and locked posts.
 * Pure state and helpers; src/ui/live.ts fills it from the Realtime Database.
 */

export interface Control {
  hold: boolean;
  /** Server time (ms) of a synchronised start; everyone waits until then. */
  startAt: number;
  allOpen: boolean;
  msg: { t: string; at: number } | null;
  /** Post indexes the teacher has locked. */
  locked: Set<number>;
}

export const noControl = (): Control => ({ hold: false, startAt: 0, allOpen: false, msg: null, locked: new Set() });

let current = noControl(), offset = 0;

export const control = (): Control => current;
export function setControl(c: Control): void { current = c; }
/** Server clock, so every laptop counts down to the same moment. */
export const serverNow = (): number => Date.now() + offset;
export function setServerOffset(ms: number): void { offset = ms; }

/** Control document from the database → Control, ignoring anything malformed. */
export function parseControl(v: unknown): Control {
  const c = noControl();
  if (!v || typeof v !== "object") return c;
  const d = v as Record<string, unknown>;
  c.hold = d.hold === true;
  c.allOpen = d.allOpen === true;
  if (typeof d.startAt === "number") c.startAt = d.startAt;
  const m = d.msg as { t?: unknown; at?: unknown } | undefined;
  if (m && typeof m.t === "string" && typeof m.at === "number") c.msg = { t: m.t, at: m.at };
  if (d.locked && typeof d.locked === "object")
    for (const [k, on] of Object.entries(d.locked as Record<string, unknown>)) if (on === true && /^\d+$/.test(k)) c.locked.add(+k);
  return c;
}

/** Seconds left before a synchronised start (0 when none is pending). */
export const countdown = (c: Control, now: number): number => (c.startAt > now ? Math.ceil((c.startAt - now) / 1000) : 0);

/** Groups wait (cannot walk or open posts) while held or counting down. */
export const waiting = (c: Control, now: number): boolean => c.hold || countdown(c, now) > 0;
