import { describe, expect, it } from "vitest";
import { checkPin, hashPin, validPin } from "../src/logic/pin";

describe("PIN guru", () => {
  it("hanya 4–8 angka", () => {
    expect(validPin("1234")).toBe(true);
    expect(validPin("12345678")).toBe(true);
    expect(validPin("123")).toBe(false);
    expect(validPin("123456789")).toBe(false);
    expect(validPin("12a4")).toBe(false);
  });

  it("PIN disimpan sebagai hash, bukan teks asli", async () => {
    const h = await hashPin("2468");
    expect(h).not.toContain("2468");
    expect(h).toBe(await hashPin("2468"));
    expect(h).not.toBe(await hashPin("2469"));
  });

  it("cek PIN", async () => {
    const h = await hashPin("2468");
    expect(await checkPin("2468", h)).toBe(true);
    expect(await checkPin("1357", h)).toBe(false);
    expect(await checkPin("2468", null)).toBe(false);
  });
});

import { fitWithin, isPanorama, maxSide } from "../src/logic/image";

describe("ukuran foto pos", () => {
  it("foto lebar dianggap panorama", () => {
    expect(isPanorama(4000, 1000)).toBe(true);
    expect(isPanorama(2500, 1000)).toBe(true);
    expect(isPanorama(1600, 1200)).toBe(false);
    expect(isPanorama(100, 0)).toBe(false);
  });

  it("diperkecil sesuai sisi terpanjang, tidak diperbesar", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual([1600, 1200]);
    expect(fitWithin(3000, 4000, 1600)).toEqual([1200, 1600]);
    expect(fitWithin(800, 600, 1600)).toEqual([800, 600]);
    expect(maxSide(8000, 2000)).toBe(4096);
    expect(maxSide(4000, 3000)).toBe(1600);
  });
});
