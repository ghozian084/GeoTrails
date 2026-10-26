import { gateDone, totalScore } from "../../src/logic/score";
import { loadTeacher } from "../../src/store";
import type { GroupState, Post } from "../../src/types";
import type { MapDef } from "./mapdef";
import { saveProgress } from "./store";

/* The map being played and the group's progress on it. */
export const app: { map: MapDef | null; posts: Post[]; S: GroupState | null } = { map: null, posts: [], S: null };

/** Active group state. Only call after the trail has begun. */
export const S = (): GroupState => app.S!;
export const map = (): MapDef => app.map!;

export const persist = (): void => { if (app.map) saveProgress(app.map.id, app.S); };

/** Teacher demo mode (set in the teacher portal / original teacher panel). */
export const demo = (): boolean => loadTeacher().demo;

/** Posts after the first open once the first post is done, or always in demo mode. */
export const isGateDone = (): boolean => demo() || gateDone(S().posts);
export const total = (): number => totalScore(S().posts);
