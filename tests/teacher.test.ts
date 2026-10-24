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
