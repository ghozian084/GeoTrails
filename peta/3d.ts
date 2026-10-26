import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "../src/styles.css";
import "../blox/blox.css";
import "./peta.css";

import type { GroupState } from "../src/types";
import { $, esc, toast } from "../src/ui/dom";
import { initTouch } from "../src/ui/touch";
import { createMapGame3D } from "./src/game3d";
import { toPosts, type MapDef } from "./src/mapdef";
import { loadPhotos } from "./src/photos";
import { app, demo, persist } from "./src/session";
import { showPrompt, updateHud } from "./src/ui/hud";
import { openLog } from "./src/ui/log";
import { closeAll, closePost, openPost, setGame } from "./src/ui/post";
import { initStart } from "./src/ui/start";

/* GeoTrails Peta 3D: the same maps, progress and posts as the 2D page, in blocky 3D. */

// Canvas labels need the bundled fonts before the world is built.
await Promise.all(['700 56px "Chakra Petch"', '700 52px "Atkinson Hyperlegible"', '700 54px "JetBrains Mono"'].map((f) => document.fonts.load(f).catch(() => [])));

const modalOpen = () => !$("postOv").hidden || !$("logOv").hidden || !$("finOv").hidden;

/** Show why 3D could not start (instead of a button that seems to do nothing) and offer 2D. */
function fail3d(map: MapDef | null, e: unknown): void {
  console.error(e);
  const el = $("err3d"), msg = e instanceof Error ? e.message : String(e);
  el.innerHTML = `Versi 3D belum bisa berjalan di perangkat ini. Pakai <a href="./${map ? `?map=${encodeURIComponent(map.id)}` : ""}">versi 2D</a>.<small>Pesan teknis: ${esc(msg)}</small>`;
  el.hidden = false;
  // A failed attempt can leave the canvas with a dead WebGL context: give the next try a fresh one.
  const old = $("map"); old.replaceWith(old.cloneNode());
}

function begin(map: MapDef, S: GroupState): void {
  try { start(map, S); } catch (e) { fail3d(map, e); }
}

function start(map: MapDef, S: GroupState): void {
  app.map = map; app.posts = toPosts(map); app.S = S;
  const game = createMapGame3D($<HTMLCanvasElement>("map"), $("stage"), map, {
    getState: () => app.S, modalOpen, openPost, closeAll, save: persist, onNearPost: showPrompt, allOpen: demo,
  });
  setGame(game);
  const openNearby = () => { const p = game.nearPost(); if (p) openPost(p.id); else toast("Dekati salah satu pos dulu."); };
  $("promptBtn").onclick = openNearby;
  initTouch($("stage"), {
    move: (x, y) => game.move(x, y),
    interact: openNearby,
    jump: () => game.jump?.(),
    help: "Geser <b>joystick</b> untuk berjalan, seret layar untuk memutar kamera, cubit untuk zoom. Di dekat pos, tekan <b>Buka</b>.<br>Mulai dari <b>Pos 0</b>. <small>Ketuk kotak ini untuk menutup.</small>",
  });

  $("startOv").hidden = true; $("groupTag").hidden = false;
  $("groupName").textContent = S.name; $("groupDot").style.background = S.color;
  $("mapTag").hidden = false; $("mapTag").textContent = map.name;
  $<HTMLAnchorElement>("to2d").href = `./?map=${encodeURIComponent(map.id)}`; $("to2d").hidden = false;
  $("mapsBtn").hidden = false;
  $("demoBadge").hidden = !demo();
  updateHud();
  persist();
  game.begin(S.pos);
  void loadPhotos(map);
}

window.addEventListener("error", (e) => { if (!$("startOv").hidden) fail3d(app.map ?? null, e.error ?? e.message); });
window.addEventListener("unhandledrejection", (e) => { if (!$("startOv").hidden) fail3d(app.map ?? null, e.reason); });
initStart(begin);
$("openLog").onclick = openLog;
$("mapsBtn").onclick = () => { persist(); location.href = location.pathname; };
$("postOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "postOv") closePost(); });
$("logOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "logOv") $("logOv").hidden = true; });
$("finOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "finOv") $("finOv").hidden = true; });
window.addEventListener("pagehide", () => { if (app.S) persist(); });
