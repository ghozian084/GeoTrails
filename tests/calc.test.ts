import { describe, expect, it } from "vitest";
import { CalcError, evaluate } from "../src/logic/calc";

describe("kalkulator (mode derajat)", () => {
  it.each([
    ["10 × tan(48) + 1,5", 12.606],
    ["10tan48+1,5", 12.606],
    ["π × 60² × 204 ÷ 1000", 2307.186],
    ["tan⁻¹(30 ÷ 360)", 4.764],
    ["1 ÷ 3 × π × 40 × (35² + 35 × 15 + 15²) ÷ 1000", 82.729],
    ["12 × 8 + π × 4² ÷ 2", 121.133],
    ["377 ÷ (2π)", 60.0014],
  ])("%s ≈ %d", (expr, expected) => {
    expect(evaluate(expr)).toBeCloseTo(expected, 3);
  });

  it.each([
    ["sin(30)", 0.5],
    ["cos(60)", 0.5],
    ["sin⁻¹(0,5)", 30],
    ["√16", 4],
    ["√(9+16)", 5],
    ["2^3^2", 512],
    ["-2^2", -4],
    ["(-2)^2", 4],
    ["2(3+4)", 14],
    ["12,5 + 0,5", 13],
    ["2.307", 2307],
    ["2.307,5 − 7,5", 2300],
    ["log(1000)", 3],
    ["ln(1)", 0],
    ["(1+2", 3],
  ])("%s = %d", (expr, expected) => {
    expect(evaluate(expr)).toBe(expected);
  });

  it.each(["", "1+", "sin", "abc", "1 ÷ 0", "(1+2))", "√(-1)", "2 # 3"])("%j → galat", (expr) => {
    expect(() => evaluate(expr)).toThrow(CalcError);
  });
});
