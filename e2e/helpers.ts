import { expect, type Page } from "@playwright/test";
import { walk } from "../src/data/map";
import { POSTS } from "../src/data/posts";
import { bfs, type Pt } from "../src/game/bfs";
import { follow, tileSize } from "../src/game/camera";

/* Shared steps for the end-to-end tests. Map clicks reuse the app's own camera and BFS. */

export const ANSWERS = ["12,6", "2.307", "4,8", "12", "82,7", "121"];

export async function startGroup(page: Page, name = "Kelompok Uji"): Promise<void> {
  await page.goto("/");
  await page.fill("#gname", name);
  await page.click("#startForm button[type=submit]");
  await expect(page.locator("#startOv")).toBeHidden();
}

/** Avatar tile, read from the saved state (pagehide forces a save). */
async function avatarTile(page: Page): Promise<Pt> {
  return page.evaluate(() => {
    window.dispatchEvent(new Event("pagehide"));
    return JSON.parse(localStorage.getItem("geotrails.v1")!).pos;
  });
}

interface Box { x: number; y: number; width: number; height: number }

async function geometry(page: Page) {
  return page.evaluate(() => {
    const box = (id: string) => {
      const el = document.getElementById(id)!;
      if (el.hidden || getComputedStyle(el).display === "none") return null;
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    };
    return { stage: box("stage")!, blockers: [box("help"), box("prompt"), box("toast")].filter(Boolean) };
  }) as Promise<{ stage: Box; blockers: Box[] }>;
}

/**
 * Walk to a post by tapping the map, hopping along the BFS route when the post is off-screen.
 * Resolves once the post modal is open, or (expectOpen = false) once the final tap is made.
 */
export async function walkToPost(page: Page, id: number, expectOpen = true): Promise<void> {
  const post = POSTS[id];
  for (let hop = 0; hop < 10; hop++) {
    const pos = await avatarTile(page);
    const { stage, blockers } = await geometry(page);
    const T = tileSize(stage.width, stage.height), cam = { x: 0, y: 0 };
    follow(cam, pos[0], pos[1], T, stage.width, stage.height);
    const screen = ([x, y]: Pt): Pt => [stage.x + x * T + T / 2 - cam.x, stage.y + y * T + T / 2 - cam.y];
    const visible = ([sx, sy]: Pt) =>
      sx > stage.x + T * .6 && sx < stage.x + stage.width - T * .6 && sy > stage.y + T * .6 && sy < stage.y + stage.height - T * .6 &&
      !blockers.some((b) => sx > b.x - 4 && sx < b.x + b.width + 4 && sy > b.y - 4 && sy < b.y + b.height + 4);

    const target = screen(post.tile);
    if (visible(target)) {
      await page.mouse.click(target[0], target[1]);
      if (expectOpen) await expect(page.locator("#postOv")).toBeVisible({ timeout: 10_000 });
      return;
    }
    const route = bfs(pos, (x, y) => Math.max(Math.abs(post.tile[0] - x), Math.abs(post.tile[1] - y)) <= 1, walk);
    if (!route) throw new Error(`Pos ${id} tidak terjangkau dari ${pos}`);
    // Skip tiles under another post's floating marker: tapping them would open that post.
    const underMarker = ([x, y]: Pt) => POSTS.some((q) => Math.hypot(x - q.tile[0], y + .62 - q.tile[1]) < .55);
    const hopTo = [...route].reverse().find((p) => visible(screen(p)) && !underMarker(p));
    if (!hopTo) throw new Error(`Tidak ada petak terlihat menuju Pos ${id}`);
    const [hx, hy] = screen(hopTo);
    await page.mouse.click(hx, hy);
    await expect.poll(() => avatarTile(page), { timeout: 10_000 }).toEqual(hopTo);
    await page.waitForTimeout(250); // let the avatar and camera settle
  }
  throw new Error(`Gagal mencapai Pos ${id}`);
}

export async function answer(page: Page, value: string): Promise<void> {
  await page.fill("#ans", value);
  await page.click("#ansForm button[type=submit]");
}

export async function closePost(page: Page): Promise<void> {
  await page.click("#xBtn");
  await expect(page.locator("#postOv")).toBeHidden();
}

/** Open the teacher panel, creating the PIN on first use. */
export async function unlockTeacher(page: Page, pin = "2468", create = true): Promise<void> {
  await page.click("#teachBtn");
  await page.fill("#pin1", pin);
  if (create) await page.fill("#pin2", pin);
  await page.click("#pinForm button[type=submit]");
  await expect(page.locator("#teachBody")).toBeVisible();
}
