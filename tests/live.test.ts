import { describe, expect, it } from "vitest";
import { angleOf, deduped, dirOf, doneCount, parseRoom, postString, ranked, round2, type LivePlayer } from "../peta/src/cloud/livedata";
import { smoother } from "../peta/src/remote";
import type { GroupState } from "../src/types";

/* Multiplayer (live rooms): data helpers and avatar smoothing. */

const P = (uid: string, s: number, p: string, n = uid): LivePlayer => ({ uid, n, c: "#2E86AB", x: 1, y: 1, d: 0, s, p, on: true, t: 1 });

describe("data ruang langsung", () => {
  it("status pos jadi satu huruf per pos", () => {
    const S = { posts: [{ result: "green" }, { result: "orange" }, { result: null }] } as unknown as GroupState;
    expect(postString(S)).toBe("go-");
    expect(doneCount("go-")).toBe(2);
  });

  it("papan skor: poin, lalu jumlah pos selesai, lalu nama", () => {
    expect(ranked([P("a", 100, "g--"), P("b", 160, "gg-"), P("c", 100, "go-"), P("d", 100, "go-", "Aster")]).map((p) => p.uid)).toEqual(["b", "d", "c", "a"]);
  });

  it("kelompok yang online lagi dari browser lain tidak tampil dobel", () => {
    const ps = [P("lama", 0, "-", "Elang"), P("baru", 0, "-", "Elang"), P("x", 0, "-", "Rusa")];
    ps[0].on = false; ps[2].on = false;
    expect(deduped(ps).map((p) => p.uid)).toEqual(["baru", "x"]);
  });

  it("data rusak dari server diabaikan", () => {
    const ps = parseRoom({ ok: { n: "A", x: 2, y: 3, c: "#111111", s: 60, p: "o", on: false, t: 5, d: 1 }, bad: { x: 1 }, nul: null });
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({ uid: "ok", n: "A", on: false, s: 60 });
    expect(parseRoom(null)).toEqual([]);
  });

  it("arah 2D dan sudut 3D saling cocok", () => {
    for (const d of ["down", "up", "left", "right"] as const) expect(dirOf(angleOf(d))).toBe(d);
    expect(dirOf(0.3)).toBe("down");
    expect(dirOf(-3.1)).toBe("up");
    expect(dirOf(7 * Math.PI / 2)).toBe("left");
    expect(round2(1.23456)).toBe(1.23);
  });
});

describe("gerak avatar kelompok lain", () => {
  const R = (x: number, y: number) => ({ uid: "a", name: "A", color: "#111111", x, y, d: 0 });

  it("meluncur menuju posisi terbaru, bukan melompat", () => {
    const step = smoother(8);
    step([R(1, 1)], 0.1);
    const [s] = step([R(3, 1)], 0.1);
    expect(s.rx).toBeCloseTo(1.8);
    expect(s.moving).toBe(true);
    const [t] = step([R(3, 1)], 1);
    expect(t.rx).toBe(3);
  });

  it("lompatan jauh langsung pindah; kelompok yang keluar dihapus", () => {
    const step = smoother(8);
    step([R(1, 1)], 0.1);
    expect(step([R(20, 10)], 0.1)[0].rx).toBe(20);
    expect(step([], 0.1)).toEqual([]);
  });
});
