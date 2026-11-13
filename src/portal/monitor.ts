import { esc, toast } from "../ui/dom";
import { basicMap } from "../map/basic";
import type { PublishedMap } from "../cloud/client";
import { loadLive } from "../cloud/config";
import { deduped, doneCount, ranked, type LivePlayer } from "../cloud/livedata";
import { noControl, type Control } from "../map/control";
import type { MapDef } from "../map/mapdef";
import { minimap } from "../map/minimap";

/*
 * Live monitor for one class in the teacher portal: for each map (Basic + the maps published
 * to the class), where every group is and the live scoreboard. Updates arrive many times per
 * second, so only the live part is redrawn, at most once per second. The teacher's controls
 * (hold, synchronised start, message, all posts open, locked posts) sit in their own bar for one
 * chosen map, so typing a message is not interrupted.
 */

const PX = 6;
let code = "", maps: MapDef[] = [], rooms = new Map<string, LivePlayer[]>(), unsubs: (() => void)[] = [];
let dirty = false, timer = 0;
let ctlMap = "", ctl: Control = noControl(), unsubCtl: (() => void) | null = null;

export const monitoring = (): string => code;

function box(): HTMLElement | null {
  return code ? document.querySelector<HTMLElement>(`.cls[data-code="${code}"] [data-live]`) : null;
}

/** The controls bar: built once per chosen map, then only its state is updated. */
function buildCtrl(el: HTMLElement): void {
  const m = maps.find((x) => x.id === ctlMap) ?? maps[0];
  el.innerHTML = `<div class="mon-head"><b>Pantauan langsung</b><button class="btn ghost" data-mon="stop">Tutup</button></div>
    <div class="mon-ctrl">
      <label class="mon-pick">Kendali untuk peta <select data-ctl="map">${maps.map((x) => `<option value="${esc(x.id)}" ${x.id === m.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <div class="row"><button class="btn" data-ctl="hold"></button><button class="btn primary" data-ctl="start">Mulai serentak</button><span class="mon-state" data-ctl="state"></span></div>
      <form class="row mon-msg" data-ctl="msgform"><input data-ctl="msg" maxlength="140" placeholder="Pesan untuk semua kelompok, mis. Kumpul di lapangan" aria-label="Pesan untuk semua kelompok"><button class="btn" type="submit">Kirim pesan</button></form>
      <div class="row mon-posts-ctl"><button class="btn ghost" data-ctl="allopen"></button>
        <span>Kunci pos:</span>${m.posts.map((_, i) => `<button class="btn ghost mon-chip" data-ctl="lock" data-post="${i}" aria-pressed="false">Pos ${i}</button>`).join("")}</div>
    </div>
    <div class="mon-live" data-live-view></div>`;
  updateCtrl();
}

function updateCtrl(): void {
  const el = box();
  if (!el) return;
  const q = (k: string) => el.querySelector<HTMLElement>(`[data-ctl="${k}"]`);
  const hold = q("hold"), open = q("allopen"), state = q("state");
  if (hold) hold.textContent = ctl.hold ? "Lepas tahan" : "Tahan semua kelompok";
  if (open) open.textContent = ctl.allOpen ? "Kembalikan urutan (Pos 0 dulu)" : "Buka semua pos";
  if (state) state.textContent = ctl.hold ? "Semua kelompok sedang menunggu aba-aba." : ctl.locked.size ? `${ctl.locked.size} pos dikunci.` : "";
  el.querySelectorAll<HTMLElement>('[data-ctl="lock"]').forEach((b) => {
    const on = ctl.locked.has(+b.dataset.post!);
    b.setAttribute("aria-pressed", String(on)); b.classList.toggle("tape", on);
  });
}

async function watchCtl(mapId: string): Promise<void> {
  unsubCtl?.(); ctlMap = mapId; ctl = noControl();
  const live = await loadLive();
  unsubCtl = live.watchControl(code, mapId, (c) => { ctl = c; updateCtrl(); });
}

function draw(): void {
  const host = box();
  if (!host) return;
  if (!host.querySelector("[data-live-view]")) buildCtrl(host);
  const el = host.querySelector<HTMLElement>("[data-live-view]")!;
  dirty = false;
  const active = maps.filter((m) => (rooms.get(m.id) ?? []).length);
  el.innerHTML = `${active.length ? active.map((m) => {
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
  unsubCtl?.(); unsubCtl = null; ctl = noControl();
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
  await watchCtl(maps[0].id);
  draw();
}

/** Re-attach after the portal redraws the class list; handle the monitor's buttons. */
export function mountMonitor(): void {
  const el = box();
  if (!el) return;
  draw();
  el.onchange = (e) => {
    const t = e.target as HTMLSelectElement;
    if (t.dataset.ctl === "map") void watchCtl(t.value).then(() => { const h = box(); if (h) { buildCtrl(h); draw(); } });
  };
  el.onsubmit = async (e) => {
    e.preventDefault();
    const input = el.querySelector<HTMLInputElement>('[data-ctl="msg"]')!, text = input.value.trim();
    if (!text) { toast("Tulis pesannya dulu."); return; }
    try { await (await loadLive()).sendMessage(code, ctlMap, text); input.value = ""; toast("Pesan terkirim ke semua kelompok."); }
    catch { toast("Pesan gagal dikirim."); }
  };
  el.onclick = async (e) => {
    const c = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-ctl]");
    if (c && c.tagName === "BUTTON") {
      const live = await loadLive(), k = c.dataset.ctl;
      try {
        if (k === "hold") await live.setHold(code, ctlMap, !ctl.hold);
        else if (k === "start") { await live.startTogether(code, ctlMap); toast("Hitung mundur dimulai di semua laptop."); }
        else if (k === "allopen") await live.setAllOpen(code, ctlMap, !ctl.allOpen);
        else if (k === "lock") { const i = +c.dataset.post!; await live.setLocked(code, ctlMap, i, !ctl.locked.has(i)); }
      } catch { toast("Gagal. Pastikan Bapak/Ibu pemilik kelas ini."); }
      return;
    }
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
