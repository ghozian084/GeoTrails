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

Tanpa langkah di bawah ini, GeoTrails Peta tetap berjalan penuh secara lokal; tombol kelas online saja yang tidak muncul.
Paket gratis Firebase (Spark) cukup: yang dipakai hanya Firestore dan Authentication, tanpa Cloud Storage.

1. Buka https://console.firebase.google.com → **Add project**. Saat ditanya, **matikan Google Analytics**.
2. **Firestore Database** → Create database → mode *production* → lokasi **asia-southeast2 (Jakarta)**.
3. **Authentication** → Get started → Sign-in method → aktifkan **Google**.
   Lalu Settings → **Authorized domains** → tambahkan domain GeoTrails (mis. `geotrails.alhazed.my.id` dan domain `*.vercel.app` bila dipakai).
4. **Project settings** → Your apps → tambah aplikasi **Web** → salin nilai konfigurasinya.
5. Di Vercel: Project → Settings → **Environment Variables**, isi semua variabel di `.env.example` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_APP_ID`), lalu deploy ulang.
6. Pasang aturan keamanan (sekali, dan setiap kali `firebase/firestore.rules` berubah):
   ```
   npx firebase login
   npx firebase deploy --only firestore:rules --project <PROJECT_ID>
   ```

Pengembangan dan tes memakai emulator (butuh Java), tidak menyentuh proyek sungguhan:
```
npm run test:rules   # tes aturan keamanan
npm run e2e:cloud    # guru menerbitkan peta, siswa memuat dengan kode kelas
```

