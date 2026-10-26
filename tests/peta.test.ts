import { beforeEach, describe, expect, it } from "vitest";
import { COLS, ROWS, walk } from "../src/data/map";
import { POSTS } from "../src/data/posts";
import { grade } from "../src/logic/grade";
import { parseNumber } from "../src/logic/parseNumber";
import { basicMap, copyOfBasic } from "../peta/src/basic";
import { blankMap, blankPost, setTile, toPosts, walker, type MapDef } from "../peta/src/mapdef";
import { align, allMaps, deleteMap, freshGroup, getMap, loadProgress, saveMap, saveProgress, studentMaps } from "../peta/src/store";
import { mapProblems } from "../peta/src/validate";
import { parseMap } from "../peta/src/portal/io";
import { cacheClass, cachedClass, classMaps, isClassCode, joinedClass, newClassCode, normalizeCode, setJoinedClass } from "../peta/src/cloud/cache";

// Minimal localStorage for the store tests (Vitest runs in Node).
const mem = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k), clear: () => mem.clear(),
  },
});

/** A small valid map: grass with one post next to the start. */
function tiny(): MapDef {
  const m = blankMap("Uji", 14, 10);
  m.start = [5, 8];
  const p = blankPost(5, 5);
  Object.assign(p, { title: "Tiang", task: "Berapa tinggi?", key: "10 m", green: [9, 11], orange: [8, 12], hints: ["Ukur bayangannya."] });
  m.posts.push(p);
  return m;
}

describe("Peta Basic = denah sekolah asli", () => {
  const basic = basicMap();

  it("lolos validasi", () => {
    expect(mapProblems(basic)).toEqual([]);
  });

  it("petak yang bisa dilalui sama persis dengan denah asli", () => {
    const w = walker(basic);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) expect([x, y, w(x, y)]).toEqual([x, y, walk(x, y)]);
  });

  it("enam pos dengan kunci jawaban yang sama", () => {
    const posts = toPosts(basic);
    expect(posts.map((p) => [p.id, p.tile, p.green, p.orange, p.errors])).toEqual(POSTS.map((p) => [p.id, p.tile, p.green, p.orange, p.errors]));
  });

  it("tabel uji wajib berlaku di peta Basic", () => {
    const posts = toPosts(basic);
    const g = (pos: number, input: string) => grade(posts[pos], parseNumber(input));
    expect(g(0, "11,1").zone).toBe("red");
    expect(g(0, "11,1").error?.m).toMatch(/mata siswa/);
    for (const [pos, input] of [[0, "12,6"], [1, "2.307"], [2, "4,8"], [3, "12"], [4, "82,7"], [5, "121"]] as const) expect(g(pos, input).zone).toBe("green");
    expect(g(5, "146").error?.m).toMatch(/setengah lingkaran/);
  });
});

describe("validasi peta", () => {
  it("peta kecil yang benar lolos", () => {
    expect(mapProblems(tiny())).toEqual([]);
  });

  it("perlu minimal satu pos", () => {
    const m = tiny(); m.posts = [];
    expect(mapProblems(m)).toContain("Peta perlu minimal 1 pos.");
  });

  it("pos yang dikelilingi kolam tidak bisa dicapai", () => {
    const m = tiny();
    for (let y = 3; y <= 7; y++) for (let x = 3; x <= 7; x++) if (x === 3 || x === 7 || y === 3 || y === 7) setTile(m, x, y, "a");
    expect(mapProblems(m).join(" ")).toMatch(/Pos 0 \(Tiang\): tidak bisa dicapai dari titik mulai/);
  });

  it("titik mulai di dalam gedung, gedung bertumpuk, ukuran", () => {
    const m = tiny();
    m.buildings.push({ name: "A", x0: 4, y0: 7, x1: 6, y1: 9, color: "#C4281C", floors: 2 }, { name: "B", x0: 6, y0: 8, x1: 8, y1: 9, color: "#0D69AC", floors: 1 });
    const p = mapProblems(m);
    expect(p).toContain("Titik mulai harus berada di petak yang bisa dilalui.");
    expect(p).toContain('Gedung "A" bertumpuk dengan gedung "B".');
    expect(mapProblems({ ...tiny(), cols: 5 })[0]).toMatch(/Ukuran peta/);
  });

  it("isi pos diperiksa seperti di Mode guru", () => {
    const m = tiny(); m.posts[0].orange = [9.5, 12];
    expect(mapProblems(m)).toContain("Pos 0 (Tiang): rentang hijau harus berada di dalam rentang oranye.");
  });
});

