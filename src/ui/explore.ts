import { cachePublicMap, classMaps, joinedSession, publicMaps } from "../cloud/cache";
import { cloudEnabled, loadPublic } from "../cloud/config";
import type { PublicSummary } from "../cloud/publicmaps";
import { groupPins } from "../map/geo";
import type { MapDef } from "../map/mapdef";
import { minimap } from "../map/minimap";
import { studentMaps } from "../map/store";
import { mapProblems } from "../map/validate";
import { $, esc } from "./dom";
import type { PinKind, WorldMap, WorldPin } from "./worldmap";

/*
 * Jelajah, the first thing on the start screen: trails as pins on a real-world map (OpenStreetMap).
 * It opens by itself when the device is online, unless the group hid it on this device
 * (`geotrails.peta.explore` = "off"); offline, the map list below is used instead. A pin opens a card with the trail (name,
 * place, posts, mini plan) and "Main RPG 2D" / "Main Blox 3D". Pins: green = public, yellow = the
 * joined class or session, grey = saved on this device. The approved public maps are also listed
 * below the map, as a fallback for slow phones and maps without a location.
 */

/** "" = keep the view of the current page. */
export type PlayMode = "2d" | "3d" | "";

interface Entry {
  kind: PinKind; name: string; place: string; lat: number; lng: number;
  posts: number; size: string; local?: MapDef; publicId?: string;
}

const KIND_LABEL: Record<PinKind, string> = { public: "Publik", class: "Kelas/sesi", device: "Di perangkat ini" };
const RANK: Record<PinKind, number> = { class: 3, public: 2, device: 1 };
const hasPlace = (m: MapDef) => !!m.place && Number.isFinite(m.place.lat) && Number.isFinite(m.place.lng);

function localEntries(): Entry[] {
  const fromClass = new Set([...classMaps().map((m) => m.id), joinedSession()?.map.id]), fromPublic = new Set(publicMaps().map((m) => m.id));
  return studentMaps().filter(hasPlace).map((m) => ({
    kind: fromClass.has(m.id) ? "class" : fromPublic.has(m.id) ? "public" : "device",
    name: m.name, place: m.place!.name, lat: m.place!.lat, lng: m.place!.lng,
    posts: m.posts.length, size: `${m.cols}×${m.rows} petak`, local: m,
  }));
}

const PREF = "geotrails.peta.explore";
const hiddenPref = (): boolean => { try { return localStorage.getItem(PREF) === "off"; } catch { return false; } };
const setHiddenPref = (off: boolean): void => { try { if (off) localStorage.setItem(PREF, "off"); else localStorage.removeItem(PREF); } catch { /* storage unavailable */ } };

