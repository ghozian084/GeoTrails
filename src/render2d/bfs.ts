export type Pt = [number, number];

/**
 * Breadth-first search on the tile grid from `start` to the first tile satisfying `goal`.
 * Returns the path excluding the start tile, or null if unreachable.
 */
export function bfs(start: Pt, goal: (x: number, y: number) => boolean, walk: (x: number, y: number) => boolean): Pt[] | null {
  type Node = [number, number, Node | null];
  const seen = new Set([start[0] + "," + start[1]]);
  const q: Node[] = [[start[0], start[1], null]];
  while (q.length) {
    const n = q.shift()!;
    if (goal(n[0], n[1])) {
      const out: Pt[] = [];
      let c: Node = n;
      while (c[2]) { out.unshift([c[0], c[1]]); c = c[2]; }
      return out;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = n[0] + dx, y = n[1] + dy, k = x + "," + y;
      if (!seen.has(k) && walk(x, y)) { seen.add(k); q.push([x, y, n]); }
    }
  }
  return null;
}
