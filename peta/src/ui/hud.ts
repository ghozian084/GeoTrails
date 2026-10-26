import type { Post } from "../../../src/types";
import { $, esc } from "../../../src/ui/dom";
import { app, isGateDone, S, total } from "../session";

/* HUD for the Peta app (adapted from src/ui/hud.ts). */

export function updateHud(): void {
  if (!app.S) return;
  $("score").textContent = String(total());
  $("dots").innerHTML = S().posts
    .map((p, i) => `<span class="${p.result || (i === 0 || isGateDone() ? "open" : "")}" title="Pos ${i}: ${esc(app.posts[i].title)}">${i}</span>`)
    .join("");
}

/** Bottom prompt shown when the avatar stands next to a post. */
export function showPrompt(p: Post | undefined): void {
  $("prompt").hidden = !p;
  if (p) {
    $("promptSub").textContent = `Pos ${p.id} · ${p.place}`;
    $("promptTitle").textContent = p.title;
  }
}
