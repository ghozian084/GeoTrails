import { describe, expect, it } from "vitest";
import { START, walk } from "../src/data/map";
import { POSTS } from "../src/data/posts";
import { bfs } from "../src/game/bfs";

describe("BFS di denah", () => {
  it.each(POSTS)("Pos $id bisa dicapai dari titik awal", (p) => {
    const path = bfs(START, (x, y) => Math.max(Math.abs(p.tile[0] - x), Math.abs(p.tile[1] - y)) <= 1, walk);
    expect(path).not.toBeNull();
    for (const [x, y] of path!) expect(walk(x, y)).toBe(true);
  });

  it("jalur tidak memuat titik awal dan setiap langkah bertetangga", () => {
    const path = bfs(START, (x, y) => x === 17 && y === 17, walk)!;
    let [px, py] = START;
    for (const [x, y] of path) {
      expect(Math.abs(x - px) + Math.abs(y - py)).toBe(1);
      [px, py] = [x, y];
    }
    expect(path.at(-1)).toEqual([17, 17]);
  });

  it("mengembalikan null untuk tujuan yang tak terjangkau", () => {
    expect(bfs(START, (x, y) => x === 3 && y === 3, walk)).toBeNull();
  });
});
