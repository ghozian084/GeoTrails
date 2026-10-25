import { expect, test, type Page } from "@playwright/test";
import { POSTS } from "../src/data/posts";
import { fresh } from "../src/store";
import { answer, holdStick, PHONE, press } from "./helpers";

/* The 3D Blox prototype at /blox/ reuses the 2D app's posts, grading and saved progress. */

async function startBlox(page: Page, name = "Kelompok Blox") {
  await page.goto("/blox/");
  await page.fill("#gname", name);
  await press(page, "#startForm button[type=submit]");
  await expect(page.locator("#startOv")).toBeHidden();
}

/** Hold a key until the post prompt for `title` appears (software WebGL is slow, so be patient). */
async function walkUntilPrompt(page: Page, key: string, title: string) {
  await page.keyboard.down(key);
  await expect(page.locator("#promptTitle")).toHaveText(title, { timeout: 30_000 });
  await page.keyboard.up(key);
}

test("Blox: halaman 3D tampil tanpa galat dan tanpa permintaan ke internet", async ({ page }) => {
  const external: string[] = [], errors: string[] = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) external.push(r.url()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await startBlox(page);
  // A rendered scene compresses far worse than a blank canvas.
  await page.waitForTimeout(1500);
  expect((await page.locator("#map").screenshot()).length).toBeGreaterThan(100_000);
  await expect(page.locator(".blox-tag")).toHaveText("3D");
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("Blox: berjalan dengan W ke Pos 0, buka dengan E, lalu menjawab", async ({ page }) => {
  test.setTimeout(90_000);
  await startBlox(page);
  await walkUntilPrompt(page, "w", "Tiang Bendera");
  await page.keyboard.press("e");
  await expect(page.locator("#ptitle")).toHaveText("Tiang Bendera");
  await answer(page, "11,1");
  await expect(page.locator(".fb.red")).toContainText("dari mata siswa");
  await answer(page, "12,6");
  await expect(page.locator(".fb.green")).toContainText("Tepat. Pos selesai.");
  await expect(page.locator("#score")).toHaveText("100");
});

test("Blox: progres dari versi 2D bisa dilanjutkan di versi 3D", async ({ page }) => {
  // Progress as the 2D version saves it: Pos 0 answered green, avatar next to the flagpole.
  const saved = fresh("Lintas Versi", "#2E86AB", POSTS);
  saved.pos = [17, 12];
  saved.posts[0] = { ...saved.posts[0], result: "green", answer: 12.6, attempts: [12.6], score: 100 };
  await page.goto("/blox/");
  await page.evaluate((s) => localStorage.setItem("geotrails.v1", s), JSON.stringify(saved));
  await page.reload();

  await expect(page.locator("#resumeBtn")).toHaveText("Lanjutkan: Lintas Versi");
  await page.click("#resumeBtn");
  await expect(page.locator("#score")).toHaveText("100");
  await expect(page.locator("#dots span.green")).toHaveCount(1);
  await expect(page.locator("#dots span.open")).toHaveCount(5);
  // Standing next to Pos 0, the prompt appears straight away.
  await expect(page.locator("#promptTitle")).toHaveText("Tiang Bendera", { timeout: 15_000 });
});

test.describe("Blox di HP (layar sentuh)", () => {
  test.use(PHONE);

  test("joystick dan tombol Buka/Lompat", async ({ page }) => {
    test.setTimeout(90_000);
    await startBlox(page, "HP 3D");
    await expect(page.locator(".stick")).toBeVisible();
    await expect(page.locator("#touchJump")).toBeVisible();
    const lift = await holdStick(page, 0, -60);
    await expect(page.locator("#promptTitle")).toHaveText("Tiang Bendera", { timeout: 40_000 });
    await lift();
    await page.tap("#touchJump");
    await page.tap("#touchAct");
    await expect(page.locator("#ptitle")).toHaveText("Tiang Bendera");
  });
});
