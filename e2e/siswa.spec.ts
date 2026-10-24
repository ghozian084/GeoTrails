import { expect, test } from "@playwright/test";
import { answer, ANSWERS, closePost, startGroup, walkToPost } from "./helpers";

test("tidak memuat apa pun dari internet saat dipakai", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => { if (!new URL(r.url()).hostname.match(/^(localhost|127\.0\.0\.1)$/) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) external.push(r.url()); });
  await startGroup(page);
  await walkToPost(page, 0);
  expect(external).toEqual([]);
});

test("Pos 1–5 terkunci sampai Pos 0 selesai", async ({ page }) => {
  await startGroup(page);
  await expect(page.locator("#dots span.open")).toHaveCount(1);
  await walkToPost(page, 2, false);
  await expect(page.locator("#toast")).toHaveText("Selesaikan Pos 0 (tiang bendera) dulu");
  await expect(page.locator("#postOv")).toBeHidden();
});

test("Pos 0: jawaban keliru memberi pesan khusus, jawaban tepat memberi 100 poin", async ({ page }) => {
  await startGroup(page);
  await walkToPost(page, 0);
  await answer(page, "11,1");
  await expect(page.locator(".fb.red")).toContainText("dari mata siswa");
  await answer(page, "12,6");
  await expect(page.locator(".fb.green")).toContainText("Tepat. Pos selesai.");
  await expect(page.locator("#score")).toHaveText("100");
  await closePost(page);
  await expect(page.locator("#dots span.open")).toHaveCount(5);
});

test("lembar kerja tersimpan dan kalkulator mengisi jawaban", async ({ page }) => {
  await startGroup(page);
  await walkToPost(page, 0);
  await page.fill("#work", "10 × tan 48° + tinggi mata 1,5 m");
  await page.click("#calcBtn");
  for (const k of ["1", "0", "×", "tan", "4", "8", ")", "+", "1", ",", "5"]) await page.click(`.keys button:text-is("${k}")`);
  await expect(page.locator("#calcOut")).toHaveText("= 12,606125");
  await page.click("#calcUse");
  await expect(page.locator("#ans")).toHaveValue("12,6061");

  await page.reload();
  await page.click("#resumeBtn");
  await walkToPost(page, 0);
  await expect(page.locator("#work")).toHaveValue("10 × tan 48° + tinggi mata 1,5 m");
});

test("trail lengkap: hasil fisik, refleksi, dan log CSV", async ({ page }) => {
  test.setTimeout(120_000);
  await startGroup(page, "Pythagoras");
  for (let i = 0; i < 6; i++) {
    await walkToPost(page, i);
    await answer(page, ANSWERS[i]);
    await expect(page.locator(".fb.green")).toBeVisible();
    if (i === 0) {
      await page.fill("#phys", "13");
      await expect(page.locator("#physOut")).toContainText("lebih kecil dari hasil fisik sebesar 3,1%");
    }
    await page.click("#closeBtn");
  }
  await expect(page.locator("#finOv")).toBeVisible();
  await expect(page.locator("#fin .big")).toHaveText("600");
  await page.fill("#refl0", "Tinggi tandon dari foto");

  await page.click("#finLog");
  const csv = await page.locator("#csvBox").inputValue();
  const lines = csv.split("\n");
  expect(lines[0]).toBe("kelompok,pos,judul,jawaban,satuan,hasil,percobaan,riwayat_jawaban,petunjuk,durasi_detik,poin,fisik,selisih_persen,lembar_kerja");
  expect(lines.slice(1, 7).every((l) => l.startsWith("Pythagoras,") && l.includes(",hijau,"))).toBe(true);
  expect(lines[1]).toContain(",13,-3.1,");
  expect(csv).toContain("kelompok,refleksi,jawaban");
  expect(csv).toContain("Tinggi tandon dari foto");

  // Finish screen shows only once; the reflection stays reachable from the log.
  await page.reload();
  await page.click("#resumeBtn");
  await expect(page.locator("#finOv")).toBeHidden();
  await page.click("#openLog");
  await page.click("#reflBtn");
  await expect(page.locator("#refl0")).toHaveValue("Tinggi tandon dari foto");
});
