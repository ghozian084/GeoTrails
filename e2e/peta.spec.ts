import { expect, test, type Page } from "@playwright/test";
import { answer } from "./helpers";

/* GeoTrails Peta (/peta/): map list for students and the teacher portal with its grid editor. */

/** Hold a key until the prompt for `title` appears. */
async function walkUntil(page: Page, key: string, title: string) {
  await page.keyboard.down(key);
  await expect(page.locator("#promptTitle")).toHaveText(title, { timeout: 15_000 });
  await page.keyboard.up(key);
}

async function play(page: Page, mapName: string, group: string) {
  await page.goto("/peta/");
  await page.locator(".map-card", { hasText: mapName }).click();
  await page.fill("#gname", group);
  await page.click("#startForm button[type=submit]");
  await expect(page.locator("#mapTag")).toHaveText(mapName);
}

test("siswa: daftar peta, peta Basic sama dengan trail asli, data aplikasi asli tidak tersentuh", async ({ page }) => {
  await page.goto("/peta/");
  await expect(page.locator(".map-card").first()).toContainText("Basic");
  await expect(page.locator(".map-card").first()).toContainText("6 pos · 36×24 petak");
  await play(page, "Basic", "Kelompok Peta");
  await walkUntil(page, "ArrowUp", "Tiang Bendera");
  await page.keyboard.press("e");
  await answer(page, "11,1");
  await expect(page.locator(".fb.red")).toContainText("dari mata siswa");
  await answer(page, "12,6");
  await expect(page.locator(".fb.green")).toContainText("Tepat. Pos selesai.");
  await page.click("#closeBtn");
  expect(await page.evaluate(() => localStorage.getItem("geotrails.v1"))).toBeNull();

  // Reloading keeps the chosen map and offers to continue.
  await page.reload();
  await expect(page.locator("#chosenName")).toHaveText("Basic");
  await expect(page.locator("#resumeBtn")).toHaveText("Lanjutkan: Kelompok Peta");
});

test("guru membuat peta di editor grid, siswa memainkannya", async ({ page }) => {
  await page.goto("/peta/guru.html");
  await page.fill("#pin1", "2468"); await page.fill("#pin2", "2468");
  await page.click("#pinForm button[type=submit]");
  await page.click("#newMap");
  await page.fill("#nmName", "Taman Kota");
  await page.fill("#nmCols", "20"); await page.fill("#nmRows", "14");
  await page.click("#newForm button[type=submit]");

  const box = (await page.locator("#edCanvas").boundingBox())!;
  const Z = 22, at = (x: number, y: number) => [box.x + (x + .5) * Z, box.y + (y + .5) * Z] as const;
  const click = async (x: number, y: number) => { const [px, py] = at(x, y); await page.mouse.click(px, py); };
  // Blank 20×14 map: start at (10, 12). Paint a path north and put a flagpole post at its end.
  await page.click('[data-tool="tile:p"]');
  const [ax, ay] = at(10, 12), [bx, by] = at(10, 6);
  await page.mouse.move(ax, ay); await page.mouse.down(); await page.mouse.move(bx, by, { steps: 2 }); await page.mouse.up();
  await page.click('[data-tool="building"]');
  const [cx, cy] = at(2, 1), [dx, dy] = at(6, 3);
  await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(dx, dy, { steps: 3 }); await page.mouse.up();
  await page.fill("#bName", "Perpustakaan");
  await page.click('[data-tool="object:flag"]'); await click(10, 5);
  await page.click('[data-tool="post"]'); await click(10, 5);
  await expect(page.locator(".problems li").first()).toContainText("Pos 0");

  await page.fill("[data-f=title]", "Tiang Taman");
  await page.fill("[data-f=task]", "Berapa tinggi tiang?");
  await page.fill("[data-f=key]", "8 × tan 40° + 1,5 ≈ 8,2 m");
  await page.fill('[data-r="green.0"]', "8"); await page.fill('[data-r="green.1"]', "8,4");
  await page.fill('[data-r="orange.0"]', "7,5"); await page.fill('[data-r="orange.1"]', "9");
  await page.fill('[data-h="0"]', "Pakai tan.");
  await expect(page.locator(".problems .ok")).toHaveText("Peta siap dipakai siswa.");
  await page.check("#pubChk");
  await expect(page.locator("#edStatus")).toHaveText("Tersimpan");
  await page.click("#edBack");
  await expect(page.locator(".portal-card", { hasText: "Taman Kota" })).toContainText("Tampil untuk siswa");

  // The painted path has no gaps: the student walks straight up to the post.
  await play(page, "Taman Kota", "Kelompok A");
  await walkUntil(page, "ArrowUp", "Tiang Taman");
  await page.keyboard.press("e");
  await answer(page, "8,2");
  await expect(page.locator(".fb.green")).toBeVisible();
  await page.click("#closeBtn");
  // One post: finishing it ends the trail.
  await expect(page.locator("#finOv")).toBeVisible();
  await expect(page.locator("#fin")).toContainText("menyelesaikan 1 pos (1 hijau, 0 oranye)");
});

test("guru: ekspor lalu impor peta, salinan Basic bisa diedit", async ({ page }) => {
  await page.goto("/peta/guru.html");
  await page.fill("#pin1", "2468"); await page.fill("#pin2", "2468");
  await page.click("#pinForm button[type=submit]");
  await page.locator(".portal-card", { hasText: "Basic" }).getByRole("button", { name: "Duplikat untuk diedit" }).click();
  const card = (name: string) => page.locator(".portal-card").filter({ has: page.getByRole("heading", { name, exact: true }) });
  const copy = card("Basic (salinan)");
  await expect(copy).toContainText("Disembunyikan");

  const [download] = await Promise.all([page.waitForEvent("download"), copy.getByRole("button", { name: "Ekspor" }).click()]);
  await page.setInputFiles("#importMap", (await download.path())!);
  await expect(page.locator(".portal-msg")).toContainText("diimpor dan masih disembunyikan");
  await expect(card("Basic (salinan) (impor)")).toContainText("6 pos");

  await copy.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("#edName")).toHaveValue("Basic (salinan)");
  await expect(page.locator(".problems .ok")).toBeVisible();
});
