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
- Aturan keamanan (`firebase/firestore.rules` dan `firebase/database.rules.json`) dipasang otomatis oleh GitHub Actions setiap kali berubah di `main`. Lihat **Pemasangan aturan otomatis** di bawah.
- **Peta guru tersimpan online**: masuk dengan Google di Portal Guru (`/guru`), dan semua peta di perangkat itu tersimpan di akun Bapak/Ibu. Di perangkat lain cukup buka `/guru` dan masuk dengan akun yang sama. Baris di bawah judul "Daftar peta" menunjukkan status sinkronnya.
- **Peta pribadi atau publik**: di Portal Guru, setiap peta bisa **Jadikan publik**. Peta publik bisa dimainkan siapa pun lewat tombol **Jelajahi peta publik** di layar mulai, setelah disetujui admin di kotak **Persetujuan peta publik**. Admin ditambahkan dengan membuat dokumen `admins/<uid>` di Firestore (database `geotrails`) lewat Firebase console; uid terlihat di Authentication → Users.
- **Mode bersama (multiplayer realtime)** memakai Realtime Database **`geotrails-live`** (asia-southeast1, Singapura; Jakarta belum tersedia untuk layanan ini) dan login anonim untuk siswa. Kelompok yang bergabung ke kelas saling melihat avatar di peta yang sama (2D dan 3D) dan papan skor langsung (tombol **Kelas**). Guru: Portal Guru → kelas → **Pantau langsung**.
  Yang dikirim hanya nama kelompok, warna, posisi, poin, dan status per pos. Data sesi dihapus dengan **Hapus data sesi**, atau otomatis bila tidak aktif 24 jam (dibersihkan saat ruang itu dibuka lagi).
  Login anonim siswa sudah aktif di proyek ini. Aturan Firestore menolak akun anonim untuk membuat kelas atau menerbitkan peta.
  Aturannya ikut dipasang otomatis (lihat di bawah).
- Tanpa `.env.production` (mis. salinan proyek ini untuk sekolah lain), halaman siswa dan Portal Guru tetap berjalan penuh secara lokal; bagian kelas online saja yang tidak muncul. Isi variabel di `.env.example` untuk proyek Firebase sendiri.

Pengembangan dan tes memakai emulator (butuh Java), tidak menyentuh proyek sungguhan:
```
npm run test:rules   # tes aturan keamanan
npm run e2e:cloud    # peta guru di akun, peta publik, guru menerbitkan peta, siswa memuat dengan kode kelas, mode bersama
```

## Tes dan pemasangan aturan otomatis (GitHub Actions)

Sama seperti QED:

| Workflow | Berjalan saat | Isinya |
|---|---|---|
| `.github/workflows/ci.yml` | setiap pull request dan setiap push ke `main` | typecheck, tes Vitest, build, tes aturan keamanan, tes e2e, tes fitur online di emulator |
| `.github/workflows/deploy.yml` | push ke `main` yang mengubah `firebase/`, `firebase.json`, atau `.firebaserc` | tes aturan keamanan, lalu memasang aturan Firestore (database `geotrails`) dan Realtime Database (`geotrails-live`) |

Aturan tidak dipasang bila tesnya gagal. `firebase.json` hanya berisi database GeoTrails, jadi database aplikasi lain di proyek yang sama tidak tersentuh. Untuk memasang ulang tanpa push: tab **Actions** → **Deploy Firebase rules** → **Run workflow**.

**Persiapan sekali saja:** workflow memakai kunci service account bernama `FIREBASE_SERVICE_ACCOUNT`, sama seperti QED.
1. Buka <https://console.cloud.google.com/iam-admin/serviceaccounts>, pilih proyek **MrGhoziProject**.
2. Buka service account `github-deploy` (yang dulu dibuat untuk QED; perannya sudah mencakup **Firebase Admin**). Bila belum ada, buat dengan peran **Firebase Admin**.
3. Tab **Keys** → **Add key** → **Create new key** → **JSON**. Sebuah file `.json` terunduh.
4. Repo GeoTrails di GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Nama: `FIREBASE_SERVICE_ACCOUNT`, isi: seluruh isi file JSON tadi. **Add secret**.
5. Hapus file JSON yang terunduh.
