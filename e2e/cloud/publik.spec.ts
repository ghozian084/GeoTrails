import { expect, test, type Browser, type Page } from "@playwright/test";
import { answer } from "../helpers";
import { addPhoto, demoMap, signIn, teacherPortal } from "./fixtures";

/* Public maps: a teacher shares a map, the admin approves it, any student can then play it. */

/** Make a site admin, bypassing the security rules (emulator only: "Bearer owner"). */
async function makeAdmin(uid: string): Promise<void> {
  const r = await fetch(`http://127.0.0.1:8080/v1/projects/demo-geotrails/databases/geotrails/documents/admins?documentId=${uid}`, {
    method: "POST", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields: {} }),
  });
  expect(r.ok).toBe(true);
}

async function studentLaptop(browser: Browser): Promise<Page> {
  const s = await (await browser.newContext()).newPage();
  await s.goto("/");
  return s;
}

test("guru mengajukan peta publik, admin menyetujui, siswa mana pun bisa memainkannya", async ({ browser }) => {
  test.setTimeout(180_000);

  // ---- Teacher: a map with a photo, shared publicly (waits for approval).
  const t = await (await browser.newContext()).newPage();
  await teacherPortal(t);
  const map = demoMap();
  await t.evaluate((m) => localStorage.setItem("geotrails.peta.maps", JSON.stringify([m])), map);
  await t.goto(`/guru?edit=${map.id}`);
  await addPhoto(t);
  await t.click("#edBack");
  const card = t.locator(".portal-card", { hasText: "Taman Kota" });
  await expect(card.locator("[data-share]")).toContainText("Masuk dengan Google untuk menjadikannya publik");
  await signIn(t, "guru-publik", "Pak Budi");
  await expect(card.locator("[data-share]")).toContainText("Pribadi · lewat kode kelas", { timeout: 15_000 });
  await expect(t.locator("#approveBox")).toBeHidden();
  await card.getByRole("button", { name: "Jadikan publik" }).click();
  await card.getByRole("button", { name: "Yakin? Kirim untuk disetujui" }).click();
  await expect(card.locator("[data-share]")).toContainText("Publik · menunggu persetujuan", { timeout: 20_000 });

  // ---- Student: nothing public yet.
  const s = await studentLaptop(browser);
  await s.click("#publicOpen");
  await expect(s.locator("#publicStatus")).toHaveText("Belum ada peta publik.", { timeout: 15_000 });

  // ---- Admin approves it.
  const a = await (await browser.newContext()).newPage();
  await teacherPortal(a);
  await makeAdmin(await signIn(a, "admin-uji", "Admin"));
  await a.reload(); // the admin check runs when the portal opens
  const box = a.locator("#approveBox");
  await expect(box).toBeVisible({ timeout: 15_000 });
  const row = box.locator("li", { hasText: "Taman Kota" });
  await row.getByRole("button", { name: "Setujui" }).click();
  await expect(box).toContainText("Tidak ada peta yang menunggu persetujuan.", { timeout: 15_000 });
  await expect(box).toContainText("Sudah publik (1)");

  // ---- Student: finds it, downloads it with the photo, plays it.
  await s.click("#publicOpen");
  await s.locator("#publicList .map-card", { hasText: "Taman Kota" }).click();
  await expect(s.locator("#chosenName")).toHaveText("Taman Kota", { timeout: 15_000 });
  await s.fill("#gname", "Kelompok Publik");
  await s.click("#startForm button[type=submit]");
  await s.keyboard.down("ArrowUp");
  await expect(s.locator("#promptTitle")).toHaveText("Papan Info", { timeout: 15_000 });
  await s.keyboard.up("ArrowUp");
  await s.keyboard.press("e");
  await expect(s.locator(".post .media img")).toHaveAttribute("src", /^blob:/);
  await answer(s, "2");
  await expect(s.locator(".fb.green")).toBeVisible();

  // Kept on the laptop: still listed offline.
  await s.route(/:8080\//, (r) => r.abort());
  await s.goto("/");
  await expect(s.locator("#mapList .map-card", { hasText: "Taman Kota" })).toContainText("Publik");
  await s.unroute(/:8080\//);

  // ---- Teacher makes it private again: no longer listed for new students.
  await t.reload();
  await expect(card.locator("[data-share]")).toContainText("Publik", { timeout: 15_000 });
  await card.getByRole("button", { name: "Jadikan pribadi" }).click();
  await card.getByRole("button", { name: "Yakin? Klik lagi" }).click();
  await expect(card.locator("[data-share]")).toContainText("Pribadi", { timeout: 15_000 });
  const s2 = await studentLaptop(browser);
  await s2.click("#publicOpen");
  await expect(s2.locator("#publicStatus")).toHaveText("Belum ada peta publik.", { timeout: 15_000 });
});
