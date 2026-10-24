import { describe, expect, it } from "vitest";
import { START } from "../src/data/map";
import { angleDelta, free, inputDir, RADIUS, slide, tileOf } from "../blox/src/movement";

describe("Blox: gerak 3D di grid denah", () => {
  const [sx, sy] = START;
  const cx = sx + .5, cz = sy + .5;

  it("titik awal bebas, gedung dan tiang bendera tidak bisa dimasuki", () => {
    expect(free(cx, cz)).toBe(true);
    expect(free(3.5, 3.5)).toBe(false); // Gedung Kelas A
    expect(free(17.5, 11.5)).toBe(false); // tiang bendera
    expect(free(-0.1, 10)).toBe(false); // di luar peta
  });

  it("menabrak dinding lalu meluncur di sepanjangnya", () => {
    // Just south of Gedung Kelas A (rows 0–6), on the row 7 path, pushing north-east.
    const [x, z] = slide(3.5, 7 + RADIUS + 0.01, 0.3, -0.3);
    expect(x).toBeCloseTo(3.8, 6);
    expect(z).toBeCloseTo(7 + RADIUS + 0.01, 6);
  });

  it("arah WASD mengikuti putaran kamera", () => {
    const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));
    close(inputDir(1, 0, 0), [0, -1]); // maju = utara
    close(inputDir(0, 1, 0), [1, 0]); // kanan = timur
    close(inputDir(1, 0, Math.PI / 2), [-1, 0]); // kamera di timur → maju = barat
    close(inputDir(1, 1, 0), [Math.SQRT1_2, -Math.SQRT1_2]);
    expect(inputDir(0, 0, 1)).toEqual([0, 0]);
  });

  it("petak dan selisih sudut", () => {
    expect(tileOf(17.9, 22.1)).toEqual([17, 22]);
    expect(angleDelta(0, Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2, 6);
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6, 6);
  });
});
