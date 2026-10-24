import { describe, expect, it } from "vitest";
import { POSTS } from "../src/data/posts";
import { toTrailFile, validateTrail } from "../src/logic/trail";

const file = () => JSON.parse(JSON.stringify(toTrailFile(POSTS)));

describe("isi pos buatan guru", () => {
  it("ekspor lalu impor pos bawaan menghasilkan pos yang sama", () => {
    const { trail, errors } = validateTrail(file(), POSTS);
    expect(errors).toEqual([]);
    expect(trail).toEqual(POSTS);
  });

  it("posisi peta selalu dari pos bawaan, bukan dari berkas", () => {
    const f = file();
    f.posts[0].tile = [0, 0];
    f.posts[0].title = "Tiang Bendera Baru";
    const { trail } = validateTrail(f, POSTS);
    expect(trail![0].tile).toEqual(POSTS[0].tile);
    expect(trail![0].title).toBe("Tiang Bendera Baru");
  });

  it("menolak berkas yang bukan berkas GeoTrails atau jumlah pos salah", () => {
    expect(validateTrail({ posts: [] }, POSTS).trail).toBeNull();
    const f = file(); f.posts.pop();
    expect(validateTrail(f, POSTS).errors[0]).toMatch(/tepat 6 pos/);
  });

  it("rentang hijau harus di dalam oranye", () => {
    const f = file(); f.posts[2].orange = [4.6, 5.6];
    expect(validateTrail(f, POSTS).errors).toContain("Pos 2: rentang hijau harus berada di dalam rentang oranye.");
  });

  it("pola kesalahan tidak boleh bertumpang dengan rentang hijau", () => {
    const f = file(); f.posts[3].errors.push({ v: 12, t: 0.1, m: "x" });
    expect(validateTrail(f, POSTS).errors.join(" ")).toMatch(/Pos 3: kesalahan 3 bertumpang/);
  });

  it("kolom wajib dan batas jumlah petunjuk", () => {
    const f = file(); f.posts[1].task = "  "; f.posts[1].hints = [];
    const { errors } = validateTrail(f, POSTS);
    expect(errors).toContain("Pos 1: soal wajib diisi.");
    expect(errors).toContain("Pos 1: petunjuk harus 1–5 butir.");
  });

  it("angka harus angka", () => {
    const f = file(); f.posts[4].green = ["80", 85];
    expect(validateTrail(f, POSTS).errors).toContain("Pos 4: rentang hijau harus berisi dua angka.");
  });
});
