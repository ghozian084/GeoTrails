import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "../src/styles.css";
import "./blox.css";

import { persist, posts, S, session, teacher } from "../src/state";
import { $, modalOpen, toast } from "../src/ui/dom";
import { showPrompt, updateHud } from "../src/ui/hud";
import { openLog } from "../src/ui/log";
import { loadPhotos, setBundledBase } from "../src/ui/photos";
import { closeAll, closePost, openPost, setGame } from "../src/ui/post";
import { initStart } from "../src/ui/start";
import { initTouch } from "../src/ui/touch";
import { closeTeacher, openTeacher } from "../src/ui/teacher";
import { createGame3D } from "./src/game3d";

/*
 * GeoTrails Blox: the same trail (posts, grading, log, teacher mode, saved progress)
 * in a blocky third-person 3D world. Only the map/game layer differs from src/main.ts.
 */

// Canvas labels need the bundled fonts before the world is built.
await Promise.all(['700 56px "Chakra Petch"', '700 52px "Atkinson Hyperlegible"', '700 54px "JetBrains Mono"'].map((f) => document.fonts.load(f).catch(() => [])));

const game = createGame3D($<HTMLCanvasElement>("map"), $("stage"), posts, {
  getState: () => session.S,
  modalOpen,
  openPost,
  closeAll,
  save: persist,
  onNearPost: showPrompt,
  allOpen: () => teacher.demo,
});
setGame(game);

function begin(): void {
  $("startOv").hidden = true; $("groupTag").hidden = false;
  $("groupName").textContent = S().name; $("groupDot").style.background = S().color;
  updateHud();
  game.begin(S().pos);
}

initStart(begin);

/** Open the post next to the avatar (prompt button and the touch "Buka" button). */
function openNearby(): void {
  const p = game.nearPost();
  if (p) openPost(p.id); else toast("Dekati salah satu pos dulu.");
}
$("promptBtn").onclick = openNearby;
initTouch($("stage"), {
  move: (x, y) => game.move(x, y),
  interact: openNearby,
  jump: () => game.jump?.(),
  help: "Geser <b>joystick</b> untuk berjalan, seret layar untuk memutar kamera, cubit untuk zoom. Di dekat pos, tekan <b>Buka</b>.<br>Mulai dari <b>Pos 0</b> di tiang bendera. <small>Ketuk kotak ini untuk menutup.</small>",
});
$("openLog").onclick = openLog;
$("teachBtn").onclick = () => openTeacher();
$("teachOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "teachOv") closeTeacher(); });
$("demoBadge").hidden = !teacher.demo;
$("postOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "postOv") closePost(); });
$("logOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "logOv") $("logOv").hidden = true; });
$("finOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "finOv") $("finOv").hidden = true; });

setBundledBase("../posts/");
void loadPhotos(posts.map((p) => p.id));
setTimeout(() => $("gname").focus(), 100);
window.addEventListener("pagehide", () => { if (session.S) persist(); });
