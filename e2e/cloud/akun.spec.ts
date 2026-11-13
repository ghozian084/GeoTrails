import { expect, test, type Browser, type Page } from "@playwright/test";
import { addPhoto, demoMap, signIn, teacherPortal } from "./fixtures";

/* A teacher's maps are kept in their Google account: made on one laptop, there on the other. */

async function laptop(browser: Browser): Promise<Page> {
  const t = await (await browser.newContext()).newPage();
  await teacherPortal(t);
  return t;
}

const card = (t: Page, name: string) => t.locator(".portal-card", { hasText: name });

test("peta guru tersimpan di akun: dibuat di satu laptop, muncul, diubah, dan dihapus di laptop lain", async ({ browser }) => {
  test.setTimeout(180_000);
  // ---- Laptop A: a map with a photo, made before signing in.
  const a = await laptop(browser);
  await expect(a.locator("#syncLine")).toContainText("tersimpan di perangkat ini saja");
  const map = demoMap();
  await a.evaluate((m) => localStorage.setItem("geotrails.peta.maps", JSON.stringify([m])), map);
  await a.goto(`/guru?edit=${map.id}`);
  await addPhoto(a);
  await a.click("#edBack");
  await signIn(a, "guru-akun", "Bu Ana");
  await expect(a.locator("#syncLine")).toContainText("Peta tersimpan online di akun Bu Ana", { timeout: 20_000 });

  // ---- Laptop B: same account, empty laptop. The map and its photo arrive.
  const b = await laptop(browser);
  await expect(card(b, "Taman Kota")).toHaveCount(0);
  await signIn(b, "guru-akun", "Bu Ana");
  await expect(card(b, "Taman Kota")).toBeVisible({ timeout: 20_000 });
  await card(b, "Taman Kota").getByRole("button", { name: "Edit" }).click();
  await b.click('[data-tool="select"]');
  const box = (await b.locator("#edCanvas").boundingBox())!;
  await b.mouse.click(box.x + 10.5 * 22, box.y + 5.5 * 22);
  await expect(b.locator(".pf-photo img")).toBeVisible();

  // Change it on B (show it to students): A gets the change.
  await b.click("#edBack");
  await card(b, "Taman Kota").getByRole("button", { name: "Tampilkan" }).click();
  await b.waitForTimeout(2500); // the upload runs shortly after the change
  await expect(b.locator("#syncLine")).toContainText("Peta tersimpan online", { timeout: 20_000 });
  await a.reload();
  await expect(card(a, "Taman Kota")).toContainText("Tampil untuk siswa", { timeout: 20_000 });

  // Delete it on A: B removes its copy at the next sync.
  const del = card(a, "Taman Kota").getByRole("button", { name: "Hapus" });
  await del.click(); await card(a, "Taman Kota").getByRole("button", { name: "Yakin? Klik lagi" }).click();
  await expect(card(a, "Taman Kota")).toHaveCount(0);
  await a.waitForTimeout(2500);
  await expect(a.locator("#syncLine")).toContainText("Peta tersimpan online", { timeout: 20_000 });
  await b.reload();
  await expect(b.locator("#syncLine")).toContainText("Peta tersimpan online", { timeout: 20_000 });
  await expect(card(b, "Taman Kota")).toHaveCount(0, { timeout: 20_000 });
});
