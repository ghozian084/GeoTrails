# Wishlist GeoTrails

Ide fitur berikutnya, urut dari yang paling bermanfaat. Centang bila sudah selesai.

## Prioritas tinggi
- [ ] **Mode offline sungguhan (PWA)**: service worker agar aplikasi pasti jalan tanpa internet setelah dibuka sekali, dan bisa dipasang seperti aplikasi.
- [ ] **Hasil kelompok terkirim ke guru**: poin, status per pos, jumlah percobaan/petunjuk; rekap kelas otomatis dan unduh CSV.
- [ ] **QR code untuk trail fisik**: kartu QR per pos untuk ditempel di objek nyata; siswa memindai di lapangan dan mengisi hasil ukur fisik.
- [ ] **Bahasa Inggris**: tombol ID/EN untuk antarmuka dan soal dua bahasa.
- [ ] **Tes otomatis di GitHub** di setiap PR.

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
- [ ] Kendali kelas langsung: mulai serentak, kirim pesan/petunjuk ke semua kelompok, buka/kunci pos, hentikan sesi.
- [ ] Analisis kesalahan: pos yang paling sering salah dan kesalahan umum yang paling sering muncul.
- [ ] Bank soal: salin pos antar peta atau dari peta publik.
- [ ] Cetak lembar kerja (PDF) untuk trail fisik.
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
