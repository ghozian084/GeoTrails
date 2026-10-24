import { describe, expect, it } from "vitest";
import { blinking, facing, walkPose, type Dir, type Pose } from "../src/game/anim";
import { avatarPalette, avatarPixels, SPRITE_H, SPRITE_W } from "../src/game/sprite";

describe("animasi avatar", () => {
  it("arah hadap mengikuti gerak, dan tetap saat diam", () => {
    expect(facing(1, 0, "down")).toBe("right");
    expect(facing(-1, 0, "down")).toBe("left");
    expect(facing(0, -1, "down")).toBe("up");
    expect(facing(0, 1, "up")).toBe("down");
    expect(facing(0, 0, "left")).toBe("left");
  });

  it("siklus jalan: diam, langkah, diam, langkah lain", () => {
    expect([0, 0.5, 1, 1.5, 2].map((d) => walkPose(d, true))).toEqual([0, 1, 0, 2, 0]);
    expect(walkPose(0.5, false)).toBe(0);
  });

  it("berkedip sebentar setiap beberapa detik", () => {
    expect(blinking(0)).toBe(true);
    expect(blinking(1000)).toBe(false);
  });
});

describe("sprite avatar", () => {
  const pal = avatarPalette("#2E86AB");
  const dirs: Dir[] = ["down", "up", "left", "right"];
  const poses: Pose[] = [0, 1, 2];

  it.each(dirs)("arah %s: ukuran 18×26 dan memakai warna kelompok", (dir) => {
    for (const pose of poses) {
      const g = avatarPixels(dir, pose, false, pal);
      expect(g).toHaveLength(SPRITE_H);
      g.forEach((row) => expect(row).toHaveLength(SPRITE_W));
      expect(g.flat()).toContain("#2E86AB");
    }
  });

  it("langkah mengubah gambar kaki", () => {
    for (const dir of dirs) {
      const a = JSON.stringify(avatarPixels(dir, 0, false, pal));
      expect(JSON.stringify(avatarPixels(dir, 1, false, pal))).not.toBe(a);
      expect(JSON.stringify(avatarPixels(dir, 2, false, pal))).not.toBe(a);
    }
  });

  it("menghadap kanan adalah cermin dari menghadap kiri", () => {
    const left = avatarPixels("left", 1, false, pal);
    const right = avatarPixels("right", 1, false, pal);
    expect(right).toEqual(left.map((row) => [...row].reverse()));
  });

  it("wajah hanya terlihat saat menghadap ke bawah, bukan dari belakang", () => {
    const head = (dir: Dir) => avatarPixels(dir, 0, false, pal).slice(1, 12).flat();
    expect(head("down")).toContain(pal.eye);
    expect(head("up")).not.toContain(pal.eye);
  });

  it("setiap piksel tepi sprite dikelilingi garis luar", () => {
    const g = avatarPixels("down", 0, false, pal);
    expect(g[0].every((c) => c === null || c === pal.outline)).toBe(true);
    expect(g[SPRITE_H - 1].every((c) => c === null || c === pal.outline)).toBe(true);
  });
});
