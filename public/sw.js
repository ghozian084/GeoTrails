/*
 * GeoTrails service worker: keeps the app working without internet.
 * - Pages: network first, the saved copy when offline.
 * - Built files (/assets/…, fonts, photos): saved the first time they are loaded, then served from the cache.
 * - "Unduh untuk offline" (message "download"): saves every file listed in offline-files.json
 *   (written by the build), so pages never opened before work offline too.
 * Only this site's own files are handled; Firebase and Google requests go straight to the network.
 */
const CACHE = "geotrails-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/** The file behind a page address: "/" → "/index.html", "/3d" → "/3d.html", "/klasik/" → "/klasik/index.html". */
function pageFile(url) {
  const p = url.pathname, last = p.split("/").pop();
  if (p.endsWith("/")) return p + "index.html";
  if (!/\.[a-z0-9]+$/i.test(last)) return p + ".html";
  return p;
}

/** Hosts with clean URLs redirect "/3d.html" to "/3d"; a redirected response cannot answer a page request. */
async function storable(res) {
  return res.redirected ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers }) : res;
}

async function page(req) {
  const url = new URL(req.url), key = new URL(pageFile(url), url.origin).href;
  try {
    const res = await fetch(req);
    if (res.ok) { const cache = await caches.open(CACHE); await cache.put(key, await storable(res.clone())); }
    return res;
  } catch {
    const hit = await caches.match(key, { ignoreVary: true });
    return hit || new Response("<!doctype html><meta charset=utf-8><title>Offline</title><p style='font-family:sans-serif;padding:24px'>Halaman ini belum tersimpan untuk offline. Sambungkan ke internet, lalu tekan <b>Unduh untuk offline</b>.</p>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function file(req) {
  // ignoreVary: module scripts are requested with an Origin header, the download was not.
  const hit = await caches.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") { const cache = await caches.open(CACHE); await cache.put(req, res.clone()); }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (/\/(sw\.js|offline-files\.json)$/.test(url.pathname)) return;
  e.respondWith(req.mode === "navigate" ? page(req) : file(req));
});

/** Save every file of the app; report progress to the page that asked. */
async function download(client) {
  try {
    const list = await (await fetch(new URL("offline-files.json", self.registration.scope), { cache: "no-store" })).json();
    const cache = await caches.open(CACHE), wanted = new Set();
    let done = 0;
    for (const f of list.files) {
      const url = new URL(f, self.registration.scope);
      const isPage = f.endsWith(".html");
      // Pages are fetched by their clean address (what the host serves) and saved under the file name.
      const fetchUrl = isPage ? new URL(f.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, ""), self.registration.scope) : url;
      const res = await fetch(fetchUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`${f}: ${res.status}`);
      await cache.put(url.href, await storable(res));
      wanted.add(url.href);
      client.postMessage({ type: "offline-progress", done: ++done, total: list.files.length });
    }
    // Drop old versions of the built files.
    for (const req of await cache.keys()) if (req.url.includes("/assets/") && !wanted.has(req.url)) await cache.delete(req);
    client.postMessage({ type: "offline-done", version: list.version });
  } catch (err) {
    client.postMessage({ type: "offline-error", message: String(err) });
  }
}

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "offline-download" && e.source) e.waitUntil(download(e.source));
});
