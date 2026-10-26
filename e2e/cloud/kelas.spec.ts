import { expect, test, type Page } from "@playwright/test";
import { blankMap, blankPost, setTile } from "../../peta/src/mapdef";
import { answer } from "../helpers";

/* Teacher publishes a map to a class; a student on another laptop loads it with the class code. */

/** A small valid map: a path from the start (10, 12) north to a signboard post at (10, 5). */
function demoMap() {
  const m = blankMap("Taman Kota", 20, 14);
  for (let y = 6; y <= 12; y++) setTile(m, 10, y, "p");
  m.objects.push({ kind: "sign", x: 10, y: 5 });
  const p = blankPost(10, 5);
  Object.assign(p, { title: "Papan Info", place: "Taman kota", task: "Berapa luas papan?", unit: "m²", key: "2 × 1 = 2 m²", green: [1.9, 2.1], orange: [1.5, 2.5], hints: ["Panjang × lebar."] });
  m.posts.push(p);
  return m;
}

async function teacherPortal(page: Page) {
  await page.goto("/peta/guru.html");
  await page.fill("#pin1", "2468"); await page.fill("#pin2", "2468");
  await page.click("#pinForm button[type=submit]");
  await expect(page.locator("#clsLogin")).toBeVisible();
}

test("guru menerbitkan peta ke kelas, siswa memuatnya dengan kode kelas", async ({ browser }) => {
  test.setTimeout(180_000);
  // ---- Teacher laptop
  const teacherCtx = await browser.newContext();
  const t = await teacherCtx.newPage();
  await teacherPortal(t);
  const map = demoMap();
  await t.evaluate((m) => localStorage.setItem("geotrails.peta.maps", JSON.stringify([m])), map);

  // Photo for the post, uploaded in the editor.
  await t.goto(`/peta/guru.html?edit=${map.id}`);
  await t.click('[data-tool="select"]');
  const box = (await t.locator("#edCanvas").boundingBox())!;
  await t.mouse.click(box.x + 10.5 * 22, box.y + 5.5 * 22);
  const jpeg = await t.evaluate(() => { const c = document.createElement("canvas"); c.width = 800; c.height = 600; const x = c.getContext("2d")!; x.fillStyle = "#3c78a0"; x.fillRect(0, 0, 800, 600); return c.toDataURL("image/jpeg").split(",")[1]; });
  await t.setInputFiles("[data-photo]", { name: "papan.jpg", mimeType: "image/jpeg", buffer: Buffer.from(jpeg, "base64") });
  await expect(t.locator(".pf-photo img")).toBeVisible();
  await t.click("#edBack");

  await t.evaluate(() => (window as unknown as { geotrailsTestSignIn(s: string, n: string): Promise<void> }).geotrailsTestSignIn("guru-1", "Bu Guru"));
  await expect(t.locator("#classBox")).toContainText("Masuk sebagai Bu Guru");
  await t.fill("#clsName", "9A Matematika");
  await t.click("#clsNew button[type=submit]");
  const cls = t.locator(".cls", { hasText: "9A Matematika" });
  await expect(cls.locator(".cls-code")).toHaveText(/^[A-Z2-9]{6}$/);
  const code = (await cls.locator(".cls-code").textContent())!;
  await cls.getByRole("button", { name: "Terbitkan ke kelas ini" }).click();
  await expect(cls.locator("li", { hasText: "Taman Kota" })).toContainText("Terbaru");

  // ---- Student laptop (separate storage)
  const studentCtx = await browser.newContext();
  const s = await studentCtx.newPage();
  await s.goto("/peta/");
  await expect(s.locator(".map-card")).toHaveCount(1); // only Basic before joining
  await s.fill("#classCode", code.toLowerCase());
  await s.click("#classForm button[type=submit]");
  await expect(s.locator("#classStatus")).toHaveText("1 peta dari kelas 9A Matematika.");
  const card = s.locator(".map-card", { hasText: "Taman Kota" });
  await expect(card).toContainText("Kelas 9A Matematika");
  await card.click();
  await s.fill("#gname", "Kelompok A");
  await s.click("#startForm button[type=submit]");
  await s.keyboard.down("ArrowUp");
  await expect(s.locator("#promptTitle")).toHaveText("Papan Info", { timeout: 15_000 });
  await s.keyboard.up("ArrowUp");
  await s.keyboard.press("e");
  await expect(s.locator(".post .media img")).toHaveAttribute("src", /^blob:/); // photo came from the class
  await answer(s, "2");
  await expect(s.locator(".fb.green")).toBeVisible();

  // Offline (Firestore unreachable): the stored copy is used.
  await s.route(/:8080\//, (r) => r.abort());
  await s.goto("/peta/");
  await expect(s.locator("#classStatus")).toHaveText("Offline: memakai peta kelas yang tersimpan.", { timeout: 30_000 });
  await expect(s.locator(".map-card", { hasText: "Taman Kota" })).toContainText("Lanjutkan: Kelompok A");
  await s.unroute(/:8080\//);

  // Teacher changes the map locally: the class shows it is out of date, then withdraws it.
  await t.evaluate((id) => {
    const maps = JSON.parse(localStorage.getItem("geotrails.peta.maps")!);
    maps.find((m: { id: string }) => m.id === id).name = "Taman Kota 2";
    localStorage.setItem("geotrails.peta.maps", JSON.stringify(maps));
  }, map.id);
  await t.reload();
  await expect(cls.locator("li", { hasText: "Taman Kota" })).toContainText("Ada perubahan", { timeout: 15_000 });
  const row = cls.locator("li", { hasText: "Taman Kota" });
  await row.getByRole("button", { name: "Tarik" }).click();
  await row.getByRole("button", { name: "Yakin? Klik lagi" }).click();
  await expect(cls).toContainText("Belum ada peta yang diterbitkan.");

  await s.goto("/peta/");
  await expect(s.locator("#classStatus")).toHaveText("0 peta dari kelas 9A Matematika.");
  await expect(s.locator(".map-card", { hasText: "Taman Kota" })).toHaveCount(0);
});

test("kode kelas yang salah ditolak", async ({ page }) => {
  await page.goto("/peta/");
  await page.fill("#classCode", "12");
  await page.click("#classForm button[type=submit]");
  await expect(page.locator("#classStatus")).toHaveText("Kode kelas terdiri dari 6 huruf/angka.");
  await page.fill("#classCode", "ZZZZZZ");
  await page.click("#classForm button[type=submit]");
  await expect(page.locator("#classStatus")).toHaveText("Kode kelas tidak ditemukan.");
});
