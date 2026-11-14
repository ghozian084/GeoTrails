import { describe, expect, it } from "vitest";
import { parseResult, postSummary, rankResults, resultPayload, sessionCsv } from "../src/cloud/sessiondata";
import { basicMap } from "../src/map/basic";
import { freshGroup } from "../src/map/store";

/* Sesi trail: hasil kelompok yang dikirim ke guru, rekap, dan CSV. */

describe("hasil kelompok untuk sesi", () => {
  const m = basicMap();

  it("yang dikirim hanya hasil per pos dan jawaban angka, bukan lembar kerja atau refleksi", () => {
    const S = freshGroup("Kelompok Elang", "#2E86AB", m);
    Object.assign(S.posts[0], { result: "green", score: 100, attempts: [11.1, 12.6], hints: 1, time: 75.4, work: "rahasia kelompok", physical: 12.4 });
    S.reflection = ["refleksi pribadi"];
    const p = resultPayload(S);
    expect(p).toEqual({ n: "Kelompok Elang", c: "#2E86AB", s: 100, posts: expect.any(Array) });
    expect(p.posts[0]).toEqual({ r: "g", s: 100, a: [11.1, 12.6], h: 1, t: 75 });
    expect(p.posts[1]).toEqual({ r: "", s: 0, a: [], h: 0, t: 0 });
    expect(JSON.stringify(p)).not.toContain("rahasia");
    expect(JSON.stringify(p)).not.toContain("refleksi");
  });

  it("riwayat jawaban dibatasi 10 terakhir; nama kelompok maks. 30 huruf", () => {
    const S = freshGroup("x".repeat(40), "#111111", m);
    S.posts[1].attempts = Array.from({ length: 15 }, (_, i) => i);
    const p = resultPayload(S);
    expect(p.n).toHaveLength(30);
    expect(p.posts[1].a).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it("rekap per pos, urutan peringkat, dan CSV", () => {
    const a = parseResult("u1", { n: "Elang", c: "#2E86AB", s: 160, posts: [{ r: "g", s: 100, a: [12.6], h: 0, t: 40 }, { r: "o", s: 60, a: [2000, 2300], h: 1, t: 90 }] }, 1)!;
    const b = parseResult("u2", { n: "Rusa", c: "#AA3322", s: 100, posts: [{ r: "g", s: 100, a: [11.1, 12.6], h: 2, t: 60 }] }, 2)!;
    expect(parseResult("u3", { posts: [] }, 3)).toBeNull();
    expect(rankResults([b, a]).map((r) => r.n)).toEqual(["Elang", "Rusa"]);
    const sum = postSummary([a, b], m);
    expect(sum[0]).toMatchObject({ green: 2, orange: 0, tried: 2, attempts: 1.5, hints: 1 });
    expect(sum[1]).toMatchObject({ green: 0, orange: 1, tried: 1, attempts: 2 });
    const csv = sessionCsv([a, b], m, "9A Senin").split("\n");
    expect(csv[0]).toBe("sesi,kelompok,total_poin,pos,judul,hasil,poin,percobaan,riwayat_jawaban,petunjuk,durasi_detik,satuan");
    expect(csv[1]).toBe("9A Senin,Elang,160,0,Tiang Bendera,hijau,100,1,\"12,6\",0,40,m");
    expect(csv).toHaveLength(1 + 2 * m.posts.length);
  });
});
