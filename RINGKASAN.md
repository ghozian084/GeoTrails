# Ringkasan proyek GeoTrails

Catatan untuk sesi Claude berikutnya dan untuk Bapak. Sesi Claude tidak saling mengingat; yang terbawa hanya isi repo, yaitu file ini, `CLAUDE.md` (aturan dan rincian teknis), dan `WISHLIST.md` (rencana fitur). Panggil dengan perintah `/ringkasan`.

Terakhir diperbarui: 18 November 2026, setelah PR #26.

## 1. Apa itu GeoTrails
- Math Trail virtual untuk siswa Grade 9 (IGCSE 0607) di Semesta Bilingual Boarding School, Semarang. Pemilik: Bapak Muhammad Ghozian Kafi Ahsan.
- Kelompok 3–4 siswa memakai 1 laptop dan menjelajahi denah sekolah. Setiap pos berisi foto/ilustrasi objek nyata dan soal pemodelan. GeoTrails dipakai sebagai pemanasan sebelum trail fisik.
- Alamat:
  - `/`: siswa, RPG 2D.
  - `/3d`: siswa, Blox 3D.
  - `/guru`: Portal Guru.
  - `/klasik/` dan `/klasik/3d`: versi klasik.
- Situs di Vercel, otomatis diperbarui setiap ada perubahan di `main`.

## 2. Cara bekerja dengan Bapak
- Balas dalam bahasa Indonesia sederhana. Sapa "Bapak".
- Alur setiap perubahan:
  1. Kerjakan di branch kerja sesi.
  2. Uji: `npm run typecheck`, `npm test`, `npm run test:rules`, `npx playwright test`, `npm run e2e:cloud`.
  3. Commit, buat PR, dan tunggu CI hijau.
  4. **Gabungkan (merge) sendiri tanpa menunggu**. Pesan Bapak: "Langsung auto merge, biar saya langsung akses".
  5. Laporkan ke Bapak: apa yang berubah, cara memakainya, dan tautan PR.
- Bila ada pilihan desain yang penting, tanyakan dulu dengan pilihan bernomor dan satu rekomendasi.
- Aturan pemilik yang tetap berlaku:
  - Tanpa data pribadi (UU PDP).
  - Semua teks siswa dalam bahasa Indonesia.
  - Tetap memakai proyek Firebase yang sekarang.
  - Jangan mengubah kunci jawaban di `src/data/posts.ts`.
- Setelah menyelesaikan fitur, perbarui file ini (bagian 4 dan 6), `CLAUDE.md`, dan `WISHLIST.md`.

## 3. Infrastruktur
- **Kode:** GitHub `ghozian084/GeoTrails`. Stack: Vite + TypeScript tanpa framework, canvas 2D, three.js 3D, Leaflet (peta Jelajah).
- **Firebase:** proyek `gen-lang-client-0151740306` (MrGhoziProject, paket Blaze).
  - Firestore: database bernama `geotrails` di Jakarta (asia-southeast2).
  - Realtime Database: `geotrails-live` di Singapura (asia-southeast1), untuk mode bersama.
  - Login: guru dengan Google, siswa secara anonim (tanpa nama/email).
  - Admin = dokumen `admins/{uid}` di Firestore, dibuat manual di konsol. Akun Bapak sudah menjadi admin.
- **Aturan keamanan:** dipasang otomatis oleh GitHub Actions (`deploy.yml`, kunci rahasia `FIREBASE_SERVICE_ACCOUNT`) setiap kali masuk `main`. Aturan Realtime Database dipasang lewat `scripts/deploy-rtdb-rules.mjs`, karena Firebase CLI menolak bila tidak ada instance default.
- **CI:** `ci.yml` menjalankan typecheck, unit test, build, tes aturan, e2e, dan e2e cloud (emulator) pada setiap PR.
- **Tes:** memakai Firebase Emulator dengan proyek `demo-geotrails`, tidak pernah proyek sungguhan. Tes e2e tidak boleh memakai internet: `playwright.config.ts` mengarahkan semua alamat luar ke proxy mati.

