import type { TeacherSettings } from "../../../src/types";
import { saveTeacher } from "../../../src/store";
import { $, esc, toast } from "../../../src/ui/dom";
import { copyOfBasic } from "../basic";
import { blankMap, cloneMap, newId } from "../mapdef";
import { minimap } from "../minimap";
import { allMaps, deleteMap, saveMap } from "../store";
import { mapProblems, SIZE } from "../validate";
import { showEditor } from "./editor";
import { classSection } from "./classes";
import { exportMap, parseMap } from "./io";

/* Portal home: every map with its status and actions. */

export function showList(el: HTMLElement, teacher: TeacherSettings, msg = ""): void {
  const maps = allMaps();
  history.replaceState(null, "", location.pathname);
  el.innerHTML = `<section class="portal-head">
      <div><h1>Daftar peta</h1><p class="sub">Siswa melihat peta yang ditampilkan di layar awal GeoTrails Peta. Peta Basic adalah denah sekolah bawaan.</p></div>
      <div class="row">
        <button class="btn primary" id="newMap">Peta baru</button>
        <label class="btn">Impor JSON<input type="file" accept=".json,application/json" id="importMap" hidden></label>
      </div>
    </section>
    ${msg ? `<p class="portal-msg">${msg}</p>` : ""}
    <form class="new-map" id="newForm" hidden>
      <h2>Peta baru</h2>
      <label>Nama <input id="nmName" maxlength="40" placeholder="contoh: Taman Kota" required></label>
      <label>Mulai dari
        <select id="nmFrom"><option value="blank">Peta kosong (rumput)</option><option value="basic">Salinan peta Basic</option></select>
      </label>
      <label>Kolom <input id="nmCols" type="number" min="${SIZE.minCols}" max="${SIZE.maxCols}" value="30"></label>
      <label>Baris <input id="nmRows" type="number" min="${SIZE.minRows}" max="${SIZE.maxRows}" value="20"></label>
      <div class="row"><button class="btn primary" type="submit">Buat dan edit</button><button class="btn ghost" type="button" id="nmCancel">Batal</button></div>
    </form>
    <div class="portal-grid">${maps.map((m) => {
      const problems = mapProblems(m);
      const status = m.builtIn ? `<span class="pill open">Bawaan · selalu tampil</span>`
        : problems.length ? `<span class="pill orange">${problems.length} masalah · belum bisa tampil</span>`
        : m.published ? `<span class="pill green">Tampil untuk siswa</span>` : `<span class="pill">Disembunyikan</span>`;
      return `<article class="portal-card" data-id="${esc(m.id)}">
        <div class="portal-thumb"></div>
        <div class="portal-info">
          <h2>${esc(m.name)}</h2>
          <small>${m.posts.length} pos · ${m.cols}×${m.rows} petak · ${m.buildings.length} gedung</small>
          ${status}
        </div>
        <div class="row">
          ${m.builtIn ? "" : `<button class="btn primary" data-act="edit">Edit</button>`}
          <button class="btn" data-act="copy">${m.builtIn ? "Duplikat untuk diedit" : "Duplikat"}</button>
          ${m.builtIn ? "" : `<button class="btn" data-act="pub" ${problems.length && !m.published ? "disabled" : ""}>${m.published ? "Sembunyikan" : "Tampilkan"}</button>`}
          <button class="btn ghost" data-act="export">Ekspor</button>
          ${m.builtIn ? "" : `<button class="btn ghost" data-act="delete">Hapus</button>`}
        </div>
      </article>`;
    }).join("")}</div>
    <section class="portal-settings portal-classes" id="classBox"></section>
    <section class="portal-settings">
      <h2>Pengaturan</h2>
      <label class="check"><input type="checkbox" id="demoChk" ${teacher.demo ? "checked" : ""}> Mode demo: semua pos terbuka tanpa menyelesaikan Pos 0</label>
      <small>Berlaku untuk GeoTrails dan GeoTrails Peta di laptop ini.</small>
    </section>`;

  el.querySelectorAll<HTMLElement>(".portal-card").forEach((card, i) => card.querySelector(".portal-thumb")!.appendChild(minimap(maps[i], 5)));
  // Class changes redraw only the class box (so an open "Peta baru" form survives a sign-in);
  // copying a class map to this laptop redraws the whole list. Never while the editor is open.
  const box = $("classBox");
  const drawClasses = (): void => { if (box.isConnected) classSection(box, drawClasses, () => showList(el, teacher)); };
  drawClasses();

  const form = $<HTMLFormElement>("newForm");
  $("newMap").onclick = () => { form.hidden = false; $("nmName").focus(); };
  $("nmCancel").onclick = () => (form.hidden = true);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $<HTMLInputElement>("nmName").value.trim() || "Peta baru";
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v) || lo));
    const m = $<HTMLSelectElement>("nmFrom").value === "basic" ? copyOfBasic(name)
      : blankMap(name, clamp(+$<HTMLInputElement>("nmCols").value, SIZE.minCols, SIZE.maxCols), clamp(+$<HTMLInputElement>("nmRows").value, SIZE.minRows, SIZE.maxRows));
    saveMap(m);
    showEditor(el, m, teacher);
  });

  $("importMap").addEventListener("change", async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const { map, problems } = parseMap(await f.text());
    if (!map) { toast(problems[0]); return; }
    saveMap(map);
    showList(el, teacher, `Peta "${esc(map.name)}" diimpor dan masih disembunyikan.${problems.length ? ` Ada ${problems.length} masalah yang perlu diperbaiki di editor.` : ""}`);
  });

  el.querySelector(".portal-grid")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-act]");
    if (!b) return;
    const m = maps.find((x) => x.id === b.closest<HTMLElement>(".portal-card")!.dataset.id)!;
    const act = b.dataset.act;
    if (act === "edit") showEditor(el, cloneMap(m), teacher);
    else if (act === "copy") {
      const c = m.builtIn ? copyOfBasic(`${m.name} (salinan)`) : { ...cloneMap(m), id: newId("m-"), name: `${m.name} (salinan)`.slice(0, 40), published: false };
      saveMap(c);
      showList(el, teacher, `Salinan "${esc(c.name)}" dibuat dan masih disembunyikan.`);
    } else if (act === "pub") {
      saveMap({ ...m, published: !m.published });
      showList(el, teacher);
    } else if (act === "export") exportMap(m);
    else if (act === "delete") {
      if (b.dataset.armed !== "1") {
        b.dataset.armed = "1"; b.textContent = "Yakin? Klik lagi"; b.classList.add("tape");
        setTimeout(() => { if (b.isConnected) { b.dataset.armed = ""; b.textContent = "Hapus"; b.classList.remove("tape"); } }, 4000);
        return;
      }
      deleteMap(m.id);
      showList(el, teacher, `Peta "${esc(m.name)}" dihapus.`);
    }
  });

  $<HTMLInputElement>("demoChk").onchange = (e) => {
    teacher.demo = (e.target as HTMLInputElement).checked;
    saveTeacher(teacher);
    $("demoBadge").hidden = !teacher.demo;
  };
}
