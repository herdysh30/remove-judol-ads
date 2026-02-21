# Changelog

Semua perubahan penting pada proyek ini didokumentasikan di file ini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/),
dan proyek ini menggunakan [Semantic Versioning](https://semver.org/lang/id/).

## [2.2.0] - 2026-02-22

### Added

- **Anti Pindah Tab** — Fitur baru untuk mencegah tab berpindah ke situs judi
  - Mode Normal: blokir tab baru hanya jika URL masuk blocklist judol
  - Mode Agresif: blokir semua tab baru dari script (kecuali whitelist)
  - Toggle dan mode selector di popup UI
- **Background Service Worker** (`background.js`) — Intercept tab baru di level browser API (`chrome.tabs.onCreated`), tidak bisa di-bypass oleh script halaman
- **Proteksi Redirect Tab Sama** — Deteksi navigasi ke situs judol di tab yang sedang aktif via `chrome.webNavigation.onCommitted`, otomatis kembali ke halaman sebelumnya
- **Whitelist Domain Legal** — ~50 domain terpercaya (Google, YouTube, Facebook, Tokopedia, dll) dikecualikan dari pemblokiran mode agresif
- **Keyword baru**: `slot7000`, `papa303`, `dorawin`, `sabangbet`, `setiatoto`, `ketuaslot`, `ketuagacor`, `vitatoto`, `lancar138`, `hokijp168`, `erigo4d`, `gacor`, `maxwin`, `cuan`, `wede`, `jp168`, `toto`, `scatter`, `jackpot`
- **TLD baru**: `.ink`, `.vip`, `.onl`
- **Shortener baru**: `t.ly`, `rebrand.ly`, `cepaturl.com`, `pastibagus.com`, `linkmasuk.vip`, `lae.onl`, `williamcgordon.com`
- **Ad container selectors baru**: `.kln`, `#overplay`, `#shadow`, `.blox.mlb`

### Fixed

- Fix bug daily counter (`judolBlockedToday`) yang menyimpan format salah sehingga reset harian tidak berfungsi
- Fix toggle Anti Pindah Tab yang tidak bisa diklik (HTML structure `<div>` → `<label>`)

### Changed

- Update `manifest.json`: tambah permissions `tabs` dan `webNavigation`, register background service worker
- Bump versi dari 2.1.0 ke 2.2.0

## [2.1.0] - 2026-02-22

### Added

- Element Picker: pilih elemen iklan langsung di halaman web
- Popup UI dengan tab management (Keywords, TLD, Domain IMG, Shortener)
- Statistik pemblokiran harian
- Toggle aktif/nonaktif ekstensi
- Reset ke default settings

### Features

- Blokir link `<a>` yang berisi gambar iklan judol
- Blokir overlay dan popup iklan
- Blokir redirect/popunder ke situs judi
- Filter berdasarkan keyword, TLD, domain gambar, dan URL shortener
- CSS instant-hide sebelum halaman render
- MutationObserver untuk konten dinamis

## [1.0.0] - 2026-02-01

### Added

- Rilis awal
- Blokir iklan judol dasar
