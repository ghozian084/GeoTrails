import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, type Timestamp } from "firebase/firestore";
import type { MapDef } from "../map/mapdef";
import { getPhoto, photoKey, putPhoto } from "../map/store";
import { newClassCode } from "./cache";
import { firebase, fitPhoto, fromBase64, signedInUser } from "./client";
import { parseResult, type GroupResult, type SessionResult } from "./sessiondata";

/*
 * Trail sessions (see firebase/firestore.rules):
 *   sessions/{code}                    { name, ownerUid, mapId, json, photos: postUid[], open, createdAt }
 *   sessions/{code}/photos/{postUid}   { data: base64 JPEG, type }
 *   sessions/{code}/results/{uid}      one group's results (GroupResult + updatedAt), written by that group
 * The map is copied into the session when it is created, so later edits do not change a running session.
 */

export interface SessionInfo { code: string; name: string; mapId: string; mapName: string; open: boolean; createdAt: number }

const col = () => collection(firebase().db, "sessions");
const millis = (t: unknown) => (t as Timestamp | undefined)?.toMillis?.() ?? 0;

function info(code: string, d: Record<string, unknown>): SessionInfo {
  let mapName = "";
  try { mapName = JSON.parse(String(d.json)).name ?? ""; } catch { /* broken map */ }
  return { code, name: String(d.name), mapId: String(d.mapId), mapName, open: d.open === true, createdAt: millis(d.createdAt) };
}

/** A new session for a map, with a code that no class or session uses yet. */
export async function createSession(uid: string, name: string, m: MapDef): Promise<SessionInfo> {
  const { db } = firebase();
  let code = "";
  for (let i = 0; i < 8 && !code; i++) {
    const c = newClassCode();
    const [s, k] = await Promise.all([getDoc(doc(db, "sessions", c)), getDoc(doc(db, "classes", c))]);
    if (!s.exists() && !k.exists()) code = c;
  }
  if (!code) throw new Error("Gagal membuat kode sesi. Coba lagi.");
  const photos: string[] = [];
  for (const p of m.posts) if (await getPhoto(photoKey(m.id, p.uid)).catch(() => undefined)) photos.push(p.uid);
  const json = JSON.stringify({ ...m, published: true, builtIn: undefined });
  await setDoc(doc(db, "sessions", code), { name: name.slice(0, 60), ownerUid: uid, mapId: m.id, json, photos, open: true, createdAt: serverTimestamp() });
  for (const pu of photos) {
    const blob = (await getPhoto(photoKey(m.id, pu)))!;
    await setDoc(doc(db, "sessions", code, "photos", pu), { data: await fitPhoto(blob), type: "image/jpeg" });
  }
  return { code, name, mapId: m.id, mapName: m.name, open: true, createdAt: Date.now() };
}

export async function mySessions(uid: string): Promise<SessionInfo[]> {
  return (await getDocs(query(col(), where("ownerUid", "==", uid)))).docs.map((d) => info(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt);
}

export const setSessionOpen = (code: string, open: boolean): Promise<void> => updateDoc(doc(col(), code), { open });

export async function sessionResults(code: string): Promise<SessionResult[]> {
  return (await getDocs(collection(firebase().db, "sessions", code, "results"))).docs
    .map((d) => parseResult(d.id, d.data(), millis(d.data().updatedAt))).filter((r): r is SessionResult => !!r);
}

/** The session's own copy of the map (for the teacher's results table and live view). */
export async function sessionMap(code: string): Promise<MapDef | null> {
  const s = await getDoc(doc(col(), code));
  try { return s.exists() ? JSON.parse(s.data().json) : null; } catch { return null; }
}

/** Delete a session with its results and photos (its teacher). */
export async function deleteSession(code: string): Promise<void> {
  const { db } = firebase(), ref = doc(db, "sessions", code), s = await getDoc(ref);
  if (!s.exists()) return;
  const results = await getDocs(collection(db, "sessions", code, "results"));
  await Promise.all(results.docs.map((d) => deleteDoc(d.ref)));
  await Promise.all(((s.data().photos ?? []) as string[]).map((pu) => deleteDoc(doc(ref, "photos", pu))));
  await deleteDoc(ref);
}

/* ---------- students ---------- */

/** Load a session by its code, storing the map's photos on this device. Null when there is no such session. */
export async function downloadSession(code: string): Promise<{ name: string; open: boolean; map: MapDef } | null> {
  const ref = doc(col(), code), s = await getDoc(ref);
  if (!s.exists()) return null;
  let m: MapDef;
  try { m = JSON.parse(s.data().json); } catch { return null; }
  for (const pu of (s.data().photos ?? []) as string[]) {
    const p = await getDoc(doc(ref, "photos", pu));
    if (p.exists()) await putPhoto(photoKey(m.id, pu), fromBase64(p.data().data)).catch(() => undefined);
  }
  return { name: String(s.data().name), open: s.data().open === true, map: m };
}

/** Whether the session still accepts results (false when closed or deleted). */
export async function sessionOpen(code: string): Promise<boolean> {
  const s = await getDoc(doc(col(), code));
  return s.exists() && s.data().open === true;
}

/** Send this group's results (anonymous sign-in; nothing personal). */
export async function sendResult(code: string, r: GroupResult): Promise<void> {
  const { db } = firebase(), user = await signedInUser();
  await setDoc(doc(db, "sessions", code, "results", user.uid), { ...r, updatedAt: serverTimestamp() });
}
