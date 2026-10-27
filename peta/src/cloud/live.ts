import { signInAnonymously } from "firebase/auth";
import {
  connectDatabaseEmulator, get, getDatabase, onDisconnect, onValue, ref, remove, serverTimestamp, set, update,
  type Database,
} from "firebase/database";
import { firebase } from "./client";
import { emulatorHost } from "./config";
import { parseRoom, STALE_MS, type LivePlayer } from "./livedata";

/*
 * Live (multiplayer) rooms on the Realtime Database, one per class and map:
 *   live/{code}/owner                     uid of the teacher who owns the class
 *   live/{code}/rooms/{mapId}/{uid}       one group: LivePlayer without uid
 * Students sign in anonymously (no personal data); each group writes only its own node.
 */

let db: Database | null = null;

function database(): Database {
  if (db) return db;
  db = getDatabase(firebase().app);
  if (emulatorHost) connectDatabaseEmulator(db, emulatorHost, 9000);
  return db;
}

const roomRef = (code: string, mapId: string) => ref(database(), `live/${code}/rooms/${mapId}`);

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
export async function joinRoom(code: string, mapId: string, first: LiveState, onPlayers: (ps: LivePlayer[]) => void): Promise<LiveRoom> {
  const { auth } = firebase();
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  const uid = user.uid, me = ref(database(), `live/${code}/rooms/${mapId}/${uid}`);
  await sweep(code, mapId).catch(() => undefined);
  await set(me, { ...first, on: true, t: serverTimestamp() });
  await onDisconnect(me).update({ on: false, t: serverTimestamp() });
  const unsub = onValue(roomRef(code, mapId), (snap) => onPlayers(parseRoom(snap.val())));
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

/** Delete the session data of a room (teacher who owns the class). */
export async function clearRoom(code: string, mapId: string): Promise<void> {
  await remove(roomRef(code, mapId));
}
