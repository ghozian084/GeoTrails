import { $, esc } from "../../../src/ui/dom";
import { joinedClass } from "../cloud/cache";
import { liveEnabled, loadLive } from "../cloud/config";
import type { LiveRoom, LiveState } from "../cloud/live";
import { deduped, doneCount, postString, ranked, round2, type LivePlayer } from "../cloud/livedata";
import type { MapDef } from "../mapdef";
import type { MapGame, Remote } from "../remote";
import { app, total } from "../session";

/*
 * Multiplayer for groups that joined a class: other groups walk on the same map and a
 * live scoreboard shows everyone's points. Only group name, colour, position, facing,
 * score and post states are sent (see firebase/database.rules.json). Without a class,
 * Realtime Database config or internet, the game simply stays single-player.
 */

const SEND_MS = 250;
let players: LivePlayer[] = [], myUid = "", room: LiveRoom | null = null;

/** Other online groups, for the game to draw. */
export const others = (): Remote[] =>
  players.filter((p) => p.uid !== myUid && p.on).map((p) => ({ uid: p.uid, name: p.n, color: p.c, x: p.x, y: p.y, d: p.d }));

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function state(game: MapGame): LiveState {
  const S = app.S!, { x, y, d } = game.pose();
  return { n: S.name.slice(0, 30) || "Kelompok", c: S.color, x: round2(x), y: round2(y), d: round2(wrap(d)), s: Math.min(1200, total()), p: postString(S) };
}

function renderPanel(): void {
  const online = players.filter((p) => p.on);
  $("liveCount").textContent = String(online.length);
  const panel = $("livePanel");
  if (panel.hidden) return;
  const n = app.map?.posts.length ?? 0;
  panel.innerHTML = `<header><b>Papan skor kelas</b><button class="btn ghost" id="liveClose" aria-label="Tutup papan skor">×</button></header>
    <ol>${ranked(deduped(players)).map((p) => `<li class="${p.uid === myUid ? "me" : ""}${p.on ? "" : " off"}">
      <i style="background:${esc(p.c)}"></i><span class="nm">${esc(p.n)}${p.uid === myUid ? " (kalian)" : ""}</span>
      <span class="pp" title="Pos selesai">${doneCount(p.p)}/${n}</span><b>${p.s}</b></li>`).join("")}</ol>
    <small>${online.length} kelompok sedang bermain di peta ini.</small>`;
  $("liveClose").onclick = () => togglePanel(false);
}

function togglePanel(show: boolean): void {
  $("livePanel").hidden = !show;
  $("liveBtn").setAttribute("aria-expanded", String(show));
  renderPanel();
}

/** Join the class room for this map (no-op when not in a class or not configured). */
export function startLive(map: MapDef, game: MapGame): void {
  const code = joinedClass();
  if (!liveEnabled || !code || room) return;
  const btn = $("liveBtn");
  btn.hidden = false; btn.classList.remove("on"); btn.title = "Menghubungkan ke kelas…";
  btn.onclick = () => togglePanel($("livePanel").hidden);
  void (async () => {
    try {
      const live = await loadLive();
      room = await live.joinRoom(code, map.id, state(game), (ps) => { players = ps; renderPanel(); });
      myUid = room.uid;
      btn.classList.add("on"); btn.title = "Kelompok lain di kelas yang sama";
      const r = room;
      const timer = setInterval(() => { if (room !== r) clearInterval(timer); else if (app.S) r.push(state(game)); }, SEND_MS);
      window.addEventListener("pagehide", () => room?.leave(), { once: true });
      // Coming back from the browser's back/forward cache: join again.
      window.addEventListener("pageshow", (e) => { if (e.persisted) { room = null; startLive(map, game); } }, { once: true });
    } catch (e) {
      console.warn("GeoTrails: mode bersama tidak tersambung", e);
      btn.title = "Mode bersama tidak tersambung (offline?). Permainan tetap berjalan.";
    }
  })();
}
