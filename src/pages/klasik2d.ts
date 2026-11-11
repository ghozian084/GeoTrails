import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "../styles/base.css";

import { createGame } from "../render2d/game";
import { persist, posts, S, session, teacher } from "../klasik/state";
import { $, modalOpen, toast } from "../ui/dom";
import { showPrompt, updateHud } from "../klasik/ui/hud";
import { openLog } from "../klasik/ui/log";
import { loadPhotos, setBundledBase } from "../ui/photos";
import { closeAll, closePost, openPost, setGame } from "../klasik/ui/post";
import { initStart } from "../klasik/ui/start";
import { initTouch } from "../ui/touch";
import { closeTeacher, openTeacher } from "../klasik/teacher";

// Hosts may serve this page at /klasik (no trailing slash), where relative links such as "3d"
// would resolve to the site root. Add the slash so they stay inside /klasik/.
if (!location.pathname.endsWith("/") && !location.pathname.endsWith(".html"))
  history.replaceState(history.state, "", `${location.pathname}/${location.search}${location.hash}`);

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

// The classic version lives in /klasik/; bundled photos are in /posts/.
setBundledBase("../posts/");
void loadPhotos(posts.map((p) => p.id));
setTimeout(() => $("gname").focus(), 100);
window.addEventListener("pagehide", () => { if (session.S) persist(); });
