import { expect, test } from "@playwright/test";

/* Mode offline: "Unduh untuk offline" saves the whole app; then every page works without internet. */

test.use({ serviceWorkers: "allow" });

test("unduh untuk offline: semua halaman (2D, 3D, Portal Guru, klasik) terbuka tanpa internet", async ({ page, context }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  const box = page.locator(".offline-box").first();
  await expect(box).toContainText("Simpan seluruh GeoTrails");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await box.getByRole("button", { name: "Unduh untuk offline" }).click();
  await expect(box.locator(".offline-status")).toContainText("Tersedia offline di perangkat ini", { timeout: 60_000 });
  await expect(box.getByRole("button", { name: "Unduh ulang" })).toBeVisible();

  await context.setOffline(true);
  // Pages never opened before also work, at their clean addresses.
  // Each check needs the page's script to have run (static HTML alone is not enough).
  for (const [url, sel] of [["/3d?map=basic", "#chosenName"], ["/guru", "#pin1"], ["/klasik/", "#swatches button"], ["/klasik/3d", "#swatches button"], ["/", ".map-card"]] as const) {
    await page.goto(url);
    await expect(page.locator(sel).first()).toBeVisible();
  }
  // And the app runs: start the Basic map in 2D.
  await page.locator(".map-card", { hasText: "Basic" }).click();
  await page.fill("#gname", "Kelompok Offline");
  await page.click("#startForm button[type=submit]");
  await expect(page.locator("#startOv")).toBeHidden();
  await expect(page.locator("#mapTag")).toHaveText("Basic");
  await context.setOffline(false);
});

test("halaman yang belum disimpan memberi pesan yang jelas saat offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await context.setOffline(true);
  await page.goto("/guru");
  await expect(page.locator("body")).toContainText("Halaman ini belum tersimpan untuk offline");
  await context.setOffline(false);
});
