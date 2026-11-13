# GeoTrails

Math Trail virtual untuk siswa Grade 9 (IGCSE 0607). Kelompok 3–4 siswa memakai 1 laptop dan menjelajahi denah sekolah 2D ala Gather.town. Setiap pos berisi foto atau panorama objek nyata dan soal pemodelan. GeoTrails dipakai sebagai pemanasan sebelum trail fisik di lapangan.

Pemilik: Muhammad Ghozian Kafi Ahsan, M.Pd (guru Matematika, Semesta Bilingual Boarding School, Semarang).

## Aturan tetap
- Semua UI dan teks untuk siswa ditulis dalam Bahasa Indonesia. Kode dan komentar boleh berbahasa Inggris.
- Halaman siswa ada di domain utama: `/` (RPG 2D) dan `/3d` (Blox 3D); siswa memilih tampilan di layar mulai, setelah memilih peta. Portal Guru di `/guru`. Versi klasik (denah asli dengan Mode guru lama) ada di `/klasik/` dan `/klasik/3d`, tanpa login dan tanpa backend: datanya hanya tersimpan di browser. Alamat lama (`/peta/...`, `/blox/`) dialihkan di `vercel.json`.
- Halaman utama (siswa dan Portal Guru) boleh memakai **Firebase (Firestore, Realtime Database, Authentication) khusus untuk fitur kelas**, dengan syarat:
  - Lokasi data `asia-southeast2` (Jakarta). Google Analytics dan pelacak lain tidak diaktifkan.
  - Guru login dengan akun Google. Siswa tidak memasukkan data apa pun: mereka cukup memasukkan kode kelas, dan untuk mode bersama memakai login anonim Firebase (tanpa nama/email).
  - Firestore (database `geotrails`, Jakarta): hanya kelas, peta, dan foto buatan guru, termasuk salinan peta guru di akunnya sendiri (`teachers/{uid}/maps/...`, hanya bisa dibaca guru itu) dan peta publik (`public/...`).
  - Mode bersama (multiplayer, Realtime Database, Singapura karena Jakarta belum tersedia): hanya untuk kelompok yang bergabung ke kelas. Yang dikirim hanya nama kelompok, warna, posisi dan arah avatar, poin, dan status per pos (hijau/oranye/belum). Lembar kerja, jawaban, dan refleksi tetap lokal. Siswa diberi tahu di layar mulai. Data sesi dihapus guru ("Hapus data sesi") atau otomatis bila tidak diperbarui 24 jam (dibersihkan saat ruang itu dibuka lagi).
  - Tanpa konfigurasi Firebase atau tanpa internet, Peta tetap berjalan penuh secara lokal.
  - Setiap perubahan aturan keamanan (`firebase/firestore.rules`, `firebase/database.rules.json`) harus lolos `npm run test:rules`.
  - localStorage: progres kelompok (`geotrails.v1`), pengaturan guru (`geotrails.guru`), isi pos buatan guru (`geotrails.trail`).
  - IndexedDB (`geotrails`, store `photos`): foto pos unggahan guru.
  - Halaman utama memakai kunci sendiri (namanya tetap `peta` agar progres lama tetap terbaca): `geotrails.peta.maps` (peta buatan guru), `geotrails.peta.deleted` (peta yang dihapus di perangkat ini dan belum dihapus di akun), `geotrails.peta.progress.<idPeta>` (progres per peta), `geotrails.peta.class` dan `geotrails.peta.classmaps.<kode>` (kelas yang diikuti dan salinan petanya untuk offline), `geotrails.peta.publicmaps` (peta publik yang dipilih siswa, untuk offline), serta IndexedDB `geotrails-peta` (foto pos per peta). PIN dan mode demo memakai `geotrails.guru` yang sama.
- Tidak boleh mengumpulkan data pribadi (UU PDP). Identitas kelompok hanya nama kelompok dan warna avatar. Selain itu yang disimpan hanya isi pelajaran: jawaban, lembar kerja, hasil ukur fisik, refleksi, foto objek, dan isi pos. Setiap kotak teks bebas untuk siswa wajib memuat pengingat "Jangan menulis data pribadi." Tidak ada analytics atau pelacak.
- Aplikasi harus tetap berjalan offline setelah dibuka sekali. Jangan memakai CDN saat runtime. Font dan aset di-bundle. SDK Firebase di-bundle dari npm dan hanya dimuat saat fitur kelas dipakai. Satu-satunya pengecualian: popup login Google guru di Portal Guru memuat skrip dari Google.
- **Jangan mengubah angka kunci jawaban di `src/data/posts.ts`** tanpa izin eksplisit. Setiap perubahan pada data pos harus lolos `npm test`. Isi pos yang diubah guru lewat Mode guru disimpan terpisah di localStorage dan tidak menyentuh `posts.ts`.
- Progres yang tersimpan dari versi lama harus tetap bisa dilanjutkan. Bila menambah kolom pada state, isi nilai bawaannya di `normalize()` (`src/core/store.ts`).
- Kerjakan perubahan kecil dan bertahap. Satu fitur, lalu uji, lalu commit.

