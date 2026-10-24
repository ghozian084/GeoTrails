import { describe, expect, it } from "vitest";
import { closeness, percentDiff } from "../src/logic/compare";

describe("taksiran vs fisik", () => {
  it("selisih persen bertanda, relatif terhadap hasil fisik", () => {
    expect(percentDiff(12.6, 12)).toBeCloseTo(5, 6);
    expect(percentDiff(2307, 2500)).toBeCloseTo(-7.72, 2);
    expect(percentDiff(12, 12)).toBe(0);
  });

  it("tanpa data atau fisik nol → tidak ada selisih", () => {
    expect(percentDiff(null, 12)).toBeNull();
    expect(percentDiff(12, null)).toBeNull();
    expect(percentDiff(12, 0)).toBeNull();
  });

  it("kategori kedekatan", () => {
    expect(closeness(4.9)).toBe("dekat");
    expect(closeness(-5)).toBe("dekat");
    expect(closeness(12)).toBe("cukup");
    expect(closeness(-15)).toBe("cukup");
    expect(closeness(15.1)).toBe("jauh");
  });
});
