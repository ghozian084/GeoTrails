# GeoTrails

Math Trail virtual untuk siswa Grade 9 (IGCSE 0607). Kelompok 3–4 siswa memakai 1 laptop dan menjelajahi denah sekolah 2D ala Gather.town. Setiap pos berisi foto atau panorama objek nyata dan soal pemodelan. GeoTrails dipakai sebagai pemanasan sebelum trail fisik di lapangan.

Pemilik: Muhammad Ghozian Kafi Ahsan, M.Pd (guru Matematika, Semesta Bilingual Boarding School, Semarang).

## Aturan tetap
- Semua UI dan teks untuk siswa ditulis dalam Bahasa Indonesia. Kode dan komentar boleh berbahasa Inggris.
- Proyek awal (`/` dan `/blox/`) tanpa login dan tanpa backend: semua datanya hanya tersimpan di browser laptop yang dipakai, tidak dikirim ke mana pun.
- GeoTrails Peta boleh memakai **Firebase (Firestore + Authentication) khusus untuk fitur kelas**, dengan syarat:
  - Lokasi data `asia-southeast2` (Jakarta). Google Analytics dan pelacak lain tidak diaktifkan.
  - Hanya guru yang login (akun Google). Siswa tidak login; mereka cukup memasukkan kode kelas.
  - Tahap 1 (sekarang): yang tersimpan di Firebase hanya kelas, peta, dan foto buatan guru. Tidak ada data siswa yang dikirim.
  - Bila kelak hasil kelompok dikirim: hanya nama kelompok, warna, status dan poin per pos, serta jumlah percobaan/petunjuk. Lembar kerja dan refleksi tetap lokal.
  - Tanpa konfigurasi Firebase atau tanpa internet, Peta tetap berjalan penuh secara lokal.
  - Setiap perubahan aturan keamanan (`firebase/firestore.rules`) harus lolos `npm run test:rules`.
  - localStorage: progres kelompok (`geotrails.v1`), pengaturan guru (`geotrails.guru`), isi pos buatan guru (`geotrails.trail`).
  - IndexedDB (`geotrails`, store `photos`): foto pos unggahan guru.
  - GeoTrails Peta memakai kunci sendiri: `geotrails.peta.maps` (peta buatan guru), `geotrails.peta.progress.<idPeta>` (progres per peta), `geotrails.peta.class` dan `geotrails.peta.classmaps.<kode>` (kelas yang diikuti dan salinan petanya untuk offline), serta IndexedDB `geotrails-peta` (foto pos per peta). PIN dan mode demo memakai `geotrails.guru` yang sama.
- Tidak boleh mengumpulkan data pribadi (UU PDP). Identitas kelompok hanya nama kelompok dan warna avatar. Selain itu yang disimpan hanya isi pelajaran: jawaban, lembar kerja, hasil ukur fisik, refleksi, foto objek, dan isi pos. Setiap kotak teks bebas untuk siswa wajib memuat pengingat "Jangan menulis data pribadi." Tidak ada analytics atau pelacak.
- Aplikasi harus tetap berjalan offline setelah dibuka sekali. Jangan memakai CDN saat runtime. Font dan aset di-bundle. SDK Firebase di-bundle dari npm dan hanya dimuat saat fitur kelas dipakai. Satu-satunya pengecualian: popup login Google guru di Portal Guru memuat skrip dari Google.
- **Jangan mengubah angka kunci jawaban di `src/data/posts.ts`** tanpa izin eksplisit. Setiap perubahan pada data pos harus lolos `npm test`. Isi pos yang diubah guru lewat Mode guru disimpan terpisah di localStorage dan tidak menyentuh `posts.ts`.
- Progres yang tersimpan dari versi lama harus tetap bisa dilanjutkan. Bila menambah kolom pada state, isi nilai bawaannya di `normalize()` (`src/store.ts`).
- Kerjakan perubahan kecil dan bertahap. Satu fitur, lalu uji, lalu commit.

## Stack
- Vite + TypeScript, tanpa framework. Peta digambar di `<canvas>`, sedangkan UI memakai DOM biasa.
- Vitest untuk logika: parsing angka, penilaian, skor, kalkulator, CSV, rekap, validasi isi pos, sprite. Playwright untuk alur end-to-end siswa dan guru (`e2e/`), dijalankan terhadap build produksi lewat `vite preview`. Tes e2e juga memastikan tidak ada permintaan ke internet saat aplikasi dipakai.
- `npm run build` menghasilkan `dist/` untuk deploy ke subdomain alhazed.my.id, termasuk prototipe 3D di `dist/blox/`.
- Prototipe 3D (Blox) memakai three.js dari npm (di-bundle, tanpa CDN). Ia memakai ulang data pos, penilaian, UI, Mode guru, dan progres tersimpan dari versi 2D; hanya lapisan game yang berbeda.
- GeoTrails Peta (`peta/`) adalah aplikasi terpisah untuk peta buatan guru. Proyek awal (`/` dan `/blox/`) tidak boleh diubah untuk fitur Peta; Peta hanya mengimpor modul dari `src/` dan `blox/`, atau memakai salinan yang disesuaikan di `peta/src/`.
- Firebase: aturan di `firebase/firestore.rules` (tanpa Cloud Storage; foto disimpan di Firestore). Konfigurasi web lewat variabel `VITE_FIREBASE_*` (lihat `.env.example`). Pengembangan dan tes memakai Firebase Emulator dengan proyek `demo-geotrails` (`.env.emulator`), tidak pernah proyek sungguhan.
- `npm run build:single` menghasilkan satu file HTML offline versi 2D di `dist-single/index.html` dengan vite-plugin-singlefile.

