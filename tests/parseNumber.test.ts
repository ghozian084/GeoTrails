import { describe, expect, it } from "vitest";
import { parseNumber } from "../src/logic/parseNumber";

describe("parseNumber (gaya Indonesia)", () => {
  it.each([
    ["12,6", 12.6],
    ["2.307", 2307],
    ["2.307,5", 2307.5],
    ["12", 12],
    ["1.234.567", 1234567],
    ["0,0833", 0.0833],
    [" 82,7 L ", 82.7],
    ["-3,5", -3.5],
    ["12.6", 12.6],
  ])("%s → %d", (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });

  it.each(["", "   ", "abc"])("%j → NaN", (input) => {
    expect(parseNumber(input)).toBeNaN();
  });
});
