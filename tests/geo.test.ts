import { describe, expect, it } from "vitest";
import { basicMap } from "../src/map/basic";
import { distanceKm, formatDistance, formatLatLng, groupPins, nearest, parseLatLng } from "../src/map/geo";
import { mapProblems, placeProblems } from "../src/map/validate";

describe("lokasi peta (Jelajah)", () => {
  it("membaca koordinat salinan Google Maps", () => {
    expect(parseLatLng("-7.0412, 110.3561")).toEqual({ lat: -7.0412, lng: 110.3561 });
    expect(parseLatLng(" −7.0412 ; 110.3561 ")).toEqual({ lat: -7.0412, lng: 110.3561 });
    expect(parseLatLng("-7.0412 110.3561")).toEqual({ lat: -7.0412, lng: 110.3561 });
    expect(parseLatLng("95, 10")).toBeNull();
    expect(parseLatLng("Semarang")).toBeNull();
    expect(formatLatLng(-7.04, 110.356)).toBe("-7.04000, 110.35600");
  });
  it("memeriksa lokasi peta", () => {
    expect(placeProblems({ name: "Taman Kota", lat: -7, lng: 110 })).toEqual([]);
    expect(placeProblems({ name: "", lat: -7, lng: 110 })).toHaveLength(1);
    expect(placeProblems({ name: "X", lat: 99, lng: 110 })).toHaveLength(1);
    const m = basicMap();
    expect(mapProblems(m)).toEqual([]);
    expect(mapProblems({ ...m, place: { name: "X", lat: NaN, lng: 0 } })).toContain("Lokasi peta: koordinat tidak valid.");
  });
  it("Basic punya pin di sekolah", () => {
    expect(basicMap().place?.name).toMatch(/Semesta/);
  });
  it("peta di tempat yang sama berbagi satu pin", () => {
    const g = groupPins([{ lat: -7.04121, lng: 110.35611, id: "a" }, { lat: -7.04123, lng: 110.35612, id: "b" }, { lat: -6.9, lng: 110.4, id: "c" }]);
    expect(g.map((x) => x.map((y) => y.id))).toEqual([["a", "b"], ["c"]]);
  });
  it("Dekat saya: jarak dan trail terdekat", () => {
    // Semarang Tawang to Simpang Lima is about 3 km.
    expect(distanceKm({ lat: -6.9645, lng: 110.4278 }, { lat: -6.9903, lng: 110.4229 })).toBeCloseTo(2.92, 1);
    expect(distanceKm({ lat: -7, lng: 110 }, { lat: -7, lng: 110 })).toBe(0);
    expect(formatDistance(0.004)).toBe("10 m");
    expect(formatDistance(0.347)).toBe("350 m");
    expect(formatDistance(1.24)).toBe("1,2 km");
    expect(formatDistance(1234.4)).toBe("1.234 km");
    const at = { lat: -6.986, lng: 110.41 };
    expect(nearest([{ lat: -7.05, lng: 110.35, id: "sekolah" }, { lat: -6.985, lng: 110.409, id: "taman" }], at)?.item.id).toBe("taman");
    expect(nearest([], at)).toBeNull();
  });
});
