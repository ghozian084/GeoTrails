import { $, esc, toast } from "../../../src/ui/dom";
import { COLORS } from "../../../src/store";
import type { GroupState } from "../../../src/types";
import type { MapDef } from "../mapdef";
import { minimap } from "../minimap";
import { cachedClass, cacheClass, classMaps, isClassCode, joinedClass, normalizeCode, setJoinedClass } from "../cloud/cache";
import { cloudEnabled, loadCloud } from "../cloud/config";
import { freshGroup, getMap, loadProgress, saveProgress, studentMaps } from "../store";
import { mapProblems } from "../validate";

/*
 * Start screen of the Peta app: first the list of maps, then the group (resume or new).
 * The chosen map goes into the URL (?map=…) so a reload or the 3D link keeps it.
 */
export function initStart(begin: (m: MapDef, S: GroupState) => void): void {
  const params = new URLSearchParams(location.search);
  let maps: MapDef[] = [];
  // "Coba sebagai siswa" from the portal: also allow a hidden map, as long as it is valid.
  const preview = params.get("preview") === "1" ? getMap(params.get("map") ?? "") : undefined;
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
  function renderList() {
    maps = studentMaps();
    if (preview && !maps.some((m) => m.id === preview.id) && mapProblems(preview).length === 0) maps.push(preview);
    const fromClass = new Set(classMaps().map((m) => m.id)), cls = joinedClass();
    const className = cls ? cachedClass(cls)?.name ?? cls : "";
    list.innerHTML = maps.map((m) => {
      const saved = loadProgress(m);
      const done = saved ? saved.posts.filter((p) => p.result).length : 0;
      return `<button type="button" class="map-card" data-id="${esc(m.id)}">
        <span class="map-thumb"></span>
        <span class="map-info"><b>${esc(m.name)}</b><small>${m.posts.length} pos · ${m.cols}×${m.rows} petak${fromClass.has(m.id) ? ` · Kelas ${esc(className)}` : ""}</small>
        ${saved ? `<small class="map-saved">Lanjutkan: ${esc(saved.name)} · ${done}/${m.posts.length} selesai</small>` : ""}</span>
      </button>`;
    }).join("") || `<p class="sub">Belum ada peta yang ditampilkan. Minta guru menampilkan peta atau memberi kode kelas.</p>`;
    list.querySelectorAll<HTMLElement>(".map-card").forEach((card, i) => card.querySelector(".map-thumb")!.appendChild(minimap(maps[i], 4)));
  }
  renderList();
  initClassBox(renderList);
  list.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
    const m = b && maps.find((x) => x.id === b.dataset.id);
    if (m) choose(m);
  });

  function choose(m: MapDef) {
    chosen = m;
    history.replaceState(null, "", `?map=${encodeURIComponent(m.id)}${m === preview ? "&preview=1" : ""}`);
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

  const wanted = params.get("map");
  const pre = maps.find((m) => m.id === wanted);
  if (pre) choose(pre);
}

/**
 * Class box above the map list: join a class with its code, refresh it, or leave it.
 * Maps of the joined class are downloaded (with photos) and cached for offline use.
 */
function initClassBox(onChange: () => void): void {
  const box = document.getElementById("classJoin");
  if (!box || !cloudEnabled) return;
  box.hidden = false;
  const status = (t: string, bad = false) => { const s = $("classStatus"); s.textContent = t; s.classList.toggle("bad", bad); };

  async function sync(code: string, joining: boolean) {
    status(joining ? "Menghubungkan…" : "Memperbarui peta kelas…");
    try {
      const got = await (await loadCloud()).downloadClass(code);
      if (!got) { status("Kode kelas tidak ditemukan.", true); if (!joining) { setJoinedClass(null); render(); onChange(); } return; }
      setJoinedClass(code);
      cacheClass(code, got.name, got.maps);
      render(); onChange();
      status(`${got.maps.length} peta dari kelas ${got.name}.`);
    } catch {
      status(joining ? "Tidak bisa terhubung. Periksa internet lalu coba lagi." : "Offline: memakai peta kelas yang tersimpan.", joining);
    }
  }

  function render() {
    const code = joinedClass(), c = code ? cachedClass(code) : null;
    box!.innerHTML = code
      ? `<div class="row"><span>Kelas <b>${esc(c?.name ?? code)}</b> <span class="cls-code">${code}</span></span><button type="button" class="btn ghost" id="classRefresh">Perbarui</button><button type="button" class="btn ghost" id="classLeave">Keluar kelas</button></div><small id="classStatus" aria-live="polite"></small>`
      : `<form class="row" id="classForm"><label for="classCode">Kode kelas</label><input id="classCode" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="mis. KQ7M2P"><button class="btn" type="submit">Gabung</button></form><small id="classStatus" aria-live="polite">Punya kode dari guru? Masukkan untuk memuat peta kelas.</small>`;
    document.getElementById("classForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = normalizeCode($<HTMLInputElement>("classCode").value);
      if (!isClassCode(code)) { status("Kode kelas terdiri dari 6 huruf/angka.", true); return; }
      void sync(code, true);
    });
    document.getElementById("classRefresh")?.addEventListener("click", () => void sync(joinedClass()!, false));
    document.getElementById("classLeave")?.addEventListener("click", () => { setJoinedClass(null); render(); onChange(); });
  }

  render();
  const code = joinedClass();
  if (code && navigator.onLine) void sync(code, false);
}
