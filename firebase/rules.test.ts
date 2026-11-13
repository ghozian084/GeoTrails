import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

/* Security rules for GeoTrails Peta classes. Run with `npm run test:rules` (starts the emulators). */

let env: RulesTestEnvironment;
const now = () => new Date();
const cls = (ownerUid: string, name = "Kelas 9A") => ({ name, ownerUid, createdAt: now() });
const mapDoc = (extra: Record<string, unknown> = {}) => ({ name: "Taman", json: "{}", photos: [], updatedAt: now(), ...extra });
const photo = (extra: Record<string, unknown> = {}) => ({ data: "/9j/2Q==", type: "image/jpeg", ...extra });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-geotrails",
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc("classes/ABC234").set(cls("guru-a"));
    await ctx.firestore().doc("classes/ABC234/maps/m-1").set(mapDoc());
  });
});

describe("kelas", () => {
  it("siapa pun yang tahu kode bisa membaca kelas dan petanya", async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertSucceeds(anon.doc("classes/ABC234").get());
    await assertSucceeds(anon.doc("classes/ABC234/maps/m-1").get());
    await assertSucceeds(anon.collection("classes/ABC234/maps").get());
  });

  it("daftar kelas tidak bisa dijelajahi; guru hanya melihat kelasnya sendiri", async () => {
    await assertFails(env.unauthenticatedContext().firestore().collection("classes").get());
    await assertFails(env.authenticatedContext("guru-b").firestore().collection("classes").get());
    const a = env.authenticatedContext("guru-a").firestore();
    await assertSucceeds(a.collection("classes").where("ownerUid", "==", "guru-a").get());
  });

  it("guru membuat kelas atas namanya sendiri dengan kode yang benar", async () => {
    const b = env.authenticatedContext("guru-b").firestore();
    await assertSucceeds(b.doc("classes/XYZ789").set(cls("guru-b")));
    await assertFails(b.doc("classes/QQQ222").set(cls("guru-a")));        // atas nama guru lain
    await assertFails(b.doc("classes/abc").set(cls("guru-b")));           // kode tidak sah
    await assertFails(b.doc("classes/RRR333").set({ ...cls("guru-b"), email: "x@y" })); // kolom tambahan
    await assertFails(env.unauthenticatedContext().firestore().doc("classes/SSS444").set(cls("x")));
  });

  it("siswa dengan login anonim (mode bersama) tidak bisa membuat kelas atau menerbitkan peta", async () => {
    const anon = env.authenticatedContext("siswa-1", { firebase: { sign_in_provider: "anonymous" } }).firestore();
    await assertFails(anon.doc("classes/TTT555").set(cls("siswa-1")));
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc("classes/UUU666").set(cls("siswa-1")); });
    await assertFails(anon.doc("classes/UUU666/maps/m-9").set(mapDoc()));
    await assertSucceeds(anon.doc("classes/ABC234/maps/m-1").get());
  });

  it("kelas guru lain tidak bisa diambil alih, diubah, atau dihapus", async () => {
    const b = env.authenticatedContext("guru-b").firestore();
    await assertFails(b.doc("classes/ABC234").set(cls("guru-b")));
    await assertFails(b.doc("classes/ABC234").update({ name: "Punyaku" }));
    await assertFails(b.doc("classes/ABC234").delete());
    const a = env.authenticatedContext("guru-a").firestore();
    await assertSucceeds(a.doc("classes/ABC234").update({ name: "Kelas 9B" }));
    await assertFails(a.doc("classes/ABC234").update({ ownerUid: "guru-b" }));
  });
});

describe("peta di kelas", () => {
  it("hanya pemilik kelas yang menerbitkan dan menarik peta", async () => {
    const a = env.authenticatedContext("guru-a").firestore();
    await assertSucceeds(a.doc("classes/ABC234/maps/m-2").set(mapDoc()));
    await assertSucceeds(a.doc("classes/ABC234/maps/m-2").delete());
    const b = env.authenticatedContext("guru-b").firestore();
    await assertFails(b.doc("classes/ABC234/maps/m-3").set(mapDoc()));
    await assertFails(b.doc("classes/ABC234/maps/m-1").delete());
    await assertFails(env.unauthenticatedContext().firestore().doc("classes/ABC234/maps/m-4").set(mapDoc()));
  });

  it("isi dokumen peta dibatasi", async () => {
    const a = env.authenticatedContext("guru-a").firestore();
    await assertFails(a.doc("classes/ABC234/maps/m-5").set(mapDoc({ siswa: "Budi" })));
    await assertFails(a.doc("classes/ABC234/maps/m-6").set(mapDoc({ json: "x".repeat(900_001) })));
    await assertFails(a.doc("classes/ABC234/maps/m-7").set(mapDoc({ photos: Array(13).fill("p") })));
  });
});

