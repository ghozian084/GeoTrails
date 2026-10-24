import { checkPin, hashPin, validPin } from "../../logic/pin";
import { teacher } from "../../state";
import { saveTeacher } from "../../store";
import { $, esc } from "../dom";
import { renderEditor } from "./editor";
import { renderKeys } from "./keys";
import { renderPhotos } from "./photos";
import { renderSettings } from "./settings";

/* Teacher panel: gated by a local PIN, organised in tabs. */

export interface Tab {
  id: string;
  label: string;
  render(el: HTMLElement): void;
}

const TABS: Tab[] = [
  { id: "keys", label: "Kunci jawaban", render: renderKeys },
  { id: "photos", label: "Foto pos", render: renderPhotos },
  { id: "editor", label: "Isi pos", render: renderEditor },
  { id: "settings", label: "Pengaturan", render: renderSettings },
];

/** Unlocked until the page reloads or the teacher locks the panel. */
let unlocked = false;
let current = TABS[0].id;

export function openTeacher(): void {
  $("teachOv").hidden = false;
  render();
}

export function closeTeacher(): void {
  $("teachOv").hidden = true;
}

function render(): void {
  if (!unlocked) { renderGate(); return; }
  const el = $("teach");
  el.innerHTML = `<header class="teach-head"><h2>Mode guru</h2><span class="spacer"></span><button class="btn ghost" id="teachLock" type="button">Kunci</button><button class="x" id="teachX" aria-label="Tutup">×</button></header>
    <nav class="tabs" role="tablist">${TABS.map((t) => `<button type="button" role="tab" id="tab-${t.id}" data-t="${t.id}" aria-selected="${t.id === current}">${esc(t.label)}</button>`).join("")}</nav>
    <div class="teach-body" id="teachBody" role="tabpanel" aria-labelledby="tab-${current}"></div>`;
  $("teachX").onclick = closeTeacher;
  $("teachLock").onclick = () => { unlocked = false; closeTeacher(); };
  el.querySelector(".tabs")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-t]");
    if (b) { current = b.dataset.t!; render(); }
  });
  TABS.find((t) => t.id === current)!.render($("teachBody"));
}

function renderGate(): void {
  const creating = !teacher.pinHash;
  $("teach").innerHTML = `<header class="teach-head"><h2>Mode guru</h2><span class="spacer"></span><button class="x" id="teachX" aria-label="Tutup">×</button></header>
    <form class="pin" id="pinForm">
      <p>${creating
        ? "Buat PIN guru (4–8 angka). PIN disimpan hanya di laptop ini dan menjaga panel guru dari siswa."
        : "Masukkan PIN guru."}</p>
      <div class="field"><label for="pin1">PIN</label><input id="pin1" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>
      ${creating ? `<div class="field"><label for="pin2">Ulangi PIN</label><input id="pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>` : ""}
      <div class="pin-msg" id="pinMsg" aria-live="polite"></div>
      <div class="row"><button class="btn primary" type="submit">${creating ? "Simpan PIN" : "Buka"}</button></div>
      ${creating ? "" : `<details class="pin-help"><summary>Lupa PIN?</summary><p>Hapus data situs GeoTrails di pengaturan browser laptop ini. Cara ini juga menghapus progres kelompok, foto unggahan, dan isi pos buatan guru di laptop ini.</p></details>`}
    </form>`;
  $("teachX").onclick = closeTeacher;
  setTimeout(() => $("pin1").focus(), 30);
  $("pinForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p1 = $<HTMLInputElement>("pin1").value.trim(), msg = $("pinMsg");
    if (creating) {
      const p2 = $<HTMLInputElement>("pin2").value.trim();
      if (!validPin(p1)) { msg.textContent = "PIN harus 4–8 angka."; return; }
      if (p1 !== p2) { msg.textContent = "Kedua PIN belum sama."; return; }
      teacher.pinHash = await hashPin(p1);
      saveTeacher(teacher);
    } else if (!(await checkPin(p1, teacher.pinHash))) {
      msg.textContent = "PIN salah.";
      $<HTMLInputElement>("pin1").select();
      return;
    }
    unlocked = true;
    render();
  });
}
