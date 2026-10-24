# GeoTrails

Math Trail virtual untuk siswa Grade 9 (IGCSE 0607). Kelompok 3–4 siswa memakai 1 laptop dan menjelajahi denah sekolah 2D ala Gather.town. Setiap pos berisi foto atau panorama objek nyata dan soal pemodelan. GeoTrails dipakai sebagai pemanasan sebelum trail fisik di lapangan.

Pemilik: Muhammad Ghozian Kafi Ahsan, M.Pd (guru Matematika, Semesta Bilingual Boarding School, Semarang).

## Aturan tetap
- Semua UI dan teks untuk siswa ditulis dalam Bahasa Indonesia. Kode dan komentar boleh berbahasa Inggris.
- Tanpa login dan tanpa backend. State disimpan di localStorage, sedangkan gambar unggahan guru di IndexedDB.
- Tidak boleh mengumpulkan data pribadi (UU PDP). Yang disimpan hanya nama kelompok dan warna avatar. Tidak ada analytics atau pelacak.
- Aplikasi harus tetap berjalan offline setelah dibuka sekali. Jangan memakai CDN saat runtime. Font dan aset di-bundle.
- **Jangan mengubah angka kunci jawaban di `src/data/posts.ts`** tanpa izin eksplisit. Setiap perubahan pada data pos harus lolos `npm test`.
- Kerjakan perubahan kecil dan bertahap. Satu fitur, lalu uji, lalu commit.

## Stack
- Vite + TypeScript, tanpa framework. Peta digambar di `<canvas>`, sedangkan UI memakai DOM biasa.
- Vitest untuk logika: parsing angka, penilaian, skor. Playwright untuk alur end-to-end.
- `npm run build` menghasilkan `dist/` untuk deploy ke subdomain alhazed.my.id.
- `npm run build:single` menghasilkan satu file HTML offline dengan vite-plugin-singlefile.

## Struktur
```
src/
  data/map.ts        grid 36×24 tile + bangunan + posisi pos
  data/posts.ts      6 pos bawaan (KUNCI JAWABAN)
  types.ts           Post, PostState, GroupState, Trail
  game/              canvas, kamera, gerak, BFS
  ui/                layar mulai, modal pos, panorama, log, layar selesai
  logic/             parseNumber, grade, score
  store.ts           localStorage / IndexedDB
public/posts/        foto & panorama per pos (pos-<id>.jpg)
prototype/geotrails.html   prototipe awal — acuan tampilan & perilaku
```

## Logika inti (jangan diubah tanpa diskusi)
- **Parsing angka gaya Indonesia**: "12,6" → 12.6; "2.307" → 2307; "2.307,5" → 2307.5
- **Penilaian**
  - Nilai di dalam `green` → hijau.
  - Nilai di dalam `orange` → oranye. Siswa boleh merevisi atau mengunci jawaban.
  - Di luar keduanya → merah.
  - Bila |v − errors[i].v| ≤ errors[i].t, tampilkan pesan kesalahan khusus.
- **Skor**
  - Hijau: 100 − 15 × jumlah petunjuk (minimal 20).
  - Oranye yang dikunci: 60 − 15 × jumlah petunjuk (minimal 10).
  - Pos 0 tidak kena pengurangan petunjuk: 100 atau 60.
- Pos 1–5 terkunci sampai Pos 0 selesai.

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
- Font: Chakra Petch (judul), Atkinson Hyperlegible (teks), JetBrains Mono (angka). Semua di-bundle lokal.
- Mode terang dan gelap mengikuti sistem. Tanpa emoji, tanpa gradien ungu.

## Perintah
- `npm run dev`: server lokal
- `npm test`: Vitest
- `npm run e2e`: Playwright
- `npm run build` / `npm run build:single`
