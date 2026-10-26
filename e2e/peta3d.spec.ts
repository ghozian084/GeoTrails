import { expect, test } from "@playwright/test";
import { answer } from "./helpers";

/* GeoTrails Peta in 3D (/peta/3d.html): same maps and progress as the 2D page. Runs in the "blox" project (software WebGL). */

test("Peta 3D: peta Basic, berjalan ke Pos 0 dan menjawab", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/peta/3d.html");
  await page.locator(".map-card", { hasText: "Basic" }).click();
  await page.fill("#gname", "Tiga D");
  await page.click("#startForm button[type=submit]");
  await page.keyboard.down("w");
  await expect(page.locator("#promptTitle")).toHaveText("Tiang Bendera", { timeout: 40_000 });
  await page.keyboard.up("w");
  await page.keyboard.press("e");
  await answer(page, "12,6");
  await expect(page.locator(".fb.green")).toBeVisible();
});

test("Peta 3D: progres dari halaman 2D ikut, tombol 2D kembali ke peta yang sama", async ({ page }) => {
  await page.goto("/peta/");
  await page.evaluate(() => localStorage.setItem("geotrails.peta.progress.basic", JSON.stringify({
    name: "Lintas", color: "#2E86AB", pos: [17, 12], started: 0, finShown: false, reflection: [],
    posts: Array.from({ length: 6 }, (_, id) => ({ id, result: id === 0 ? "green" : null, answer: id === 0 ? 12.6 : null, attempts: [], hints: 0, time: 0, score: id === 0 ? 100 : 0, work: "", physical: null })),
  })));
  await page.goto("/peta/3d.html?map=basic");
  await expect(page.locator("#resumeBtn")).toHaveText("Lanjutkan: Lintas");
  await page.click("#resumeBtn");
  await expect(page.locator("#score")).toHaveText("100");
  await expect(page.locator("#promptTitle")).toHaveText("Tiang Bendera", { timeout: 15_000 });
  await expect(page.locator("#to2d")).toHaveAttribute("href", "./?map=basic");
});