## Stack
- Vite + TypeScript, tanpa framework. Peta digambar di `<canvas>`, sedangkan UI memakai DOM biasa.
- Vitest untuk logika: parsing angka, penilaian, skor, kalkulator, CSV, rekap, validasi isi pos, sprite. Playwright untuk alur end-to-end siswa dan guru (`e2e/`), dijalankan terhadap build produksi lewat `vite preview`. Tes e2e juga memastikan tidak ada permintaan ke internet saat aplikasi dipakai.
- `npm run build` menghasilkan `dist/` untuk deploy (Vercel, subdomain alhazed.my.id): `index.html`, `3d.html`, `guru.html`, `klasik/`. `vercel.json` menyalakan alamat tanpa `.html` dan pengalihan alamat lama.
- Tampilan 3D memakai three.js dari npm (di-bundle, tanpa CDN), dibangun dari data peta yang sama dengan 2D.
- Semua kode ada di `src/`, dikelompokkan menurut fungsi (lihat Struktur). Kode yang hanya dipakai versi klasik ada di `src/klasik/`; fitur baru masuk ke halaman utama, bukan ke versi klasik.
- Firebase: aturan di `firebase/firestore.rules` dan `firebase/database.rules.json` (tanpa Cloud Storage; foto disimpan di Firestore). Konfigurasi web lewat variabel `VITE_FIREBASE_*` (lihat `.env.example`); untuk produksi di `.env.production` (proyek `gen-lang-client-0151740306`, database Firestore bernama `geotrails` di asia-southeast2, terpisah dari database aplikasi lain di proyek itu). Mode bersama memakai Realtime Database `geotrails-live` (`VITE_FIREBASE_DATABASE_URL`); tanpa URL itu Peta tetap bermain sendiri. Pengembangan dan tes memakai Firebase Emulator dengan proyek `demo-geotrails` (`.env.emulator`), tidak pernah proyek sungguhan.
- `npm run build:single` menghasilkan satu file HTML offline versi klasik 2D di `dist-single/index.html` dengan vite-plugin-singlefile.

## Struktur
```
index.html  3d.html  guru.html   halaman siswa (RPG 2D, Blox 3D) dan Portal Guru
klasik/                          versi klasik: index.html (2D) dan 3d.html
src/
  pages/      skrip tiap halaman: siswa2d, siswa3d, guru, klasik2d, klasik3d
  core/       logika murni: parseNumber, grade, score, calc, compare, csv, csvParse, recap, trail, pin, image;
              types.ts (Post, GroupState, ...), store.ts (localStorage/IndexedDB, normalize(), migrasi progres lama)
  data/       map.ts (grid 36×24 asli), posts.ts (6 pos bawaan, KUNCI JAWABAN), reflection.ts
  map/        MapDef (mapdef), peta Basic (basic), validate, store (peta & progres), photos, session, minimap,
              remote (avatar kelompok lain)
  render2d/   kanvas 2D: world/props (tanah dan benda), sprite/anim (avatar pixel-art RPG), camera, bfs,
              draw2d + game2d (peta buatan guru), render + game (versi klasik)
  render3d/   three.js: world3d + game3d + move3d (peta buatan guru), avatar3d, movement, textures
  ui/         layar mulai (pilihan RPG 2D / Blox 3D), modal pos, HUD, log, selesai, mode bersama (live),
              kalkulator, panorama, foto, kontrol sentuh (touch, stick), dom
  portal/     Portal Guru: daftar peta, editor grid, isi pos, kelas online, pantauan langsung (monitor), sinkron akun (sync),
              pribadi/publik dan persetujuan admin (sharing)
  cloud/      Firebase: config, cache (offline), client (kelas & peta), mymaps (peta guru di akunnya), publicmaps (peta publik), live + livedata (mode bersama)
  klasik/     hanya versi klasik: state, ui/ (start, hud, post, log, finish), teacher/ (Mode guru), world3d, game3d
  styles/     base.css (token & komponen), peta.css, portal.css, blox.css
firebase/     firestore.rules, database.rules.json + tes aturannya (emulator)
tests/        Vitest
e2e/          Playwright: peta, peta3d (halaman utama), touch + klasik/ (siswa, guru, blox) untuk versi klasik, cloud/ (emulator); helpers.ts
public/posts/ foto & panorama per pos (pos-<id>.jpg), opsional
prototype/geotrails.html   prototipe awal — acuan tampilan & perilaku
WISHLIST.md   ide fitur berikutnya (dicentang bila selesai); perintah /wishlist di .claude/commands/wishlist.md
```

