import {
  connectDatabaseEmulator, get, getDatabase, onDisconnect, onValue, ref, remove, serverTimestamp, set, update,
  type Database,
} from "firebase/database";
import { firebase, signedInUser } from "./client";
import { emulatorHost } from "./config";
import { parseControl, serverNow, setServerOffset, type Control } from "../map/control";
import { parseRoom, STALE_MS, type LivePlayer } from "./livedata";

/*
 * Live (multiplayer) rooms on the Realtime Database, one per class and map:
 *   live/{code}/owner                     uid of the teacher who owns the class
 *   live/{code}/rooms/{mapId}/{uid}       one group: LivePlayer without uid
 *   live/{code}/control/{mapId}           the teacher's controls: hold, startAt, allOpen, msg, locked
 * Students sign in anonymously (no personal data); each group writes only its own node.
 */

let db: Database | null = null;

function database(): Database {
  if (db) return db;
  db = getDatabase(firebase().app);
  if (emulatorHost) connectDatabaseEmulator(db, emulatorHost, 9000);
  // Server clock offset, so countdowns end at the same moment on every laptop.
  onValue(ref(db, ".info/serverTimeOffset"), (s) => setServerOffset(Number(s.val()) || 0));
  return db;
}

const roomRef = (code: string, mapId: string) => ref(database(), `live/${code}/rooms/${mapId}`);
const controlRef = (code: string, mapId: string) => ref(database(), `live/${code}/control/${mapId}`);

/** The teacher's controls for a room (students and the teacher's monitor). */
export function watchControl(code: string, mapId: string, cb: (c: Control) => void): () => void {
  return onValue(controlRef(code, mapId), (snap) => cb(parseControl(snap.val())), () => cb(parseControl(null)));
}

/** Remove groups that have not been updated for 24 hours (allowed for anyone in the class). */
async function sweep(code: string, mapId: string): Promise<void> {
  const snap = await get(roomRef(code, mapId));
  const old = parseRoom(snap.val()).filter((p) => p.t && p.t < Date.now() - STALE_MS);
  await Promise.all(old.map((p) => remove(ref(database(), `live/${code}/rooms/${mapId}/${p.uid}`)).catch(() => undefined)));
}

export type LiveState = Omit<LivePlayer, "uid" | "on" | "t">;

export interface LiveRoom {
  readonly uid: string;
  /** Send this group's latest state (only the fields that changed are written). */
  push(s: LiveState): void;
  leave(): void;
}

/** Join a room as a group and listen to everyone in it. */
export async function joinRoom(code: string, mapId: string, first: LiveState, onPlayers: (ps: LivePlayer[]) => void, onControl: (c: Control) => void): Promise<LiveRoom> {
  const user = await signedInUser();
  const uid = user.uid, me = ref(database(), `live/${code}/rooms/${mapId}/${uid}`);
  await sweep(code, mapId).catch(() => undefined);
  await set(me, { ...first, on: true, t: serverTimestamp() });
  await onDisconnect(me).update({ on: false, t: serverTimestamp() });
  const unsubRoom = onValue(roomRef(code, mapId), (snap) => onPlayers(parseRoom(snap.val())));
  const unsubControl = watchControl(code, mapId, onControl);
  const unsub = () => { unsubRoom(); unsubControl(); };
  let last: LiveState = { ...first }, left = false;
  return {
    uid,
    push(s) {
      if (left) return;
      const diff: Record<string, unknown> = {};
      for (const k of Object.keys(s) as (keyof LiveState)[]) if (s[k] !== last[k]) diff[k] = s[k];
      if (!Object.keys(diff).length) return;
      last = { ...s };
      void update(me, { ...diff, on: true, t: serverTimestamp() }).catch(() => undefined);
    },
    leave() {
      if (left) return;
      left = true; unsub();
      void update(me, { on: false, t: serverTimestamp() }).catch(() => undefined);
    },
  };
}

/* ---------- teacher ---------- */

/** Record the signed-in teacher as owner of the class's live rooms (first owner wins). */
export async function claimClass(code: string, uid: string): Promise<void> {
  const owner = ref(database(), `live/${code}/owner`);
  if (!(await get(owner)).exists()) await set(owner, uid);
}

/** Watch one room of a class (teacher monitor). */
export function watchRoom(code: string, mapId: string, cb: (ps: LivePlayer[]) => void): () => void {
  return onValue(roomRef(code, mapId), (snap) => cb(parseRoom(snap.val())), () => cb([]));
}

/** Delete the session data of a room, and its controls (teacher who owns the class). */
export async function clearRoom(code: string, mapId: string): Promise<void> {
  await remove(roomRef(code, mapId));
  await remove(controlRef(code, mapId));
}

/* Teacher controls (only the class owner may write them). */

export const setHold = (code: string, mapId: string, hold: boolean): Promise<void> =>
  update(controlRef(code, mapId), { hold });

/** Release everyone at the same moment, a few seconds from now (server clock). */
export const startTogether = (code: string, mapId: string, seconds = 3): Promise<void> =>
  update(controlRef(code, mapId), { hold: false, startAt: serverNow() + seconds * 1000 });

export const sendMessage = (code: string, mapId: string, text: string): Promise<void> =>
  set(ref(database(), `live/${code}/control/${mapId}/msg`), { t: text.slice(0, 140), at: serverTimestamp() });

export const setAllOpen = (code: string, mapId: string, open: boolean): Promise<void> =>
  update(controlRef(code, mapId), { allOpen: open });

export const setLocked = (code: string, mapId: string, post: number, locked: boolean): Promise<void> =>
  set(ref(database(), `live/${code}/control/${mapId}/locked/${post}`), locked ? true : null);