describe("foto pos", () => {
  const path = "classes/ABC234/maps/m-1/photos/p-1";

  it("pemilik kelas menyimpan foto JPEG; siapa pun dengan kode bisa membaca", async () => {
    await assertSucceeds(env.authenticatedContext("guru-a").firestore().doc(path).set(photo()));
    await assertSucceeds(env.unauthenticatedContext().firestore().doc(path).get());
    await assertSucceeds(env.authenticatedContext("guru-a").firestore().doc(path).delete());
  });

  it("guru lain dan pengunjung tidak bisa menulis; hanya JPEG di bawah batas ukuran", async () => {
    await assertFails(env.authenticatedContext("guru-b").firestore().doc(path).set(photo()));
    await assertFails(env.unauthenticatedContext().firestore().doc(path).set(photo()));
    const a = env.authenticatedContext("guru-a").firestore();
    await assertFails(a.doc(path).set(photo({ type: "text/html" })));
    await assertFails(a.doc(path).set(photo({ data: "x".repeat(950_001) })));
    await assertFails(a.doc(path).set(photo({ nama: "Budi" })));
  });
});

describe("peta guru di akun Google", () => {
  const myMap = (extra: Record<string, unknown> = {}) => ({ name: "Taman", json: "{}", photos: { p1: "abc" }, updatedAt: Date.now(), deleted: false, ...extra });
  const path = "teachers/guru-a/maps/m-1";

  it("guru menyimpan, membaca, dan menghapus petanya sendiri", async () => {
    const a = env.authenticatedContext("guru-a").firestore();
    await assertSucceeds(a.doc(path).set(myMap()));
    await assertSucceeds(a.doc(path).get());
    await assertSucceeds(a.collection("teachers/guru-a/maps").get());
    await assertSucceeds(a.doc(`${path}/photos/p1`).set(photo()));
    await assertSucceeds(a.doc(`${path}/photos/p1`).get());
    await assertSucceeds(a.doc(path).set(myMap({ name: "", json: "", photos: {}, deleted: true })));
    await assertSucceeds(a.doc(`${path}/photos/p1`).delete());
  });

  it("guru lain, siswa anonim, dan pengunjung tidak bisa membaca atau menulis", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().doc(path).set(myMap()); });
    for (const db of [
      env.authenticatedContext("guru-b").firestore(),
      env.authenticatedContext("guru-a", { firebase: { sign_in_provider: "anonymous" } }).firestore(),
      env.unauthenticatedContext().firestore(),
    ]) {
      await assertFails(db.doc(path).get());
      await assertFails(db.collection("teachers/guru-a/maps").get());
      await assertFails(db.doc(path).set(myMap()));
      await assertFails(db.doc(`${path}/photos/p1`).set(photo()));
    }
  });

  it("isi dokumen dibatasi", async () => {
    const a = env.authenticatedContext("guru-a").firestore();
    await assertFails(a.doc(path).set({ ...myMap(), email: "x@y" }));
    await assertFails(a.doc(path).set(myMap({ json: "x".repeat(900001) })));
    await assertFails(a.doc(path).set(myMap({ updatedAt: "kemarin" })));
    await assertFails(a.doc(path).set(myMap({ photos: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`p${i}`, "s"])) })));
    await assertFails(a.doc(`${path}/photos/p1`).set(photo({ type: "image/png" })));
  });
});

