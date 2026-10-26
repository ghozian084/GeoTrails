import { LIMITS, MAX_ERRORS, MAX_HINTS } from "../../../src/logic/trail";
import { parseNumber } from "../../../src/logic/parseNumber";
import { esc } from "../../../src/ui/dom";
import type { MapDef, MapPost } from "../mapdef";
import { photoFor, removeUpload, uploadPhoto } from "../photos";

/*
 * Form for one post's content in the map editor. Edits are written straight into `post`;
 * `changed(structural)` is called after every edit (structural = the form must be redrawn).
 */

const num = (v: number) => (typeof v === "number" && isFinite(v) ? String(v).replace(".", ",") : "");

export interface PostFormActions {
  changed(structural: boolean): void;
  move(): void;
  up(): void;
  down(): void;
  remove(): void;
}

export function postForm(el: HTMLElement, m: MapDef, index: number, act: PostFormActions): void {
  const p: MapPost = m.posts[index];
  const photo = photoFor(m.id, p.uid);
  const input = (f: keyof MapPost, label: string, lim: number) =>
    `<label class="ed-f"><span>${label}</span><input data-f="${f}" maxlength="${lim}" value="${esc(p[f] as string)}"></label>`;
  const area = (f: keyof MapPost, label: string, lim: number) =>
    `<label class="ed-f"><span>${label}</span><textarea data-f="${f}" maxlength="${lim}">${esc(p[f] as string)}</textarea></label>`;

  el.innerHTML = `<div class="pf-head"><span class="chip">POS ${index}</span><b>${esc(p.title || "Pos tanpa judul")}</b></div>
    ${index === 0 ? `<p class="pf-note">Pos 0 adalah pos pembuka: pos lain terbuka setelah Pos 0 selesai, dan petunjuk di Pos 0 gratis.</p>` : ""}
    <div class="row pf-actions">
      <button type="button" class="btn" data-a="move">Pindahkan</button>
      <button type="button" class="btn ghost" data-a="up" ${index === 0 ? "disabled" : ""} aria-label="Naikkan urutan">Naik</button>
      <button type="button" class="btn ghost" data-a="down" ${index === m.posts.length - 1 ? "disabled" : ""} aria-label="Turunkan urutan">Turun</button>
      <button type="button" class="btn ghost" data-a="remove">Hapus pos</button>
    </div>
    <div class="pf-photo">
      ${photo ? `<img src="${esc(photo.url)}" alt="">` : `<span>${p.scene != null ? "Memakai ilustrasi bawaan" : "Belum ada foto"}</span>`}
      <div class="row">
        <label class="btn">Pilih foto<input type="file" accept="image/*" hidden data-photo></label>
        ${photo?.source === "upload" ? `<button type="button" class="btn ghost" data-a="nophoto">Hapus foto</button>` : ""}
      </div>
      <small class="pf-msg" data-msg></small>
    </div>
    <form class="pf" autocomplete="off">
      ${input("title", "Judul", LIMITS.title)}${input("place", "Tempat", LIMITS.place)}
      ${input("concept", "Konsep", LIMITS.concept)}${input("unit", "Satuan", LIMITS.unit)}
      ${area("task", "Soal", LIMITS.task)}${area("note", "Catatan untuk siswa", LIMITS.note)}
      ${input("key", "Model rujukan (tampil setelah pos selesai)", LIMITS.key)}
      <fieldset><legend>Rentang penilaian (koma untuk desimal)</legend>
        <div class="pf-ranges">
          <label>Hijau dari <input data-r="green.0" inputmode="decimal" value="${num(p.green[0])}"></label><label>sampai <input data-r="green.1" inputmode="decimal" value="${num(p.green[1])}"></label>
          <label>Oranye dari <input data-r="orange.0" inputmode="decimal" value="${num(p.orange[0])}"></label><label>sampai <input data-r="orange.1" inputmode="decimal" value="${num(p.orange[1])}"></label>
        </div>
      </fieldset>
      <fieldset><legend>Petunjuk</legend>
        ${p.hints.map((h, i) => `<div class="ed-row"><b>P${i + 1}</b><textarea data-h="${i}" maxlength="${LIMITS.hint}" aria-label="Petunjuk ${i + 1}">${esc(h)}</textarea>${p.hints.length > 1 ? `<button type="button" class="btn ghost" data-hdel="${i}" aria-label="Hapus petunjuk ${i + 1}">×</button>` : ""}</div>`).join("")}
        ${p.hints.length < MAX_HINTS ? `<button type="button" class="btn" data-a="hint">Tambah petunjuk</button>` : ""}
      </fieldset>
      <fieldset><legend>Kesalahan umum (nilai ± toleransi → pesan)</legend>
        ${p.errors.map((e, i) => `<div class="pf-err"><input data-ev="${i}" inputmode="decimal" value="${num(e.v)}" placeholder="nilai" aria-label="Nilai kesalahan ${i + 1}"><span>±</span><input data-et="${i}" inputmode="decimal" value="${num(e.t)}" placeholder="toleransi" aria-label="Toleransi kesalahan ${i + 1}"><button type="button" class="btn ghost" data-edel="${i}" aria-label="Hapus kesalahan ${i + 1}">×</button><input data-em="${i}" maxlength="${LIMITS.msg}" value="${esc(e.m)}" placeholder="pesan untuk siswa" aria-label="Pesan kesalahan ${i + 1}"></div>`).join("")}
        ${p.errors.length < MAX_ERRORS ? `<button type="button" class="btn" data-a="err">Tambah kesalahan</button>` : ""}
      </fieldset>
    </form>`;

  el.querySelector("form")!.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement, d = t.dataset, n = () => parseNumber(t.value);
    if (d.f) (p as unknown as Record<string, string>)[d.f] = t.value;
    else if (d.r) { const [k, i] = d.r.split(".") as ["green" | "orange", string]; p[k][+i] = n(); }
    else if (d.h) p.hints[+d.h] = t.value;
    else if (d.ev) p.errors[+d.ev].v = n();
    else if (d.et) p.errors[+d.et].t = n();
    else if (d.em) p.errors[+d.em].m = t.value;
    else return;
    if (d.f === "title") el.querySelector(".pf-head b")!.textContent = t.value || "Pos tanpa judul";
    act.changed(false);
  });

  el.addEventListener("click", async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b) return;
    const a = b.dataset.a;
    if (a === "move") act.move();
    else if (a === "up") act.up();
    else if (a === "down") act.down();
    else if (a === "remove") {
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Yakin? Klik lagi"; b.classList.add("tape"); return; }
      act.remove();
    } else if (a === "hint") { p.hints.push(""); act.changed(true); }
    else if (a === "err") { p.errors.push({ v: NaN, t: NaN, m: "" }); act.changed(true); }
    else if (b.dataset.hdel) { p.hints.splice(+b.dataset.hdel, 1); act.changed(true); }
    else if (b.dataset.edel) { p.errors.splice(+b.dataset.edel, 1); act.changed(true); }
    else if (a === "nophoto") { await removeUpload(m, p.uid); act.changed(true); }
  });

  el.querySelector<HTMLInputElement>("[data-photo]")!.addEventListener("change", async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0], msg = el.querySelector<HTMLElement>("[data-msg]")!;
    if (!f) return;
    msg.textContent = "Memproses foto…";
    try { await uploadPhoto(m, p.uid, f); act.changed(true); }
    catch (err) { msg.textContent = err instanceof Error ? err.message : "Foto gagal disimpan."; }
  });
}
