import { $, esc, toast } from "./dom";
import { COLORS } from "../core/store";
import type { GroupState } from "../core/types";
import type { MapDef } from "../map/mapdef";
import { minimap } from "../map/minimap";
import { cachedClass, cacheClass, classMaps, isClassCode, joinedClass, joinedSession, normalizeCode, publicMaps, setJoinedClass, setJoinedSession } from "../cloud/cache";
import { cloudEnabled, liveEnabled, loadCloud, loadSessions } from "../cloud/config";
import { freshGroup, getMap, loadProgress, saveProgress, studentMaps } from "../map/store";
import { mapProblems } from "../map/validate";
import { initExplore } from "./explore";
import { offlineBox } from "./offline";
import { spriteFrame } from "../render2d/sprite";
import type { Pose } from "../render2d/anim";

export type ViewMode = "2d" | "3d";
const PAGE: Record<ViewMode, string> = { "2d": "./", "3d": "3d" };
const VIEW_NAME: Record<ViewMode, string> = { "2d": "RPG 2D", "3d": "Blox 3D" };

/** Pixel avatar drawn into a canvas, scaled without smoothing. */
function drawAvatar(cv: HTMLCanvasElement, color: string, pose: Pose = 0): void {
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(spriteFrame(color, "down", pose, false), 0, 0, cv.width, cv.height);
}

function avatarCanvas(color: string, scale: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = 18 * scale; cv.height = 26 * scale;
  drawAvatar(cv, color);
  return cv;
}

/** "3/6 pos" plus a bar; finished trails say so. */
function progressHtml(done: number, total: number): string {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<span class="progress" role="img" aria-label="${done} dari ${total} pos selesai"><i style="width:${pct}%"></i></span>`;
}

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
    drawAvatar(preview2d, pickColor);
  });

  // Live avatar preview in the group step: the chosen colour, the typed name, a gentle walk cycle.
  const preview2d = $<HTMLCanvasElement>("avatarPreview");
  preview2d.width = 18 * 5; preview2d.height = 26 * 5;
  drawAvatar(preview2d, pickColor);
  $("gname").addEventListener("input", () => {
    $("avatarName").textContent = $<HTMLInputElement>("gname").value.trim() || "Kelompokmu";
  });
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let tick = 0;
  if (!still) setInterval(() => {
    if ($("groupStep").hidden || $("startOv").hidden) return;
    tick = (tick + 1) % 4;
    drawAvatar(preview2d, pickColor, ([0, 1, 0, 2] as Pose[])[tick]);
  }, 260);

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
        ${saved ? `<small class="map-saved">Lanjutkan: ${esc(saved.name)} · ${done}/${m.posts.length} selesai</small>${progressHtml(done, m.posts.length)}` : ""}</span>
      </button>`;
    }).join("") || `<p class="sub">Belum ada peta yang ditampilkan. Minta guru menampilkan peta atau memberi kode kelas.</p>`;
    list.querySelectorAll<HTMLElement>(".map-card").forEach((card, i) => card.querySelector(".map-thumb")!.appendChild(minimap(maps[i], 4)));
    renderContinue();
  }

  // "Lanjutkan petualangan": groups that already played on this laptop resume with one click.
  let resumable: { m: MapDef; S: GroupState }[] = [];
  function renderContinue() {
    resumable = maps.map((m) => ({ m, S: loadProgress(m)! })).filter((x) => x.S)
      .sort((a, b) => (b.S.started || 0) - (a.S.started || 0)).slice(0, 3);
    $("continueBox").hidden = !resumable.length;
    $("continueList").innerHTML = resumable.map(({ m, S }, i) => {
      const done = S.posts.filter((p) => p.result).length, total = m.posts.length;
      return `<button type="button" class="continue-card" data-k="${i}">
        <span class="continue-avatar"></span>
        <span class="map-info"><b>${esc(S.name)}</b><small>${esc(m.name)} · ${done === total ? "Semua pos selesai" : `${done}/${total} pos selesai`}</small>${progressHtml(done, total)}</span>
        <span class="continue-go">Lanjutkan<small>${VIEW_NAME[mode]}</small></span>
      </button>`;
    }).join("");
    $("continueList").querySelectorAll<HTMLElement>(".continue-avatar").forEach((el, i) => el.appendChild(avatarCanvas(resumable[i].S.color, 2)));
  }
  $("continueList").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-k]");
    const r = b && resumable[+b.dataset.k!];
    if (!r) return;
    choose(r.m);
    begin(r.m, r.S);
  });
  renderList();
  // "Cara bermain" stays open for new groups and folds away once this laptop has played
  // (and on phones, where it would push the map off the screen).
  if (resumable.length || matchMedia("(max-width:600px)").matches) $<HTMLDetailsElement>("howto").open = false;
  let redrawPins = (): void => {};
  initClassBox(() => { renderList(); redrawPins(); }, (m) => { renderList(); redrawPins(); choose(m); });
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
  // Jelajah: a pin's "Main RPG 2D"/"Main Blox 3D" opens that view with the map (same page: just choose it).
  redrawPins = initExplore($("pickMain"), (m, view) => {
    if (view && view !== mode) { location.href = `${PAGE[view]}?map=${encodeURIComponent(m.id)}`; return; }
    renderList(); choose(m);
  });
  const off = document.createElement("div");
  $("menuFoot").appendChild(off);
  offlineBox(off);
  $("menuFoot").insertAdjacentHTML("beforeend", `<p class="klasik-link"><a href="klasik/">Versi klasik</a>: denah sekolah asli dengan Mode guru lama.</p>`);

  function choose(m: MapDef) {
    chosen = m;
    history.replaceState(null, "", `?map=${encodeURIComponent(m.id)}${m === preview ? "&preview=1" : ""}`);
    $("pickMap").hidden = true; $("groupStep").hidden = false;
    setStep(2);
    $("chosenName").textContent = m.name;
    $("chosenMeta").textContent = `${m.posts.length} pos · ${m.cols}×${m.rows} petak${m.place?.name ? ` · ${m.place.name}` : ""}`;
    $("chosenThumb").replaceChildren(minimap(m, 3));
    const saved = loadProgress(m);
    $("resumeBox").hidden = !saved;
    if (saved) {
      $("resumeBtn").textContent = `Lanjutkan: ${saved.name}`;
      $("resumeBtn").onclick = () => begin(m, saved);
    }
    setTimeout(() => (saved ? $("resumeBtn") : $("gname")).focus(), 30);
  }

  function setStep(n: 1 | 2) {
    $("stepMap").toggleAttribute("aria-current", false); $("stepGroup").toggleAttribute("aria-current", false);
    $(n === 1 ? "stepMap" : "stepGroup").setAttribute("aria-current", "step");
    $("stepMap").classList.toggle("done", n === 2);
    $("startOv").querySelector(".sheet")!.classList.toggle("narrow", n === 2);
  }
  $("changeMap").onclick = () => {
    history.replaceState(null, "", location.pathname);
    $("groupStep").hidden = true; $("pickMap").hidden = false; setStep(1);
    redrawPins();
  };
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
