import { hashPin, validPin } from "../../logic/pin";
import { session, teacher } from "../../state";
import { clearSaved, saveTeacher } from "../../store";
import { $, esc } from "../dom";
import { updateHud } from "../hud";

export function renderSettings(el: HTMLElement): void {
  const S = session.S;
  el.innerHTML = `
    <section class="set">
      <h3>Mode demo</h3>
      <label class="check"><input type="checkbox" id="demoChk" ${teacher.demo ? "checked" : ""}> Buka semua pos tanpa menyelesaikan Pos 0</label>
      <small>Untuk memperagakan pos di depan kelas. Tanda MODE DEMO muncul di bilah atas selama aktif.</small>
    </section>
    <section class="set">
      <h3>Progres kelompok di laptop ini</h3>
      <p>${S ? `Kelompok aktif: <b>${esc(S.name)}</b>.` : "Belum ada kelompok yang aktif di sesi ini."}</p>
      <div class="row"><button class="btn" type="button" id="resetGroup">Hapus progres kelompok</button></div>
      <small>Progres, lembar kerja, dan refleksi kelompok dihapus dari laptop ini. Unduh log CSV dulu bila masih diperlukan.</small>
    </section>
    <form class="set" id="pinChange">
      <h3>Ganti PIN</h3>
      <div class="row">
        <input id="newPin1" type="password" inputmode="numeric" maxlength="8" placeholder="PIN baru" aria-label="PIN baru">
        <input id="newPin2" type="password" inputmode="numeric" maxlength="8" placeholder="Ulangi PIN" aria-label="Ulangi PIN baru">
        <button class="btn" type="submit">Simpan PIN</button>
      </div>
      <small id="pinChangeMsg" aria-live="polite"></small>
    </form>
    <section class="set">
      <h3>Privasi</h3>
      <small>GeoTrails tidak memakai login, server, atau pelacak. Semua data (nama kelompok, warna avatar, jawaban, catatan, foto unggahan) tersimpan hanya di browser laptop ini.</small>
    </section>`;

  $<HTMLInputElement>("demoChk").onchange = (e) => {
    teacher.demo = (e.target as HTMLInputElement).checked;
    saveTeacher(teacher);
    $("demoBadge").hidden = !teacher.demo;
    if (session.S) updateHud();
  };

  let armed = false;
  $("resetGroup").onclick = () => {
    const b = $("resetGroup");
    if (!armed) {
      armed = true; b.textContent = "Yakin? Klik lagi untuk menghapus"; b.classList.add("tape");
      setTimeout(() => { armed = false; if (b.isConnected) { b.textContent = "Hapus progres kelompok"; b.classList.remove("tape"); } }, 4000);
      return;
    }
    clearSaved();
    location.reload();
  };

  $("pinChange").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p1 = $<HTMLInputElement>("newPin1").value.trim(), p2 = $<HTMLInputElement>("newPin2").value.trim(), msg = $("pinChangeMsg");
    if (!validPin(p1)) { msg.textContent = "PIN harus 4–8 angka."; return; }
    if (p1 !== p2) { msg.textContent = "Kedua PIN belum sama."; return; }
    teacher.pinHash = await hashPin(p1);
    saveTeacher(teacher);
    msg.textContent = "PIN baru tersimpan.";
    $<HTMLInputElement>("newPin1").value = ""; $<HTMLInputElement>("newPin2").value = "";
  });
}
