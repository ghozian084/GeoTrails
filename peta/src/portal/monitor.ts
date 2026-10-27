import { esc, toast } from "../../../src/ui/dom";
import { basicMap } from "../basic";
import type { PublishedMap } from "../cloud/client";
import { loadLive } from "../cloud/config";
import { deduped, doneCount, ranked, type LivePlayer } from "../cloud/livedata";
import type { MapDef } from "../mapdef";
import { minimap } from "../minimap";

/*
 * Live monitor for one class in the teacher portal: for each map (Basic + the maps published
 * to the class), where every group is and the live scoreboard. Updates arrive many times per
 * second, so only this box is redrawn, at most once per second.
 */

const PX = 6;
let code = "", maps: MapDef[] = [], rooms = new Map<string, LivePlayer[]>(), unsubs: (() => void)[] = [];
let dirty = false, timer = 0;

export const monitoring = (): string => code;

function box(): HTMLElement | null {
  return code ? document.querySelector<HTMLElement>(`.cls[data-code="${code}"] [data-live]`) : null;
}

function draw(): void {
  const el = box();
  if (!el) return;
  dirty = false;
  const active = maps.filter((m) => (rooms.get(m.id) ?? []).length);
  el.innerHTML = `<div class="mon-head"><b>Pantauan langsung</b><button class="btn ghost" data-mon="stop">Tutup</button></div>
    ${active.length ? active.map((m) => {
      const ps = rooms.get(m.id)!, online = ps.filter((p) => p.on).length;
      return `<section class="mon-map" data-map="${esc(m.id)}">
        <header><b>${esc(m.name)}</b><span>${online} online · ${ps.length} kelompok</span>
          <button class="btn ghost" data-mon="clear" data-map="${esc(m.id)}">Hapus data sesi</button></header>
        <div class="mon-body"><div class="mon-thumb"></div>
          <table><thead><tr><th>#</th><th>Kelompok</th><th>Pos</th><th>Poin</th></tr></thead><tbody>
          ${ranked(ps).map((p, i) => `<tr class="${p.on ? "" : "off"}"><td>${i + 1}</td><td><i style="background:${esc(p.c)}"></i>${esc(p.n)}${p.on ? "" : " <small>(offline)</small>"}</td>
            <td class="mono">${doneCount(p.p)}/${m.posts.length} <span class="mon-posts">${[...p.p].map((ch) => `<span class="${ch === "g" ? "green" : ch === "o" ? "orange" : ""}"></span>`).join("")}</span></td><td class="mono">${p.s}</td></tr>`).join("")}
          </tbody></table></div></section>`;
    }).join("") : `<small>Belum ada kelompok yang bermain. Siswa perlu bergabung dengan kode <b>${code}</b>, lalu memilih peta.</small>`}
    <small class="mon-note">Data sesi (nama kelompok, warna, posisi, poin) dihapus saat Bapak/Ibu menekan "Hapus data sesi", atau otomatis bila tidak aktif 24 jam dan kelas dibuka lagi.</small>`;
  for (const sec of el.querySelectorAll<HTMLElement>(".mon-map")) {
    const m = maps.find((x) => x.id === sec.dataset.map)!, cv = minimap(m, PX), ctx = cv.getContext("2d")!;
    for (const p of rooms.get(m.id) ?? []) {
      ctx.globalAlpha = p.on ? 1 : .4;
      ctx.fillStyle = p.c; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x * PX, p.y * PX, PX * .9, 0, 7); ctx.fill(); ctx.stroke();
    }
    sec.querySelector(".mon-thumb")!.appendChild(cv);
  }
}

function schedule(): void {
  dirty = true;
  if (!timer) timer = window.setInterval(() => { if (dirty) draw(); }, 1000);
}

export function stopMonitor(): void {
  unsubs.forEach((u) => u()); unsubs = [];
  clearInterval(timer); timer = 0;
  code = ""; rooms = new Map();
}

/** Start watching a class (the teacher must own it). */
export async function startMonitor(cls: string, uid: string, published: PublishedMap[]): Promise<void> {
  stopMonitor();
  code = cls;
  maps = [basicMap()];
  for (const pm of published) { try { maps.push(JSON.parse(pm.json)); } catch { /* skip broken map */ } }
  const live = await loadLive();
  await live.claimClass(cls, uid);
  if (code !== cls) return;
  for (const m of maps) unsubs.push(live.watchRoom(cls, m.id, (ps) => { rooms.set(m.id, deduped(ps)); schedule(); }));
  draw();
}

/** Re-attach after the portal redraws the class list; handle the monitor's buttons. */
export function mountMonitor(): void {
  const el = box();
  if (!el) return;
  draw();
  el.onclick = async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-mon]");
    if (!b) return;
    if (b.dataset.mon === "stop") { const c = code; stopMonitor(); const x = document.querySelector(`.cls[data-code="${c}"] [data-live]`); if (x) x.innerHTML = ""; return; }
    if (b.dataset.mon === "clear") {
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Yakin? Klik lagi"; b.classList.add("tape"); return; }
      try { await (await loadLive()).clearRoom(code, b.dataset.map!); toast("Data sesi dihapus."); }
      catch { toast("Gagal menghapus. Pastikan Bapak/Ibu pemilik kelas ini."); }
    }
  };
}
