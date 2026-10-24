import { POSTS } from "./data/posts";
import { gateDone, totalScore } from "./logic/score";
import { save } from "./store";
import type { GroupState } from "./types";

/** The active group's session; null until the start screen is done. */
export const session: { S: GroupState | null } = { S: null };

export const posts = POSTS;

/** Active group state. Only call after the trail has begun. */
export const S = (): GroupState => session.S!;

export const persist = (): void => save(session.S);
export const isGateDone = (): boolean => gateDone(S().posts);
export const total = (): number => totalScore(S().posts);
