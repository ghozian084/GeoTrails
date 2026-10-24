import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./styles.css";

import { createGame } from "./game/game";
import { persist, posts, S, session, teacher } from "./state";
import { $, modalOpen } from "./ui/dom";
import { showPrompt, updateHud } from "./ui/hud";
import { openLog } from "./ui/log";
import { closeAll, closePost, openPost, setGame } from "./ui/post";
import { initStart } from "./ui/start";
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

$("promptBtn").onclick = () => { const p = game.nearPost(); if (p) openPost(p.id); };
$("openLog").onclick = openLog;
$("teachBtn").onclick = () => openTeacher();
$("teachOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "teachOv") closeTeacher(); });
$("demoBadge").hidden = !teacher.demo;
$("postOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "postOv") closePost(); });
$("logOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "logOv") $("logOv").hidden = true; });
$("finOv").addEventListener("click", (e) => { if ((e.target as HTMLElement).id === "finOv") $("finOv").hidden = true; });

setTimeout(() => $("gname").focus(), 100);
window.addEventListener("pagehide", () => { if (session.S) persist(); });
