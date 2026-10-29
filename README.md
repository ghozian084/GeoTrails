# GeoTrails

Math Trail virtual untuk siswa Grade 9 (IGCSE 0607). Lihat `CLAUDE.md` untuk aturan proyek.

```
npm install
npm run dev           # server lokal
npm test              # Vitest
npm run e2e           # Playwright (sekali di awal: npx playwright install chromium)
npm run build         # dist/ (2D) dan dist/blox/ (prototipe 3D)
npm run build:single  # dist-single/index.html (satu file, offline)
```

Prototipe 3D bergaya blok: buka `/blox/` (saat `npm run dev`: http://localhost:5173/blox/).

GeoTrails Peta (peta buatan guru): `/peta/` untuk siswa, `/peta/guru.html` untuk Portal Guru (editor peta grid), `/peta/3d.html` untuk versi 3D.

## Kelas online (Firebase) untuk GeoTrails Peta

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
- **Mode bersama (multiplayer realtime)** memakai Realtime Database **`geotrails-live`** (asia-southeast1, Singapura; Jakarta belum tersedia untuk layanan ini) dan login anonim untuk siswa. Kelompok yang bergabung ke kelas saling melihat avatar di peta yang sama (2D dan 3D) dan papan skor langsung (tombol **Kelas**). Guru: Portal Guru → kelas → **Pantau langsung**.
  Yang dikirim hanya nama kelompok, warna, posisi, poin, dan status per pos. Data sesi dihapus dengan **Hapus data sesi**, atau otomatis bila tidak aktif 24 jam (dibersihkan saat ruang itu dibuka lagi).
  Login anonim siswa sudah aktif di proyek ini. Aturan Firestore menolak akun anonim untuk membuat kelas atau menerbitkan peta.
  Pasang ulang aturannya setiap kali `firebase/database.rules.json` berubah: `npx firebase deploy --only database --project gen-lang-client-0151740306`, atau tempel isinya di Firebase console → Realtime Database → `geotrails-live` → Rules → Publish.
- Tanpa `.env.production` (mis. salinan proyek ini untuk sekolah lain), GeoTrails Peta tetap berjalan penuh secara lokal; bagian kelas online saja yang tidak muncul. Isi variabel di `.env.example` untuk proyek Firebase sendiri.

Pengembangan dan tes memakai emulator (butuh Java), tidak menyentuh proyek sungguhan:
```
npm run test:rules   # tes aturan keamanan
npm run e2e:cloud    # guru menerbitkan peta, siswa memuat dengan kode kelas, mode bersama
```

