import type { Teacher } from "../cloud/client";
import { cloudEnabled, liveEnabled, loadCloud, loadLive, loadSessions } from "../cloud/config";
import { done, postSummary, rankResults, sessionCsv, type SessionResult } from "../cloud/sessiondata";
import type { SessionInfo } from "../cloud/sessions";
import { basicMap } from "../map/basic";
import type { MapDef } from "../map/mapdef";
import { allMaps } from "../map/store";
import { mapProblems } from "../map/validate";
import { esc, toast } from "../ui/dom";
import { download } from "./io";
import { mountMonitor, startMonitor } from "./monitor";

/*
 * "Sesi trail" in the Teacher Portal: create a session for one map (students join with its code),
 * see each group's results as they arrive, download them as CSV, close or delete the session.
 * Results are only sent during a session (see src/ui/results.ts).
 */

let teacher: Teacher | null = null, started = false, busy = "";
let sessions: SessionInfo[] = [];
const open = new Map<string, { map: MapDef; results: SessionResult[] }>();
let redraw = (): void => {};

const num = (v: number) => String(Math.round(v * 100) / 100).replace(".", ",");
const errMsg = (e: unknown) => (String((e as { code?: string })?.code ?? "").includes("permission-denied") ? "Tidak diizinkan." : e instanceof Error ? e.message : "Gagal. Coba lagi.");

async function refresh(): Promise<void> {
  sessions = teacher ? await (await loadSessions()).mySessions(teacher.uid) : [];
}

async function loadResults(code: string): Promise<void> {
  const s = await loadSessions();
  const map = open.get(code)?.map ?? (await s.sessionMap(code));
  if (!map) throw new Error("Peta sesi tidak ditemukan.");
  open.set(code, { map, results: await s.sessionResults(code) });
}

function resultsHtml(code: string, name: string): string {
  const o = open.get(code);
  if (!o) return "";
  const { map, results } = o, rs = rankResults(results), sum = postSummary(results, map);
  const cell = (r: SessionResult, i: number) => {
    const x = r.posts[i];
    if (!x || (!x.r && !x.a.length)) return `<td class="r-none">–</td>`;
    const last = x.a.length ? num(x.a[x.a.length - 1]) : "";
    return `<td class="${x.r === "g" ? "r-g" : x.r === "o" ? "r-o" : "r-try"}" title="Jawaban: ${esc(x.a.map(num).join(", ") || "–")} · petunjuk ${x.h} · ${x.t} detik">${x.a.length}× · ${esc(last)}</td>`;
  };
  return `<div class="ses-results">
    <div class="row"><b>Hasil ${results.length} kelompok</b><button class="btn ghost" data-ses="reload" data-code="${code}">Muat ulang</button>
      <button class="btn" data-ses="csv" data-code="${code}" data-name="${esc(name)}" ${results.length ? "" : "disabled"}>Unduh CSV</button></div>
    ${results.length ? `<div class="ses-table"><table>
      <thead><tr><th>#</th><th>Kelompok</th><th>Poin</th><th>Selesai</th>${map.posts.map((p, i) => `<th title="${esc(p.title)}">Pos ${i}</th>`).join("")}</tr></thead>
      <tbody>${rs.map((r, k) => `<tr><td>${k + 1}</td><td><i style="background:${esc(r.c)}"></i>${esc(r.n)}</td><td class="mono">${r.s}</td><td class="mono">${done(r)}/${map.posts.length}</td>${map.posts.map((_, i) => cell(r, i)).join("")}</tr>`).join("")}</tbody>
      <tfoot><tr><td></td><td colspan="3">Rekap per pos</td>${sum.map((p) => `<td title="${esc(p.title)}">${p.green} hijau${p.orange ? ` · ${p.orange} oranye` : ""}<br>${num(p.attempts)}× · ${num(p.hints)} ptj</td>`).join("")}</tr></tfoot>
    </table></div>
    <small>Sel: jumlah percobaan · jawaban terakhir (arahkan kursor untuk semua jawaban). Hijau dan oranye = status pos.</small>`
    : `<small>Belum ada hasil. Hasil muncul setelah kelompok memasukkan kode <b>${code}</b> dan mulai bermain.</small>`}
  </div>`;
}

