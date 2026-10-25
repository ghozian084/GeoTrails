import { describe, expect, it } from "vitest";
import { dominantDir, stickVector } from "../src/ui/stick";

describe("joystick layar sentuh", () => {
  it("zona mati di tengah", () => {
    expect(stickVector(5, -5, 60)).toEqual([0, 0]);
  });

  it("panjang vektor maksimal 1, arah tetap", () => {
    const [x, y] = stickVector(0, -200, 60);
    expect(x).toBeCloseTo(0, 9);
    expect(y).toBeCloseTo(-1, 9);
    const [a, b] = stickVector(30, 30, 60);
    expect(Math.hypot(a, b)).toBeLessThan(1);
    expect(a).toBeCloseTo(b, 9);
  });

  it("dorongan setengah memberi kecepatan sebagian", () => {
    const [, y] = stickVector(0, 30, 60);
    expect(y).toBeGreaterThan(0.3);
    expect(y).toBeLessThan(0.5);
  });

  it("2D: arah grid mengikuti sumbu terkuat", () => {
    expect(dominantDir(0.9, -0.2)).toEqual([1, 0]);
    expect(dominantDir(-0.1, -0.8)).toEqual([0, -1]);
    expect(dominantDir(0, 0.6)).toEqual([0, 1]);
    expect(dominantDir(0.1, 0.1)).toBeNull();
  });
});

import { COLS, ROWS } from "../src/data/map";
import { tileSize } from "../src/game/camera";

describe("ukuran petak peta", () => {
  it("desktop tetap 46 px", () => {
    expect(tileSize(1280, 806)).toBe(46);
  });

  it("layar HP tegak: peta mengisi tinggi layar", () => {
    const T = tileSize(412, 820);
    expect(T * ROWS).toBeGreaterThanOrEqual(820);
    expect(T * COLS).toBeGreaterThanOrEqual(412);
  });
});
