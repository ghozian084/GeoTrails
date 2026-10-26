import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "../src/styles.css";
import "./peta.css";
import "./portal.css";

import { checkPin, hashPin, validPin } from "../src/logic/pin";
import { loadTeacher, saveTeacher } from "../src/store";
import { $ } from "../src/ui/dom";
import { showEditor } from "./src/portal/editor";
import { showList } from "./src/portal/list";
import { getMap } from "./src/store";

/*
 * Teacher portal for the Peta app: manage maps and edit them on a grid.
 * Uses the same local teacher PIN as the original Mode guru.
 */

const teacher = loadTeacher();
$("demoBadge").hidden = !teacher.demo;

function gate(): void {
  const creating = !teacher.pinHash;
  $("main").innerHTML = `<form class="pin portal-pin" id="pinForm">
      <h1>Portal Guru</h1>
      <p>${creating ? "Buat PIN guru (4–8 angka). PIN disimpan hanya di laptop ini." : "Masukkan PIN guru."}</p>
      <div class="field"><label for="pin1">PIN</label><input id="pin1" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>
      ${creating ? `<div class="field"><label for="pin2">Ulangi PIN</label><input id="pin2" type="password" inputmode="numeric" autocomplete="off" maxlength="8"></div>` : ""}
      <div class="pin-msg" id="pinMsg" aria-live="polite"></div>
      <div class="row"><button class="btn primary" type="submit">${creating ? "Simpan PIN" : "Buka"}</button></div>
      <small>PIN ini sama dengan PIN Mode guru di GeoTrails. PIN hanya menjaga portal dari siswa, bukan pengaman sungguhan.</small>
    </form>`;
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
      msg.textContent = "PIN salah."; $<HTMLInputElement>("pin1").select(); return;
    }
    sessionStorage.setItem("geotrails.peta.unlocked", "1");
    open();
  });
}

function open(): void {
  $("lockBtn").hidden = false;
  // ?edit=<id> reopens a map in the editor (e.g. after a reload).
  const editing = getMap(new URLSearchParams(location.search).get("edit") ?? "");
  if (editing && !editing.builtIn) showEditor($("main"), editing, teacher);
  else showList($("main"), teacher);
}

$("lockBtn").onclick = () => { sessionStorage.removeItem("geotrails.peta.unlocked"); location.reload(); };
// Stay unlocked for this browser tab (so returning from the editor does not ask again).
if (sessionStorage.getItem("geotrails.peta.unlocked") === "1" && teacher.pinHash) open(); else gate();
