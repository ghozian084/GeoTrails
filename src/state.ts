import { POSTS } from "./data/posts";
import { gateDone, totalScore } from "./logic/score";
import { loadTeacher, save } from "./store";
import type { GroupState } from "./types";

/** The active group's session; null until the start screen is done. */
export const session: { S: GroupState | null } = { S: null };

export const posts = POSTS;

/** Active group state. Only call after the trail has begun. */
export const S = (): GroupState => session.S!;

export const persist = (): void => save(session.S);
/** Teacher settings for this laptop (PIN hash, demo mode). Mutated and saved by the teacher panel. */
export const teacher = loadTeacher();

/** Posts 1–5 are open once Pos 0 is done, or always in demo mode. */
export const isGateDone = (): boolean => teacher.demo || gateDone(S().posts);
export const total = (): number => totalScore(S().posts);
