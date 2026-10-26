import type { TeacherSettings } from "../../../src/types";
import { $, esc, toast } from "../../../src/ui/dom";
import { readColors, C } from "../../../src/game/render";
import { objectProps, renderGround } from "../draw2d";
import {
  BUILDING_COLORS, blankPost, buildingAt, objectAt, OBJECT_KINDS, OBJECT_LABEL, setTile, TILE_KINDS, TILE_LABEL,
  type MapDef, type ObjectKind, type TileKind,
} from "../mapdef";
import { loadPhotos } from "../photos";
import { saveMap } from "../store";
import { mapProblems, MAX_POSTS, SIZE } from "../validate";
import { drawEditor, TILE_COLOR, type EditorView } from "./canvas";
import { showList } from "./list";
import { postForm } from "./postform";

/*
 * Grid map editor. Every change is saved automatically to this laptop; undo/redo keep a
 * history of snapshots. Students only see the map once it has no problems and is shown.
 */

type Tool =
  | { t: "tile"; kind: TileKind } | { t: "building" } | { t: "object"; kind: ObjectKind }
  | { t: "post" } | { t: "start" } | { t: "erase" } | { t: "select" };

const OBJECT_HELP = "Klik petak untuk menaruh objek; klik lagi untuk menghapusnya.";