/** Returns a function that redraws the pins (after joining or leaving a class or session). */
export function initExplore(parent: HTMLElement, onPlay: (m: MapDef, mode: PlayMode) => void): () => void {
  const box = document.createElement("div");
  box.className = "public-box explore";
  box.innerHTML = `<div class="row explore-head"><b>Jelajah</b><span class="spacer"></span>
      <button type="button" class="btn ghost" id="publicOpen">Tampilkan peta</button>
      <button type="button" class="btn ghost" id="exploreHide" hidden>Sembunyikan</button></div>
    <small id="publicStatus" aria-live="polite">Temukan trail di peta dunia, lalu main dalam RPG 2D atau Blox 3D.</small>
    <div class="explore-wrap" id="exploreWrap" hidden>
      <div class="explore-map" id="exploreMap" aria-label="Peta Jelajah"></div>
      <div class="explore-legend">${(["public", "class", "device"] as PinKind[]).map((k) => `<span><i class="wpin wpin-${k}"></i>${KIND_LABEL[k]}</span>`).join("")}</div>
      <div class="explore-card" id="exploreCard" hidden></div>
    </div>
    <div class="public-list" id="publicList"></div>`;
  parent.appendChild(box);
  const status = (t: string) => { $("publicStatus").textContent = t; };
  let world: WorldMap | null = null, groups: Entry[][] = [], remote: PublicSummary[] = [];

  function showCard(i: number) {
    const card = $("exploreCard"), g = groups[i];
    if (!g) return;
    card.hidden = false;
    card.innerHTML = `<header class="row"><b>${esc(g[0].place)}</b><span class="spacer"></span><button type="button" class="btn ghost" data-close>Tutup</button></header>
      ${g.map((e, k) => `<article class="explore-trail">
        <span class="map-thumb"></span>
        <span class="map-info"><b>${esc(e.name)}</b><small>${e.posts} pos · ${e.size} · ${KIND_LABEL[e.kind]}</small></span>
        <span class="row"><button type="button" class="btn primary" data-play="2d" data-k="${k}">Main RPG 2D</button><button type="button" class="btn" data-play="3d" data-k="${k}">Main Blox 3D</button></span>
      </article>`).join("")}`;
    card.querySelectorAll<HTMLElement>(".explore-trail").forEach((el, k) => {
      const m = g[k].local;
      if (m) el.querySelector(".map-thumb")!.appendChild(minimap(m, 3));
      else el.querySelector(".map-thumb")!.remove();
    });
    card.onclick = (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-close]")) { card.hidden = true; return; }
      const b = t.closest<HTMLElement>("[data-play]");
      if (b) void play(g[+b.dataset.k!], b.dataset.play as PlayMode);
    };
  }

  async function play(e: Entry, mode: PlayMode) {
    if (e.local) { onPlay(e.local, mode); return; }
    status("Mengunduh peta…");
    try {
      const m = await (await loadPublic()).downloadPublic(e.publicId!);
      if (!m || mapProblems(m).length) { status("Peta ini tidak bisa dipakai."); return; }
      status("");
      onPlay(cachePublicMap(m), mode);
    } catch { status("Gagal mengunduh. Periksa internet lalu coba lagi."); }
  }

  function drawPins() {
    const local = localEntries(), ids = new Set(local.map((e) => e.local!.id));
    const pub: Entry[] = remote.filter((p) => p.place && !ids.has(p.id)).map((p) => ({
      kind: "public", name: p.name, place: p.place!.name, lat: p.place!.lat, lng: p.place!.lng,
      posts: p.posts, size: `${p.cols}×${p.rows} petak`, publicId: p.id,
    }));
    groups = groupPins([...local, ...pub]).map((g) => g.sort((a, b) => RANK[b.kind] - RANK[a.kind]));
    const pins: WorldPin[] = groups.map((g, i) => ({ lat: g[0].lat, lng: g[0].lng, kind: g[0].kind, count: g.length, key: String(i), label: `${g[0].place}: ${g.map((e) => e.name).join(", ")}` }));
    world?.setPins(pins, (k) => showCard(+k));
    return pins.length;
  }

  function listPublic() {
    $("publicList").innerHTML = remote.map((p) => `<button type="button" class="map-card public" data-pub="${esc(p.id)}">
      <span class="map-info"><b>${esc(p.name)}</b><small>${p.posts} pos · ${p.cols}×${p.rows} petak · Publik${p.place ? ` · ${esc(p.place.name)}` : ""}</small></span></button>`).join("");
  }

  // One load at a time (the automatic one at start and a press of "Perbarui" may overlap).
  let loading: Promise<void> = Promise.resolve();
  const open = (byHand: boolean): Promise<void> => (loading = loading.then(() => load(byHand)));
  async function load(byHand: boolean) {
    const wrap = $("exploreWrap");
    if (!navigator.onLine) { status("Tanpa internet: pilih peta dari daftar di bawah. Peta Jelajah muncul lagi saat online."); return; }
    setHiddenPref(false);
    wrap.hidden = false;
    $("publicOpen").textContent = "Perbarui"; $("exploreHide").hidden = false;
    status("Memuat peta Jelajah…");
    const [mapOk] = await Promise.all([
      world ? Promise.resolve(true) : import("./worldmap").then(({ createWorldMap }) => { world = createWorldMap($("exploreMap")); return true; }, () => false),
      cloudEnabled ? loadPublic().then((x) => x.approvedMaps()).then((l) => { remote = l; }, () => { remote = []; }) : Promise.resolve(),
    ]);
    if (!mapOk) wrap.hidden = true;
    world?.resize();
    if (mapOk && byHand) wrap.scrollIntoView({ block: "nearest" });
    const n = drawPins();
    listPublic();
    status((!mapOk ? "Peta Jelajah tidak bisa dimuat. Pilih peta dari daftar di bawah."
      : n ? "Klik pin untuk melihat trail di tempat itu." : "Belum ada trail dengan lokasi.")
      + (cloudEnabled && !remote.length ? " Belum ada peta publik." : ""));
  }

  $("publicOpen").onclick = () => void open(true);
  $("exploreHide").onclick = () => {
    setHiddenPref(true);
    $("exploreWrap").hidden = true; $("exploreHide").hidden = true;
    $("publicOpen").textContent = "Tampilkan peta";
    status("Peta Jelajah disembunyikan di perangkat ini. Pilih peta dari daftar di bawah.");
  };

  $("publicList").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-pub]");
    const p = b && remote.find((x) => x.id === b.dataset.pub);
    if (!p) return;
    void (async () => {
      status("Mengunduh peta…");
      try {
        const m = await (await loadPublic()).downloadPublic(p.id);
        if (!m || mapProblems(m).length) { status("Peta ini tidak bisa dipakai."); return; }
        $("publicList").innerHTML = ""; status("");
        onPlay(cachePublicMap(m), "");
      } catch { status("Gagal mengunduh. Periksa internet lalu coba lagi."); }
    })();
  });
  if (!hiddenPref()) void open(false);
  return () => { if (world) { world.resize(); drawPins(); } };
}
