import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { answer } from "../helpers";
import { signIn, teacherPortal } from "./fixtures";

/* Trail sessions: the teacher's code brings students to the map, and their results back to the teacher. */

test("guru membuat sesi, siswa ikut dengan kode sesi, hasil dan CSV sampai ke guru", async ({ browser }) => {
  test.setTimeout(180_000);
  // ---- Teacher creates a session for the Basic map.
  const t = await (await browser.newContext()).newPage();
  await teacherPortal(t);
  await signIn(t, "guru-sesi", "Bu Eka");
  const box = t.locator("#sessionBox");
  await expect(box.locator("#sesNew")).toBeVisible({ timeout: 15_000 });
  await box.locator("#sesName").fill("9A Trail Senin");
  await box.getByRole("button", { name: "Buat sesi" }).click();
  const card = box.locator(".sess", { hasText: "9A Trail Senin" });
  await expect(card.locator(".cls-code")).toHaveText(/^[A-Z2-9]{6}$/, { timeout: 20_000 });
  await expect(card).toContainText("Peta: Basic");
  const code = (await card.locator(".cls-code").textContent())!;

  // ---- Student joins with the session code: the map is chosen for them.
  const s = await (await browser.newContext()).newPage();
  await s.goto("/");
  await s.fill("#classCode", code.toLowerCase());
  await s.click("#classForm button[type=submit]");
  await expect(s.locator("#classStatus")).toHaveText("Sesi 9A Trail Senin: peta Basic.", { timeout: 15_000 });
  await expect(s.locator("#chosenName")).toHaveText("Basic");
  await expect(s.locator("#classJoin")).toContainText("hasil kelompokmu (poin, status, dan jawaban angka per pos) terkirim ke guru");
  await s.fill("#gname", "Kelompok Elang");
  await s.click("#startForm button[type=submit]");
  await s.keyboard.down("ArrowUp");
  await expect(s.locator("#promptTitle")).toHaveText("Tiang Bendera", { timeout: 15_000 });
  await s.keyboard.up("ArrowUp");
  await s.keyboard.press("e");
  await answer(s, "11,1");
  await answer(s, "12,6");
  await expect(s.locator(".fb.green")).toBeVisible();
  await s.click("#closeBtn");

  // A second group, also via the code (both start their live room and results together).
  const s2 = await (await browser.newContext()).newPage();
  await s2.goto("/");
  await s2.fill("#classCode", code);
  await s2.click("#classForm button[type=submit]");
  await expect(s2.locator("#chosenName")).toHaveText("Basic", { timeout: 15_000 });
  await s2.fill("#gname", "Kelompok Rusa");
  await s2.click("#startForm button[type=submit]");
  await expect(s2.locator("#liveBtn")).toHaveClass(/on/, { timeout: 20_000 });

  // ---- Teacher sees the result (sent a few seconds after the change).
  await card.getByRole("button", { name: "Lihat hasil" }).click();
  const row = card.locator("tbody tr", { hasText: "Kelompok Elang" });
  await expect(async () => {
    await card.getByRole("button", { name: "Muat ulang" }).click();
    await expect(row).toBeVisible({ timeout: 2000 });
    await expect(row.locator("td").nth(4)).toHaveText("2× · 12,6", { timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await expect(async () => {
    await card.getByRole("button", { name: "Muat ulang" }).click();
    await expect(card.locator(".ses-results")).toContainText("Hasil 2 kelompok", { timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await expect(card.locator("tbody tr", { hasText: "Kelompok Rusa" }).locator("td").nth(3)).toHaveText("0/6");
  await expect(row.locator("td").nth(2)).toHaveText("100");
  await expect(row.locator("td").nth(3)).toHaveText("1/6");
  await expect(row.locator("td").nth(4)).toHaveClass("r-g");
  await expect(card.locator("tfoot")).toContainText("1 hijau");

  const [dl] = await Promise.all([t.waitForEvent("download"), card.getByRole("button", { name: "Unduh CSV" }).click()]);
  const csv = readFileSync((await dl.path())!, "utf8");
  expect(csv).toContain('9A Trail Senin,Kelompok Elang,100,0,Tiang Bendera,hijau,100,2,"11,1 | 12,6",0,');

  // ---- Closing the session: the student is told, and nothing more is accepted.
  await card.getByRole("button", { name: "Tutup sesi" }).click();
  await expect(card.locator(".pill")).toHaveText("Ditutup", { timeout: 15_000 });
  await s.goto("/");
  await expect(s.locator("#classJoin")).toContainText("Sesi ini sudah ditutup guru", { timeout: 15_000 });

  // ---- Deleting it removes the session and its results.
  await card.getByRole("button", { name: "Hapus sesi" }).click();
  await card.getByRole("button", { name: "Yakin? Hasil ikut terhapus" }).click();
  await expect(box.locator(".sess", { hasText: "9A Trail Senin" })).toHaveCount(0, { timeout: 15_000 });
});
