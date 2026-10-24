import { describe, expect, it } from "vitest";
import { POSTS } from "../src/data/posts";
import { gateDone, greenScore, isFreePost, isUnlocked, orangeScore, totalScore } from "../src/logic/score";
import { fresh } from "../src/store";

describe("skor", () => {
  it("hijau: 100 − 15 × petunjuk, minimal 20", () => {
    expect([0, 1, 2, 3, 6].map((h) => greenScore(h, false))).toEqual([100, 85, 70, 55, 20]);
  });

  it("oranye dikunci: 60 − 15 × petunjuk, minimal 10", () => {
    expect([0, 1, 2, 3].map((h) => orangeScore(h, false))).toEqual([60, 45, 30, 15]);
    expect(orangeScore(4, false)).toBe(10);
  });

  it("Pos 0 tidak kena pengurangan petunjuk", () => {
    expect(isFreePost(0)).toBe(true);
    expect(isFreePost(1)).toBe(false);
    expect(greenScore(3, true)).toBe(100);
    expect(orangeScore(3, true)).toBe(60);
  });

  it("total menjumlah skor semua pos", () => {
    const S = fresh("Uji", "#000", POSTS);
    S.posts[0].score = 100;
    S.posts[3].score = 45;
    expect(totalScore(S.posts)).toBe(145);
  });
});

describe("gerbang Pos 0", () => {
  it("Pos 1–5 terkunci sampai Pos 0 selesai", () => {
    const S = fresh("Uji", "#000", POSTS);
    expect(gateDone(S.posts)).toBe(false);
    expect(isUnlocked(S.posts, 0)).toBe(true);
    for (let i = 1; i <= 5; i++) expect(isUnlocked(S.posts, i)).toBe(false);
    S.posts[0].result = "orange";
    for (let i = 1; i <= 5; i++) expect(isUnlocked(S.posts, i)).toBe(true);
  });
});
