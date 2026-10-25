import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./styles.css";

import { createGame } from "./game/game";
import { persist, posts, S, session, teacher } from "./state";
import { $, modalOpen, toast } from "./ui/dom";
import { showPrompt, updateHud } from "./ui/hud";
import { openLog } from "./ui/log";
import { loadPhotos } from "./ui/photos";
import { closeAll, closePost, openPost, setGame } from "./ui/post";
import { initStart } from "./ui/start";
import { initTouch } from "./ui/touch";
import { closeTeacher, openTeacher } from "./ui/teacher";

const game = createGame($<HTMLCanvasElement>("map"), $("stage"), posts, {
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
  help: "Geser <b>joystick</b> untuk berjalan, atau ketuk peta. Di dekat pos, tekan <b>Buka</b>.<br>Mulai dari <b>Pos 0</b> di tiang bendera. <small>Ketuk kotak ini untuk menutup.</small>",
});
$("openLog").onclick = openLog;
$("teachBtn").onclick = () => openTeacher();
$("teachOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "teachOv") closeTeacher(); });
$("demoBadge").hidden = !teacher.demo;
$("postOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "postOv") closePost(); });
$("logOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "logOv") $("logOv").hidden = true; });
$("finOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "finOv") $("finOv").hidden = true; });

void loadPhotos(posts.map((p) => p.id));
setTimeout(() => $("gname").focus(), 100);
window.addEventListener("pagehide", () => { if (session.S) persist(); });
