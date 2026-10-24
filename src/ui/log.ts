import { toCsv } from "../logic/csv";
import { session, isGateDone, posts, S, total } from "../state";
import { clearSaved } from "../store";
import { $, esc, fmt, toast } from "./dom";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const csv = () => toCsv(S(), posts);

export function openLog(): void {
  if (!session.S) { toast("Mulai jelajah dulu"); return; }
  const rows = S().posts.map((st, i) => {
    const lbl = st.result === "green" ? "hijau" : st.result === "orange" ? "oranye" : (i === 0 || isGateDone() ? "terbuka" : "terkunci");
    const cls = st.result || (i === 0 || isGateDone() ? "open" : "");
    return `<tr><td class="num">${i}</td><td>${esc(posts[i].title)}</td><td><span class="pill ${cls}">${lbl}</span></td><td class="num">${st.answer != null ? fmt(st.answer) + " " + esc(posts[i].unit) : "–"}</td><td class="num">${st.attempts.length}</td><td class="num">${st.hints}</td><td class="num">${mmss(st.time)}</td><td class="num">${st.score}</td></tr>`;
  }).join("");
  $("log").innerHTML = `<h2>Log ${esc(S().name)}</h2><p class="sub">Total ${total()} poin · ${S().posts.filter((p) => p.result).length}/6 pos selesai</p>
   <div class="tblwrap"><table><thead><tr><th>Pos</th><th>Objek</th><th>Hasil</th><th style="text-align:right">Jawaban</th><th style="text-align:right">Coba</th><th style="text-align:right">Petunjuk</th><th style="text-align:right">Durasi</th><th style="text-align:right">Poin</th></tr></thead><tbody>${rows}</tbody></table></div>
   <textarea id="csvBox" readonly aria-label="Data CSV">${esc(csv())}</textarea>
   <div class="row"><button class="btn primary" id="copyBtn">Salin CSV</button><button class="btn" id="dlBtn">Unduh .csv</button><small id="copyMsg"></small><span class="spacer"></span><button class="btn ghost" id="resetBtn">Mulai ulang</button><button class="btn" id="closeLog">Tutup</button></div>`;
  $("logOv").hidden = false;
  $("closeLog").onclick = () => ($("logOv").hidden = true);
  $("copyBtn").onclick = () => {
    const t = $<HTMLTextAreaElement>("csvBox");
    const ok = () => ($("copyMsg").textContent = "Tersalin. Tempel ke spreadsheet.");
    const fallback = () => { t.select(); $("copyMsg").textContent = "Teks sudah dipilih. Tekan Ctrl+C."; };
    try { navigator.clipboard.writeText(t.value).then(ok, fallback); } catch { fallback(); }
  };
  $("dlBtn").onclick = () => {
    try {
      const b = new Blob([csv()], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `geotrails-${S().name.replace(/\W+/g, "-")}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { /* download unsupported */ }
    $("copyMsg").textContent = "Jika unduhan tidak muncul, pakai Salin CSV.";
  };
  let armed = false;
  $("resetBtn").onclick = () => {
    if (!armed) {
      armed = true;
      $("resetBtn").textContent = "Yakin? Klik lagi untuk hapus progres";
      $("resetBtn").classList.add("tape");
      setTimeout(() => { armed = false; const b = $("resetBtn"); if (b) { b.textContent = "Mulai ulang"; b.classList.remove("tape"); } }, 4000);
      return;
    }
    clearSaved();
    location.reload();
  };
}
