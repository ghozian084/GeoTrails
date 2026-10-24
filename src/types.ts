export type Zone = "green" | "orange" | "red";
export type Result = "green" | "orange" | null;

/** A typical wrong answer: if |v - answer| <= t, show message m. */
export interface ErrorPattern {
  v: number;
  t: number;
  m: string;
}

export interface Post {
  id: number;
  title: string;
  place: string;
  concept: string;
  /** Map tile [x, y] where the post object stands. */
  tile: [number, number];
  media: "pano" | "img";
  /** Initial horizontal focus (0..1) for panoramas. */
  focus?: number;
  task: string;
  unit: string;
  note: string;
  green: [number, number];
  orange: [number, number];
  key: string;
  errors: ErrorPattern[];
  hints: string[];
}

export interface PostState {
  id: number;
  result: Result;
  answer: number | null;
  attempts: number[];
  hints: number;
  /** Seconds spent with the post open. */
  time: number;
  score: number;
}

export interface GroupState {
  name: string;
  color: string;
  pos: [number, number];
  posts: PostState[];
  started: number;
  finShown: boolean;
}

export interface Trail {
  posts: Post[];
}
