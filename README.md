# GeoTrails

Math Trail virtual untuk siswa Grade 9 (IGCSE 0607). Lihat `CLAUDE.md` untuk aturan proyek.

```
npm install
npm run dev           # server lokal
npm test              # Vitest
npm run e2e           # Playwright (sekali di awal: npx playwright install chromium)
npm run build         # dist/: /, /3d, /guru, /klasik/
npm run build:single  # dist-single/index.html (versi klasik 2D, satu file, offline)
```

Halaman:
- `/` siswa (pilih peta, lalu tampilan **RPG 2D** atau **Blox 3D**); `/3d` langsung ke tampilan 3D.
- `/guru` Portal Guru: editor peta grid, kelas online, pantauan langsung.
- `/klasik/` dan `/klasik/3d` versi klasik (denah asli dengan Mode guru lama).

Alamat lama `/peta/...` dan `/blox/` dialihkan otomatis (`vercel.json`). Struktur folder: lihat `CLAUDE.md`.


## Kelas online (Firebase)

Sudah aktif. Konfigurasi web ada di `.env.production` (nilainya memang publik; aksesnya dijaga oleh aturan keamanan), jadi Vercel tidak perlu diisi apa pun.

- Proyek Firebase: **MrGhoziProject** (`gen-lang-client-0151740306`).
- Database Firestore sendiri bernama **`geotrails`** di **asia-southeast2 (Jakarta)**, terpisah dari database aplikasi lain di proyek itu. Aturannya hanya dipasang ke database ini.
- Login guru: Google. Domain yang diizinkan antara lain `geotrails.alhazed.my.id` dan `alhazed.my.id`.
  Domain lain (mis. `*.vercel.app`): Firebase console → Authentication → Settings → **Authorized domains** → Add domain.
- Pasang ulang aturan setiap kali `firebase/firestore.rules` berubah (setelah `npm run test:rules` lolos):
  ```
  npx firebase login
  npx firebase deploy --only firestore:rules --project gen-lang-client-0151740306
  ```
- **Peta guru tersimpan online**: masuk dengan Google di Portal Guru (`/guru`), dan semua peta di perangkat itu tersimpan di akun Bapak/Ibu. Di perangkat lain cukup buka `/guru` dan masuk dengan akun yang sama. Baris di bawah judul "Daftar peta" menunjukkan status sinkronnya.
- **Peta pribadi atau publik**: di Portal Guru, setiap peta bisa **Jadikan publik**. Peta publik bisa dimainkan siapa pun lewat tombol **Jelajahi peta publik** di layar mulai, setelah disetujui admin di kotak **Persetujuan peta publik**. Admin ditambahkan dengan membuat dokumen `admins/<uid>` di Firestore (database `geotrails`) lewat Firebase console; uid terlihat di Authentication → Users.
- **Mode bersama (multiplayer realtime)** memakai Realtime Database **`geotrails-live`** (asia-southeast1, Singapura; Jakarta belum tersedia untuk layanan ini) dan login anonim untuk siswa. Kelompok yang bergabung ke kelas saling melihat avatar di peta yang sama (2D dan 3D) dan papan skor langsung (tombol **Kelas**). Guru: Portal Guru → kelas → **Pantau langsung**.
  Yang dikirim hanya nama kelompok, warna, posisi, poin, dan status per pos. Data sesi dihapus dengan **Hapus data sesi**, atau otomatis bila tidak aktif 24 jam (dibersihkan saat ruang itu dibuka lagi).
  Login anonim siswa sudah aktif di proyek ini. Aturan Firestore menolak akun anonim untuk membuat kelas atau menerbitkan peta.
  Pasang ulang aturannya setiap kali `firebase/database.rules.json` berubah: `npx firebase deploy --only database --project gen-lang-client-0151740306`, atau tempel isinya di Firebase console → Realtime Database → `geotrails-live` → Rules → Publish.
- Tanpa `.env.production` (mis. salinan proyek ini untuk sekolah lain), halaman siswa dan Portal Guru tetap berjalan penuh secara lokal; bagian kelas online saja yang tidak muncul. Isi variabel di `.env.example` untuk proyek Firebase sendiri.

Pengembangan dan tes memakai emulator (butuh Java), tidak menyentuh proyek sungguhan:
```
npm run test:rules   # tes aturan keamanan
npm run e2e:cloud    # peta guru di akun, peta publik, guru menerbitkan peta, siswa memuat dengan kode kelas, mode bersama
```

