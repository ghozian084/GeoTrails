import { persist, posts, session } from "../state";
import { COLORS, fresh, loadSaved } from "../store";
import type { GroupState } from "../types";
import { $, toast } from "./dom";

/** Start screen: resume a saved group or create a new one. Calls `begin` once a group is chosen. */
export function initStart(begin: () => void): void {
  let pickColor = COLORS[0];
  const sw = $("swatches");
  sw.innerHTML = COLORS.map((c, i) => `<button type="button" style="background:${c}" aria-label="Warna ${i + 1}" aria-pressed="${i === 0}" data-c="${c}"></button>`).join("");
  sw.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    pickColor = b.dataset.c!;
    [...sw.children].forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });

  const saved: GroupState | null = loadSaved(posts.length);
  if (saved) { $("resumeBox").hidden = false; $("resumeBtn").textContent = `Lanjutkan: ${saved.name}`; }
  $("resumeBtn").onclick = () => { session.S = saved; begin(); };
  $("newBtn").onclick = () => { $("resumeBox").hidden = true; $("gname").focus(); };
  $("startForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const n = $<HTMLInputElement>("gname").value.trim();
    if (!n) { $("gname").focus(); toast("Tulis nama kelompok dulu"); return; }
    session.S = fresh(n, pickColor, posts); persist(); begin();
  });
}
