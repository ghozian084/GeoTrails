import { isPanorama, PANO_RATIO } from "../../logic/image";
import { posts } from "../../state";
import { esc, fmt } from "../dom";
import { photoFor, removeUpload, uploadPhoto } from "../photos";
import { SCENES } from "../scenes";

const SOURCE = { upload: "Foto unggahan (laptop ini)", bundled: "Foto bawaan aplikasi" };

/** Upload or remove a real photo per post. */
export function renderPhotos(el: HTMLElement): void {
  el.innerHTML = `<p class="sub">Ganti ilustrasi dengan foto asli objek di sekolah. Foto unggahan disimpan hanya di browser laptop ini dan diperkecil otomatis.</p>
    <ul class="tips">
      <li>Foto lebar (minimal ${fmt(PANO_RATIO, 1)} : 1, misalnya mode panorama di HP) tampil sebagai panorama yang bisa digeser.</li>
      <li>Label data pada ilustrasi tidak ikut tampil. Pastikan data ukur yang diperlukan terlihat atau tertulis di foto, atau tulis di catatan pos (tab Isi pos).</li>
      <li>Agar foto dipakai di semua laptop, simpan sebagai <code>public/posts/pos-&lt;nomor&gt;.jpg</code> di proyek lalu deploy ulang.</li>
    </ul>
    <div class="photo-grid">${posts.map((p) => {
      const ph = photoFor(p.id);
      const thumb = ph ? `<img src="${esc(ph.url)}" alt="">` : SCENES[p.id]();
      return `<article class="photo-card">
        <div class="thumb">${thumb}</div>
        <div class="photo-info">
          <h3><span class="chip">POS ${p.id}</span>${esc(p.title)}</h3>
          <small>${ph ? `${SOURCE[ph.source]} · ${ph.w}×${ph.h}${isPanorama(ph.w, ph.h) ? " · panorama" : ""}` : "Ilustrasi bawaan"}</small>
          <div class="row">
            <label class="btn">Pilih foto<input type="file" accept="image/*" data-id="${p.id}" hidden></label>
            ${ph?.source === "upload" ? `<button class="btn ghost" type="button" data-del="${p.id}">Hapus unggahan</button>` : ""}
          </div>
          <small class="photo-msg" id="photoMsg${p.id}" aria-live="polite"></small>
        </div>
      </article>`;
    }).join("")}</div>`;

  el.querySelectorAll<HTMLInputElement>("input[type=file]").forEach((inp) =>
    inp.addEventListener("change", async () => {
      const id = +inp.dataset.id!, file = inp.files?.[0];
      if (!file) return;
      const msg = el.querySelector<HTMLElement>(`#photoMsg${id}`)!;
      msg.textContent = "Memproses foto…";
      try { await uploadPhoto(id, file); renderPhotos(el); }
      catch (e) { msg.textContent = e instanceof Error ? e.message : "Foto gagal disimpan."; }
    }),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-del]").forEach((b) =>
    (b.onclick = async () => { await removeUpload(+b.dataset.del!); renderPhotos(el); }),
  );
}
