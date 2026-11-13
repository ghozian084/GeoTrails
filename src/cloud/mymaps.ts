import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import type { MapDef } from "../map/mapdef";
import { clearTombstone, customMaps, deletePhoto, getPhoto, photoKey, putPhoto, removeLocalMap, saveMap, tombstones } from "../map/store";
import { firebase, fitPhoto, fromBase64 } from "./client";

/*
 * The teacher's own maps, kept in their Google account so they can work on any device:
 *   teachers/{uid}/maps/{mapId}                  { name, json, photos: {postUid: sig}, updatedAt, deleted }
 *   teachers/{uid}/maps/{mapId}/photos/{postUid} { data: base64 JPEG, type }
 * The copy changed last wins (updatedAt). A deleted map stays as a small "deleted" document
 * so other devices remove their copy too. Photos are only sent when they changed (sig).
 */

interface CloudMap { name: string; json: string; photos: Record<string, string>; updatedAt: number; deleted: boolean }

export interface SyncResult { downloaded: number; uploaded: number; removed: number }

/** Short content hash of a photo, to send only photos that changed. */
async function sig(blob: Blob): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
  return [...h.slice(0, 10)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const localSig = async (mapId: string, postUid: string): Promise<string | null> => {
  const b = await getPhoto(photoKey(mapId, postUid)).catch(() => undefined);
  return b ? sig(b) : null;
};

/**
 * Bring this device and the teacher's account in line. `download` = also take maps that are
 * newer in the account (off while a map is open in the editor, so it is not replaced underneath).
 * `editing`: the map open in the editor, never replaced or removed here.
 */
export async function syncMaps(uid: string, download: boolean, editing: string | null): Promise<SyncResult> {
  const { db } = firebase();
  const mapsCol = collection(db, "teachers", uid, "maps");
  const mapRef = (id: string) => doc(mapsCol, id);
  const photoRef = (id: string, p: string) => doc(mapsCol, id, "photos", p);
  const res: SyncResult = { downloaded: 0, uploaded: 0, removed: 0 };

  const cloud = new Map<string, CloudMap>();
  for (const d of (await getDocs(mapsCol)).docs) cloud.set(d.id, d.data() as CloudMap);

  // 1. Maps deleted on this device: mark them deleted in the account (unless changed there later).
  for (const t of tombstones()) {
    const c = cloud.get(t.id);
    if (!c || (!c.deleted && c.updatedAt <= t.at)) {
      await Promise.all(Object.keys(c?.photos ?? {}).map((p) => deleteDoc(photoRef(t.id, p))));
      const gone: CloudMap = { name: "", json: "", photos: {}, updatedAt: t.at, deleted: true };
      await setDoc(mapRef(t.id), gone);
      cloud.set(t.id, gone);
    }
    clearTombstone(t.id);
  }

  // 2. Newer in the account: take it (or remove this device's copy if it was deleted there).
  if (download) {
    for (const [id, c] of cloud) {
      if (id === editing) continue;
      const local = customMaps().find((m) => m.id === id), at = local?.updatedAt ?? 0;
      if (c.deleted) {
        if (local && at <= c.updatedAt) { removeLocalMap(id); res.removed++; }
        continue;
      }
      if (local && at >= c.updatedAt) continue;
      let m: MapDef;
      try { m = JSON.parse(c.json); } catch { continue; }
      if (m.id !== id) continue;
      for (const p of m.posts) {
        const want = c.photos[p.uid];
        if (!want) { if (await localSig(id, p.uid)) await deletePhoto(photoKey(id, p.uid)); continue; }
        if ((await localSig(id, p.uid)) === want) continue;
        const s = await getDoc(photoRef(id, p.uid));
        if (s.exists()) await putPhoto(photoKey(id, p.uid), fromBase64(s.data().data));
      }
      saveMap({ ...m, updatedAt: c.updatedAt }, false);
      res.downloaded++;
    }
  }

  // 3. Newer on this device (or not in the account yet): send it, with the photos that changed.
  for (const m of customMaps()) {
    const c = cloud.get(m.id);
    if (!m.updatedAt) { m.updatedAt = Date.now(); saveMap(m, false); }
    if (c && m.updatedAt <= c.updatedAt) continue;
    const photos: Record<string, string> = {};
    for (const p of m.posts) {
      const blob = await getPhoto(photoKey(m.id, p.uid)).catch(() => undefined);
      if (!blob) continue;
      let s = await sig(blob);
      if (c?.photos?.[p.uid] !== s) {
        const data = await fitPhoto(blob);
        const sent = fromBase64(data);
        // Keep the exact bytes that were sent, so every device sees the same photo signature.
        if (sent.size !== blob.size) { await putPhoto(photoKey(m.id, p.uid), sent); s = await sig(sent); }
        await setDoc(photoRef(m.id, p.uid), { data, type: "image/jpeg" });
      }
      photos[p.uid] = s;
    }
    await Promise.all(Object.keys(c?.photos ?? {}).filter((p) => !photos[p]).map((p) => deleteDoc(photoRef(m.id, p))));
    await setDoc(mapRef(m.id), { name: m.name.slice(0, 60), json: JSON.stringify({ ...m, builtIn: undefined }), photos, updatedAt: m.updatedAt, deleted: false });
    res.uploaded++;
  }
  return res;
}
