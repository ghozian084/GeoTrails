import type { ErrorPattern, Post, Zone } from "../types";

export interface Grade {
  zone: Zone;
  /** Matching typical-error pattern, if any (checked regardless of zone). */
  error: ErrorPattern | null;
}

export function zoneOf(post: Post, v: number): Zone {
  if (v >= post.green[0] && v <= post.green[1]) return "green";
  if (v >= post.orange[0] && v <= post.orange[1]) return "orange";
  return "red";
}

export function grade(post: Post, v: number): Grade {
  return {
    zone: zoneOf(post, v),
    error: post.errors.find((x) => Math.abs(v - x.v) <= x.t) ?? null,
  };
}
