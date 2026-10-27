import { expect, test, type Browser, type Page } from "@playwright/test";
import { answer } from "../helpers";

/* Multiplayer: groups in the same class see each other on the map and on a live scoreboard. */

const signIn = (p: Page, sub: string, name: string) =>
  p.evaluate(([s, n]) => (window as unknown as { geotrailsTestSignIn(s: string, n: string): Promise<void> }).geotrailsTestSignIn(s, n), [sub, name]);

async function student(browser: Browser, code: string, group: string): Promise<Page> {
  const ctx = await browser.newContext();
  const s = await ctx.newPage();
  await s.goto("/peta/");
  await s.fill("#classCode", code);
  await s.click("#classForm button[type=submit]");
  await expect(s.locator("#classStatus")).toContainText("dari kelas 9B");
  await expect(s.locator(".live-note")).toContainText("terlihat oleh teman sekelas dan guru");
  await s.locator(".map-card", { hasText: "Basic" }).click();
  await s.fill("#gname", group);
  await s.click("#startForm button[type=submit]");
  await expect(s.locator("#liveBtn")).toHaveClass(/on/, { timeout: 20_000 });
  return s;
}

test("dua kelompok bermain bersama, guru memantau lalu menghapus data sesi", async ({ browser }) => {
  test.setTimeout(180_000);
  // ---- Teacher creates the class (and owns its live rooms).
  const t = await (await browser.newContext()).newPage();
  await t.goto("/peta/guru.html");
  await t.fill("#pin1", "2468"); await t.fill("#pin2", "2468");
  await t.click("#pinForm button[type=submit]");
  await signIn(t, "guru-live", "Pak Guru");
  await expect(t.locator("#classBox")).toContainText("Masuk sebagai Pak Guru");
  await t.fill("#clsName", "9B Matematika");
  await t.click("#clsNew button[type=submit]");
  const cls = t.locator(".cls", { hasText: "9B Matematika" });
  const code = (await cls.locator(".cls-code").textContent())!;

  // ---- Two student laptops.
  const a = await student(browser, code, "Kelompok Elang");
  const b = await student(browser, code, "Kelompok Rusa");
  await expect(a.locator("#liveCount")).toHaveText("2", { timeout: 15_000 });
  await expect(b.locator("#liveCount")).toHaveText("2");

  // Group A finishes Pos 0; B's live scoreboard follows.
  await a.keyboard.down("ArrowUp");
  await expect(a.locator("#promptTitle")).toHaveText("Tiang Bendera", { timeout: 15_000 });
  await a.keyboard.up("ArrowUp");
  await a.keyboard.press("e");
  await answer(a, "12,6");
  await expect(a.locator(".fb.green")).toBeVisible();
  await a.click("#closeBtn");
  await b.click("#liveBtn");
  const rowA = b.locator("#livePanel li", { hasText: "Kelompok Elang" });
  await expect(rowA).toContainText("100", { timeout: 10_000 });
  await expect(rowA).toContainText("1/6");
  await expect(b.locator("#livePanel li").first()).toContainText("Kelompok Elang"); // ranked first
  await expect(b.locator("#livePanel li.me")).toContainText("Kelompok Rusa (kalian)");

  // ---- Teacher monitor.
  await cls.getByRole("button", { name: "Pantau langsung" }).click();
  const mon = cls.locator(".mon-map", { hasText: "Basic" });
  await expect(mon).toContainText("2 online · 2 kelompok", { timeout: 15_000 });
  await expect(mon.locator("tbody tr").first()).toContainText("Kelompok Elang");
  await expect(mon.locator("canvas")).toBeVisible();

  // Group B leaves: shown offline, then the teacher clears the session data.
  await b.context().close();
  await expect(mon).toContainText("1 online · 2 kelompok", { timeout: 15_000 });
  await expect(a.locator("#liveCount")).toHaveText("1");
  const clear = mon.getByRole("button", { name: "Hapus data sesi" });
  await clear.click(); await mon.getByRole("button", { name: "Yakin? Klik lagi" }).click();
  await expect(cls.locator("[data-live]")).toContainText("Belum ada kelompok yang bermain", { timeout: 10_000 });
});