## Struktur
```
src/
  data/map.ts          grid 36×24 tile + bangunan + posisi pos
  data/posts.ts        6 pos bawaan (KUNCI JAWABAN)
  data/reflection.ts   pertanyaan refleksi akhir
  types.ts             Post, PostState, GroupState, Trail, TeacherSettings
  state.ts             sesi aktif, pos yang dipakai (bawaan/buatan guru), pengaturan guru
  store.ts             localStorage / IndexedDB, migrasi progres lama
  game/                canvas, kamera, gerak, BFS
    world.ts           lapisan tanah statis (rumput, paving, gedung, bayangan)
    props.ts           benda tinggi yang diurutkan kedalamannya (pohon, bendera, tandon, pot)
    sprite.ts, anim.ts avatar pixel-art RPG dan animasi jalan
  logic/               parseNumber, grade, score, calc, compare, csv, csvParse, recap, trail, pin, image
  ui/                  layar mulai, modal pos, panorama, kalkulator, foto, log, layar selesai, kontrol sentuh (touch.ts, stick.ts)
    teacher/           Mode guru: kunci jawaban, foto pos, isi pos, rekap kelas, pengaturan
firebase/              firestore.rules + rules.test.ts (tes aturan keamanan di emulator)
tests/                 Vitest
e2e/                   Playwright (siswa, guru, touch, blox, peta, peta3d .spec.ts; helpers.ts); e2e/cloud/ untuk fitur kelas di emulator
public/posts/          foto & panorama per pos (pos-<id>.jpg), opsional
peta/                  GeoTrails Peta di /peta/: index.html (siswa: daftar peta lalu bermain 2D), 3d.html (peta yang sama dalam 3D),
                       guru.html (Portal Guru: daftar peta + editor grid). Kode di peta/src/ (mapdef, basic, validate, store,
                       draw2d, game2d, world3d, game3d, ui/, portal/, cloud/ (config, cache, client Firebase))
blox/                  prototipe 3D bergaya blok di /blox/ (index.html, main.ts, src/: game3d, world3d, avatar3d, movement, textures)
prototype/geotrails.html   prototipe awal — acuan tampilan & perilaku
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

## Mode guru
- Dibuka dari tombol "Mode guru" di layar mulai atau di Log, dijaga PIN lokal 4–8 angka (disimpan sebagai hash). PIN hanya penghalang ringan, bukan pengaman.
- Tab: Kunci jawaban, Foto pos, Isi pos (edit + ekspor/impor JSON), Rekap kelas (gabungan log CSV, tidak disimpan), Pengaturan (mode demo, hapus progres, ganti PIN).
- Posisi pos di peta selalu mengikuti pos bawaan. Isi pos buatan guru divalidasi (`logic/trail.ts`) sebelum dipakai.

## GeoTrails Peta (peta buatan guru)
- Peta "Basic" dibuat saat dimuat dari `src/data/map.ts` dan `src/data/posts.ts` (hanya dibaca). Basic tidak bisa diedit; guru menduplikatnya. Tes memastikan petak yang bisa dilalui dan kunci jawabannya sama persis dengan aslinya.
- Satu peta = JSON (`MapDef`): petak (rumput, paving, lapangan, paving teduh, taman, kolam), gedung (nama, warna, lantai), objek (pohon, tiang bendera, tandon, pot, ramp, papan), titik mulai, dan 1–12 pos dengan isi dan kunci jawaban masing-masing. Pos 0 tetap pos pembuka (gerbang, petunjuk gratis).
- Siswa hanya melihat peta yang ditampilkan guru dan lolos pemeriksaan (`peta/src/validate.ts`): ukuran 12–60 × 10–40, gedung tidak bertumpuk, titik mulai bisa dilalui, setiap pos bisa dicapai dari titik mulai, isi pos sesuai aturan yang sama dengan Mode guru.
- Versi 3D (`peta/3d.html`) selalu dibangun dari data peta yang sama dengan 2D.
- Kelas online: guru membuat kelas (kode 6 karakter) dan menerbitkan peta beserta fotonya; siswa memasukkan kode kelas untuk memuat peta itu. Peta kelas disimpan di laptop siswa agar tetap bisa dipakai offline. Model data: `classes/{kode}`, `classes/{kode}/maps/{idPeta}`, `.../photos/{uidPos}`.

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
- `npm run test:rules`: tes aturan keamanan Firestore (menjalankan emulator)
- `npm run e2e:cloud`: tes kelas online Peta di emulator (guru menerbitkan, siswa memuat)
- `npm run e2e`: Playwright. Di laptop baru jalankan dulu `npx playwright install chromium`. Tes 3D (Blox dan Peta 3D) berjalan di proyek `blox` dengan WebGL perangkat lunak.
