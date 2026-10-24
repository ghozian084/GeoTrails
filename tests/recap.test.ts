import { describe, expect, it } from "vitest";
import { POSTS } from "../src/data/posts";
import { toCsv } from "../src/logic/csv";
import { parseCsv } from "../src/logic/csvParse";
import { parseLogs, summarize } from "../src/logic/recap";
import { fresh } from "../src/store";

function log(name: string, f: (S: ReturnType<typeof fresh>) => void) {
  const S = fresh(name, "#000", POSTS);
  f(S);
  return toCsv(S, POSTS);
}

describe("parser CSV", () => {
  it("kutip, koma, baris baru, dan CRLF", () => {
    expect(parseCsv('a,"b,c","d ""e"""\r\n"x\ny",z')).toEqual([["a", "b,c", 'd "e"'], ["x\ny", "z"]]);
  });

  it("membaca kembali hasil toCsv dengan tepat", () => {
    const csv = log("A, B", (S) => { S.posts[0].work = 'baris 1\n"kutip"'; });
    const rows = parseCsv(csv);
    expect(rows[1][0]).toBe("A, B");
    expect(rows[1][rows[0].indexOf("lembar_kerja")]).toBe('baris 1\n"kutip"');
  });
});

describe("rekap kelas", () => {
  const a = log("Euclid", (S) => {
    S.posts[0] = { ...S.posts[0], result: "green", answer: 12.6, attempts: [11.1, 12.6], hints: 1, time: 120, score: 100, physical: 12, work: "" };
    S.posts[5] = { ...S.posts[5], result: "orange", answer: 126, attempts: [146, 126], hints: 2, time: 300, score: 30, physical: null, work: "" };
    S.reflection = ["Tinggi tandon", "", "Bayangan"];
  });
  const b = log("Pythagoras", (S) => {
    S.posts[0] = { ...S.posts[0], result: "green", answer: 12.5, attempts: [11.12, 12.5], hints: 0, time: 90, score: 100, physical: 12.5, work: "" };
  });

  it("menggabungkan beberapa log yang ditempel berurutan", () => {
    const { groups, warnings } = parseLogs(a + "\n" + b);
    expect(warnings).toEqual([]);
    expect(groups.map((g) => g.name)).toEqual(["Euclid", "Pythagoras"]);
    expect(groups[0].posts).toHaveLength(6);
    expect(groups[0].posts[0]).toMatchObject({ result: "hijau", attempts: 2, history: [11.1, 12.6], hints: 1, time: 120, score: 100, physical: 12, diff: 5 });
    expect(groups[0].reflection.map((r) => r.a)).toEqual(["Tinggi tandon", "Bayangan"]);
  });

  it("ringkasan per kelompok dan per pos, termasuk kesalahan tersering", () => {
    const { perGroup, perPost } = summarize(parseLogs(a + "\n" + b).groups, POSTS);
    expect(perGroup.map((g) => [g.name, g.total, g.green, g.orange])).toEqual([["Euclid", 130, 1, 1], ["Pythagoras", 100, 1, 0]]);
    expect(perPost[0]).toMatchObject({ groups: 2, green: 2, orange: 0, open: 0, avgAttempts: 2, avgHints: 0.5 });
    expect(perPost[0].avgAbsDiff).toBeCloseTo(2.5, 6);
    expect(perPost[0].mistakes).toEqual([{ m: POSTS[0].errors[0].m, count: 2 }]);
    expect(perPost[5].mistakes[0].m).toMatch(/setengah lingkaran/);
    expect(perPost[1]).toMatchObject({ green: 0, open: 2, avgAttempts: null });
  });

  it("kelompok yang ditempel dua kali memakai data terakhir dan memberi peringatan", () => {
    const { groups, warnings } = parseLogs(a + "\n" + a);
    expect(groups).toHaveLength(1);
    expect(warnings[0]).toMatch(/Euclid/);
  });

  it("log versi lama tanpa kolom baru tetap terbaca", () => {
    const old = "kelompok,pos,judul,jawaban,satuan,hasil,percobaan,riwayat_jawaban,petunjuk,durasi_detik,poin\nLama,0,Tiang Bendera,12.6,m,hijau,1,12.6,0,30,100";
    const { groups } = parseLogs(old);
    expect(groups[0].posts[0]).toMatchObject({ result: "hijau", score: 100, physical: null, diff: null });
  });

  it("teks yang bukan log memberi peringatan", () => {
    expect(parseLogs("halo").warnings[0]).toMatch(/Tidak ada data/);
  });
});
