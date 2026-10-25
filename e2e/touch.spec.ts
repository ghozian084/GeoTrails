import { expect, test } from "@playwright/test";
import { answer, holdStick, PHONE, startGroup } from "./helpers";

test("desktop dengan mouse: kontrol sentuh tidak tampil", async ({ page }) => {
  await startGroup(page);
  await expect(page.locator(".stick")).toBeHidden();
  await expect(page.locator("#touchAct")).toBeHidden();
});

test.describe("HP (layar sentuh)", () => {
  test.use(PHONE);

  test("joystick membawa avatar ke Pos 0, tombol Buka membuka pos", async ({ page }) => {
    await startGroup(page, "HP");
    await expect(page.locator(".stick")).toBeVisible();
    await expect(page.locator("#help")).toContainText("joystick");

    // Away from a post, "Buka" only explains what to do.
    await page.tap("#touchAct");
    await expect(page.locator("#toast")).toHaveText("Dekati salah satu pos dulu.");

    const lift = await holdStick(page, 0, -60);
    await expect(page.locator("#promptTitle")).toHaveText("Tiang Bendera", { timeout: 15_000 });
    await lift();
    await page.tap("#touchAct");
    await expect(page.locator("#ptitle")).toHaveText("Tiang Bendera");
    await answer(page, "12,6");
    await expect(page.locator(".fb.green")).toBeVisible();
  });

  test("tata letak pas di layar HP", async ({ page }) => {
    await startGroup(page, "HP");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    // The help box closes with a tap so it does not cover the map.
    await page.tap("#help");
    await expect(page.locator("#help")).toBeHidden();
    // The map fills the stage: no empty band below it.
    const [stageH, mapH] = await page.evaluate(() => [document.getElementById("stage")!.clientHeight, document.getElementById("map")!.clientHeight]);
    expect(mapH).toBe(stageH);
  });
});
