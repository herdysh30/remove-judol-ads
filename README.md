# 🛡️ Remove Judol Ads

Ekstensi Chrome untuk memblokir iklan judi online (judol) di website Indonesia.

## ✨ Fitur

- **Blokir Link Iklan** — Menghapus elemen `<a>` yang berisi gambar iklan judol
- **Blokir Overlay/Popup** — Menghapus overlay dan popup iklan yang menutupi halaman
- **Blokir Redirect** — Mencegah popup/redirect ke situs judi
- **Element Picker** — Pilih elemen iklan langsung di halaman web (seperti DevTools inspect)
- **Customizable Rules** — Tambah/hapus keyword, TLD, domain, dan shortener

## 🚀 Instalasi

### Dari Source (Developer Mode)

1. Clone repository:
   ```bash
   git clone https://github.com/USERNAME/remove-judol-ads.git
   ```
2. Buka `chrome://extensions/` di Chrome
3. Aktifkan **Developer mode** (toggle di kanan atas)
4. Klik **Load unpacked**
5. Pilih folder `src/` dari repository yang sudah di-clone
6. Ekstensi siap digunakan! 🎉

## 📖 Cara Penggunaan

1. Klik ikon ekstensi di toolbar Chrome
2. Aktifkan/nonaktifkan ekstensi dengan toggle
3. Gunakan **Element Picker** (🎯) untuk memilih elemen iklan langsung di halaman
4. Kelola rules di tab **Keywords**, **TLD**, **Domain IMG**, dan **Shortener**
5. Lihat statistik pemblokiran di popup

## 🏗️ Struktur Proyek

```
remove-judol-ads/
├── src/                    # Source code ekstensi
│   ├── manifest.json       # Manifest V3 Chrome Extension
│   ├── content.js          # Content script (ad removal logic)
│   ├── inject.js           # Injected script (popup/redirect blocker)
│   ├── picker.js           # Element picker functionality
│   ├── popup.html          # Popup UI
│   ├── popup.css           # Popup styling
│   └── popup.js            # Popup logic
├── assets/                 # Ikon & aset visual
├── docs/                   # Dokumentasi tambahan
└── store/                  # Aset untuk Chrome Web Store
```

## 🤝 Kontribusi

1. Fork repository ini
2. Buat branch fitur baru: `git checkout -b feature/nama-fitur`
3. Commit perubahan: `git commit -m "feat: deskripsi fitur"`
4. Push ke branch: `git push origin feature/nama-fitur`
5. Buat Pull Request

### Commit Convention

Gunakan [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | Keterangan                        |
| ----------- | --------------------------------- |
| `feat:`     | Fitur baru                        |
| `fix:`      | Bug fix                           |
| `docs:`     | Perubahan dokumentasi             |
| `style:`    | Formatting, tanpa perubahan logic |
| `refactor:` | Refactoring code                  |
| `chore:`    | Maintenance, update dependencies  |

## 📄 Lisensi

[MIT License](LICENSE) — Bebas digunakan dan dimodifikasi.

## 🙏 Credits

Dibuat untuk membantu pengguna internet Indonesia terbebas dari iklan judi online.
