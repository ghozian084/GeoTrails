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
