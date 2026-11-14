import { $, esc, toast } from "./dom";
import { COLORS } from "../core/store";
import type { GroupState } from "../core/types";
import type { MapDef } from "../map/mapdef";
import { minimap } from "../map/minimap";
import { cachedClass, cacheClass, cachePublicMap, classMaps, isClassCode, joinedClass, joinedSession, normalizeCode, publicMaps, setJoinedClass, setJoinedSession } from "../cloud/cache";
import { cloudEnabled, liveEnabled, loadCloud, loadPublic, loadSessions } from "../cloud/config";
import { freshGroup, getMap, loadProgress, saveProgress, studentMaps } from "../map/store";
import { mapProblems } from "../map/validate";
import { offlineBox } from "./offline";

export type ViewMode = "2d" | "3d";
const PAGE: Record<ViewMode, string> = { "2d": "./", "3d": "3d" };

/*
 * Start screen: first the list of maps, then the view (RPG 2D or Blox 3D) and the group
 * (resume or new). The chosen map goes into the URL (?map=…) so a reload or the other view keeps it.
 * `mode` is the view this page shows; picking the other view opens its page with the same map.
 */
export function initStart(begin: (m: MapDef, S: GroupState) => void, mode: ViewMode): void {
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
    const fromClass = new Set(classMaps().map((m) => m.id)), fromPublic = new Set(publicMaps().map((m) => m.id)), cls = joinedClass(), sess = joinedSession();
    const className = cls ? cachedClass(cls)?.name ?? cls : "";
    list.innerHTML = maps.map((m) => {
      const saved = loadProgress(m);
      const done = saved ? saved.posts.filter((p) => p.result).length : 0;
      return `<button type="button" class="map-card" data-id="${esc(m.id)}">
        <span class="map-thumb"></span>
        <span class="map-info"><b>${esc(m.name)}</b><small>${m.posts.length} pos · ${m.cols}×${m.rows} petak${sess?.map.id === m.id ? ` · Sesi ${esc(sess.name)}` : fromClass.has(m.id) ? ` · Kelas ${esc(className)}` : fromPublic.has(m.id) ? " · Publik" : ""}</small>
        ${saved ? `<small class="map-saved">Lanjutkan: ${esc(saved.name)} · ${done}/${m.posts.length} selesai</small>` : ""}</span>
      </button>`;
    }).join("") || `<p class="sub">Belum ada peta yang ditampilkan. Minta guru menampilkan peta atau memberi kode kelas.</p>`;
    list.querySelectorAll<HTMLElement>(".map-card").forEach((card, i) => card.querySelector(".map-thumb")!.appendChild(minimap(maps[i], 4)));
  }
  renderList();
  initClassBox(renderList, (m) => { renderList(); choose(m); });
  list.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
    const m = b && maps.find((x) => x.id === b.dataset.id);
    if (m) choose(m);
  });

  // View choice, shown with the chosen map (progress is shared, so switching keeps it).
  const pick = document.createElement("div");
  pick.className = "mode-pick"; pick.setAttribute("role", "radiogroup"); pick.setAttribute("aria-label", "Tampilan");
  pick.innerHTML = ([["2d", "RPG 2D", "Denah dari atas dengan avatar piksel. Ringan untuk semua perangkat."],
    ["3d", "Blox 3D", "Dunia 3D bergaya blok. Butuh perangkat yang lebih kuat."]] as const)
    .map(([k, t, d]) => `<button type="button" role="radio" data-mode="${k}" aria-checked="${k === mode}"><b>${t}</b><small>${d}</small></button>`).join("");
  $("groupStep").querySelector(".chosen")!.after(pick);
  pick.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-mode]");
    if (!b || !chosen || b.dataset.mode === mode) return;
    location.href = `${PAGE[b.dataset.mode as ViewMode]}${location.search}`;
  });
  if (cloudEnabled) initPublicBox((m) => { renderList(); choose(m); });
  const off = document.createElement("div");
  $("pickMap").appendChild(off);
  offlineBox(off);
  $("pickMap").insertAdjacentHTML("beforeend", `<p class="klasik-link"><a href="klasik/">Versi klasik</a>: denah sekolah asli dengan Mode guru lama.</p>`);

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
 * Code box above the map list: a class code (the class's maps) or a session code (one map, and the
 * group's results go to the teacher). Downloaded maps and photos are kept for offline use.
 */
function initClassBox(onChange: () => void, onSession: (m: MapDef) => void): void {
  const box = document.getElementById("classJoin");
  if (!box || !cloudEnabled) return;
  box.hidden = false;
  const status = (t: string, bad = false) => { const s = $("classStatus"); s.textContent = t; s.classList.toggle("bad", bad); };

  const sessionNote = (open: boolean) => open
    ? "Selama sesi, hasil kelompokmu (poin, status, dan jawaban angka per pos) terkirim ke guru. Lembar kerja dan refleksi tetap di laptop ini."
    : "Sesi ini sudah ditutup guru: kamu masih bisa bermain, tetapi hasilnya tidak terkirim lagi.";

  async function syncSession(code: string, joining: boolean): Promise<boolean> {
    const got = await (await loadSessions()).downloadSession(code);
    if (!got) { if (!joining) { setJoinedSession(null); render(); onChange(); } return false; }
    setJoinedSession({ code, ...got });
    render(); onChange();
    status(`Sesi ${got.name}: peta ${got.map.name}.`);
    if (joining) onSession(joinedSession()!.map);
    return true;
  }

  async function sync(code: string, joining: boolean) {
    status(joining ? "Menghubungkan…" : "Memperbarui peta kelas…");
    try {
      const got = await (await loadCloud()).downloadClass(code);
      if (!got && joining && await syncSession(code, true)) return;
      if (!got) { status("Kode kelas atau sesi tidak ditemukan.", true); if (!joining) { setJoinedClass(null); render(); onChange(); } return; }
      setJoinedClass(code);
      cacheClass(code, got.name, got.maps);
      render(); onChange();
      status(`${got.maps.length} peta dari kelas ${got.name}.`);
    } catch {
      status(joining ? "Tidak bisa terhubung. Periksa internet lalu coba lagi." : "Offline: memakai peta kelas yang tersimpan.", joining);
    }
  }

  function render() {
    const code = joinedClass(), c = code ? cachedClass(code) : null, sess = joinedSession();
    const sessHtml = sess ? `<div class="row session-row"><span>Sesi <b>${esc(sess.name)}</b> <span class="cls-code">${sess.code}</span></span><button type="button" class="btn ghost" id="sessionLeave">Keluar sesi</button></div>
      <small class="live-note">${esc(sessionNote(sess.open))}</small>` : "";
    box!.innerHTML = sessHtml + (code
      ? `<div class="row"><span>Kelas <b>${esc(c?.name ?? code)}</b> <span class="cls-code">${code}</span></span><button type="button" class="btn ghost" id="classRefresh">Perbarui</button><button type="button" class="btn ghost" id="classLeave">Keluar kelas</button></div><small id="classStatus" aria-live="polite"></small>${liveEnabled ? `<small class="live-note">Main bersama kelas: nama kelompok, warna, posisi, dan poin kelompokmu terlihat oleh teman sekelas dan guru.</small>` : ""}`
      : sess ? `<small id="classStatus" aria-live="polite"></small>`
      : `<form class="row" id="classForm"><label for="classCode">Kode kelas atau sesi</label><input id="classCode" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="mis. KQ7M2P"><button class="btn" type="submit">Gabung</button></form><small id="classStatus" aria-live="polite">Punya kode dari guru? Masukkan untuk memuat peta kelas atau mengikuti sesi trail.</small>`);
    document.getElementById("classForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = normalizeCode($<HTMLInputElement>("classCode").value);
      if (!isClassCode(code)) { status("Kode terdiri dari 6 huruf/angka.", true); return; }
      void sync(code, true);
    });
    document.getElementById("classRefresh")?.addEventListener("click", () => void sync(joinedClass()!, false));
    document.getElementById("classLeave")?.addEventListener("click", () => { setJoinedClass(null); render(); onChange(); });
    document.getElementById("sessionLeave")?.addEventListener("click", () => { setJoinedSession(null); render(); onChange(); });
  }

  render();
  const code = joinedClass(), sess = joinedSession();
  if (code && navigator.onLine) void sync(code, false);
  // Refresh the session (open or closed, its map) quietly.
  if (sess && navigator.onLine) void syncSession(sess.code, false).catch(() => undefined);
}

