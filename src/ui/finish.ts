import { persist, S, total } from "../state";
import { $, esc } from "./dom";
import { openLog } from "./log";

/** Show the finish screen once, when every post has a result. */
export function maybeFinish(): void {
  if (S().finShown || !S().posts.every((p) => p.result)) return;
  S().finShown = true; persist();
  const g = S().posts.filter((p) => p.result === "green").length;
  $("fin").innerHTML = `<h2>Trail selesai</h2><p style="color:var(--muted);margin:0">${esc(S().name)} menyelesaikan 6 pos (${g} hijau, ${6 - g} oranye).</p><div class="big">${total()}</div><p style="margin:0 0 6px;font-weight:700">Sebelum trail di lapangan:</p>
   <ol><li>Lengkapi model dan perhitungan tiap pos di lembar kerja.</li><li>Tandai data mana yang kamu taksir dari foto, bukan dari catatan.</li><li>Saat trail fisik, ukur ulang data itu dan isi kolom "Fisik".</li></ol>
   <div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="finLog">Lihat log</button><button class="btn" id="finClose">Kembali ke peta</button></div>`;
  $("finOv").hidden = false;
  $("finLog").onclick = () => { $("finOv").hidden = true; openLog(); };
  $("finClose").onclick = () => ($("finOv").hidden = true);
}
