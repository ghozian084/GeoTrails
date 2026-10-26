import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type Auth } from "firebase/auth";
import {
  collection, connectFirestoreEmulator, deleteDoc, doc, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, where,
  type Firestore,
} from "firebase/firestore";
import type { MapDef } from "../mapdef";
import { getPhoto, photoKey, putPhoto } from "../store";
import { newClassCode } from "./cache";
import { emulatorHost, firebaseConfig } from "./config";

/*
 * Firebase access for GeoTrails Peta (stage 1: classes, published maps and their photos).
 * Data model (see firebase/firestore.rules):
 *   classes/{code}                       { name, ownerUid, createdAt }
 *   classes/{code}/maps/{mapId}          { name, json, photos: postUid[], updatedAt }
 *   classes/{code}/maps/{mapId}/photos/{postUid}   { data: base64 JPEG, type }
 * No student data is written.
 */

let app: FirebaseApp, auth: Auth, db: Firestore;

function init() {
  if (app) return;
  app = initializeApp(firebaseConfig as Record<string, string>);
  auth = getAuth(app);
  db = getFirestore(app);
  if (emulatorHost) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
  }
}

export interface Teacher { uid: string; name: string }
export interface CloudClass { code: string; name: string; ownerUid: string }
export interface PublishedMap { id: string; name: string; json: string; photos: string[] }

/* ---------- teacher sign-in ---------- */

export function watchTeacher(cb: (t: Teacher | null) => void): () => void {
  init();
  return onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, name: u.displayName || u.email || "Guru" } : null));
}

export async function signInTeacher(): Promise<void> {
  init();
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutTeacher(): Promise<void> {
  init();
  await signOut(auth);
}

/* ---------- classes ---------- */

export async function getClass(code: string): Promise<CloudClass | null> {
  init();
  const s = await getDoc(doc(db, "classes", code));
  return s.exists() ? { code, name: s.data().name, ownerUid: s.data().ownerUid } : null;
}

export async function myClasses(uid: string): Promise<CloudClass[]> {
  init();
  const snap = await getDocs(query(collection(db, "classes"), where("ownerUid", "==", uid)));
  return snap.docs.map((d) => ({ code: d.id, name: d.data().name, ownerUid: uid })).sort((a, b) => a.name.localeCompare(b.name));
}

/** New class with a fresh, unused code. */
export async function createClass(uid: string, name: string): Promise<CloudClass> {
  init();
  for (let i = 0; i < 8; i++) {
    const code = newClassCode();
    if (await getClass(code)) continue;
    await setDoc(doc(db, "classes", code), { name: name.slice(0, 60), ownerUid: uid, createdAt: serverTimestamp() });
    return { code, name, ownerUid: uid };
  }
  throw new Error("Gagal membuat kode kelas. Coba lagi.");
}

export async function publishedMaps(code: string): Promise<PublishedMap[]> {
  init();
  const snap = await getDocs(collection(db, "classes", code, "maps"));
  return snap.docs.map((d) => ({ id: d.id, name: d.data().name, json: d.data().json, photos: d.data().photos ?? [] }));
}

/* ---------- photos ---------- */

const PHOTO_LIMIT = 700_000; // base64 characters, well under the 950 000 allowed by the rules

const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

const fromBase64 = (data: string): Blob => {
  const bin = atob(data), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new Blob([out], { type: "image/jpeg" });
};

/** Re-encode a photo (smaller, lower quality) until it fits in one Firestore document. */
async function fitPhoto(blob: Blob): Promise<string> {
  let data = await toBase64(blob);
  if (data.length <= PHOTO_LIMIT) return data;
  const bmp = await createImageBitmap(blob);
  try {
    for (const [scale, q] of [[1, .75], [.8, .7], [.65, .65], [.5, .6], [.35, .55]]) {
      const cv = document.createElement("canvas");
      cv.width = Math.round(bmp.width * scale); cv.height = Math.round(bmp.height * scale);
      cv.getContext("2d")!.drawImage(bmp, 0, 0, cv.width, cv.height);
      const b = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/jpeg", q));
      if (b) { data = await toBase64(b); if (data.length <= PHOTO_LIMIT) return data; }
    }
  } finally {
    bmp.close();
  }
  throw new Error("Foto terlalu besar untuk diterbitkan.");
}

/* ---------- publish / withdraw ---------- */

/** Publish (or update) a map and its uploaded photos to a class the teacher owns. */
export async function publishMap(code: string, m: MapDef): Promise<void> {
  init();
  const mapRef = doc(db, "classes", code, "maps", m.id);
  const before = await getDoc(mapRef);
  const oldPhotos: string[] = before.exists() ? before.data().photos ?? [] : [];
  const photos: string[] = [];
  for (const p of m.posts) {
    const blob = await getPhoto(photoKey(m.id, p.uid)).catch(() => undefined);
    if (!blob) continue;
    await setDoc(doc(mapRef, "photos", p.uid), { data: await fitPhoto(blob), type: "image/jpeg" });
    photos.push(p.uid);
  }
  for (const uid of oldPhotos) if (!photos.includes(uid)) await deleteDoc(doc(mapRef, "photos", uid));
  const json = JSON.stringify({ ...m, published: true, builtIn: undefined });
  await setDoc(mapRef, { name: m.name.slice(0, 60), json, photos, updatedAt: serverTimestamp() });
}

export async function withdrawMap(code: string, mapId: string): Promise<void> {
  init();
  const mapRef = doc(db, "classes", code, "maps", mapId);
  const s = await getDoc(mapRef);
  for (const uid of (s.exists() ? s.data().photos ?? [] : []) as string[]) await deleteDoc(doc(mapRef, "photos", uid));
  await deleteDoc(mapRef);
}

/* ---------- students ---------- */

/** Download a class's maps and store their photos locally (so they also work offline). */
export async function downloadClass(code: string): Promise<{ name: string; maps: MapDef[] } | null> {
  init();
  const cls = await getClass(code);
  if (!cls) return null;
  const maps: MapDef[] = [];
  for (const pm of await publishedMaps(code)) {
    let m: MapDef;
    try { m = JSON.parse(pm.json); } catch { continue; }
    if (m.id !== pm.id) continue;
    maps.push(m);
    for (const uid of pm.photos) {
      const s = await getDoc(doc(db, "classes", code, "maps", pm.id, "photos", uid));
      if (s.exists()) await putPhoto(photoKey(m.id, uid), fromBase64(s.data().data)).catch(() => undefined);
    }
  }
  return { name: cls.name, maps };
}
