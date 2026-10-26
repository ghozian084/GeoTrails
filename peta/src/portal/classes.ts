import { $, esc, toast } from "../../../src/ui/dom";
import type { CloudClass, PublishedMap, Teacher } from "../cloud/client";
import { cloudEnabled, emulatorHost, loadCloud } from "../cloud/config";
import { customMaps, saveMap } from "../store";
import { mapProblems } from "../validate";
import type { MapDef } from "../mapdef";

/*
 * "Kelas online" section of the portal: teacher sign-in (Google), classes with their codes,
 * and publishing maps to a class so students can load them with the code.
 * State lives here so it survives re-renders of the map list.
 */

let teacher: Teacher | null = null, watching = false, busy = "";
/** Redraw of the most recently rendered class box (the sign-in watcher outlives each render). */
let redraw = (): void => {};
let classes: CloudClass[] = [];
const published = new Map<string, PublishedMap[]>();

const errMsg = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("popup-closed")) return "Masuk dibatalkan.";
  if (code.includes("permission-denied")) return "Tidak diizinkan. Pastikan Bapak/Ibu masuk dengan akun pemilik kelas.";
  if (code.includes("unavailable") || !navigator.onLine) return "Tidak bisa terhubung ke internet.";
  return e instanceof Error ? e.message : "Terjadi kesalahan.";
};

/** Same map content as the published copy (ignoring the published flag). */
const sameAsPublished = (m: MapDef, pm: PublishedMap) => {
  try { return JSON.stringify({ ...JSON.parse(pm.json), published: m.published }) === JSON.stringify({ ...m, builtIn: undefined }); } catch { return false; }
};

export function classSection(el: HTMLElement, rerender: () => void, mapsChanged: () => void): void {
  redraw = rerender;
  if (!cloudEnabled) {
    el.innerHTML = `<h2>Kelas online</h2><small>Belum aktif. Isi konfigurasi Firebase (lihat README) agar peta bisa diterbitkan ke laptop siswa dengan kode kelas. Tanpa itu, bagikan peta lewat Ekspor/Impor JSON.</small>`;
    return;
  }
  if (!watching) {
    watching = true;
    // Automated tests sign in without the Google popup (emulator builds only).
    if (emulatorHost) Object.assign(window, { geotrailsTestSignIn: async (sub: string, name: string) => (await loadCloud()).signInForTests(sub, name) });
    void loadCloud().then((c) => c.watchTeacher(async (t) => {
      teacher = t;
      if (t) await refresh(); else { classes = []; published.clear(); }
      redraw();
    }));
  }
  const maps = customMaps().filter((m) => mapProblems(m).length === 0);
  el.innerHTML = `<h2>Kelas online</h2>
    ${!teacher ? `<p class="sub">Masuk untuk membuat kelas dan menerbitkan peta. Siswa cukup memasukkan kode kelas, tanpa login.</p>
      <div class="row"><button class="btn primary" id="clsLogin">Masuk dengan Google</button></div>`
    : `<p class="sub">Masuk sebagai <b>${esc(teacher.name)}</b>. <button class="btn ghost" id="clsLogout">Keluar</button></p>
      ${busy ? `<p class="cls-busy">${esc(busy)}</p>` : ""}
      <div class="cls-list">${classes.map((c) => {
        const pubs = published.get(c.code) ?? [];
        return `<article class="cls" data-code="${c.code}">
          <header><b>${esc(c.name)}</b><span class="cls-code" title="Kode kelas">${c.code}</span><button class="btn ghost" data-act="copycode">Salin kode</button></header>
          ${pubs.length ? `<ul>${pubs.map((pm) => {
            const local = customMaps().find((m) => m.id === pm.id);
            const state = !local ? `<button class="btn ghost" data-act="pull" data-map="${esc(pm.id)}">Salin ke laptop ini</button>`
              : sameAsPublished(local, pm) ? `<span class="pill green">Terbaru</span>`
              : `<span class="pill orange">Ada perubahan</span><button class="btn" data-act="publish" data-map="${esc(pm.id)}">Perbarui</button>`;
            return `<li><span>${esc(pm.name)}</span>${state}<button class="btn ghost" data-act="withdraw" data-map="${esc(pm.id)}">Tarik</button></li>`;
          }).join("")}</ul>` : `<small>Belum ada peta yang diterbitkan.</small>`}
          ${maps.length ? `<div class="row"><select data-sel aria-label="Peta untuk diterbitkan">${maps.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}</select><button class="btn primary" data-act="publish">Terbitkan ke kelas ini</button></div>`
            : `<small>Buat peta (tanpa masalah) dulu untuk diterbitkan.</small>`}
        </article>`;
      }).join("")}</div>
      <form class="row" id="clsNew"><input id="clsName" maxlength="60" placeholder="Nama kelas, mis. 9A Matematika" aria-label="Nama kelas baru"><button class="btn" type="submit">Buat kelas</button></form>`}`;

  const cloud = () => loadCloud();
  const run = async (label: string, fn: () => Promise<void>) => {
    busy = label; rerender();
    try { await fn(); await refresh(); toast("Selesai."); }
    catch (e) { toast(errMsg(e)); }
    finally { busy = ""; rerender(); }
  };

  document.getElementById("clsLogin")?.addEventListener("click", async () => {
    try { await (await cloud()).signInTeacher(); } catch (e) { toast(errMsg(e)); }
  });
  document.getElementById("clsLogout")?.addEventListener("click", async () => { await (await cloud()).signOutTeacher(); });
  document.getElementById("clsNew")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $<HTMLInputElement>("clsName").value.trim();
    if (!name) { toast("Tulis nama kelas dulu."); return; }
    void run("Membuat kelas…", async () => { await (await cloud()).createClass(teacher!.uid, name); });
  });
  el.querySelector(".cls-list")?.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-act]");
    if (!b) return;
    const card = b.closest<HTMLElement>(".cls")!, code = card.dataset.code!;
    const act = b.dataset.act;
    if (act === "copycode") { void navigator.clipboard?.writeText(code).then(() => toast(`Kode ${code} tersalin.`), () => toast(code)); return; }
    const mapId = b.dataset.map ?? card.querySelector<HTMLSelectElement>("[data-sel]")?.value;
    if (!mapId) return;
    if (act === "publish") {
      const m = customMaps().find((x) => x.id === mapId);
      if (!m || mapProblems(m).length) { toast("Peta ini masih bermasalah."); return; }
      void run(`Menerbitkan "${m.name}"…`, async () => { await (await cloud()).publishMap(code, m); });
    } else if (act === "withdraw") {
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Yakin? Klik lagi"; b.classList.add("tape"); return; }
      void run("Menarik peta…", async () => { await (await cloud()).withdrawMap(code, mapId); });
    } else if (act === "pull") {
      const pm = published.get(code)?.find((x) => x.id === mapId);
      if (!pm) return;
      try {
        const m: MapDef = { ...JSON.parse(pm.json), published: false };
        saveMap(m); toast(`"${m.name}" disalin ke laptop ini.`); mapsChanged();
      } catch { toast("Data peta di kelas rusak."); }
    }
  });
}

async function refresh() {
  if (!teacher) return;
  const c = await loadCloud();
  classes = await c.myClasses(teacher.uid);
  published.clear();
  for (const k of classes) published.set(k.code, await c.publishedMaps(k.code));
}