describe("peta publik", () => {
  const pub = (owner: string, extra: Record<string, unknown> = {}) => ({ name: "Taman", json: "{}", photos: ["p1"], ownerUid: owner, status: "pending", updatedAt: Date.now(), posts: 1, cols: 20, rows: 14, ...extra });
  const admin = () => env.authenticatedContext("admin-1").firestore();
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("admins/admin-1").set({ note: "pemilik" });
      await ctx.firestore().doc("public/ok").set(pub("guru-b", { status: "approved" }));
      await ctx.firestore().doc("public/ok/photos/p1").set(photo());
      await ctx.firestore().doc("public/tunggu").set(pub("guru-b"));
      await ctx.firestore().doc("public/tunggu/photos/p1").set(photo());
    });
  });

  it("siapa pun membaca peta publik yang sudah disetujui, tetapi tidak yang menunggu", async () => {
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext("siswa", { firebase: { sign_in_provider: "anonymous" } }).firestore(), env.authenticatedContext("guru-c").firestore()]) {
      await assertSucceeds(db.doc("public/ok").get());
      await assertSucceeds(db.doc("public/ok/photos/p1").get());
      await assertSucceeds(db.collection("public").where("status", "==", "approved").get());
      await assertFails(db.doc("public/tunggu").get());
      await assertFails(db.doc("public/tunggu/photos/p1").get());
      await assertFails(db.collection("public").get());
    }
  });

  it("guru mengajukan peta (menunggu); tidak bisa menyetujui sendiri atau menyamar sebagai guru lain", async () => {
    const a = env.authenticatedContext("guru-a").firestore();
    await assertSucceeds(a.doc("public/baru").set(pub("guru-a")));
    await assertSucceeds(a.doc("public/baru/photos/p1").set(photo()));
    await assertSucceeds(a.collection("public").where("ownerUid", "==", "guru-a").get());
    await assertFails(a.doc("public/baru2").set(pub("guru-a", { status: "approved" })));
    await assertFails(a.doc("public/baru3").set(pub("guru-b")));
    await assertFails(a.doc("public/ok").set(pub("guru-a"))); // peta guru lain
    await assertFails(a.doc("public/ok/photos/p2").set(photo()));
    await assertFails(a.doc("public/ok").delete());
    await assertFails(env.authenticatedContext("guru-a", { firebase: { sign_in_provider: "anonymous" } }).firestore().doc("public/x").set(pub("guru-a")));
  });

  it("perubahan oleh pemilik kembali menunggu persetujuan; pemilik bisa menarik petanya", async () => {
    const b = env.authenticatedContext("guru-b").firestore();
    await assertFails(b.doc("public/ok").set(pub("guru-b", { status: "approved", name: "Ubah" })));
    await assertSucceeds(b.doc("public/ok").set(pub("guru-b", { name: "Ubah" })));
    await assertSucceeds(b.doc("public/tunggu/photos/p1").delete());
    await assertSucceeds(b.doc("public/tunggu").delete());
  });

  it("admin melihat yang menunggu, menyetujui atau menolak, dan bisa langsung menerbitkan petanya", async () => {
    const ad = admin();
    await assertSucceeds(ad.doc("admins/admin-1").get());
    await assertFails(env.authenticatedContext("guru-a").firestore().doc("admins/guru-a").set({}));
    await assertSucceeds(ad.collection("public").where("status", "==", "pending").get());
    await assertSucceeds(ad.doc("public/tunggu/photos/p1").get());
    await assertFails(ad.doc("public/tunggu").update({ name: "diubah admin" }));
    await assertSucceeds(ad.doc("public/tunggu").update({ status: "approved" }));
    await assertSucceeds(ad.doc("public/ok/photos/p1").delete());
    await assertSucceeds(ad.doc("public/ok").delete());
    await assertSucceeds(ad.doc("public/milik-admin").set(pub("admin-1", { status: "approved" })));
  });

  it("isi dokumen dibatasi", async () => {
    const a = env.authenticatedContext("guru-a").firestore();
    await assertFails(a.doc("public/x").set({ ...pub("guru-a"), email: "x@y" }));
    await assertFails(a.doc("public/x").set(pub("guru-a", { posts: 0 })));
    await assertFails(a.doc("public/x").set(pub("guru-a", { json: "x".repeat(900001) })));
    await assertFails(a.doc("public/x").set(pub("guru-a", { name: "" })));
  });
});