## 4. Riwayat fitur (urut waktu)
| PR | Fitur |
|---|---|
| #3–#5 | Playwright e2e, prototipe Blox 3D, kontrol sentuh (HP/tablet) |
| #6–#10 | "Peta": peta buatan guru (model data, editor grid, halaman siswa 2D/3D), kelas online dengan Firebase, mode bersama (multiplayer realtime) |
| #11 | Halaman siswa pindah ke domain utama (`/`, `/3d`, `/guru`); versi lama jadi `/klasik/`; `src/` disusun menurut fungsi |
| #12 | Peta guru tersimpan di akun Google guru (sinkron antarperangkat) |
| #13 | Peta pribadi (lewat kode kelas) atau publik (setelah disetujui admin); "Lupa PIN? Masuk dengan Google" |
| #14–#15 | `WISHLIST.md` dan perintah `/wishlist`; ide Jelajah ala MathCityMap |
| #16 | Kendali kelas langsung: tahan, mulai serentak, kirim pesan, buka/kunci pos |
| #17–#18 | CI di GitHub dan pemasangan aturan Firebase otomatis |
| #19 | Cetak lembar kerja (PDF) untuk trail fisik, kunci jawaban opsional |
| #20 | Ilustrasi template untuk soal (8 objek) dengan label ukuran dari guru |
| #21 | Label di atas foto pos (diseret, dengan titik penunjuk) |
| #22 | Mode offline sungguhan (PWA): tombol "Unduh untuk offline", bisa dipasang sebagai aplikasi |
| #23 | Sesi trail: kode sesi 6 karakter, hasil kelompok (poin, status dan jawaban angka per pos, petunjuk, durasi) terkirim ke guru; tabel hasil, rekap per pos, CSV, tutup/hapus sesi |
| #24 | Jelajah ala MathCityMap sebagai tampilan utama layar mulai: peta dunia OpenStreetMap dengan pin trail, kartu trail lalu Main RPG 2D/Blox 3D; guru mengisi "Lokasi di Jelajah" di editor |
| #25 | `RINGKASAN.md` dan perintah `/ringkasan` |
| #26 | Menu utama lebih nyaman: halaman penuh dua kolom (Jelajah kiri, kode dan daftar peta kanan), kartu "Lanjutkan petualangan" sekali klik, "Cara bermain" bisa dilipat, langkah 1–2, pratinjau avatar |

## 5. Keputusan Bapak yang perlu diingat
- **Hasil kelompok** hanya dikirim di dalam sesi trail yang dibuat guru, dengan kode sesi sendiri (tidak sama dengan kode kelas). Isinya hasil + jawaban angka, dan tersimpan sampai guru menghapus sesi.
- **Peta publik** tampil setelah disetujui Bapak (admin). Siswa menemukannya di layar mulai.
- **Gambar soal:** ilustrasi template dikerjakan dulu, lalu label bebas di foto. Keduanya sudah selesai.
- **Jelajah:**
  - Sumber peta OpenStreetMap: online memakai peta, offline memakai daftar.
  - Ini pengecualian yang disetujui untuk aturan "tanpa CDN"; nama OSM wajib tampil di pojok peta.
  - Jelajah menjadi tampilan utama layar mulai.
- **Pin Basic** di koordinat -7.04, 110.356 (disetujui Bapak).

## 6. Yang belum dikerjakan
Lihat `WISHLIST.md` untuk daftar lengkap. Yang paling dekat:
- Jelajah tahap 3: tombol "Dekat saya", lalu titik nyata per pos sebagai jembatan ke trail fisik (GPS/QR).
- QR code untuk trail fisik (kartu QR per pos).
- Analisis kesalahan: pos yang paling sering salah dan kesalahan umum. Datanya sudah tersedia dari hasil sesi.
- Bahasa Inggris (tombol ID/EN).
- Denah sekolah (foto) sebagai latar editor, bank soal, jenis soal lain, mode lomba, aksesibilitas, lencana.
- Teknis: pembersihan data sesi terjadwal, Firebase App Check, domain `geotrails.alhazed.my.id`.

## 7. Catatan teknis yang pernah menjebak
- **Emulator lokal:** jalankan dengan `env -u HTTPS_PROXY -u https_proxy` (contoh: `npm run e2e:cloud`).
- **Login anonim siswa:** harus lewat satu fungsi bersama, `signedInUser()` di `src/cloud/client.ts`. Kalau mode bersama dan pengiriman hasil login sendiri-sendiri, satu kelompok bisa punya dua identitas dan hasilnya ditolak.
- **Peta Leaflet:** dibuat dengan `keyboard: false`. Fokus pada peta menggulir jendela layar mulai sehingga klik pin meleset.
- **Service worker:** cocokkan cache dengan `ignoreVary`, karena skrip modul membawa header Origin. Plugin daftar offline memakai `enforce: "post"`.
- **Git:** force push ditolak. Setelah PR digabung (squash), mulai branch baru dari `origin/main`, lalu `git merge -s ours origin/<branch>` agar push tetap fast-forward.
- **Shell:** `pkill -f` yang cocok dengan perintahnya sendiri ikut mematikan shell. Hindari.
