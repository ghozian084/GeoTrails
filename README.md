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
