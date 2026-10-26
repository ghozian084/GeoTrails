import { newId, type MapDef } from "../mapdef";
import { customMaps } from "../store";
import { mapProblems } from "../validate";

/* Export / import maps as JSON files (photos stay on the laptop and are not included). */

export function download(name: string, text: string, type = "application/json"): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

export function exportMap(m: MapDef): void {
  const out: MapDef = { ...m, builtIn: undefined };
  download(`geotrails-peta-${m.name.replace(/\W+/g, "-").toLowerCase()}.json`, JSON.stringify(out, null, 2));
}

/** Parse an exported map. It gets a fresh id (so it never overwrites a map) and starts hidden. */
export function parseMap(text: string): { map: MapDef | null; problems: string[] } {
  let data: MapDef;
  try { data = JSON.parse(text); } catch { return { map: null, problems: ["Berkas JSON tidak bisa dibaca."] }; }
  if (!data || data.format !== "geotrails-map") return { map: null, problems: ["Berkas ini bukan peta GeoTrails."] };
  const names = new Set(customMaps().map((m) => m.name));
  let name = String(data.name || "Peta impor").slice(0, 34);
  while (names.has(name) || name === "Basic") name = `${name} (impor)`.slice(0, 40);
  const map: MapDef = { ...data, id: newId("m-"), name, published: false, builtIn: undefined };
  return { map, problems: mapProblems(map) };
}
