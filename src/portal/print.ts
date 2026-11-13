import type { MapDef, MapPost } from "../map/mapdef";
import { minimap } from "../map/minimap";
import { loadPhotos, photoFor } from "../map/photos";
import { SCENES } from "../ui/scenes";
import { esc } from "../ui/dom";

/*
 * Printable worksheet for the physical trail: an overview of the map with the post numbers, then
 * one block per post (photo, task, a table for field measurements, room for the model and the
 * calculation, the final answer). Printed with the browser's own dialog, which also saves it as a
 * PDF; no library and no internet needed. The answer key is only included when the teacher asks.
 */

const num = (v: number): string => String(v).replace(".", ",");

/** Map overview with numbered posts, as an image (canvas → PNG). */
function overview(m: MapDef): string {
  const px = Math.max(6, Math.min(14, Math.floor(640 / m.cols)));
  const cv = minimap(m, px), ctx = cv.getContext("2d")!;
  ctx.font = `700 ${Math.round(px * 1.1)}px "JetBrains Mono", monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  m.posts.forEach((p, i) => {
    const x = (p.x + .5) * px, y = (p.y + .5) * px, r = px * 1.05;
    ctx.fillStyle = "#F2B705"; ctx.strokeStyle = "#2A2200"; ctx.lineWidth = Math.max(1, px / 6);
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2A2200"; ctx.fillText(String(i), x, y + 1);
  });
  return cv.toDataURL("image/png");
}

function picture(m: MapDef, p: MapPost): string {
  const ph = photoFor(m.id, p.uid);
  if (ph) return `<img class="ps-photo" src="${esc(ph.url)}" alt="Foto ${esc(p.title)}">`;
  if (p.scene != null && SCENES[p.scene]) return `<div class="ps-photo ps-scene">${SCENES[p.scene]()}</div>`;
  return "";
}

function postBlock(m: MapDef, p: MapPost, i: number, withKey: boolean): string {
  return `<section class="ps-post">
    <header><span class="ps-no">Pos ${i}</span><b>${esc(p.title)}</b><small>${esc(p.place)}${p.concept ? ` · ${esc(p.concept)}` : ""}</small></header>
    <div class="ps-body">
      ${picture(m, p)}
      <div class="ps-text">
        <p class="ps-task">${esc(p.task)}</p>
        ${p.note ? `<p class="ps-note">${esc(p.note)}</p>` : ""}
        ${i === 0 ? `<p class="ps-note">Pos pembuka: kerjakan pos ini lebih dulu.</p>` : ""}
      </div>
    </div>
    <table class="ps-table"><thead><tr><th>Yang diukur di lapangan</th><th>Hasil ukur</th><th>Satuan</th></tr></thead>
      <tbody>${"<tr><td></td><td></td><td></td></tr>".repeat(3)}</tbody></table>
    <div class="ps-work"><span>Model dan perhitungan</span></div>
    <p class="ps-answer">Jawaban akhir: <span class="ps-line"></span> ${esc(p.unit)}</p>
    ${withKey ? `<div class="ps-key"><b>Kunci (untuk guru)</b>
      <span>Model rujukan: ${esc(p.key)}</span>
      <span>Hijau ${num(p.green[0])}–${num(p.green[1])} ${esc(p.unit)} · Oranye ${num(p.orange[0])}–${num(p.orange[1])} ${esc(p.unit)}</span>
      ${p.hints.length ? `<span>Petunjuk: ${p.hints.map((h, k) => `P${k + 1}. ${esc(h)}`).join(" ")}</span>` : ""}
    </div>` : ""}
  </section>`;
}

/** The whole worksheet as HTML (also used by the tests). */
export function worksheetHtml(m: MapDef, withKey: boolean, overviewSrc = ""): string {
  return `<header class="ps-head">
      <div><h1>${esc(m.name)}</h1><p>Lembar kerja GeoTrails · ${m.posts.length} pos${withKey ? " · <b>dengan kunci jawaban (untuk guru)</b>" : ""}</p></div>
      <div class="ps-group"><span>Nama kelompok</span><span class="ps-line"></span><small>Jangan menulis data pribadi.</small></div>
    </header>
    ${overviewSrc ? `<figure class="ps-map"><img src="${overviewSrc}" alt="Denah ${esc(m.name)} dengan nomor pos"><figcaption>Denah dan letak pos. Mulai dari Pos 0.</figcaption></figure>` : ""}
    ${m.posts.map((p, i) => postBlock(m, p, i, withKey)).join("")}`;
}

/** Open the print preview for a map. */
export async function showPrint(m: MapDef): Promise<void> {
  document.getElementById("printOv")?.remove();
  const ov = document.createElement("div");
  ov.id = "printOv"; ov.className = "print-ov";
  ov.innerHTML = `<div class="print-bar" role="toolbar" aria-label="Cetak lembar kerja">
      <b>Lembar kerja: ${esc(m.name)}</b>
      <label class="check"><input type="checkbox" id="printKey"> Sertakan kunci jawaban (untuk guru)</label>
      <button class="btn primary" id="printGo">Cetak / Simpan PDF</button>
      <button class="btn ghost" id="printClose">Tutup</button>
      <small>Di dialog cetak, pilih "Simpan sebagai PDF" untuk mendapat file PDF.</small>
    </div>
    <article class="print-sheet" id="printSheet"><p>Menyiapkan lembar kerja…</p></article>`;
  document.body.appendChild(ov);
  document.body.classList.add("printing");
  const close = () => { ov.remove(); document.body.classList.remove("printing"); };
  ov.querySelector<HTMLButtonElement>("#printClose")!.onclick = close;

  await loadPhotos(m).catch(() => undefined);
  const src = overview(m), sheet = ov.querySelector<HTMLElement>("#printSheet")!;
  const render = () => { sheet.innerHTML = worksheetHtml(m, ov.querySelector<HTMLInputElement>("#printKey")!.checked, src); };
  render();
  ov.querySelector<HTMLInputElement>("#printKey")!.onchange = render;
  ov.querySelector<HTMLButtonElement>("#printGo")!.onclick = async () => {
    // Wait for every photo, so none is missing from the printout.
    await Promise.all([...sheet.querySelectorAll("img")].map((img) => img.decode().catch(() => undefined)));
    window.print();
  };
}
