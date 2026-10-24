import { isGateDone, posts, S, total } from "../state";
import type { Post } from "../types";
import { $, esc } from "./dom";

export function updateHud(): void {
  $("score").textContent = String(total());
  $("dots").innerHTML = S().posts
    .map((p, i) => `<span class="${p.result || (i === 0 || isGateDone() ? "open" : "")}" title="Pos ${i}: ${esc(posts[i].title)}">${i}</span>`)
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
