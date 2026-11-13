import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import type { MapDef } from "../map/mapdef";
import { getPhoto, photoKey, putPhoto } from "../map/store";
import { firebase, fitPhoto, fromBase64 } from "./client";

/*
 * Public maps, playable by anyone (see firebase/firestore.rules):
 *   admins/{uid}                          site admins (created by hand)
 *   public/{mapId}                        { name, json, photos: postUid[], ownerUid, status, updatedAt, posts, cols, rows }
 *   public/{mapId}/photos/{postUid}       { data: base64 JPEG, type }
 * A teacher's map waits as "pending" until an admin approves it; every later change waits again.
 */

export type PublicStatus = "pending" | "approved";
export interface PublicSummary { id: string; name: string; status: PublicStatus; updatedAt: number; posts: number; cols: number; rows: number; ownerUid: string }

const col = () => collection(firebase().db, "public");
const summary = (id: string, d: Record<string, unknown>): PublicSummary => ({
  id, name: String(d.name), status: d.status as PublicStatus, updatedAt: Number(d.updatedAt) || 0,
  posts: Number(d.posts) || 0, cols: Number(d.cols) || 0, rows: Number(d.rows) || 0, ownerUid: String(d.ownerUid),
});

export async function isAdmin(uid: string): Promise<boolean> {
  try { return (await getDoc(doc(firebase().db, "admins", uid))).exists(); } catch { return false; }
}

/** The signed-in teacher's public maps (any status). */
export async function myPublic(uid: string): Promise<PublicSummary[]> {
  return (await getDocs(query(col(), where("ownerUid", "==", uid)))).docs.map((d) => summary(d.id, d.data()));
}

/** Approved maps for the students' "Jelajahi peta publik" list. */
export async function approvedMaps(): Promise<PublicSummary[]> {
  return (await getDocs(query(col(), where("status", "==", "approved")))).docs.map((d) => summary(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Maps waiting for approval (admins only). */
export async function pendingMaps(): Promise<PublicSummary[]> {
  return (await getDocs(query(col(), where("status", "==", "pending")))).docs.map((d) => summary(d.id, d.data()));
}

/** Share (or update) a map publicly with its photos. Approved at once only for admins. */
export async function sharePublic(m: MapDef, uid: string, admin: boolean): Promise<PublicStatus> {
  const ref = doc(col(), m.id);
  const before = await getDoc(ref).catch(() => null);
  const old: string[] = before?.exists() ? before.data().photos ?? [] : [];
  const status: PublicStatus = admin ? "approved" : "pending";
  const photos: string[] = [];
  for (const p of m.posts) if (await getPhoto(photoKey(m.id, p.uid)).catch(() => undefined)) photos.push(p.uid);
  // The map document first: the photo rules check its owner.
  const json = JSON.stringify({ ...m, published: true, builtIn: undefined });
  await setDoc(ref, { name: m.name.slice(0, 60) || "Peta", json, photos, ownerUid: uid, status, updatedAt: m.updatedAt ?? Date.now(), posts: m.posts.length, cols: m.cols, rows: m.rows });
  for (const pu of photos) {
    const blob = (await getPhoto(photoKey(m.id, pu)))!;
    await setDoc(doc(ref, "photos", pu), { data: await fitPhoto(blob), type: "image/jpeg" });
  }
  await Promise.all(old.filter((pu) => !photos.includes(pu)).map((pu) => deleteDoc(doc(ref, "photos", pu))));
  return status;
}

/** Remove a public map with its photos (its owner, or an admin rejecting it). */
export async function removePublic(id: string): Promise<void> {
  const ref = doc(col(), id), s = await getDoc(ref);
  if (!s.exists()) return;
  await Promise.all(((s.data().photos ?? []) as string[]).map((pu) => deleteDoc(doc(ref, "photos", pu))));
  await deleteDoc(ref);
}

export async function approve(id: string): Promise<void> {
  await updateDoc(doc(col(), id), { status: "approved" });
}

/** Download one public map and store its photos on this device. */
export async function downloadPublic(id: string): Promise<MapDef | null> {
  const ref = doc(col(), id), s = await getDoc(ref);
  if (!s.exists()) return null;
  let m: MapDef;
  try { m = JSON.parse(s.data().json); } catch { return null; }
  if (m.id !== id) return null;
  for (const pu of (s.data().photos ?? []) as string[]) {
    const p = await getDoc(doc(ref, "photos", pu));
    if (p.exists()) await putPhoto(photoKey(id, pu), fromBase64(p.data().data)).catch(() => undefined);
  }
  return m;
}
