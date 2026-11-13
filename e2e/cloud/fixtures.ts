import { expect, type Page } from "@playwright/test";
import { blankMap, blankPost, setTile } from "../../src/map/mapdef";

/* Shared steps for the class tests on the Firebase emulators. */

/** A small valid map: a path from the start (10, 12) north to a signboard post at (10, 5). */
export function demoMap() {
  const m = blankMap("Taman Kota", 20, 14);
  for (let y = 6; y <= 12; y++) setTile(m, 10, y, "p");
  m.objects.push({ kind: "sign", x: 10, y: 5 });
  const p = blankPost(10, 5);
  Object.assign(p, { title: "Papan Info", place: "Taman kota", task: "Berapa luas papan?", unit: "m²", key: "2 × 1 = 2 m²", green: [1.9, 2.1], orange: [1.5, 2.5], hints: ["Panjang × lebar."] });
  m.posts.push(p);
  return m;
}

export async function teacherPortal(page: Page) {
  await page.goto("/guru");
  await page.fill("#pin1", "2468"); await page.fill("#pin2", "2468");
  await page.click("#pinForm button[type=submit]");
  await expect(page.locator("#clsLogin")).toBeVisible();
}

/** Emulator-only teacher sign-in (the Google popup cannot run in tests). */
export const signIn = (p: Page, sub: string, name: string): Promise<void> =>
  p.evaluate(([s, n]) => (window as unknown as { geotrailsTestSignIn(s: string, n: string): Promise<void> }).geotrailsTestSignIn(s, n), [sub, name]);

/** In the editor (map from demoMap): select the post at (10, 5) and upload a photo for it. */
export async function addPhoto(t: Page): Promise<void> {
  await t.click('[data-tool="select"]');
  const box = (await t.locator("#edCanvas").boundingBox())!;
  await t.mouse.click(box.x + 10.5 * 22, box.y + 5.5 * 22);
  const jpeg = await t.evaluate(() => { const c = document.createElement("canvas"); c.width = 800; c.height = 600; const x = c.getContext("2d")!; x.fillStyle = "#3c78a0"; x.fillRect(0, 0, 800, 600); return c.toDataURL("image/jpeg").split(",")[1]; });
  await t.setInputFiles("[data-photo]", { name: "papan.jpg", mimeType: "image/jpeg", buffer: Buffer.from(jpeg, "base64") });
  await expect(t.locator(".pf-photo img")).toBeVisible();
}
