import { $, esc, toast } from "../../../src/ui/dom";
import { COLORS } from "../../../src/store";
import type { GroupState } from "../../../src/types";
import type { MapDef } from "../mapdef";
import { minimap } from "../minimap";
import { freshGroup, loadProgress, saveProgress, studentMaps } from "../store";

/*
 * Start screen of the Peta app: first the list of maps, then the group (resume or new).
 * The chosen map goes into the URL (?map=…) so a reload or the 3D link keeps it.
 */
export function initStart(begin: (m: MapDef, S: GroupState) => void): void {
  const maps = studentMaps();
  let chosen: MapDef | null = null, pickColor = COLORS[0];

  const sw = $("swatches");
  sw.innerHTML = COLORS.map((c, i) => `<button type="button" style="background:${c}" aria-label="Warna ${i + 1}" aria-pressed="${i === 0}" data-c="${c}"></button>`).join("");
  sw.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button");
    if (!b) return;
    pickColor = b.dataset.c!;
    [...sw.children].forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });

  const list = $("mapList");
  list.innerHTML = maps.map((m) => {
    const saved = loadProgress(m);
    const done = saved ? saved.posts.filter((p) => p.result).length : 0;
    return `<button type="button" class="map-card" data-id="${esc(m.id)}">
      <span class="map-thumb"></span>
      <span class="map-info"><b>${esc(m.name)}</b><small>${m.posts.length} pos · ${m.cols}×${m.rows} petak</small>
      ${saved ? `<small class="map-saved">Lanjutkan: ${esc(saved.name)} · ${done}/${m.posts.length} selesai</small>` : ""}</span>
    </button>`;
  }).join("");
  list.querySelectorAll<HTMLElement>(".map-card").forEach((card, i) => card.querySelector(".map-thumb")!.appendChild(minimap(maps[i], 4)));
  list.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
    const m = b && maps.find((x) => x.id === b.dataset.id);
    if (m) choose(m);
  });

  function choose(m: MapDef) {
    chosen = m;
    history.replaceState(null, "", `?map=${encodeURIComponent(m.id)}`);
    $("pickMap").hidden = true; $("groupStep").hidden = false;
    $("chosenName").textContent = m.name;
    const saved = loadProgress(m);
    $("resumeBox").hidden = !saved;
    if (saved) {
      $("resumeBtn").textContent = `Lanjutkan: ${saved.name}`;
      $("resumeBtn").onclick = () => begin(m, saved);
    }
    setTimeout(() => (saved ? $("resumeBtn") : $("gname")).focus(), 30);
  }

  $("changeMap").onclick = () => { history.replaceState(null, "", location.pathname); $("groupStep").hidden = true; $("pickMap").hidden = false; };
  $("newBtn").onclick = () => { $("resumeBox").hidden = true; $("gname").focus(); };
  $("startForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!chosen) return;
    const n = $<HTMLInputElement>("gname").value.trim();
    if (!n) { $("gname").focus(); toast("Tulis nama kelompok dulu"); return; }
    const S = freshGroup(n, pickColor, chosen);
    saveProgress(chosen.id, S);
    begin(chosen, S);
  });

  const wanted = new URLSearchParams(location.search).get("map");
  const pre = maps.find((m) => m.id === wanted);
  if (pre) choose(pre);
  if (!maps.length) list.innerHTML = `<p class="sub">Belum ada peta yang ditampilkan. Minta guru menampilkan peta di portal guru.</p>`;
}