## Logika inti (jangan diubah tanpa diskusi)
- **Parsing angka gaya Indonesia**: "12,6" → 12.6; "2.307" → 2307; "2.307,5" → 2307.5. Kalkulator memakai aturan yang sama dan selalu dalam mode derajat.
- **Penilaian**
  - Nilai di dalam `green` → hijau.
  - Nilai di dalam `orange` → oranye. Siswa boleh merevisi atau mengunci jawaban.
  - Di luar keduanya → merah.
  - Bila |v − errors[i].v| ≤ errors[i].t, tampilkan pesan kesalahan khusus.
- **Skor**
  - Hijau: 100 − 15 × jumlah petunjuk (minimal 20).
  - Oranye yang dikunci: 60 − 15 × jumlah petunjuk (minimal 10).
  - Pos 0 tidak kena pengurangan petunjuk: 100 atau 60.
- Pos 1–5 terkunci sampai Pos 0 selesai, kecuali guru menyalakan mode demo.
- **Kontrol sentuh** (2D dan 3D): joystick kiri bawah dan tombol Buka (serta Lompat di 3D) muncul bila input terakhir berupa sentuhan, dan hilang lagi setelah klik mouse. Di 2D joystick memilih arah grid; di 3D analog dan mengikuti kamera.
- **Foto pos**: urutan prioritas unggahan guru (IndexedDB) → `public/posts/pos-<id>.jpg` → ilustrasi bawaan. Foto dengan rasio ≥ 2,5 : 1 tampil sebagai panorama.

## Mode guru (versi klasik)
- Dibuka dari tombol "Mode guru" di layar mulai atau di Log, dijaga PIN lokal 4–8 angka (disimpan sebagai hash). PIN hanya penghalang ringan, bukan pengaman.
- Tab: Kunci jawaban, Foto pos, Isi pos (edit + ekspor/impor JSON), Rekap kelas (gabungan log CSV, tidak disimpan), Pengaturan (mode demo, hapus progres, ganti PIN).
- Posisi pos di peta selalu mengikuti pos bawaan. Isi pos buatan guru divalidasi (`src/core/trail.ts`) sebelum dipakai.

