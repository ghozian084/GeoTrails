import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

/*
 * Real-world map for the Jelajah screen and the teacher's pin picker (Leaflet, bundled from npm).
 * The only part of GeoTrails that loads from the internet at runtime: OpenStreetMap tiles, and only
 * once this module is opened. Pins are plain CSS markers (no image files). Nothing about the
 * viewer's location is read, stored or sent.
 */

export type PinKind = "public" | "class" | "device";
export interface WorldPin { lat: number; lng: number; kind: PinKind; label: string; count: number; key: string }

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

const icon = (p: WorldPin) => L.divIcon({
  className: `wpin wpin-${p.kind}`,
  html: `<span>${p.count > 1 ? p.count : ""}</span>`,
  iconSize: [26, 26], iconAnchor: [13, 26],
});

export interface WorldMap {
  setPins(pins: WorldPin[], onPick: (key: string) => void): void;
  /** Teacher's picker: one movable pin; clicks or drags call back with the new spot. */
  picker(at: { lat: number; lng: number } | null, onMove: (lat: number, lng: number) => void): void;
  focus(lat: number, lng: number, zoom?: number): void;
  resize(): void;
  destroy(): void;
}

export function createWorldMap(el: HTMLElement, center: [number, number] = [-2.5, 118], zoom = 5): WorldMap {
  // keyboard: false — Leaflet focuses the map on press, which scrolls the start window and makes the click land elsewhere.
  const map = L.map(el, { center, zoom, worldCopyJump: true, zoomControl: true, keyboard: false });
  L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIB }).addTo(map);
  let layer = L.layerGroup().addTo(map);
  let pick: L.Marker | null = null;

  return {
    setPins(pins, onPick) {
      layer.remove();
      layer = L.layerGroup(pins.map((p) => L.marker([p.lat, p.lng], { icon: icon(p), title: p.label, alt: p.label, keyboard: true })
        .on("click", () => onPick(p.key)))).addTo(map);
      if (pins.length) map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])).pad(0.3), { maxZoom: 15, animate: false });
    },
    picker(at, onMove) {
      const put = (lat: number, lng: number) => {
        if (!pick) pick = L.marker([lat, lng], { icon: icon({ lat, lng, kind: "class", label: "Lokasi peta", count: 1, key: "" }), draggable: true })
          .on("dragend", () => { const q = pick!.getLatLng(); onMove(q.lat, q.lng); }).addTo(map);
        else pick.setLatLng([lat, lng]);
      };
      if (at) { put(at.lat, at.lng); map.setView([at.lat, at.lng], 16); }
      map.on("click", (e: L.LeafletMouseEvent) => { put(e.latlng.lat, e.latlng.lng); onMove(e.latlng.lat, e.latlng.lng); });
    },
    focus(lat, lng, z = 16) { map.setView([lat, lng], z); },
    resize() { map.invalidateSize(); },
    destroy() { map.remove(); },
  };
}
