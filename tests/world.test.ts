import { describe, expect, it } from "vitest";
import { mix, parseColor, shade, withAlpha } from "../src/game/color";
import { groundAt, rng } from "../src/game/world";

describe("jenis permukaan denah", () => {
  it("membedakan lapangan, paving, rumput, taman, dan gedung", () => {
    expect(groundAt(17, 11)).toBe("court"); // tiang bendera di lapangan upacara
    expect(groundAt(10, 10)).toBe("court");
    expect(groundAt(6, 12)).toBe("pave");
    expect(groundAt(0, 7)).toBe("pave");
    expect(groundAt(10, 20)).toBe("grass");
    expect(groundAt(33, 21)).toBe("garden");
    expect(groundAt(3, 3)).toBe("build");
    expect(groundAt(-1, 0)).toBeNull();
    expect(groundAt(36, 0)).toBeNull();
  });
});

describe("tekstur deterministik", () => {
  it("rng dengan seed sama menghasilkan urutan sama, dalam [0, 1)", () => {
    const a = rng(7), b = rng(7);
    const xs = Array.from({ length: 50 }, a);
    expect(Array.from({ length: 50 }, b)).toEqual(xs);
    expect(xs.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(rng(8)()).not.toBe(xs[0]);
  });
});

describe("warna", () => {
  it("membaca hex dan rgba", () => {
    expect(parseColor("#0E6B5B")).toEqual([14, 107, 91, 1]);
    expect(parseColor("#fff")).toEqual([255, 255, 255, 1]);
    expect(parseColor("rgba(20,40,35,.22)")).toEqual([20, 40, 35, 0.22]);
  });

  it("mencampur, menerangkan, menggelapkan, dan mengubah alfa", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("rgb(128,128,128)");
    expect(shade("#808080", 1)).toBe("rgb(255,255,255)");
    expect(shade("#808080", -1)).toBe("rgb(0,0,0)");
    expect(withAlpha("#0E6B5B", 0.5)).toBe("rgba(14,107,91,0.5)");
  });
});