export function showEditor(root: HTMLElement, map: MapDef, teacher: TeacherSettings): void {
  const m = map;
  let tool: Tool = { t: "tile", kind: "p" }, brush = 1;
  const view: EditorView = { zoom: 22, hover: null, rect: null, selPost: null, selBuilding: null, movingPost: null };
  const undo: string[] = [], redo: string[] = [];
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  /** Removes the document/window listeners when leaving the editor. */
  const life = new AbortController(), signal = life.signal;
  history.replaceState(null, "", `?edit=${encodeURIComponent(m.id)}`);

  root.innerHTML = `<div class="ed-top">
      <button class="btn ghost" id="edBack">← Daftar peta</button>
      <input id="edName" maxlength="40" aria-label="Nama peta" value="${esc(m.name)}">
      <span class="ed-status" id="edStatus" aria-live="polite">Tersimpan</span>
      <span class="spacer"></span>
      <button class="btn ghost" id="edUndo" title="Ctrl+Z">Urungkan</button>
      <button class="btn ghost" id="edRedo" title="Ctrl+Y">Ulangi</button>
      <button class="btn ghost" id="edZoomOut" aria-label="Perkecil">−</button>
      <button class="btn ghost" id="edZoomIn" aria-label="Perbesar">+</button>
      <button class="btn" id="edPreview">Pratinjau</button>
      <button class="btn primary" id="edTry">Coba sebagai siswa</button>
    </div>
    <div class="ed-body">
      <aside class="ed-tools" aria-label="Alat">
        <h3>Petak</h3>
        <div class="tool-grid">${TILE_KINDS.map((k) => `<button type="button" class="tool" data-tool="tile:${k}"><i style="background:${TILE_COLOR[k]}"></i>${TILE_LABEL[k]}</button>`).join("")}</div>
        <label class="brush">Ukuran kuas <select id="edBrush"><option value="1">1×1</option><option value="2">2×2</option><option value="3">3×3</option></select></label>
        <h3>Bangunan & objek</h3>
        <div class="tool-grid">
          <button type="button" class="tool" data-tool="building"><i class="ico-b"></i>Gedung</button>
          ${OBJECT_KINDS.map((k) => `<button type="button" class="tool" data-tool="object:${k}"><i class="ico-o ico-${k}"></i>${OBJECT_LABEL[k]}</button>`).join("")}
        </div>
        <h3>Trail</h3>
        <div class="tool-grid">
          <button type="button" class="tool" data-tool="post"><i class="ico-p"></i>Pos</button>
          <button type="button" class="tool" data-tool="start"><i class="ico-s"></i>Titik mulai</button>
          <button type="button" class="tool" data-tool="select"><i class="ico-sel"></i>Pilih</button>
          <button type="button" class="tool" data-tool="erase"><i class="ico-e"></i>Hapus</button>
        </div>
        <p class="tool-help" id="toolHelp"></p>
      </aside>
      <div class="ed-canvas-wrap" id="edWrap"><canvas id="edCanvas" aria-label="Kanvas peta"></canvas></div>
      <aside class="ed-panel" id="edPanel"></aside>
    </div>
    <div class="overlay" id="previewOv" hidden><div class="sheet preview"><header class="row"><b>Pratinjau peta</b><span class="spacer"></span><button class="btn" id="previewClose">Tutup</button></header><div class="preview-wrap" id="previewWrap"></div></div></div>`;

  const cv = $<HTMLCanvasElement>("edCanvas"), panel = $("edPanel");
  const redraw = () => drawEditor(cv, m, view);

  /* ---------- saving & history ---------- */
  const snapshot = () => JSON.stringify(m);
  function checkpoint() { undo.push(snapshot()); if (undo.length > 60) undo.shift(); redo.length = 0; }
  function restore(json: string) { Object.assign(m, JSON.parse(json)); view.selPost = view.selBuilding = view.movingPost = null; changed(true); }
  function changed(structural: boolean) {
    $("edStatus").textContent = "Menyimpan…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveMap(m); $("edStatus").textContent = "Tersimpan"; renderProblems(); }, 350);
    redraw();
    if (structural) renderPanel(); else renderProblems();
  }
  const flush = () => { clearTimeout(saveTimer); saveMap(m); };
  window.addEventListener("beforeunload", flush, { signal });

  /* ---------- tools ---------- */
  const HELP: Record<Tool["t"], string> = {
    tile: "Klik atau seret untuk mengecat petak.",
    building: "Seret untuk membuat gedung, lalu atur nama, warna, dan jumlah lantainya di panel kanan.",
    object: OBJECT_HELP,
    post: "Klik petak kosong untuk menambah pos; klik pos untuk mengedit isinya.",
    start: "Klik petak tempat kelompok mulai berjalan.",
    select: "Klik gedung atau pos untuk mengubahnya.",
    erase: "Klik pos, objek, atau gedung untuk menghapusnya.",
  };
  function setTool(id: string) {
    const [t, kind] = id.split(":");
    tool = (kind ? { t, kind } : { t }) as Tool;
    root.querySelectorAll<HTMLButtonElement>(".tool").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === id)));
    $("toolHelp").textContent = HELP[tool.t];
    view.movingPost = null;
  }
  root.querySelector(".ed-tools")!.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-tool]");
    if (b) setTool(b.dataset.tool!);
  });
  $<HTMLSelectElement>("edBrush").onchange = (e) => (brush = +(e.target as HTMLSelectElement).value);
  setTool("tile:p");

  /* ---------- canvas interaction ---------- */
  const tileOf = (e: PointerEvent): [number, number] => {
    const r = cv.getBoundingClientRect();
    return [Math.floor((e.clientX - r.left) / view.zoom), Math.floor((e.clientY - r.top) / view.zoom)];
  };
  const inside = ([x, y]: [number, number]) => x >= 0 && y >= 0 && x < m.cols && y < m.rows;
  let dragging = false, anchor: [number, number] | null = null, last: [number, number] | null = null;

  /** Paint every tile on the line from the previous pointer position, so fast drags leave no gaps. */
  function paintLine(to: [number, number]) {
    const from = last ?? to;
    const n = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
    for (let i = 0; i <= n; i++) {
      const k = n ? i / n : 0;
      paint([Math.round(from[0] + (to[0] - from[0]) * k), Math.round(from[1] + (to[1] - from[1]) * k)]);
    }
    last = to;
  }

  function paint([x, y]: [number, number]) {
    if (tool.t !== "tile") return;
    const o = Math.floor((brush - 1) / 2);
    for (let dy = 0; dy < brush; dy++) for (let dx = 0; dx < brush; dx++) setTile(m, x - o + dx, y - o + dy, tool.kind);
  }

  cv.addEventListener("pointerdown", (e) => {
    const at = tileOf(e);
    if (!inside(at)) return;
    const [x, y] = at;
    // Moving a post: the next click places it.
    if (view.movingPost != null) {
      if (buildingAt(m, x, y)) { toast("Pos tidak bisa diletakkan di dalam gedung."); return; }
      if (m.posts.some((p, i) => i !== view.movingPost && p.x === x && p.y === y)) { toast("Sudah ada pos di petak itu."); return; }
      checkpoint();
      Object.assign(m.posts[view.movingPost], { x, y });
      view.movingPost = null;
      changed(true);
      return;
    }
    cv.setPointerCapture(e.pointerId);
    const postIdx = m.posts.findIndex((p) => p.x === x && p.y === y);
    const bIdx = m.buildings.findIndex((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
    switch (tool.t) {
      case "tile": checkpoint(); dragging = true; last = null; paintLine(at); redraw(); break;
      case "building": dragging = true; anchor = at; view.rect = [x, y, x, y]; redraw(); break;
      case "object": {
        if (bIdx >= 0) { toast("Objek tidak bisa diletakkan di dalam gedung."); return; }
        checkpoint();
        const cur = objectAt(m, x, y);
        m.objects = m.objects.filter((o) => o !== cur);
        if (!cur || cur.kind !== tool.kind) m.objects.push({ kind: tool.kind, x, y });
        changed(false);
        break;
      }
      case "post": {
        if (postIdx >= 0) { select(postIdx, null); return; }
        if (bIdx >= 0) { toast("Pos tidak bisa diletakkan di dalam gedung."); return; }
        if (m.posts.length >= MAX_POSTS) { toast(`Peta maksimal ${MAX_POSTS} pos.`); return; }
        checkpoint();
        m.posts.push(blankPost(x, y));
        view.selPost = m.posts.length - 1; view.selBuilding = null;
        changed(true);
        break;
      }
      case "start": checkpoint(); m.start = [x, y]; changed(false); break;
      case "select": select(postIdx >= 0 ? postIdx : null, postIdx < 0 && bIdx >= 0 ? bIdx : null); break;
      case "erase": {
        checkpoint();
        if (postIdx >= 0) { m.posts.splice(postIdx, 1); view.selPost = null; }
        else if (objectAt(m, x, y)) m.objects = m.objects.filter((o) => !(o.x === x && o.y === y));
        else if (bIdx >= 0) { m.buildings.splice(bIdx, 1); view.selBuilding = null; }
        else { undo.pop(); return; }
        changed(true);
        break;
      }
    }
  });
  cv.addEventListener("pointermove", (e) => {
    const at = tileOf(e);
    view.hover = inside(at) ? at : null;
    if (dragging && inside(at)) {
      if (tool.t === "tile") paintLine(at);
      else if (tool.t === "building" && anchor) view.rect = [Math.min(anchor[0], at[0]), Math.min(anchor[1], at[1]), Math.max(anchor[0], at[0]), Math.max(anchor[1], at[1])];
    }
    redraw();
  });
  cv.addEventListener("pointerleave", () => { view.hover = null; redraw(); });
  const finish = () => {
    if (!dragging) return;
    dragging = false;
    if (tool.t === "tile") { changed(false); return; }
    if (tool.t === "building" && view.rect) {
      const [x0, y0, x1, y1] = view.rect;
      view.rect = null; anchor = null;
      const overlaps = m.buildings.some((b) => x0 <= b.x1 && b.x0 <= x1 && y0 <= b.y1 && b.y0 <= y1);
      const hasPost = m.posts.some((p) => p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1);
      if (overlaps) { toast("Gedung tidak boleh bertumpuk dengan gedung lain."); redraw(); return; }
      if (hasPost) { toast("Ada pos di area itu. Pindahkan posnya dulu."); redraw(); return; }
      checkpoint();
      m.objects = m.objects.filter((o) => !(o.x >= x0 && o.x <= x1 && o.y >= y0 && o.y <= y1));
      m.buildings.push({ name: `Gedung ${m.buildings.length + 1}`, x0, y0, x1, y1, color: BUILDING_COLORS[m.buildings.length % BUILDING_COLORS.length], floors: 2 });
      view.selBuilding = m.buildings.length - 1; view.selPost = null;
      changed(true);
    }
  };
  cv.addEventListener("pointerup", finish);
  cv.addEventListener("pointercancel", finish);

  function select(post: number | null, building: number | null) {
    view.selPost = post; view.selBuilding = building; view.movingPost = null;
    redraw(); renderPanel();
  }

  /* ---------- side panel ---------- */
  function renderPanel() {
    if (view.selPost != null && m.posts[view.selPost]) {
      const i = view.selPost;
      panel.innerHTML = `<div id="pfBox"></div><div id="problems"></div>`;
      postForm($("pfBox"), m, i, {
        changed: (structural) => { changed(structural); },
        move: () => { view.movingPost = i; $("toolHelp").textContent = "Klik petak tujuan untuk memindahkan pos."; redraw(); },
        up: () => { checkpoint(); [m.posts[i - 1], m.posts[i]] = [m.posts[i], m.posts[i - 1]]; view.selPost = i - 1; changed(true); },
        down: () => { checkpoint(); [m.posts[i + 1], m.posts[i]] = [m.posts[i], m.posts[i + 1]]; view.selPost = i + 1; changed(true); },
        remove: () => { checkpoint(); m.posts.splice(i, 1); view.selPost = null; changed(true); },
      });
    } else if (view.selBuilding != null && m.buildings[view.selBuilding]) {
      const b = m.buildings[view.selBuilding];
      panel.innerHTML = `<section class="pp">
          <h3>Gedung</h3>
          <label class="ed-f"><span>Nama</span><input id="bName" maxlength="40" value="${esc(b.name)}"></label>
          <div class="ed-f"><span>Warna dinding (3D)</span><div class="swatches">${BUILDING_COLORS.map((c) => `<button type="button" style="background:${c}" aria-label="Warna ${c}" aria-pressed="${c === b.color}" data-c="${c}"></button>`).join("")}</div></div>
          <label class="ed-f"><span>Jumlah lantai (3D)</span><input id="bFloors" type="number" min="1" max="5" value="${b.floors}"></label>
          <small>${b.x1 - b.x0 + 1} × ${b.y1 - b.y0 + 1} petak</small>
          <div class="row"><button class="btn ghost" id="bDel">Hapus gedung</button><button class="btn ghost" id="bDone">Selesai</button></div>
        </section><div id="problems"></div>`;
      $<HTMLInputElement>("bName").oninput = (e) => { b.name = (e.target as HTMLInputElement).value; changed(false); };
      $<HTMLInputElement>("bFloors").oninput = (e) => { b.floors = Math.round(+(e.target as HTMLInputElement).value) || 1; changed(false); };
      panel.querySelector(".swatches")!.addEventListener("click", (e) => {
        const s = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-c]");
        if (s) { b.color = s.dataset.c!; changed(true); }
      });
      $("bDel").onclick = () => { checkpoint(); m.buildings.splice(view.selBuilding!, 1); view.selBuilding = null; changed(true); };
      $("bDone").onclick = () => select(null, null);
    } else {
      panel.innerHTML = `<section class="pp">
          <h3>Peta</h3>
          <p class="sub">${m.posts.length} pos · ${m.buildings.length} gedung · ${m.objects.length} objek</p>
          <div class="ed-f"><span>Ukuran (kolom × baris)</span>
            <div class="row"><input id="szCols" type="number" min="${SIZE.minCols}" max="${SIZE.maxCols}" value="${m.cols}" aria-label="Kolom"><span>×</span><input id="szRows" type="number" min="${SIZE.minRows}" max="${SIZE.maxRows}" value="${m.rows}" aria-label="Baris"><button class="btn" id="szApply">Ubah ukuran</button></div>
            <small>Bagian yang terpotong (kanan/bawah) ikut terhapus.</small>
          </div>
          <h3>Daftar pos</h3>
          ${m.posts.length ? `<ol class="post-list" start="0">${m.posts.map((p, i) => `<li><button type="button" class="linkish" data-post="${i}">${esc(p.title || "Pos tanpa judul")}</button></li>`).join("")}</ol>` : `<p class="sub">Belum ada pos. Pilih alat <b>Pos</b>, lalu klik peta.</p>`}
        </section><div id="problems"></div>`;
      $("szApply").onclick = () => resize(+$<HTMLInputElement>("szCols").value, +$<HTMLInputElement>("szRows").value);
      panel.querySelector(".post-list")?.addEventListener("click", (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-post]");
        if (b) select(+b.dataset.post!, null);
      });
    }
    renderProblems();
  }

  function renderProblems() {
    const box = document.getElementById("problems");
    if (!box) return;
    const probs = mapProblems(m);
    box.innerHTML = `<section class="pp problems">
        <h3>Pemeriksaan</h3>
        ${probs.length ? `<ul>${probs.slice(0, 12).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>${probs.length > 12 ? `<small>… dan ${probs.length - 12} lainnya</small>` : ""}` : `<p class="ok">Peta siap dipakai siswa.</p>`}
        <label class="check"><input type="checkbox" id="pubChk" ${m.published ? "checked" : ""} ${probs.length && !m.published ? "disabled" : ""}> Tampilkan untuk siswa</label>
        ${probs.length && m.published ? `<small>Peta ini belum muncul untuk siswa sampai semua masalah diperbaiki.</small>` : ""}
      </section>`;
    $<HTMLInputElement>("pubChk").onchange = (e) => { m.published = (e.target as HTMLInputElement).checked; changed(false); };
  }

  function resize(cols: number, rows: number) {
    cols = Math.round(cols); rows = Math.round(rows);
    if (!(cols >= SIZE.minCols && cols <= SIZE.maxCols && rows >= SIZE.minRows && rows <= SIZE.maxRows)) { toast(`Ukuran harus ${SIZE.minCols}–${SIZE.maxCols} kolom dan ${SIZE.minRows}–${SIZE.maxRows} baris.`); return; }
    checkpoint();
    let t = "";
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) t += x < m.cols && y < m.rows ? m.tiles[y * m.cols + x] : "g";
    const fits = (x: number, y: number) => x < cols && y < rows;
    Object.assign(m, {
      cols, rows, tiles: t,
      buildings: m.buildings.filter((b) => fits(b.x1, b.y1)),
      objects: m.objects.filter((o) => fits(o.x, o.y)),
      posts: m.posts.filter((p) => fits(p.x, p.y)),
      start: fits(m.start[0], m.start[1]) ? m.start : [Math.floor(cols / 2), rows - 2],
    });
    view.selPost = view.selBuilding = null;
    changed(true);
  }

  /* ---------- top bar ---------- */
  $<HTMLInputElement>("edName").oninput = (e) => { m.name = (e.target as HTMLInputElement).value; changed(false); };
  $("edBack").onclick = () => { flush(); life.abort(); showList(root, teacher, `Perubahan pada "${esc(m.name)}" tersimpan.`); };
  $("edUndo").onclick = () => { if (undo.length) { redo.push(snapshot()); restore(undo.pop()!); } };
  $("edRedo").onclick = () => { if (redo.length) { undo.push(snapshot()); restore(redo.pop()!); } };
  $("edZoomIn").onclick = () => { view.zoom = Math.min(40, view.zoom + 4); redraw(); };
  $("edZoomOut").onclick = () => { view.zoom = Math.max(10, view.zoom - 4); redraw(); };
  $("edTry").onclick = () => { flush(); window.open(`./?map=${encodeURIComponent(m.id)}&preview=1`, "_blank"); };
  $("edPreview").onclick = () => {
    readColors();
    const T = 22, DPR = Math.min(2, window.devicePixelRatio || 1);
    const ground = renderGround(m, T, DPR, C);
    const c = document.createElement("canvas");
    c.width = ground.width; c.height = ground.height; c.style.width = `${m.cols * T}px`;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(ground, 0, 0);
    ctx.scale(DPR, DPR);
    objectProps(m, T, DPR, C).sort((a, b) => a.depth - b.depth).forEach((p) => p.draw(ctx, 0));
    $("previewWrap").replaceChildren(c);
    $("previewOv").hidden = false;
  };
  $("previewClose").onclick = () => ($("previewOv").hidden = true);
  document.addEventListener("keydown", (e) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); $("edUndo").click(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); $("edRedo").click(); }
    if (e.key === "Escape") { $("previewOv").hidden = true; if (view.movingPost != null) { view.movingPost = null; redraw(); } }
  }, { signal });

  void loadPhotos(m).then(() => { if (view.selPost != null) renderPanel(); });
  redraw();
  renderPanel();
}
