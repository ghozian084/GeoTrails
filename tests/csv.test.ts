import { describe, expect, it } from "vitest";
import { POSTS } from "../src/data/posts";
import { toCsv } from "../src/logic/csv";
import { fresh } from "../src/store";

const header = (csv: string) => csv.split("\n")[0].split(",");

describe("log CSV", () => {
  it("memuat kolom lembar kerja", () => {
    const S = fresh("Uji", "#000", POSTS);
    expect(header(toCsv(S, POSTS))).toContain("lembar_kerja");
  });

  it("catatan berisi koma, kutip, dan baris baru tetap satu sel", () => {
    const S = fresh("Uji", "#000", POSTS);
    S.posts[0].work = 'tan 48° = 1,11\n"tinggi mata" 1,5 m';
    const csv = toCsv(S, POSTS);
    expect(csv).toContain('"tan 48° = 1,11\n""tinggi mata"" 1,5 m"');
  });
});
