import { formatLatLng, parseLatLng, roundCoord } from "../map/geo";
import type { MapDef } from "../map/mapdef";
import { $, esc } from "../ui/dom";
import type { WorldMap } from "../ui/worldmap";

/*
 * "Lokasi di Jelajah" in the editor's map panel: the map's pin on the students' Jelajah map
 * (place name and coordinates). Coordinates can be pasted from Google Maps or picked on an
 * OpenStreetMap map, which loads from the internet only when "Pilih di peta" is pressed.
 */

let world: WorldMap | null = null;

export function placeHtml(m: MapDef): string {
  const p = m.place;
  return `<h3>Lokasi di Jelajah</h3>
    <p class="sub">Pin peta ini di peta Jelajah siswa. Pasang hanya di tempat umum (sekolah, taman), bukan rumah.</p>
    <label class="ed-f"><span>Nama tempat</span><input id="plName" maxlength="60" placeholder="mis. SMP Semesta, Semarang" value="${esc(p?.name ?? "")}"></label>
    <label class="ed-f"><span>Koordinat (lintang, bujur)</span><input id="plCoord" inputmode="decimal" placeholder="-7.04120, 110.35610" value="${p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? formatLatLng(p.lat, p.lng) : ""}"></label>
    <small>Salin dari Google Maps (klik kanan pada tempatnya, lalu klik angka koordinat), atau pilih di peta.</small>
    <div class="row"><button type="button" class="btn" id="plPick">Pilih di peta</button>${p ? `<button type="button" class="btn ghost" id="plClear">Hapus lokasi</button>` : ""}</div>
    <div class="pl-map" id="plMap" hidden></div>`;
}

/** Wire the fields; `changed(structural)` is the editor's save hook. */
export function wirePlace(m: MapDef, changed: (structural: boolean) => void): void {
  world?.destroy(); world = null;
  const name = $<HTMLInputElement>("plName"), coord = $<HTMLInputElement>("plCoord");
  const apply = () => {
    const n = name.value.trim(), c = coord.value.trim();
    if (!n && !c) { delete m.place; changed(false); return; }
    const q = parseLatLng(c);
    // A half-filled location stays on the map, so the check list tells the teacher what is missing.
    m.place = { name: n, lat: q ? roundCoord(q.lat) : NaN, lng: q ? roundCoord(q.lng) : NaN };
    changed(false);
  };
  name.oninput = apply;
  coord.oninput = apply;
  document.getElementById("plClear")?.addEventListener("click", () => { delete m.place; changed(true); });
  $("plPick").onclick = async () => {
    const box = $("plMap");
    if (!box.hidden) { box.hidden = true; return; }
    if (!navigator.onLine) { box.hidden = false; box.textContent = "Peta butuh internet. Tempel koordinat dari Google Maps di kotak di atas."; return; }
    box.hidden = false;
    if (world) { world.resize(); return; }
    box.textContent = "Memuat peta…";
    try {
      const { createWorldMap } = await import("../ui/worldmap");
      box.textContent = "";
      const at = m.place && Number.isFinite(m.place.lat) && Number.isFinite(m.place.lng) ? m.place : null;
      world = createWorldMap(box, at ? [at.lat, at.lng] : [-7.0, 110.4], at ? 16 : 11);
      world.picker(at, (lat, lng) => { coord.value = formatLatLng(lat, lng); apply(); });
    } catch {
      box.textContent = "Peta tidak bisa dimuat. Tempel koordinat dari Google Maps di kotak di atas.";
    }
  };
}
