import { expect, test, type Page } from "@playwright/test";
import { POSTS } from "../src/data/posts";
import { toCsv } from "../src/logic/csv";
import { fresh } from "../src/store";
import { answer, startGroup, unlockTeacher, walkToPost } from "./helpers";

test("PIN guru: dibuat sekali, PIN salah ditolak", async ({ page }) => {
  await page.goto("/");
  await unlockTeacher(page);
  await page.click("#teachLock");
  await page.click("#teachBtn");
  await page.fill("#pin1", "1111");
  await page.click("#pinForm button[type=submit]");
  await expect(page.locator("#pinMsg")).toHaveText("PIN salah.");
  await page.fill("#pin1", "2468");
  await page.click("#pinForm button[type=submit]");
  await expect(page.locator(".key-card")).toHaveCount(6);
});

test("mode demo membuka semua pos tanpa menyelesaikan Pos 0", async ({ page }) => {
  await page.goto("/");
  await unlockTeacher(page);
  await page.click("#tab-settings");
  await page.check("#demoChk");
  await page.click("#teachX");
  await startGroup(page);
  await expect(page.locator("#demoBadge")).toBeVisible();
  await expect(page.locator("#dots span.open")).toHaveCount(6);
  await walkToPost(page, 3);
  await expect(page.locator("#ptitle")).toHaveText("Gedung Kelas B");
});

test("isi pos: isian keliru ditolak, perubahan dipakai siswa, bisa dikembalikan", async ({ page }) => {
  await page.goto("/");
  await unlockTeacher(page);
  await page.click("#tab-editor");
  await page.fill("[data-f=title]", "Tiang Bendera Utama");
  await page.fill('[data-r="green.1"]', "13,5");
  await page.click("#edSave");
  await expect(page.locator("#edMsg")).toContainText("Pos 0: rentang hijau harus berada di dalam rentang oranye.");

  await page.fill('[data-r="green.1"]', "12,9");
  await page.click("#errAdd");
  await page.fill('[data-ev="3"]', "25,2");
  await page.fill('[data-et="3"]', "0,5");
  await page.fill('[data-em="3"]', "Kamu mengalikan dua kali.");
  await page.click("#edSave");
  await page.waitForURL("**/");
  await expect(page.locator("#gname")).toBeVisible();

  await startGroup(page);
  await walkToPost(page, 0);
  await expect(page.locator("#ptitle")).toHaveText("Tiang Bendera Utama");
  await answer(page, "25,2");
  await expect(page.locator(".fb.red")).toContainText("Kamu mengalikan dua kali.");
  await page.click("#xBtn");

  await page.click("#openLog");
  await page.click("#logTeach");
  await page.fill("#pin1", "2468");
  await page.click("#pinForm button[type=submit]");
  await page.click("#tab-editor");
  await page.click("#edDefault");
  await page.click("#edDefault");
  await page.waitForURL("**/");
  await page.click("#resumeBtn");
  await walkToPost(page, 0);
  await expect(page.locator("#ptitle")).toHaveText("Tiang Bendera");
});

test("isi pos: ekspor JSON lalu impor di laptop lain", async ({ page, browser }) => {
  await page.goto("/");
  await unlockTeacher(page);
  await page.click("#tab-editor");
  await page.fill("[data-f=title]", "Tiang Bendera Impor");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#edExport")]);
  const file = await download.path();

  const other = await browser.newPage();
  await other.goto("/");
  await unlockTeacher(other, "1357");
  await other.click("#tab-editor");
  await other.setInputFiles("#edImport", file);
  await expect(other.locator("#edMsg")).toContainText("Berkas dimuat");
  await expect(other.locator("[data-f=title]")).toHaveValue("Tiang Bendera Impor");
  await other.close();
});

/** A small JPEG made in the browser, `w`×`h` pixels. */
async function jpeg(page: Page, w: number, h: number): Promise<Buffer> {
  const b64 = await page.evaluate(([w, h]) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const x = c.getContext("2d")!;
    x.fillStyle = "#3c78a0"; x.fillRect(0, 0, w, h);
    return c.toDataURL("image/jpeg").split(",")[1];
  }, [w, h]);
  return Buffer.from(b64, "base64");
}

test("foto pos: foto lebar jadi panorama dan tetap ada setelah dimuat ulang", async ({ page }) => {
  await page.goto("/");
  await unlockTeacher(page);
  await page.click("#tab-photos");
  await page.setInputFiles('input[data-id="1"]', { name: "tandon.jpg", mimeType: "image/jpeg", buffer: await jpeg(page, 1200, 300) });
  await expect(page.locator(".photo-card").nth(1)).toContainText("Foto unggahan (laptop ini) · 1200×300 · panorama");

  await page.reload();
  await unlockTeacher(page, "2468", false);
  await page.click("#tab-settings");
  await page.check("#demoChk");
  await page.click("#teachX");
  await startGroup(page);
  await walkToPost(page, 1);
  await expect(page.locator("#pano")).toHaveAttribute("style", /blob:/);
  await expect(page.locator(".cap span").first()).toHaveText("Foto · Belakang gudang");
});

test("rekap kelas dari beberapa log CSV", async ({ page }) => {
  const a = fresh("Euclid", "#000", POSTS);
  a.posts[0] = { ...a.posts[0], result: "green", answer: 12.6, attempts: [11.1, 12.6], score: 100 };
  const b = fresh("Pythagoras", "#000", POSTS);
  b.posts[0] = { ...b.posts[0], result: "orange", answer: 12, attempts: [11.12, 12], score: 60 };

  await page.goto("/");
  await unlockTeacher(page);
  await page.click("#tab-recap");
  await page.fill("#recapIn", toCsv(a, POSTS) + "\n\n" + toCsv(b, POSTS));
  await page.click("#recapRun");
  const groups = page.locator(".teach-body table").first().locator("tbody tr");
  await expect(groups).toHaveCount(2);
  await expect(groups.first()).toContainText("Euclid");
  await expect(groups.first()).toContainText("100");
  await expect(page.locator(".recap-card").first()).toContainText("2× Kamu menghitung tinggi dari mata siswa");
});
