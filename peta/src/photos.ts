import { fitWithin, maxSide } from "../../src/logic/image";
import type { MapDef } from "./mapdef";
import { deletePhoto, getPhoto, photoKey, putPhoto } from "./store";

/*
 * Post photos for the Peta app. Priority: teacher upload for this map (IndexedDB) →
 * for posts copied from Basic, the bundled public/posts/pos-<n>.jpg → none (the post
 * then shows its built-in illustration, or a "no photo yet" card).
 */

export interface Photo { url: string; w: number; h: number; source: "upload" | "bundled" }

const photos = new Map<string, Photo>();

export const photoFor = (mapId: string, uid: string): Photo | undefined => photos.get(photoKey(mapId, uid));

const measure = (url: string): Promise<{ w: number; h: number } | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });

async function load(mapId: string, uid: string, scene: number | undefined, base: string): Promise<void> {
  const key = photoKey(mapId, uid), old = photos.get(key);
  if (old?.source === "upload") URL.revokeObjectURL(old.url);
  photos.delete(key);
  try {
    const blob = await getPhoto(key);
    if (blob) {
      const url = URL.createObjectURL(blob), size = await measure(url);
      if (size) { photos.set(key, { url, ...size, source: "upload" }); return; }
      URL.revokeObjectURL(url);
    }
  } catch { /* IndexedDB unavailable */ }
  if (scene == null) return;
  const url = `${base}pos-${scene}.jpg`, size = await measure(url);
  if (size) photos.set(key, { url, ...size, source: "bundled" });
}

/** `base`: folder of the bundled photos relative to the page (the Peta pages live in /peta/). */
export const loadPhotos = (m: MapDef, base = "../posts/"): Promise<void> =>
  Promise.all(m.posts.map((p) => load(m.id, p.uid, p.scene, base))).then(() => undefined);

export async function uploadPhoto(m: MapDef, uid: string, file: File): Promise<void> {
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { throw new Error("Berkas ini tidak bisa dibaca sebagai gambar. Gunakan JPG atau PNG."); }
  const [w, h] = fitWithin(bmp.width, bmp.height, maxSide(bmp.width, bmp.height));
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  cv.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Gambar gagal diproses.");
  await putPhoto(photoKey(m.id, uid), blob);
  const p = m.posts.find((q) => q.uid === uid);
  await load(m.id, uid, p?.scene, "../posts/");
}

export async function removeUpload(m: MapDef, uid: string): Promise<void> {
  await deletePhoto(photoKey(m.id, uid));
  const p = m.posts.find((q) => q.uid === uid);
  await load(m.id, uid, p?.scene, "../posts/");
}