/**
 * "Jelajahi peta publik": approved public maps, loaded from the internet only when asked.
 * A chosen map is downloaded with its photos and kept on this device for offline play.
 */
function initPublicBox(onPick: (m: MapDef) => void): void {
  const box = document.createElement("div");
  box.className = "public-box";
  box.innerHTML = `<button type="button" class="btn" id="publicOpen">Jelajahi peta publik</button><small id="publicStatus" aria-live="polite"></small><div class="public-list" id="publicList"></div>`;
  $("mapList").after(box);
  const status = (t: string) => { $("publicStatus").textContent = t; };
  $("publicOpen").onclick = async () => {
    status("Memuat peta publik…");
    try {
      const list = await (await loadPublic()).approvedMaps();
      status(list.length ? "Pilih peta untuk diunduh dan dimainkan." : "Belum ada peta publik.");
      $("publicList").innerHTML = list.map((p) => `<button type="button" class="map-card public" data-pub="${esc(p.id)}">
        <span class="map-info"><b>${esc(p.name)}</b><small>${p.posts} pos · ${p.cols}×${p.rows} petak · Publik</small></span></button>`).join("");
    } catch {
      status("Tidak bisa memuat peta publik. Periksa internet lalu coba lagi.");
    }
  };
  $("publicList").addEventListener("click", async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-pub]");
    if (!b) return;
    status("Mengunduh peta…");
    try {
      const m = await (await loadPublic()).downloadPublic(b.dataset.pub!);
      if (!m || mapProblems(m).length) { status("Peta ini tidak bisa dipakai."); return; }
      const saved = cachePublicMap(m);
      $("publicList").innerHTML = ""; status("");
      onPick(saved);
    } catch {
      status("Gagal mengunduh. Periksa internet lalu coba lagi.");
    }
  });
}
