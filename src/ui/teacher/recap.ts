import { csvJoin } from "../../logic/csv";
import { parseLogs, summarize, type GroupRecord } from "../../logic/recap";
import { posts } from "../../state";
import { esc, fmt } from "../dom";

/* "Rekap kelas": combine log CSVs from several laptops. Data stays in memory only. */

let pasted = "";
let groups: GroupRecord[] = [];
let warnings: string[] = [];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const n1 = (v: number | null) => (v == null ? "–" : fmt(v, 1));

export function renderRecap(el: HTMLElement): void {
  const { perGroup, perPost } = summarize(groups, posts);
  el.innerHTML = `<p class="sub">Tempel isi log CSV dari setiap laptop (tombol Salin CSV di Log), satu per satu di bawah, atau pilih beberapa berkas .csv sekaligus. Data rekap tidak disimpan.</p>
    <textarea id="recapIn" class="recap-in" placeholder="kelompok,pos,judul,jawaban,…" aria-label="Isi log CSV">${esc(pasted)}</textarea>
    <div class="row">
      <button class="btn primary" type="button" id="recapRun">Buat rekap</button>
      <label class="btn">Pilih berkas .csv<input type="file" accept=".csv,text/csv" multiple id="recapFiles" hidden></label>
      <button class="btn ghost" type="button" id="recapClear">Kosongkan</button>
      <span class="spacer"></span>
      ${groups.length ? `<button class="btn" type="button" id="recapDl">Unduh rekap .csv</button>` : ""}
    </div>
    ${warnings.length ? `<ul class="recap-warn">${warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
    ${groups.length ? `
    <h3 class="recap-h">Per kelompok (${groups.length})</h3>
    <div class="tblwrap"><table><thead><tr><th>Kelompok</th><th style="text-align:right">Poin</th><th style="text-align:right">Hijau</th><th style="text-align:right">Oranye</th><th style="text-align:right">Petunjuk</th><th style="text-align:right">Durasi</th></tr></thead><tbody>
      ${perGroup.map((g) => `<tr><td>${esc(g.name)}</td><td class="num">${g.total}</td><td class="num">${g.green}</td><td class="num">${g.orange}</td><td class="num">${g.hints}</td><td class="num">${mmss(g.time)}</td></tr>`).join("")}
    </tbody></table></div>
    <h3 class="recap-h">Per pos</h3>
    <div class="tblwrap"><table><thead><tr><th>Pos</th><th style="text-align:right">Hijau</th><th style="text-align:right">Oranye</th><th style="text-align:right">Belum</th><th style="text-align:right">Rata-rata coba</th><th style="text-align:right">Rata-rata petunjuk</th><th style="text-align:right">Selisih fisik</th></tr></thead><tbody>
      ${perPost.map((p) => `<tr><td>${p.id} · ${esc(p.title)}</td><td class="num">${p.green}</td><td class="num">${p.orange}</td><td class="num">${p.open}</td><td class="num">${n1(p.avgAttempts)}</td><td class="num">${n1(p.avgHints)}</td><td class="num">${p.avgAbsDiff == null ? "–" : fmt(p.avgAbsDiff, 1) + "%"}</td></tr>`).join("")}
    </tbody></table></div>
    <h3 class="recap-h">Kesalahan tersering</h3>
    ${perPost.some((p) => p.mistakes.length) ? perPost.filter((p) => p.mistakes.length).map((p) => `<div class="recap-card"><b>Pos ${p.id} · ${esc(p.title)}</b><ul>${p.mistakes.slice(0, 3).map((m) => `<li><span class="pill">${m.count}×</span> ${esc(m.m)}</li>`).join("")}</ul></div>`).join("") : `<p class="sub">Belum ada jawaban keliru yang cocok dengan pola kesalahan umum.</p>`}
    <h3 class="recap-h">Refleksi kelompok</h3>
    ${groups.some((g) => g.reflection.length) ? groups.filter((g) => g.reflection.length).map((g) => `<div class="recap-card"><b>${esc(g.name)}</b><dl>${g.reflection.map((r) => `<dt>${esc(r.q)}</dt><dd>${esc(r.a)}</dd>`).join("")}</dl></div>`).join("") : `<p class="sub">Belum ada refleksi.</p>`}
    ` : ""}`;

  const $ = (id: string) => el.querySelector<HTMLElement>("#" + id)!;
  const input = $("recapIn") as HTMLTextAreaElement;
  input.addEventListener("input", () => (pasted = input.value));
  const run = () => { ({ groups, warnings } = parseLogs(pasted)); renderRecap(el); };
  $("recapRun").onclick = run;
  $("recapClear").onclick = () => { pasted = ""; groups = []; warnings = []; renderRecap(el); };
  $("recapFiles").addEventListener("change", async (e) => {
    const files = [...((e.target as HTMLInputElement).files ?? [])];
    const texts = await Promise.all(files.map((f) => f.text()));
    pasted = [pasted.trim(), ...texts.map((t) => t.trim())].filter(Boolean).join("\n\n");
    run();
  });
  const dl = el.querySelector<HTMLButtonElement>("#recapDl");
  if (dl) dl.onclick = () => {
    const rows: (string | number)[][] = [
      ["kelompok", "poin", "hijau", "oranye", "petunjuk", "durasi_detik"],
      ...perGroup.map((g) => [g.name, g.total, g.green, g.orange, g.hints, g.time]),
      [],
      ["pos", "judul", "hijau", "oranye", "belum", "rata_percobaan", "rata_petunjuk", "rata_selisih_fisik_persen", "kesalahan_tersering"],
      ...perPost.map((p) => [p.id, p.title, p.green, p.orange, p.open, round(p.avgAttempts), round(p.avgHints), round(p.avgAbsDiff), p.mistakes.slice(0, 3).map((m) => `${m.count}× ${m.m}`).join(" | ")]),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csvJoin(rows)], { type: "text/csv" }));
    a.download = "geotrails-rekap-kelas.csv";
    document.body.appendChild(a); a.click(); a.remove();
  };
}

const round = (v: number | null) => (v == null ? "" : Math.round(v * 10) / 10);
