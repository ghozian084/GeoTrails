import { REFLECTION_MAX, REFLECTION_QUESTIONS } from "../data/reflection";
import { persist, S, total } from "../state";
import { $, esc } from "./dom";
import { openLog } from "./log";

export const allDone = (): boolean => S().posts.every((p) => p.result);

/** Show the finish screen once, when every post has a result. */
export function maybeFinish(): void {
  if (S().finShown || !allDone()) return;
  S().finShown = true; persist();
  openFinish();
}

/** Finish screen with the score, next steps and the reflection questions. */
export function openFinish(): void {
  const g = S().posts.filter((p) => p.result === "green").length;
  const qs = REFLECTION_QUESTIONS.map((q, i) => `<div class="refl-q">
      <label for="refl${i}">${i + 1}. ${esc(q)}</label>
      <textarea id="refl${i}" data-i="${i}" maxlength="${REFLECTION_MAX}">${esc(S().reflection[i] ?? "")}</textarea>
    </div>`).join("");
  $("fin").innerHTML = `<h2>Trail selesai</h2><p style="color:var(--muted);margin:0">${esc(S().name)} menyelesaikan 6 pos (${g} hijau, ${6 - g} oranye).</p><div class="big">${total()}</div><p style="margin:0 0 6px;font-weight:700">Sebelum trail di lapangan:</p>
   <ol><li>Lengkapi model dan perhitungan tiap pos di lembar kerja.</li><li>Tandai data mana yang kamu taksir dari foto, bukan dari catatan.</li><li>Saat trail fisik, ukur ulang data itu dan isi kolom "Fisik".</li></ol>
   <section class="refl" aria-labelledby="reflTitle">
     <h3 id="reflTitle"><span>Refleksi kelompok</span><span class="attempts" id="reflMsg"></span></h3>
     ${qs}
     <small>Tersimpan otomatis dan ikut ke log CSV. Jangan menulis data pribadi.</small>
   </section>
   <div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="finLog">Lihat log</button><button class="btn" id="finClose">Kembali ke peta</button></div>`;
  $("finOv").hidden = false;
  $("fin").querySelectorAll<HTMLTextAreaElement>(".refl textarea").forEach((t) =>
    t.addEventListener("input", () => {
      S().reflection[+t.dataset.i!] = t.value.slice(0, REFLECTION_MAX);
      persist();
      $("reflMsg").textContent = "Tersimpan";
    }),
  );
  $("finLog").onclick = () => { $("finOv").hidden = true; openLog(); };
  $("finClose").onclick = () => ($("finOv").hidden = true);
}
