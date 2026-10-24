import { POSTS } from "../../data/posts";
import { parseNumber } from "../../logic/parseNumber";
import { LIMITS, MAX_ERRORS, MAX_HINTS, toTrailFile, validateTrail, type PostContent, type TrailFile } from "../../logic/trail";
import { customTrail, posts } from "../../state";
import { clearCustomTrail, saveCustomTrail } from "../../store";
import { esc } from "../dom";

/* "Isi pos" tab: edit the six posts' text, ranges, hints and error patterns; export/import as JSON. */

/** Unsaved edits survive switching tabs or posts. */
let draft: PostContent[] | null = null;
let sel = 0;

const num = (v: number) => (typeof v === "number" && isFinite(v) ? String(v).replace(".", ",") : "");
const file = (): TrailFile => ({ ...toTrailFile(posts), posts: draft! });

export function renderEditor(el: HTMLElement, msg = ""): void {
  draft ??= toTrailFile(posts).posts;
  const p = draft[sel];
  const input = (f: keyof PostContent, label: string, lim: number, cls = "") =>
    `<label class="ed-f ${cls}"><span>${label}</span><input data-f="${f}" maxlength="${lim}" value="${esc(p[f] as string)}"></label>`;
  const area = (f: keyof PostContent, label: string, lim: number) =>
    `<label class="ed-f wide"><span>${label}</span><textarea data-f="${f}" maxlength="${lim}">${esc(p[f] as string)}</textarea></label>`;

  el.innerHTML = `<p class="sub">${customTrail ? "Isi pos buatan guru sedang dipakai di laptop ini." : "Pos bawaan sedang dipakai."} Posisi pos di peta tetap. Bila objek diganti, unggah juga fotonya di tab Foto pos.</p>
    <nav class="subtabs" aria-label="Pilih pos">${draft.map((q, i) => `<button type="button" data-sel="${i}" aria-pressed="${i === sel}">Pos ${q.id}</button>`).join("")}</nav>
    <form class="ed" id="edForm" autocomplete="off">
      ${input("title", "Judul", LIMITS.title)}${input("place", "Tempat", LIMITS.place)}
      ${input("concept", "Konsep", LIMITS.concept)}${input("unit", "Satuan", LIMITS.unit, "short")}
      ${area("task", "Soal", LIMITS.task)}${area("note", "Catatan untuk siswa", LIMITS.note)}
      ${input("key", "Model rujukan (tampil setelah pos selesai)", LIMITS.key, "wide")}
      <fieldset class="ed-ranges wide"><legend>Rentang penilaian (pakai koma untuk desimal)</legend>
        <label>Hijau dari <input data-r="green.0" inputmode="decimal" value="${num(p.green[0])}"></label><label>sampai <input data-r="green.1" inputmode="decimal" value="${num(p.green[1])}"></label>
        <label>Oranye dari <input data-r="orange.0" inputmode="decimal" value="${num(p.orange[0])}"></label><label>sampai <input data-r="orange.1" inputmode="decimal" value="${num(p.orange[1])}"></label>
      </fieldset>
      <fieldset class="wide"><legend>Petunjuk (dibuka berurutan, −15 poin per petunjuk kecuali Pos 0)</legend>
        ${p.hints.map((h, i) => `<div class="ed-row"><b>P${i + 1}</b><textarea data-h="${i}" maxlength="${LIMITS.hint}" aria-label="Petunjuk ${i + 1}">${esc(h)}</textarea>${p.hints.length > 1 ? `<button type="button" class="btn ghost" data-hdel="${i}" aria-label="Hapus petunjuk ${i + 1}">Hapus</button>` : ""}</div>`).join("")}
        ${p.hints.length < MAX_HINTS ? `<button type="button" class="btn" id="hintAdd">Tambah petunjuk</button>` : ""}
      </fieldset>
      <fieldset class="wide"><legend>Kesalahan umum: bila |jawaban − nilai| ≤ toleransi, siswa melihat pesan ini</legend>
        ${p.errors.map((e, i) => `<div class="ed-row err"><input data-ev="${i}" inputmode="decimal" value="${num(e.v)}" aria-label="Nilai kesalahan ${i + 1}" placeholder="nilai"><span>±</span><input data-et="${i}" inputmode="decimal" value="${num(e.t)}" aria-label="Toleransi kesalahan ${i + 1}" placeholder="toleransi"><input data-em="${i}" maxlength="${LIMITS.msg}" value="${esc(e.m)}" aria-label="Pesan kesalahan ${i + 1}" placeholder="pesan untuk siswa"><button type="button" class="btn ghost" data-edel="${i}" aria-label="Hapus kesalahan ${i + 1}">Hapus</button></div>`).join("")}
        ${p.errors.length < MAX_ERRORS ? `<button type="button" class="btn" id="errAdd">Tambah kesalahan</button>` : ""}
      </fieldset>
    </form>
    <div class="ed-msg" id="edMsg" aria-live="polite">${msg}</div>
    <div class="row">
      <button class="btn primary" type="button" id="edSave">Simpan &amp; terapkan</button>
      <button class="btn" type="button" id="edUndo">Batalkan perubahan</button>
      <span class="spacer"></span>
      <button class="btn" type="button" id="edExport">Ekspor JSON</button>
      <label class="btn">Impor JSON<input type="file" accept="application/json,.json" id="edImport" hidden></label>
      <button class="btn ghost" type="button" id="edDefault">Kembalikan pos bawaan</button>
    </div>
    <small>Mengubah kunci jawaban tidak mengubah poin yang sudah diperoleh kelompok. Berkas JSON bisa dibagikan ke laptop lain lewat Impor JSON.</small>`;

  const rerender = (m = "") => renderEditor(el, m);
  const showErrors = (errors: string[]) =>
    ($("edMsg").innerHTML = `<b>Belum bisa disimpan:</b><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`);
  function $(id: string) { return el.querySelector<HTMLElement>("#" + id)!; }

  el.querySelector(".subtabs")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-sel]");
    if (b) { sel = +b.dataset.sel!; rerender(); }
  });

  const form = $("edForm");
  form.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement, d = t.dataset;
    const n = () => parseNumber(t.value);
    if (d.f) (p as unknown as Record<string, string>)[d.f] = t.value;
    else if (d.r) { const [k, i] = d.r.split(".") as ["green" | "orange", string]; p[k][+i] = n(); }
    else if (d.h) p.hints[+d.h] = t.value;
    else if (d.ev) p.errors[+d.ev].v = n();
    else if (d.et) p.errors[+d.et].t = n();
    else if (d.em) p.errors[+d.em].m = t.value;
  });
  form.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!t) return;
    if (t.id === "hintAdd") p.hints.push("");
    else if (t.id === "errAdd") p.errors.push({ v: NaN, t: NaN, m: "" });
    else if (t.dataset.hdel) p.hints.splice(+t.dataset.hdel, 1);
    else if (t.dataset.edel) p.errors.splice(+t.dataset.edel, 1);
    else return;
    rerender();
  });

  $("edSave").onclick = () => {
    const { trail, errors } = validateTrail(file(), POSTS);
    if (!trail) { showErrors(errors); return; }
    try { saveCustomTrail(toTrailFile(trail)); } catch { showErrors(["Penyimpanan browser penuh atau tidak tersedia."]); return; }
    $("edMsg").textContent = "Tersimpan. Memuat ulang GeoTrails…";
    setTimeout(() => location.reload(), 600);
  };
  $("edUndo").onclick = () => { draft = null; rerender("Perubahan yang belum disimpan dibatalkan."); };
  $("edExport").onclick = () => {
    const { trail, errors } = validateTrail(file(), POSTS);
    if (!trail) { showErrors(errors); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(toTrailFile(trail), null, 2)], { type: "application/json" }));
    a.download = "geotrails-isi-pos.json";
    document.body.appendChild(a); a.click(); a.remove();
  };
  $("edImport").addEventListener("change", async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    let data: unknown;
    try { data = JSON.parse(await f.text()); } catch { showErrors(["Berkas JSON tidak bisa dibaca."]); return; }
    const { trail, errors } = validateTrail(data, POSTS);
    if (!trail) { showErrors(errors); return; }
    draft = toTrailFile(trail).posts;
    rerender("Berkas dimuat. Periksa isinya, lalu klik Simpan &amp; terapkan.");
  });
  let armed = false;
  $("edDefault").onclick = () => {
    const b = $("edDefault");
    if (!armed) {
      armed = true; b.textContent = "Yakin? Klik lagi"; b.classList.add("tape");
      setTimeout(() => { armed = false; if (b.isConnected) { b.textContent = "Kembalikan pos bawaan"; b.classList.remove("tape"); } }, 4000);
      return;
    }
    clearCustomTrail();
    location.reload();
  };
}
