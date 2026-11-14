import { LIMITS, MAX_ERRORS, MAX_HINTS } from "../core/trail";
import { parseNumber } from "../core/parseNumber";
import { esc } from "../ui/dom";
import type { MapDef, MapPost } from "../map/mapdef";
import { photoFor, removeUpload, uploadPhoto } from "../map/photos";
import { FIG_LIMITS, MARK_MAX, marksSvg, newFigure, newMark, renderFigure, TEMPLATES } from "../map/figures";

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
      ${photo ? `<div class="pf-photo-edit"><img src="${esc(photo.raw)}" alt=""><svg class="pf-marks" data-marks viewBox="0 0 ${photo.w} ${photo.h}" preserveAspectRatio="none">${marksSvg(p.marks ?? [], photo.w, photo.h)}</svg></div>` : `<span>${p.figure ? "Belum ada foto: memakai ilustrasi template di bawah" : p.scene != null ? "Memakai ilustrasi bawaan" : "Belum ada foto"}</span>`}
      <div class="row">
        <label class="btn">Pilih foto<input type="file" accept="image/*" hidden data-photo></label>
        ${photo?.source === "upload" ? `<button type="button" class="btn ghost" data-a="nophoto">Hapus foto</button>` : ""}
      </div>
      <small class="pf-msg" data-msg></small>
      ${photo ? `<fieldset class="pf-marks-ed"><legend>Label di foto</legend>
        <small>Tulis ukuran yang terlihat di foto. Seret kotak label untuk memindahkannya, dan seret titik kuning ke bagian yang diukur.</small>
        ${(p.marks ?? []).map((mk, i) => `<div class="pf-lbl pf-mk">
          <b>L${i + 1}</b>
          <input data-mn="${i}" maxlength="${FIG_LIMITS.name}" value="${esc(mk.name)}" placeholder="nama ukuran" aria-label="Nama label foto ${i + 1}">
          <input data-mv="${i}" maxlength="${FIG_LIMITS.value}" value="${esc(mk.value)}" placeholder="angka" aria-label="Angka label foto ${i + 1}">
          <input data-mu="${i}" maxlength="${FIG_LIMITS.unit}" value="${esc(mk.unit)}" placeholder="satuan" aria-label="Satuan label foto ${i + 1}">
          <button type="button" class="btn ghost" data-mdel="${i}" aria-label="Hapus label foto ${i + 1}">Hapus</button>
        </div>`).join("")}
        ${(p.marks?.length ?? 0) < MARK_MAX ? `<button type="button" class="btn" data-a="mark">Tambah label</button>` : ""}
      </fieldset>` : p.marks?.length ? `<small>Label di foto tersimpan, dan tampil lagi setelah foto dipilih.</small>` : ""}
    </div>
    <fieldset class="pf-fig"><legend>Ilustrasi template</legend>
      <small>Untuk pos yang belum punya foto: pilih objek, lalu isi label ukurannya. Bila ada foto, foto yang dipakai.</small>
      <select data-fig aria-label="Template ilustrasi">
        <option value="">Tanpa template</option>
        ${TEMPLATES.map((t) => `<option value="${t.id}" ${p.figure?.tpl === t.id ? "selected" : ""}>${esc(t.title)} · ${esc(t.desc)}</option>`).join("")}
      </select>
      ${p.figure ? `<div class="pf-fig-prev" data-figprev>${renderFigure(p.figure, p.title)}</div>
        <div class="pf-lbls">${p.figure.labels.map((l, i) => `<div class="pf-lbl">
          <label class="check"><input type="checkbox" data-fs="${i}" ${l.show ? "checked" : ""}> Tampil</label>
          <input data-fn="${i}" maxlength="${FIG_LIMITS.name}" value="${esc(l.name)}" placeholder="nama ukuran" aria-label="Nama label ${i + 1}">
          <input data-fv="${i}" maxlength="${FIG_LIMITS.value}" value="${esc(l.value)}" placeholder="angka" aria-label="Angka label ${i + 1}">
          <input data-fu="${i}" maxlength="${FIG_LIMITS.unit}" value="${esc(l.unit)}" placeholder="satuan" aria-label="Satuan label ${i + 1}">
        </div>`).join("")}</div>
        <small>Tidak semua label harus dipakai di soal: data pengecoh membuat siswa memilih data yang perlu.</small>` : ""}
    </fieldset>
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
    else if (a === "mark") { (p.marks ??= []).push(newMark(p.marks.length)); act.changed(true); }
    else if (b.dataset.mdel && p.marks) { p.marks.splice(+b.dataset.mdel, 1); if (!p.marks.length) delete p.marks; act.changed(true); }
  });

  // Labels on the photo: typing updates them, dragging moves a label or its pointer.
  const svg = el.querySelector<SVGSVGElement>("[data-marks]");
  const redrawMarks = () => { if (svg && photo) svg.innerHTML = marksSvg(p.marks ?? [], photo.w, photo.h); };
  el.querySelector(".pf-marks-ed")?.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement, d = t.dataset, mk = p.marks;
    if (!mk) return;
    if (d.mn) mk[+d.mn].name = t.value;
    else if (d.mv) mk[+d.mv].value = t.value;
    else if (d.mu) mk[+d.mu].unit = t.value;
    else return;
    redrawMarks(); act.changed(false);
  });
  if (svg) {
    let drag: { i: number; anchor: boolean; dx: number; dy: number } | null = null;
    const at = (e: PointerEvent) => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    svg.addEventListener("pointerdown", (e) => {
      const t = (e.target as Element).closest("[data-box],[data-anchor]");
      if (!t || !p.marks) return;
      const anchor = t.hasAttribute("data-anchor"), i = +(t.getAttribute(anchor ? "data-anchor" : "data-box") ?? 0), mk = p.marks[i], [x, y] = at(e);
      drag = anchor ? { i, anchor, dx: 0, dy: 0 } : { i, anchor, dx: mk.x - x, dy: mk.y - y };
      svg.setPointerCapture(e.pointerId); e.preventDefault();
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag || !p.marks) return;
      const [x, y] = at(e), mk = p.marks[drag.i];
      if (drag.anchor) { mk.ax = clamp(x); mk.ay = clamp(y); } else { mk.x = clamp(x + drag.dx); mk.y = clamp(y + drag.dy); }
      redrawMarks();
    });
    const end = () => { if (drag) { drag = null; act.changed(false); } };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
  }

  const fig = el.querySelector<HTMLFieldSetElement>(".pf-fig")!;
  fig.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches("[data-fig]")) {
      if (t.value) p.figure = newFigure(t.value); else delete p.figure;
      act.changed(true);
    } else if (t.dataset.fs && p.figure) { p.figure.labels[+t.dataset.fs].show = t.checked; redrawFig(); }
  });
  fig.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement, d = t.dataset, f = p.figure;
    if (!f) return;
    if (d.fn) f.labels[+d.fn].name = t.value;
    else if (d.fv) f.labels[+d.fv].value = t.value;
    else if (d.fu) f.labels[+d.fu].unit = t.value;
    else return;
    redrawFig();
  });
  function redrawFig() {
    const prev = el.querySelector<HTMLElement>("[data-figprev]");
    if (prev && p.figure) prev.innerHTML = renderFigure(p.figure, p.title);
    act.changed(false);
  }

  el.querySelector<HTMLInputElement>("[data-photo]")!.addEventListener("change", async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0], msg = el.querySelector<HTMLElement>("[data-msg]")!;
    if (!f) return;
    msg.textContent = "Memproses foto…";
    try { await uploadPhoto(m, p.uid, f); act.changed(true); }
    catch (err) { msg.textContent = err instanceof Error ? err.message : "Foto gagal disimpan."; }
  });
}
