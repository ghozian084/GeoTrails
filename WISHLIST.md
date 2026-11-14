# Wishlist GeoTrails

Ide fitur berikutnya, urut dari yang paling bermanfaat. Centang bila sudah selesai.

## Prioritas tinggi
- [ ] **Mode offline sungguhan (PWA)**: service worker agar aplikasi pasti jalan tanpa internet setelah dibuka sekali, dan bisa dipasang seperti aplikasi.
- [ ] **Hasil kelompok terkirim ke guru**: poin, status per pos, jumlah percobaan/petunjuk; rekap kelas otomatis dan unduh CSV.
- [ ] **QR code untuk trail fisik**: kartu QR per pos untuk ditempel di objek nyata; siswa memindai di lapangan dan mengisi hasil ukur fisik.
- [ ] **Bahasa Inggris**: tombol ID/EN untuk antarmuka dan soal dua bahasa.
- [x] **Tes otomatis di GitHub** di setiap PR (CI), plus pemasangan aturan Firebase otomatis.

## Jelajah berbentuk peta (ala MathCityMap)
- [ ] **Layar Jelajah berupa peta dunia sungguhan** dengan pin trail di lokasi nyata. Pin dibuka → kartu trail (nama, tempat, jumlah pos, denah mini) → **Main RPG 2D** atau **Main Blox 3D**.
  - Pin hijau = publik, kuning = kelas yang diikuti, abu-abu = tersimpan di perangkat; peta Basic jadi pin pertama di Semesta BBS Semarang.
  - Daftar biasa tetap ada di bawah peta sebagai cadangan (HP lambat, offline).
  - Sumber peta (perlu diputuskan): A. OpenStreetMap saat online, daftar saat offline (disarankan; perlu pengecualian aturan "tanpa CDN" khusus layar Jelajah dan atribusi OSM), B. peta sederhana bawaan (offline penuh, kurang detail), C. peta berbayar/berkunci.
  - Privasi: pin hanya di tempat umum (sekolah, taman); lokasi siswa untuk "Dekat saya" tidak disimpan dan tidak dikirim.
  - Tahapan:
    - [ ] 1. Data lokasi peta (lat, lng, nama tempat), isian pin di editor, aturan keamanan untuk kolom baru.
    - [ ] 2. Layar Jelajah: peta + pin + kartu trail; "Jelajahi peta publik" dan daftar peta pindah ke sini.
    - [ ] 3. Tombol "Dekat saya", lalu titik nyata per pos sebagai jembatan ke trail fisik (GPS/QR).

## Dunia bersama ala Roblox
- [ ] **Server dunia terbuka**: siswa dari kelas dan sekolah mana pun masuk ke dunia 3D yang sama dan saling berinteraksi secara realtime, tidak hanya melihat avatar.
  - Bergerak bersama dan bertabrakan (tidak saling tembus), animasi lompat terlihat oleh semua.
  - Ekspresi atau isyarat aman (lambaian, tepuk tangan, "ikuti aku") dari daftar tetap, bukan obrolan bebas, agar aman untuk anak.
  - Tim lintas kelompok: menyelesaikan pos bersama, papan skor tim.
  - Beberapa "server" per dunia dengan batas jumlah pemain, seperti Roblox.
  - Perlu: batas koneksi dan biaya Realtime Database, moderasi, aturan UU PDP (tanpa data pribadi, tanpa obrolan bebas).
- [x] Dasar sudah ada: mode bersama per kelas (avatar kelompok lain dan papan skor langsung, 2D dan 3D).

## Untuk guru
- [ ] Denah sekolah (foto) sebagai latar di editor grid untuk dijiplak.
- [x] Kendali kelas langsung: tahan dan mulai serentak, kirim pesan ke semua kelompok, buka/kunci pos (hentikan sesi = "Hapus data sesi").
- [ ] Analisis kesalahan: pos yang paling sering salah dan kesalahan umum yang paling sering muncul.
- Gambar soal dengan label ukuran (seperti ilustrasi Basic):
  - [x] Tahap 2 (dikerjakan dulu): ilustrasi template, 8 objek; guru mengisi nama, angka, dan satuan label.
  - [x] Tahap 1: label bebas di atas foto (tambah label, ketik nama/angka/satuan, seret label dan titik penunjuknya); tampil untuk siswa, di panorama, dan di lembar kerja.
- [ ] Bank soal: salin pos antar peta atau dari peta publik.
- [x] Cetak lembar kerja (PDF) untuk trail fisik: denah bernomor, tiap pos dengan foto, tabel hasil ukur, ruang perhitungan; kunci jawaban opsional untuk guru.
- [x] Peta guru tersimpan online di akun Google.
- [x] Peta pribadi (lewat kode kelas) atau publik (setelah disetujui admin).

## Untuk siswa
- [ ] Jenis soal lain: pilihan ganda, jawaban dua angka, cek satuan.
- [ ] Mode lomba dengan waktu dan papan peringkat di proyektor.
- [ ] Aksesibilitas: soal dibacakan, ukuran huruf bisa diperbesar.
- [ ] Lencana dan pencapaian.

## Teknis dan keamanan
- [ ] Pembersihan data sesi terjadwal (fungsi terjadwal Firebase).
- [ ] Firebase App Check agar database hanya dipakai dari situs GeoTrails.
- [ ] Domain `geotrails.alhazed.my.id` diarahkan ke Vercel.