## Peta buatan guru (halaman utama)
- Peta "Basic" dibuat saat dimuat dari `src/data/map.ts` dan `src/data/posts.ts` (hanya dibaca). Basic tidak bisa diedit; guru menduplikatnya. Tes memastikan petak yang bisa dilalui dan kunci jawabannya sama persis dengan aslinya.
- Satu peta = JSON (`MapDef`): petak (rumput, paving, lapangan, paving teduh, taman, kolam), gedung (nama, warna, lantai), objek (pohon, tiang bendera, tandon, pot, ramp, papan), titik mulai, dan 1–12 pos dengan isi dan kunci jawaban masing-masing. Pos 0 tetap pos pembuka (gerbang, petunjuk gratis).
- Siswa hanya melihat peta yang ditampilkan guru dan lolos pemeriksaan (`src/map/validate.ts`): ukuran 12–60 × 10–40, gedung tidak bertumpuk, titik mulai bisa dilalui, setiap pos bisa dicapai dari titik mulai, isi pos sesuai aturan yang sama dengan Mode guru.
- Tampilan 3D (`/3d`) selalu dibangun dari data peta yang sama dengan 2D, dan progres kelompok sama untuk keduanya.
- Portal Guru dibuka dengan PIN lokal per perangkat. Guru yang lupa PIN bisa membuat PIN baru lewat "Lupa PIN? Masuk dengan Google", hanya bila akunnya dikenal (admin, pemilik kelas, atau punya peta di akunnya).
- Peta guru tersimpan di akun Google guru: begitu guru masuk di Portal Guru, peta di perangkat itu dan di akunnya disinkronkan (salinan yang terakhir diubah menang, `updatedAt`; foto hanya dikirim bila berubah). Peta yang dihapus ditandai `deleted` agar perangkat lain ikut menghapusnya. Kode: `src/cloud/mymaps.ts` (sinkron) dan `src/portal/sync.ts` (kapan sinkron dan baris status di daftar peta).
- Pribadi atau publik, per peta. Pribadi (bawaan): siswa hanya mendapat peta lewat kode kelas. Publik: siapa pun bisa menemukan dan memainkannya lewat tombol "Jelajahi peta publik" di layar mulai (dimuat dari internet hanya saat tombol ditekan; peta yang dipilih disimpan untuk offline). Peta guru tampil publik setelah disetujui admin, dan setiap perubahan perlu disetujui lagi; peta milik admin langsung tampil. Admin = dokumen `admins/{uid}` di Firestore, dibuat manual di konsol (tidak bisa ditulis dari aplikasi); admin melihat kotak "Persetujuan peta publik" di Portal Guru. Model data: `public/{idPeta}` (`status` pending/approved, `ownerUid`, ringkasan) dan `.../photos/{uidPos}`. Kode: `src/cloud/publicmaps.ts`, `src/portal/sharing.ts`.
- Kelas online: guru membuat kelas (kode 6 karakter) dan menerbitkan peta beserta fotonya; siswa memasukkan kode kelas untuk memuat peta itu. Peta kelas disimpan di laptop siswa agar tetap bisa dipakai offline. Model data: `classes/{kode}`, `classes/{kode}/maps/{idPeta}`, `.../photos/{uidPos}`.
- Mode bersama (multiplayer realtime): kelompok di kelas yang sama dan peta yang sama saling melihat avatar (2D dan 3D) dan papan skor langsung (tombol "Kelas"). Guru memantau dari Portal Guru ("Pantau langsung": peta mini dengan posisi kelompok dan papan skor) dan bisa menghapus data sesi. Model data Realtime Database: `live/{kode}/owner` (uid guru), `live/{kode}/rooms/{idPeta}/{uid}` (satu kelompok, hanya ditulis kelompok itu sendiri).
- Kendali kelas langsung (di "Pantau langsung", per peta): tahan semua kelompok, mulai serentak dengan hitung mundur (jam server), kirim pesan ke semua kelompok (maks. 140 karakter), buka semua pos (melewati urutan Pos 0), dan kunci pos tertentu. Hanya pemilik kelas yang bisa menulis; siswa di kelas membaca. Model data: `live/{kode}/control/{idPeta}` (`hold`, `startAt`, `allOpen`, `msg`, `locked`). Kode: `src/map/control.ts` (status), `src/ui/live.ts` (layar siswa), `src/portal/monitor.ts` (tombol guru).

## Uji wajib (tabel jawaban kunci)
| Pos | Input | Hasil yang diharapkan |
|---|---|---|
| 0 | 11,1 | merah + pesan "tinggi mata" |
| 0 | 12,6 | hijau |
| 1 | 2.307 | hijau |
| 2 | 4,8 | hijau |
| 3 | 12 | hijau |
| 4 | 82,7 | hijau |
| 5 | 121 | hijau |
| 5 | 146 | merah + pesan "setengah lingkaran" |

## Gaya visual
- Nuansa peta survei lapangan. Aksen hijau #0E6B5B, sorotan kuning pita ukur #F2B705, netral kehijauan.
- Peta bergaya realistis dari atas (tekstur, atap seng, bayangan ke kanan bawah). Avatar pixel-art RPG. Warna peta diambil dari token `--map-*` di `src/styles.css`.
- Font: Chakra Petch (judul), Atkinson Hyperlegible (teks), JetBrains Mono (angka). Semua di-bundle lokal.
- Mode terang dan gelap mengikuti sistem. Tanpa emoji, tanpa gradien ungu.

## Perintah
- `npm run dev`: server lokal
- `npm test`: Vitest
- `npm run typecheck`: pemeriksaan TypeScript (aplikasi dan e2e)
- `npm run build` / `npm run build:single`
- `npm run test:rules`: tes aturan keamanan Firestore dan Realtime Database (menjalankan emulator)
- `npm run e2e:cloud`: tes fitur online di emulator (peta guru di akun, peta publik dan persetujuan admin, guru menerbitkan, siswa memuat, mode bersama)
- `npm run e2e`: Playwright. Di laptop baru jalankan dulu `npx playwright install chromium`. Tes 3D (Blox dan Peta 3D) berjalan di proyek `blox` dengan WebGL perangkat lunak.
