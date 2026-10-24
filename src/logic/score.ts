import type { PostState } from "../types";

export const HINT_COST = 15;

/** Post 0 is the worked example: hints there are free. */
export const isFreePost = (id: number): boolean => id === 0;

export const greenScore = (hints: number, free: boolean): number =>
  free ? 100 : Math.max(20, 100 - HINT_COST * hints);

export const orangeScore = (hints: number, free: boolean): number =>
  free ? 60 : Math.max(10, 60 - HINT_COST * hints);

export const totalScore = (posts: PostState[]): number => posts.reduce((a, p) => a + p.score, 0);

/** Posts 1–5 stay locked until post 0 has a result. */
export const gateDone = (posts: PostState[]): boolean => !!posts[0].result;

export const isUnlocked = (posts: PostState[], id: number): boolean => id === 0 || gateDone(posts);
