import { fitWithin, maxSide } from "../logic/image";
import { deletePhoto, getPhoto, putPhoto } from "../store";

/*
 * Real photos for posts. Priority: teacher upload (IndexedDB, this laptop only) →
 * bundled file public/posts/pos-<id>.jpg (every laptop after deploy) → built-in illustration.
 */

export interface Photo {
  url: string;
  w: number;
  h: number;
  source: "upload" | "bundled";
}

const photos = new Map<number, Photo>();

export const photoFor = (id: number): Photo | undefined => photos.get(id);

const measure = (url: string): Promise<{ w: number; h: number } | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });

async function load(id: number): Promise<void> {
  const old = photos.get(id);
  if (old?.source === "upload") URL.revokeObjectURL(old.url);
  photos.delete(id);
  try {
    const blob = await getPhoto(id);
    if (blob) {
      const url = URL.createObjectURL(blob), size = await measure(url);
      if (size) { photos.set(id, { url, ...size, source: "upload" }); return; }
      URL.revokeObjectURL(url);
    }
  } catch { /* IndexedDB unavailable: fall through to the bundled photo */ }
  const url = `posts/pos-${id}.jpg`, size = await measure(url);
  if (size) photos.set(id, { url, ...size, source: "bundled" });
}

export const loadPhotos = (ids: number[]): Promise<void> => Promise.all(ids.map(load)).then(() => undefined);

/** Downscale an image file to JPEG and store it as the upload for a post. */
export async function uploadPhoto(id: number, file: File): Promise<void> {
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { throw new Error("Berkas ini tidak bisa dibaca sebagai gambar. Gunakan JPG atau PNG."); }
  const [w, h] = fitWithin(bmp.width, bmp.height, maxSide(bmp.width, bmp.height));
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  cv.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Gambar gagal diproses.");
  await putPhoto(id, blob);
  await load(id);
}

export async function removeUpload(id: number): Promise<void> {
  await deletePhoto(id);
  await load(id);
}
