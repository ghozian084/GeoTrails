import { esc } from "./dom";

/*
 * Offline mode: registers the service worker (public/sw.js) and shows the "Unduh untuk offline"
 * box. Pages already opened work offline by themselves; the button saves the whole app (2D, 3D,
 * Teacher Portal, classic version) so every page works without internet. Also offers "Pasang
 * sebagai aplikasi" where the browser supports installing.
 * `root` is the site root relative to the page ("./" for the main pages, "../" in /klasik/).
 */

const KEY = "geotrails.offline";
interface Saved { version: string; at: number }

const supported = (): boolean => typeof navigator !== "undefined" && "serviceWorker" in navigator && !import.meta.env.DEV;

function saved(): Saved | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && typeof v.version === "string" ? v : null; } catch { return null; }
}

// One state for every box on the page (the portal redraws its box often).
const boxes = new Set<HTMLElement>();
let root = "./", busy = "", error = "", newest: string | null = null, started = false;
let installPrompt: (Event & { prompt(): Promise<void> }) | null = null;

/** Register the service worker (once per page). */
export function registerOffline(siteRoot = "./"): void {
  root = siteRoot;
  if (!supported()) return;
  void navigator.serviceWorker.register(`${root}sw.js`, { scope: root }).catch(() => undefined);
}

function render(): void {
  const s = saved(), stale = !!(s && newest && newest !== s.version);
  const date = s ? new Date(s.at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
  const status = error || busy || (s
    ? stale ? "Ada versi baru GeoTrails. Unduh lagi agar versi offline ikut terbaru." : `Tersedia offline di perangkat ini (diunduh ${date}). Bisa dipakai tanpa internet.`
    : "Simpan seluruh GeoTrails (2D, 3D, Portal Guru) di perangkat ini agar bisa dipakai tanpa internet.");
  for (const el of boxes) {
    if (!el.isConnected) { boxes.delete(el); continue; }
    el.innerHTML = `<div class="offline-row">
        <button type="button" class="btn" data-off="get" ${busy ? "disabled" : ""}>${s ? (stale ? "Perbarui unduhan offline" : "Unduh ulang") : "Unduh untuk offline"}</button>
        ${installPrompt ? `<button type="button" class="btn ghost" data-off="install">Pasang sebagai aplikasi</button>` : ""}
      </div>
      <small class="offline-status ${s && !stale && !busy && !error ? "ok" : ""} ${error ? "bad" : ""}" aria-live="polite">${esc(status)}</small>`;
  }
}

function start(): void {
  if (started) return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e as typeof installPrompt; render(); });
  navigator.serviceWorker.addEventListener("message", (e) => {
    const d = e.data ?? {};
    if (d.type === "offline-progress") busy = `Mengunduh ${d.done} dari ${d.total} berkas…`;
    else if (d.type === "offline-done") {
      try { localStorage.setItem(KEY, JSON.stringify({ version: d.version, at: Date.now() } satisfies Saved)); } catch { /* storage unavailable */ }
      newest = d.version; busy = "";
    } else if (d.type === "offline-error") { busy = ""; error = "Unduhan gagal. Periksa internet lalu coba lagi."; }
    else return;
    render();
  });
  // The latest version on the server (no answer when offline).
  void fetch(`${root}offline-files.json`, { cache: "no-store" }).then((r) => r.json()).then((v) => { newest = v.version ?? null; render(); }, () => undefined);
}

async function onClick(e: Event): Promise<void> {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-off]");
  if (!b) return;
  if (b.dataset.off === "install" && installPrompt) { await installPrompt.prompt(); installPrompt = null; render(); return; }
  error = "";
  if (!navigator.onLine) { error = "Butuh internet untuk mengunduh."; render(); return; }
  busy = "Menyiapkan unduhan…"; render();
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: "offline-download" });
}

/** Show the offline box in `el` (hidden where the browser has no service workers). */
export function offlineBox(el: HTMLElement): void {
  if (!supported()) { el.hidden = true; return; }
  start();
  el.hidden = false;
  el.classList.add("offline-box");
  boxes.add(el);
  el.addEventListener("click", (e) => void onClick(e));
  render();
}
