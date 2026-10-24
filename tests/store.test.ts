import { describe, expect, it } from "vitest";
import { POSTS } from "../src/data/posts";
import { fresh, normalize } from "../src/store";
import type { GroupState } from "../src/types";

describe("penyimpanan", () => {
  it("kelompok baru punya lembar kerja kosong, fisik kosong, dan refleksi kosong", () => {
    const S = fresh("Uji", "#000", POSTS);
    expect(S.reflection).toEqual([]);
    S.posts.forEach((p) => { expect(p.work).toBe(""); expect(p.physical).toBeNull(); });
  });

  it("progres versi lama tetap bisa dilanjutkan", () => {
    const old = JSON.parse(JSON.stringify(fresh("Lama", "#000", POSTS)));
    delete old.reflection;
    old.posts.forEach((p: Record<string, unknown>) => { delete p.work; delete p.physical; });
    old.posts[0].result = "green"; old.posts[0].score = 100;
    const S = normalize(old as GroupState);
    expect(S.reflection).toEqual([]);
    expect(S.posts[0]).toMatchObject({ result: "green", score: 100, work: "", physical: null });
  });
});
