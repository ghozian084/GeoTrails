# GeoTrails

Math Trail virtual untuk siswa Grade 9 (IGCSE 0607). Kelompok 3–4 siswa memakai 1 laptop dan menjelajahi denah sekolah 2D ala Gather.town. Setiap pos berisi foto atau panorama objek nyata dan soal pemodelan. GeoTrails dipakai sebagai pemanasan sebelum trail fisik di lapangan.

Pemilik: Muhammad Ghozian Kafi Ahsan, M.Pd (guru Matematika, Semesta Bilingual Boarding School, Semarang).

## Aturan tetap
- Semua UI dan teks untuk siswa ditulis dalam Bahasa Indonesia. Kode dan komentar boleh berbahasa Inggris.
- Tanpa login dan tanpa backend. Semua data hanya tersimpan di browser laptop yang dipakai, tidak dikirim ke mana pun.
  - localStorage: progres kelompok (`geotrails.v1`), pengaturan guru (`geotrails.guru`), isi pos buatan guru (`geotrails.trail`).
  - IndexedDB (`geotrails`, store `photos`): foto pos unggahan guru.
- Tidak boleh mengumpulkan data pribadi (UU PDP). Identitas kelompok hanya nama kelompok dan warna avatar. Selain itu yang disimpan hanya isi pelajaran: jawaban, lembar kerja, hasil ukur fisik, refleksi, foto objek, dan isi pos. Setiap kotak teks bebas untuk siswa wajib memuat pengingat "Jangan menulis data pribadi." Tidak ada analytics atau pelacak.
- Aplikasi harus tetap berjalan offline setelah dibuka sekali. Jangan memakai CDN saat runtime. Font dan aset di-bundle.
- **Jangan mengubah angka kunci jawaban di `src/data/posts.ts`** tanpa izin eksplisit. Setiap perubahan pada data pos harus lolos `npm test`. Isi pos yang diubah guru lewat Mode guru disimpan terpisah di localStorage dan tidak menyentuh `posts.ts`.
- Progres yang tersimpan dari versi lama harus tetap bisa dilanjutkan. Bila menambah kolom pada state, isi nilai bawaannya di `normalize()` (`src/store.ts`).
- Kerjakan perubahan kecil dan bertahap. Satu fitur, lalu uji, lalu commit.

## Stack
- Vite + TypeScript, tanpa framework. Peta digambar di `<canvas>`, sedangkan UI memakai DOM biasa.
- Vitest untuk logika: parsing angka, penilaian, skor, kalkulator, CSV, rekap, validasi isi pos, sprite. Playwright untuk alur end-to-end siswa dan guru (`e2e/`), dijalankan terhadap build produksi lewat `vite preview`. Tes e2e juga memastikan tidak ada permintaan ke internet saat aplikasi dipakai.
- `npm run build` menghasilkan `dist/` untuk deploy ke subdomain alhazed.my.id.
- `npm run build:single` menghasilkan satu file HTML offline di `dist-single/index.html` dengan vite-plugin-singlefile.

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
  ui/                  layar mulai, modal pos, panorama, kalkulator, foto, log, layar selesai
    teacher/           Mode guru: kunci jawaban, foto pos, isi pos, rekap kelas, pengaturan
tests/                 Vitest
e2e/                   Playwright (siswa.spec.ts, guru.spec.ts, helpers.ts)
public/posts/          foto & panorama per pos (pos-<id>.jpg), opsional
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
- **Foto pos**: urutan prioritas unggahan guru (IndexedDB) → `public/posts/pos-<id>.jpg` → ilustrasi bawaan. Foto dengan rasio ≥ 2,5 : 1 tampil sebagai panorama.

## Mode guru
- Dibuka dari tombol "Mode guru" di layar mulai atau di Log, dijaga PIN lokal 4–8 angka (disimpan sebagai hash). PIN hanya penghalang ringan, bukan pengaman.
- Tab: Kunci jawaban, Foto pos, Isi pos (edit + ekspor/impor JSON), Rekap kelas (gabungan log CSV, tidak disimpan), Pengaturan (mode demo, hapus progres, ganti PIN).
- Posisi pos di peta selalu mengikuti pos bawaan. Isi pos buatan guru divalidasi (`logic/trail.ts`) sebelum dipakai.

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
- `npm run e2e`: Playwright. Di laptop baru jalankan dulu `npx playwright install chromium`.
