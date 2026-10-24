import { POSTS } from "./data/posts";
import { gateDone, totalScore } from "./logic/score";
import { validateTrail } from "./logic/trail";
import { loadCustomTrail, loadTeacher, save } from "./store";
import type { GroupState, Post } from "./types";

/** The active group's session; null until the start screen is done. */
export const session: { S: GroupState | null } = { S: null };

/** Teacher-edited content when present and valid, else the built-in posts. */
function activeTrail(): { posts: Post[]; custom: boolean } {
  const saved = loadCustomTrail();
  const trail = saved ? validateTrail(saved, POSTS).trail : null;
  return trail ? { posts: trail, custom: true } : { posts: POSTS, custom: false };
}
const active = activeTrail();
export const posts = active.posts;
export const customTrail = active.custom;

/** Active group state. Only call after the trail has begun. */
export const S = (): GroupState => session.S!;

export const persist = (): void => save(session.S);
/** Teacher settings for this laptop (PIN hash, demo mode). Mutated and saved by the teacher panel. */
export const teacher = loadTeacher();

/** Posts 1–5 are open once Pos 0 is done, or always in demo mode. */
export const isGateDone = (): boolean => teacher.demo || gateDone(S().posts);
export const total = (): number => totalScore(S().posts);
