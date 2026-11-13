import type { Teacher } from "../cloud/client";
import { cloudEnabled, loadCloud, loadMyMaps } from "../cloud/config";
import { esc, toast } from "../ui/dom";

/*
 * Keeps the teacher's maps in their Google account: a full sync when they sign in or open the
 * map list, and an upload a moment after every change on this device (also while editing).
 * The status line in the map list (#syncLine) says where the maps are stored.
 */

let teacher: Teacher | null = null, editing: string | null = null, started = false;
let state: "busy" | "ok" | "offline" | "" = "", lastAt = 0, lastFull = 0;
let running = false, queued: boolean | null = null, timer = 0;
let redrawList = (): void => {};

/** Start watching the teacher's sign-in (once per page). */
export function initSync(): void {
  if (started || !cloudEnabled) return;
  started = true;
  void loadCloud().then((c) => c.watchTeacher((t) => {
    teacher = t; state = "";
    render();
    if (t) void sync(true);
  }));
  window.addEventListener("geotrails:maps", () => {
    if (!teacher) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => void sync(false), 1500);
  });
  window.addEventListener("online", () => { if (teacher) void sync(true); });
}

/** The map list is on screen: redraw it after downloads, and refresh from the account now and then. */
export function onListShown(redraw: () => void): void {
  editing = null; redrawList = redraw;
  render();
  if (teacher && Date.now() - lastFull > 30_000) void sync(true);
}

/** A map is open in the editor: it is uploaded after changes but never replaced underneath. */
export function setEditing(id: string): void { editing = id; }

async function sync(download: boolean): Promise<void> {
  if (!teacher) return;
  if (running) { queued = (queued ?? false) || download; return; }
  running = true; state = "busy"; render();
  try {
    const r = await (await loadMyMaps()).syncMaps(teacher.uid, download, editing);
    state = "ok"; lastAt = Date.now();
    if (download) lastFull = lastAt;
    if ((r.downloaded || r.removed) && !editing) redrawList();
  } catch (e) {
    console.warn("GeoTrails: sinkron peta gagal", e);
    state = "offline";
  } finally {
    running = false; render();
    if (queued !== null) { const d = queued; queued = null; void sync(d); }
  }
}

function render(): void {
  const el = document.getElementById("syncLine");
  if (!el) return;
  el.hidden = !cloudEnabled;
  const time = new Date(lastAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  el.className = `sync-line ${teacher ? state : "local"}`;
  el.innerHTML = !teacher
    ? `Peta di daftar ini tersimpan di perangkat ini saja. <button class="btn ghost" id="syncLogin">Masuk dengan Google</button> agar peta tersimpan online dan bisa dibuka di perangkat lain.`
    : state === "busy" ? `Menyinkronkan peta dengan akun ${esc(teacher.name)}…`
    : state === "offline" ? `Belum tersinkron: tidak bisa terhubung. Perubahan tetap tersimpan di perangkat ini dan dikirim saat online lagi.`
    : state === "ok" ? `Peta tersimpan online di akun ${esc(teacher.name)}. Terakhir disinkronkan pukul ${time}.`
    : `Masuk sebagai ${esc(teacher.name)}.`;
  document.getElementById("syncLogin")?.addEventListener("click", async () => {
    try { await (await loadCloud()).signInTeacher(); } catch { toast("Masuk dibatalkan atau gagal."); }
  });
}