/** Fill the "Sesi trail" box (called after every render of the map list). */
export function sessionSection(el: HTMLElement, rerender: () => void): void {
  redraw = rerender;
  if (!cloudEnabled) { el.hidden = true; return; }
  if (!started) {
    started = true;
    void loadCloud().then((c) => c.watchTeacher(async (t) => {
      teacher = t; open.clear();
      await refresh().catch(() => undefined);
      redraw();
    }));
  }
  const maps = [basicMap(), ...allMaps().filter((m) => !m.builtIn && mapProblems(m).length === 0)];
  el.innerHTML = `<h2>Sesi trail</h2>
    <p class="sub">Buat sesi untuk satu peta. Siswa memasukkan kode sesi di layar mulai, dan hasil tiap kelompok (poin, status, jawaban angka per pos) masuk ke sini. Di luar sesi, tidak ada hasil yang dikirim.</p>
    ${!teacher ? `<small>Masuk dengan Google (bagian Kelas online) untuk membuat sesi.</small>` : `
      ${busy ? `<p class="cls-busy">${esc(busy)}</p>` : ""}
      <form class="row" id="sesNew">
        <select id="sesMap" aria-label="Peta untuk sesi">${maps.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}</select>
        <input id="sesName" maxlength="60" placeholder="Nama sesi, mis. 9A Trail Senin" aria-label="Nama sesi">
        <button class="btn primary" type="submit">Buat sesi</button>
      </form>
      <div class="cls-list">${sessions.map((s) => `<article class="cls sess" data-code="${s.code}">
        <header><b>${esc(s.name)}</b><span class="cls-code" title="Kode sesi">${s.code}</span>
          <span class="pill ${s.open ? "green" : ""}">${s.open ? "Dibuka" : "Ditutup"}</span>
          <button class="btn ghost" data-ses="copy" data-code="${s.code}">Salin kode</button>
          <button class="btn" data-ses="results" data-code="${s.code}">${open.has(s.code) ? "Sembunyikan hasil" : "Lihat hasil"}</button>
          ${liveEnabled ? `<button class="btn ghost" data-ses="monitor" data-code="${s.code}">Pantau langsung</button>` : ""}
          <button class="btn ghost" data-ses="toggle" data-code="${s.code}">${s.open ? "Tutup sesi" : "Buka lagi"}</button>
          <button class="btn ghost" data-ses="delete" data-code="${s.code}">Hapus sesi</button></header>
        <small>Peta: ${esc(s.mapName || s.mapId)}${s.createdAt ? ` · dibuat ${new Date(s.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}${s.open ? "" : " · hasil baru tidak diterima"}</small>
        ${resultsHtml(s.code, s.name)}
        <div class="cls-live" data-live></div>
      </article>`).join("")}</div>`}`;

  const run = async (label: string, fn: () => Promise<void>, ok = "Selesai.") => {
    busy = label; redraw();
    try { await fn(); await refresh(); toast(ok); } catch (e) { toast(errMsg(e)); } finally { busy = ""; redraw(); }
  };

  el.querySelector<HTMLFormElement>("#sesNew")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const m = maps.find((x) => x.id === el.querySelector<HTMLSelectElement>("#sesMap")!.value)!;
    const name = el.querySelector<HTMLInputElement>("#sesName")!.value.trim() || `${m.name} ${new Date().toLocaleDateString("id-ID")}`;
    void run(`Membuat sesi "${name}"…`, async () => {
      const s = await (await loadSessions()).createSession(teacher!.uid, name, m);
      // Own the session's live room (synchronised start, messages) right away.
      if (liveEnabled) await (await loadLive()).claimClass(s.code, teacher!.uid).catch(() => undefined);
    }, "Sesi dibuat. Bagikan kodenya ke siswa.");
  });

  mountMonitor();
  el.querySelector(".cls-list")?.addEventListener("click", async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-ses]");
    if (!b) return;
    const code = b.dataset.code!, s = sessions.find((x) => x.code === code), act = b.dataset.ses;
    if (act === "copy") { void navigator.clipboard?.writeText(code).then(() => toast(`Kode ${code} tersalin.`), () => toast(code)); return; }
    if (act === "results") {
      if (open.has(code)) { open.delete(code); redraw(); return; }
      void run("Memuat hasil…", () => loadResults(code), "Hasil dimuat.");
    } else if (act === "reload") void run("Memuat hasil…", () => loadResults(code), "Hasil diperbarui.");
    else if (act === "csv") {
      const o = open.get(code);
      if (o) download(`geotrails-sesi-${code}.csv`, "﻿" + sessionCsv(o.results, o.map, b.dataset.name ?? code), "text/csv;charset=utf-8");
    } else if (act === "monitor") {
      try {
        const map = open.get(code)?.map ?? (await (await loadSessions()).sessionMap(code));
        if (!map) return;
        // The monitor always watches Basic; add the session's map when it is another one.
        await startMonitor(code, teacher!.uid, map.id === "basic" ? [] : [{ id: map.id, name: map.name, json: JSON.stringify(map), photos: [] }]);
        mountMonitor();
      } catch { toast("Pantauan langsung tidak tersambung."); }
    } else if (act === "toggle" && s) void run(s.open ? "Menutup sesi…" : "Membuka sesi…", () => loadSessions().then((x) => x.setSessionOpen(code, !s.open)), s.open ? "Sesi ditutup: hasil baru tidak diterima." : "Sesi dibuka lagi.");
    else if (act === "delete") {
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Yakin? Hasil ikut terhapus"; b.classList.add("tape"); return; }
      void run("Menghapus sesi…", async () => {
        await (await loadSessions()).deleteSession(code);
        if (liveEnabled && s) await (await loadLive()).clearRoom(code, s.mapId).catch(() => undefined);
        open.delete(code);
      }, "Sesi dan hasilnya dihapus.");
    }
  });
}
