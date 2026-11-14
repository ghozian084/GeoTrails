import { fitWithin, maxSide } from "../core/image";
import { markBox, type PhotoMark } from "./figures";
import type { MapDef } from "./mapdef";
import { deletePhoto, getPhoto, photoKey, putPhoto } from "./store";

/*
 * Post photos for the Peta app. Priority: teacher upload for this map (IndexedDB) →
 * for posts copied from Basic, the bundled public/posts/pos-<n>.jpg → none (the post
 * then shows its built-in illustration, or a "no photo yet" card).
 * When the teacher placed labels on the photo, `url` is a copy with the labels drawn in
 * (students, panorama, worksheet) and `raw` the photo itself (the editor draws its own labels).
 */

export interface Photo { url: string; raw: string; w: number; h: number; source: "upload" | "bundled" }

const photos = new Map<string, Photo>();

export const photoFor = (mapId: string, uid: string): Photo | undefined => photos.get(photoKey(mapId, uid));

const measure = (url: string): Promise<{ w: number; h: number } | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });

const revoke = (u: string) => { if (u.startsWith("blob:")) URL.revokeObjectURL(u); };

/** The photo with the teacher's labels drawn in (same layout as the editor overlay). */
async function withMarks(src: string, w: number, h: number, marks: PhotoMark[]): Promise<string> {
  await document.fonts?.load('700 20px "JetBrains Mono"').catch(() => undefined);
  const img = new Image();
  img.src = src;
  await img.decode();
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  for (const m of marks) {
    const b = markBox(m, w, h), sw = Math.max(1.5, b.fs * .12);
    ctx.strokeStyle = "#2A2200"; ctx.lineWidth = sw;
    if (b.pointer) {
      ctx.setLineDash([b.fs * .35, b.fs * .28]);
      ctx.beginPath(); ctx.moveTo(b.lx, b.ly); ctx.lineTo(b.ax, b.ay); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "#F7C948";
    ctx.beginPath(); ctx.arc(b.ax, b.ay, b.fs * .38, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, b.fs * .25); ctx.fill(); ctx.lineWidth = sw * .8; ctx.stroke();
    ctx.fillStyle = "#2A2200"; ctx.font = `700 ${b.fs}px "JetBrains Mono", Menlo, monospace`;
    ctx.fillText(b.text, b.x + b.pad, b.y + b.h * .68);
  }
  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/jpeg", .9));
  return blob ? URL.createObjectURL(blob) : src;
}

async function load(mapId: string, uid: string, scene: number | undefined, base: string, marks: PhotoMark[] = []): Promise<void> {
  const key = photoKey(mapId, uid), old = photos.get(key);
  if (old) { revoke(old.raw); if (old.url !== old.raw) revoke(old.url); }
  photos.delete(key);
  let found: Omit<Photo, "url"> | null = null;
  try {
    const blob = await getPhoto(key);
    if (blob) {
      const raw = URL.createObjectURL(blob), size = await measure(raw);
      if (size) found = { raw, ...size, source: "upload" }; else URL.revokeObjectURL(raw);
    }
  } catch { /* IndexedDB unavailable */ }
  if (!found && scene != null) {
    const raw = `${base}pos-${scene}.jpg`, size = await measure(raw);
    if (size) found = { raw, ...size, source: "bundled" };
  }
  if (!found) return;
  const url = marks.length ? await withMarks(found.raw, found.w, found.h, marks).catch(() => found!.raw) : found.raw;
  photos.set(key, { ...found, url });
}

/** `base`: folder of the bundled photos relative to the page (the student pages live at the site root). */
export const loadPhotos = (m: MapDef, base = "posts/"): Promise<void> =>
  Promise.all(m.posts.map((p) => load(m.id, p.uid, p.scene, base, p.marks))).then(() => undefined);

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
  await load(m.id, uid, p?.scene, "posts/", p?.marks);
}

export async function removeUpload(m: MapDef, uid: string): Promise<void> {
  await deletePhoto(photoKey(m.id, uid));
  const p = m.posts.find((q) => q.uid === uid);
  await load(m.id, uid, p?.scene, "posts/", p?.marks);
}
