import { describe, expect, it } from "vitest";
import { POSTS } from "../src/data/posts";
import { grade } from "../src/logic/grade";
import { parseNumber } from "../src/logic/parseNumber";
import type { Zone } from "../src/types";

/* Tabel uji wajib dari CLAUDE.md. */
const CASES: { pos: number; input: string; zone: Zone; message?: RegExp }[] = [
  { pos: 0, input: "11,1", zone: "red", message: /dari mata siswa/ },
  { pos: 0, input: "12,6", zone: "green" },
  { pos: 1, input: "2.307", zone: "green" },
  { pos: 2, input: "4,8", zone: "green" },
  { pos: 3, input: "12", zone: "green" },
  { pos: 4, input: "82,7", zone: "green" },
  { pos: 5, input: "121", zone: "green" },
  { pos: 5, input: "146", zone: "red", message: /setengah lingkaran/ },
];

describe("tabel jawaban kunci", () => {
  it.each(CASES)("Pos $pos, input $input → $zone", ({ pos, input, zone, message }) => {
    const g = grade(POSTS[pos], parseNumber(input));
    expect(g.zone).toBe(zone);
    if (message) expect(g.error?.m).toMatch(message);
  });

  it("Pos 0, 11,1 memicu pesan tinggi mata (kesalahan pertama)", () => {
    expect(grade(POSTS[0], parseNumber("11,1")).error).toBe(POSTS[0].errors[0]);
  });

  it("jawaban hijau tidak memicu pesan kesalahan khusus", () => {
    for (const c of CASES.filter((c) => c.zone === "green")) {
      expect(grade(POSTS[c.pos], parseNumber(c.input)).error).toBeNull();
    }
  });
});

describe("data pos", () => {
  it("ada 6 pos dengan id 0–5 berurutan", () => {
    expect(POSTS.map((p) => p.id)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it.each(POSTS)("Pos $id: rentang hijau ada di dalam rentang oranye", (p) => {
    expect(p.green[0]).toBeLessThanOrEqual(p.green[1]);
    expect(p.orange[0]).toBeLessThanOrEqual(p.green[0]);
    expect(p.orange[1]).toBeGreaterThanOrEqual(p.green[1]);
  });

  it.each(POSTS)("Pos $id: pola kesalahan tidak bertumpang dengan rentang hijau", (p) => {
    for (const e of p.errors) {
      expect(e.v + e.t < p.green[0] || e.v - e.t > p.green[1]).toBe(true);
    }
  });
});
