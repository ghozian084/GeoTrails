import { gateDone, totalScore } from "../core/score";
import { loadTeacher } from "../core/store";
import type { GroupState, Post } from "../core/types";
import type { MapDef } from "./mapdef";
import { control } from "./control";
import { saveProgress } from "./store";

/* The map being played and the group's progress on it. */
export const app: { map: MapDef | null; posts: Post[]; S: GroupState | null } = { map: null, posts: [], S: null };

/** Active group state. Only call after the trail has begun. */
export const S = (): GroupState => app.S!;
export const map = (): MapDef => app.map!;

export const persist = (): void => { if (app.map) saveProgress(app.map.id, app.S); };

/** Teacher demo mode (set in the teacher portal / original teacher panel). */
export const demo = (): boolean => loadTeacher().demo;

/** Every post open: demo mode on this laptop, or the teacher opened all posts for the class. */
export const allOpen = (): boolean => demo() || control().allOpen;

/** Posts after the first open once the first post is done, or always when all posts are open. */
export const isGateDone = (): boolean => allOpen() || gateDone(S().posts);
export const total = (): number => totalScore(S().posts);
