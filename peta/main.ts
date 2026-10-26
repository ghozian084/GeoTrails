import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "../src/styles.css";
import "./peta.css";

import type { GroupState } from "../src/types";
import { $, toast } from "../src/ui/dom";
import { initTouch } from "../src/ui/touch";
import { createMapGame } from "./src/game2d";
import { toPosts, type MapDef } from "./src/mapdef";
import { loadPhotos } from "./src/photos";
import { app, demo, persist } from "./src/session";
import { showPrompt, updateHud } from "./src/ui/hud";
import { openLog } from "./src/ui/log";
import { closeAll, closePost, openPost, setGame } from "./src/ui/post";
import { initStart } from "./src/ui/start";

/* GeoTrails Peta: pick a map (Basic or a teacher-made one), then play it in 2D. */

const modalOpen = () => !$("postOv").hidden || !$("logOv").hidden || !$("finOv").hidden;

function begin(map: MapDef, S: GroupState): void {
  app.map = map; app.posts = toPosts(map); app.S = S;
  const game = createMapGame($<HTMLCanvasElement>("map"), $("stage"), map, {
    getState: () => app.S, modalOpen, openPost, closeAll, save: persist, onNearPost: showPrompt, allOpen: demo,
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
  $<HTMLAnchorElement>("to3d").href = `3d.html?map=${encodeURIComponent(map.id)}`; $("to3d").hidden = false;
  $("mapsBtn").hidden = false;
  $("demoBadge").hidden = !demo();
  updateHud();
  persist();
  game.begin(S.pos);
  void loadPhotos(map);
}

initStart(begin);
$("openLog").onclick = openLog;
$("mapsBtn").onclick = () => { persist(); location.href = location.pathname; };
$("postOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "postOv") closePost(); });
$("logOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "logOv") $("logOv").hidden = true; });
$("finOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "finOv") $("finOv").hidden = true; });
window.addEventListener("pagehide", () => { if (app.S) persist(); });
