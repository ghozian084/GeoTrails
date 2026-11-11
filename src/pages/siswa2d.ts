import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "../styles/base.css";
import "../styles/peta.css";

import type { GroupState } from "../core/types";
import { $, toast } from "../ui/dom";
import { initTouch } from "../ui/touch";
import { createMapGame } from "../render2d/game2d";
import { toPosts, type MapDef } from "../map/mapdef";
import { loadPhotos } from "../map/photos";
import { app, demo, persist } from "../map/session";
import { showPrompt, updateHud } from "../ui/hud";
import { openLog } from "../ui/log";
import { closeAll, closePost, openPost, setGame } from "../ui/post";
import { others, startLive } from "../ui/live";
import { initStart } from "../ui/start";

/* Student page (/): pick a map (Basic or a teacher-made one), then play it in 2D. */

const modalOpen = () => !$("postOv").hidden || !$("logOv").hidden || !$("finOv").hidden;

function begin(map: MapDef, S: GroupState): void {
  app.map = map; app.posts = toPosts(map); app.S = S;
  const game = createMapGame($<HTMLCanvasElement>("map"), $("stage"), map, {
    getState: () => app.S, modalOpen, openPost, closeAll, save: persist, onNearPost: showPrompt, allOpen: demo, others,
  });
  setGame(game);
  const openNearby = () => { const p = game.nearPost(); if (p) openPost(p.id); else toast("Dekati salah satu pos dulu."); };
  $("promptBtn").onclick = openNearby;
  initTouch($("stage"), {
    move: (x, y) => game.move(x, y),
    interact: openNearby,
    help: "Geser <b>joystick</b> untuk berjalan, atau ketuk peta. Di dekat pos, tekan <b>Buka</b>.<br>Mulai dari <b>Pos 0</b>. <small>Ketuk kotak ini untuk menutup.</small>",
  });

  $("startOv").hidden = true; $("groupTag").hidden = false;
  $("groupName").textContent = S.name; $("groupDot").style.background = S.color;
  $("mapTag").hidden = false; $("mapTag").textContent = map.name;
  $<HTMLAnchorElement>("to3d").href = `3d?map=${encodeURIComponent(map.id)}`; $("to3d").hidden = false;
  $("mapsBtn").hidden = false;
  $("demoBadge").hidden = !demo();
  updateHud();
  persist();
  game.begin(S.pos);
  void loadPhotos(map);
  startLive(map, game);
}

initStart(begin, "2d");
$("openLog").onclick = openLog;
$("mapsBtn").onclick = () => { persist(); location.href = location.pathname; };
$("postOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "postOv") closePost(); });
$("logOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "logOv") $("logOv").hidden = true; });
$("finOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "finOv") $("finOv").hidden = true; });
window.addEventListener("pagehide", () => { if (app.S) persist(); });
