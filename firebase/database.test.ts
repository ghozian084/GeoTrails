import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

/* Realtime Database rules for live (multiplayer) rooms. Run with `npm run test:rules` (starts the emulators). */

let env: RulesTestEnvironment;
const NOW = { ".sv": "timestamp" };
const player = (extra: Record<string, unknown> = {}) => ({ n: "Kelompok A", c: "#2E86AB", x: 10.5, y: 12, d: 1.5, s: 100, p: "g-----", on: true, t: NOW, ...extra });
const student = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).database();
const teacher = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } }).database();
const ROOM = "live/ABC234/rooms/basic";

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-geotrails",
    database: { rules: readFileSync("firebase/database.rules.json", "utf8"), host: "127.0.0.1", port: 9000 },
  });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.database().ref("live/ABC234/owner").set("guru-a");
    await ctx.database().ref(`${ROOM}/siswa-b`).set({ ...player({ n: "Kelompok B" }), t: Date.now() });
  });
});

describe("ruang langsung", () => {
  it("siswa (anonim) menulis datanya sendiri dan membaca ruang kelasnya", async () => {
    const db = student("siswa-a");
    await assertSucceeds(db.ref(`${ROOM}/siswa-a`).set(player()));
    await assertSucceeds(db.ref(`${ROOM}/siswa-a`).update({ x: 11, y: 12, d: 0, t: NOW }));
    await assertSucceeds(db.ref(ROOM).once("value"));
  });

  it("tanpa login tidak bisa membaca atau menulis; daftar kelas tidak bisa dijelajahi", async () => {
    const anon = env.unauthenticatedContext().database();
    await assertFails(anon.ref(ROOM).once("value"));
    await assertFails(anon.ref(`${ROOM}/x`).set(player()));
    await assertFails(student("siswa-a").ref("live").once("value"));
    await assertFails(student("siswa-a").ref("live/ABC234/rooms").once("value"));
  });

  it("siswa tidak bisa mengubah atau menghapus data kelompok lain", async () => {
    const db = student("siswa-a");
    await assertFails(db.ref(`${ROOM}/siswa-b`).update({ s: 1000, t: NOW }));
    await assertFails(db.ref(`${ROOM}/siswa-b`).remove());
    await assertFails(db.ref(ROOM).remove());
  });

  it("hanya kolom yang diizinkan, dengan nilai yang masuk akal", async () => {
    const db = student("siswa-a"), me = db.ref(`${ROOM}/siswa-a`);
    await assertFails(me.set(player({ email: "a@b.c" })));
    await assertFails(me.set(player({ n: "x".repeat(31) })));
    await assertFails(me.set(player({ c: "red" })));
    await assertFails(me.set(player({ x: 99 })));
    await assertFails(me.set(player({ s: 5000 })));
    await assertFails(me.set(player({ p: "abc" })));
    await assertFails(me.set(player({ t: 1 }))); // time must come from the server
    await assertFails(db.ref("live/abc234/rooms/basic/siswa-a").set(player())); // not a class code
    await assertFails(db.ref("live/ABC234/rooms/peta~1/siswa-a").set(player()));
    await assertFails(db.ref(`live/ABC234/rooms/${"m".repeat(41)}/siswa-a`).set(player()));
    await assertFails(db.ref("live/ABC234/lain").set("x"));
  });

  it("data yang tidak diperbarui lebih dari 24 jam boleh dihapus siapa pun di kelas", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.database().ref(`${ROOM}/lama`).set({ ...player(), t: Date.now() - 25 * 3600_000 });
    });
    const db = student("siswa-a");
    await assertSucceeds(db.ref(`${ROOM}/lama`).remove());
    await assertFails(db.ref(`${ROOM}/siswa-b`).remove()); // still fresh
  });

  it("pemilik kelas (guru) menghapus data sesi; siswa tidak bisa mengaku pemilik", async () => {
    await assertFails(student("siswa-a").ref("live/XYZ789/owner").set("siswa-a"));
    await assertFails(teacher("guru-b").ref("live/ABC234/owner").set("guru-b")); // already owned
    await assertSucceeds(teacher("guru-c").ref("live/XYZ789/owner").set("guru-c"));
    await assertFails(teacher("guru-b").ref(ROOM).remove());
    await assertSucceeds(teacher("guru-a").ref(ROOM).remove());
    await assertSucceeds(teacher("guru-a").ref("live/ABC234/rooms").remove());
    await assertFails(teacher("guru-a").ref(`${ROOM}/siswa-b`).set(player())); // the teacher cannot write as a group
  });
});