describe("penyimpanan peta dan progres", () => {
  beforeEach(() => mem.clear());

  it("Basic selalu pertama; peta guru disimpan, diubah, dihapus", () => {
    const m = tiny();
    saveMap(m);
    expect(allMaps().map((x) => x.name)).toEqual(["Basic", "Uji"]);
    m.name = "Uji 2"; saveMap(m);
    expect(getMap(m.id)?.name).toBe("Uji 2");
    deleteMap(m.id);
    expect(allMaps()).toHaveLength(1);
    expect(() => saveMap(basicMap())).toThrow(/Basic/);
  });

  it("hanya peta yang ditampilkan dan valid muncul untuk siswa", () => {
    const shown = { ...tiny(), published: true }, hidden = tiny(), broken = { ...tiny(), published: true, posts: [] };
    [shown, hidden, broken].forEach(saveMap);
    expect(studentMaps().map((m) => m.id)).toEqual(["basic", shown.id]);
  });

  it("salinan Basic bisa diedit dan berdiri sendiri", () => {
    const c = copyOfBasic("Sekolah kami");
    expect(c.id).not.toBe("basic");
    expect(c.builtIn).toBeUndefined();
    expect(mapProblems(c)).toEqual([]);
  });

  it("progres per peta menyesuaikan jumlah pos yang berubah", () => {
    const m = tiny();
    const S = freshGroup("Euclid", "#000", m);
    S.posts[0] = { ...S.posts[0], result: "green", score: 100 };
    saveProgress(m.id, S);
    m.posts.push({ ...blankPost(8, 5) });
    const back = loadProgress(m)!;
    expect(back.posts).toHaveLength(2);
    expect(back.posts[0].score).toBe(100);
    expect(back.posts[1].result).toBeNull();
  });

  it("posisi avatar yang kini tertutup kembali ke titik mulai", () => {
    const m = tiny();
    const S = freshGroup("Euclid", "#000", m);
    S.pos = [2, 2];
    setTile(m, 2, 2, "a");
    expect(align(S, m).pos).toEqual(m.start);
  });
});

describe("impor peta", () => {
  beforeEach(() => mem.clear());

  it("berkas ekspor diimpor sebagai peta baru yang disembunyikan", () => {
    const m = { ...tiny(), published: true };
    saveMap(m);
    const { map, problems } = parseMap(JSON.stringify(m));
    expect(problems).toEqual([]);
    expect(map!.id).not.toBe(m.id);
    expect(map!.published).toBe(false);
    expect(map!.name).toBe("Uji (impor)");
  });

  it("menolak berkas yang bukan peta", () => {
    expect(parseMap("{}").problems[0]).toMatch(/bukan peta/);
    expect(parseMap("bukan json").problems[0]).toMatch(/tidak bisa dibaca/);
  });
});

describe("kelas online (cache lokal)", () => {
  beforeEach(() => mem.clear());

  it("kode kelas 6 karakter tanpa huruf/angka yang mirip", () => {
    for (let i = 0; i < 200; i++) expect(isClassCode(newClassCode())).toBe(true);
    expect(isClassCode("ABC234")).toBe(true);
    expect(isClassCode("ABC1O0")).toBe(false);
    expect(normalizeCode(" abc-234 ")).toBe("ABC234");
  });

  it("peta kelas tersimpan untuk dipakai offline dan muncul untuk siswa", () => {
    const m = tiny();
    setJoinedClass("ABC234");
    cacheClass("ABC234", "Kelas 9A", [m]);
    expect(joinedClass()).toBe("ABC234");
    expect(cachedClass("ABC234")?.name).toBe("Kelas 9A");
    expect(classMaps().map((x) => x.id)).toEqual([m.id]);
    expect(classMaps()[0].published).toBe(true);
    expect(studentMaps().map((x) => x.id)).toEqual(["basic", m.id]);
    expect(getMap(m.id)?.name).toBe("Uji");
  });

  it("peta kelas yang bermasalah tidak muncul; keluar kelas menghapus salinannya", () => {
    setJoinedClass("ABC234");
    cacheClass("ABC234", "Kelas 9A", [{ ...tiny(), posts: [] }]);
    expect(classMaps()).toEqual([]);
    setJoinedClass(null);
    expect(joinedClass()).toBeNull();
    expect(cachedClass("ABC234")).toBeNull();
  });
});
