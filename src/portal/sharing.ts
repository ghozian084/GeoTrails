import { cachePublicMap, forgetPublicMap } from "../cloud/cache";
import type { Teacher } from "../cloud/client";
import { cloudEnabled, loadCloud, loadPublic } from "../cloud/config";
import type { PublicSummary } from "../cloud/publicmaps";
import type { MapDef } from "../map/mapdef";
import { customMaps } from "../map/store";
import { mapProblems } from "../map/validate";
import { esc, toast } from "../ui/dom";

/*
 * Private or public, per map. Private (the default): students only get the map through a class
 * code. Public: anyone can find and play it on the start screen, once an admin has approved it
 * (an admin's own maps are approved at once). Admins also get an approval box in the portal.
 */

let teacher: Teacher | null = null, admin = false, started = false, busy = "";
let mine = new Map<string, PublicSummary>(), pending: PublicSummary[] = [], approved: PublicSummary[] = [];

const errMsg = (e: unknown) => ((e as { code?: string })?.code ?? "").includes("permission-denied")
  ? "Tidak diizinkan." : !navigator.onLine ? "Tidak bisa terhubung ke internet." : "Gagal. Coba lagi.";

async function refresh(): Promise<void> {
  if (!teacher) { admin = false; mine = new Map(); pending = []; approved = []; return; }
  const pub = await loadPublic();
  admin = await pub.isAdmin(teacher.uid);
  mine = new Map((await pub.myPublic(teacher.uid)).map((p) => [p.id, p]));
  [pending, approved] = admin ? await Promise.all([pub.pendingMaps(), pub.approvedMaps()]) : [[], []];
}

/** Fill the share areas of the map list and the admin box (called after every list render). */
export function mountSharing(): void {
  if (!cloudEnabled) return;
  if (!started) {
    started = true;
    void loadCloud().then((c) => c.watchTeacher(async (t) => {
      teacher = t;
      await refresh().catch(() => undefined);
      mountSharing();
    }));
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-share]")) {
    const m = customMaps().find((x) => x.id === el.dataset.share);
    if (m) el.innerHTML = shareHtml(m);
  }
  const box = document.getElementById("approveBox");
  if (box) { box.hidden = !admin; box.innerHTML = admin ? adminHtml() : ""; }
  wire();
}

function shareHtml(m: MapDef): string {
  const p = mine.get(m.id);
  if (!teacher) return `<small class="share-note">Pribadi: siswa memakainya lewat kode kelas. Masuk dengan Google untuk menjadikannya publik.</small>`;
  if (busy === m.id) return `<small class="share-note">Memproses…</small>`;
  if (!p) {
    const bad = mapProblems(m).length > 0;
    return `<span class="pill">Pribadi · lewat kode kelas</span>
      <button class="btn ghost" data-pub="share" data-id="${esc(m.id)}" ${bad ? "disabled title=\"Perbaiki masalah peta dulu\"" : ""}>Jadikan publik</button>`;
  }
  const changed = (m.updatedAt ?? 0) > p.updatedAt;
  return `${p.status === "approved" ? `<span class="pill green">Publik</span>` : `<span class="pill orange">Publik · menunggu persetujuan</span>`}
    ${changed ? `<button class="btn ghost" data-pub="share" data-id="${esc(m.id)}">Kirim perubahan${admin ? "" : " (perlu disetujui lagi)"}</button>` : ""}
    <button class="btn ghost" data-pub="unshare" data-id="${esc(m.id)}">Jadikan pribadi</button>`;
}

function adminHtml(): string {
  const row = (p: PublicSummary, actions: string) => `<li><span><b>${esc(p.name)}</b> <small>${p.posts} pos · ${p.cols}×${p.rows} petak</small></span>${actions}</li>`;
  return `<h2>Persetujuan peta publik</h2>
    <p class="sub">Peta guru lain tampil untuk semua orang setelah Bapak/Ibu setujui. Coba dulu isinya, termasuk foto dan soal.</p>
    ${pending.length ? `<ul class="approve-list">${pending.map((p) => row(p, `
      <button class="btn ghost" data-pub="try" data-id="${esc(p.id)}">Coba</button>
      <button class="btn primary" data-pub="approve" data-id="${esc(p.id)}">Setujui</button>
      <button class="btn ghost" data-pub="reject" data-id="${esc(p.id)}">Tolak</button>`)).join("")}</ul>`
      : `<small>Tidak ada peta yang menunggu persetujuan.</small>`}
    <h3>Sudah publik (${approved.length})</h3>
    ${approved.length ? `<ul class="approve-list">${approved.map((p) => row(p, `<button class="btn ghost" data-pub="reject" data-id="${esc(p.id)}">Hapus dari publik</button>`)).join("")}</ul>` : `<small>Belum ada.</small>`}`;
}

function wire(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-pub]").forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.id!, act = b.dataset.pub!;
      if ((act === "share" && !mine.has(id)) || act === "reject" || act === "unshare") {
        if (b.dataset.armed !== "1") {
          b.dataset.armed = "1"; b.classList.add("tape");
          b.textContent = act === "share" ? (admin ? "Yakin? Langsung tampil untuk semua orang" : "Yakin? Kirim untuk disetujui") : "Yakin? Klik lagi";
          return;
        }
      }
      const pub = await loadPublic();
      try {
        if (act === "try") {
          const m = await pub.downloadPublic(id);
          if (!m) { toast("Peta ini tidak bisa dibuka."); return; }
          cachePublicMap(m);
          window.open(`./?map=${encodeURIComponent(id)}`, "_blank");
          return;
        }
        busy = id; mountSharing();
        if (act === "share") {
          const m = customMaps().find((x) => x.id === id)!;
          const st = await pub.sharePublic(m, teacher!.uid, admin);
          toast(st === "approved" ? `"${m.name}" sekarang publik.` : `"${m.name}" dikirim dan menunggu persetujuan.`);
        } else if (act === "unshare") { await pub.removePublic(id); toast("Peta sekarang pribadi."); }
        else if (act === "approve") { await pub.approve(id); toast("Peta disetujui dan sekarang publik."); }
        else if (act === "reject") { await pub.removePublic(id); forgetPublicMap(id); toast("Peta dihapus dari publik."); }
        await refresh();
      } catch (e) {
        toast(errMsg(e));
      } finally {
        busy = ""; mountSharing();
      }
    };
  });
}
