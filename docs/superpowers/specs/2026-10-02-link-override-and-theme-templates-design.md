# Link Override Appearance + Theme Templates — Design

Tanggal: 2026-10-02 · Status: menunggu review user

## Tujuan
1. Tiap link bisa menimpa (override) sebagian tampilan dari theme (typography + button), misalnya tombol rata kiri dengan icon mentok kiri padahal theme-nya center.
2. Konfigurasi sebuah link bisa disimpan sebagai **template** yang hidup di dalam **theme**, lalu dipakai lagi lewat Add link > Link type > Template.
3. Export/import theme ikut membawa template **dan semua gambarnya** (background, custom font, thumbnail template) sehingga bisa dibagikan ke instance lain.

Di luar cakupan: override warna/background, override per grup, menu sidebar khusus template, export `.zip`.

## 1. Override per link

**Data.** Kolom baru `links.override_json` (text, nullable, default null). Isinya objek sparse, hanya key yang diubah. Key yang boleh (whitelist, divalidasi Zod, key lain dibuang):
- Typography: `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `customFontUrl`
- Button: `buttonSurface`, `buttonBorderRadius`, `buttonBorderWidth`, `buttonShadow`, `buttonHover`, `buttonAlign`, `linkIconPosition`

**Render.** Fungsi pure `applyLinkOverride(theme, overrideJson): ThemeTokens` di `lib/link-override.ts` (`{ ...theme, ...parsedOverride }`, override tidak valid diabaikan). `LinkCard` memanggilnya sekali di awal lalu memakai hasilnya menggantikan `theme`. Tidak ada jalur render baru. Preview HP di dashboard dan halaman publik memakai `LinkCard` yang sama.

**UI.** Di `link-form-modal.tsx`, section collapsible "Override customization" dengan dua sub-grup Typography dan Button. Field dan opsinya memakai ulang komponen dari `theme-editor.tsx` (diekstrak ke komponen bersama kalau belum reusable, tanpa mengubah perilaku editor theme). Tiap field punya toggle "ikut theme" / nilai sendiri. Ada tombol "Reset override". Gaya visual mengikuti modal yang ada (font, warna, bentuk tombol).

## 2. Template di dalam theme

**Data.** `ThemeTokens` dapat field `templates: LinkTemplate[]` (default `[]`).
```
LinkTemplate = { id: string(uuid), name: string, config: LinkConfig }
LinkConfig   = snapshot field link: title, url, description, linkType, displayStyle,
               thumbnailPath, image*, icon, featured, utm*, override
               (TANPA: pageId, groupId, orderIndex, schedule*, isActive, statistik)
```
`parseThemeTokens` harus menormalkan `templates` (buang entri rusak). Karena ada di tokens, duplicate/switch/delete theme otomatis benar.

**Titik rawan.** `buildThemeTokensFromForm` dan `saveThemeAction` membangun tokens dari form editor. Keduanya WAJIB mempertahankan `templates` dari tokens yang tersimpan (bukan reset ke `[]`). Ada test untuk ini.

**Simpan.** Tombol "Save as template" di footer modal link (dekat Favorite/Cancel/Save), minta nama, lalu server action `saveLinkTemplateAction(themeId, name, config)`. Thumbnail/`imageContentPath` disalin ke file baru (lewat util upload yang ada) supaya template tidak rusak kalau link asli dihapus.

**Pakai.** Add link > Link type > "Template": picker menampilkan template dari theme aktif page tersebut. Pilih satu, form terisi semua field, tetap bisa diedit sebelum disimpan. Gambar disalin lagi ke file baru untuk link yang dibuat.

**Kelola.** Rename dan hapus (dengan konfirmasi) langsung di kartu picker. Hapus template tidak menghapus file gambarnya kalau masih dipakai link lain; file milik template saja yang dibersihkan.

## 3. Export/import dengan gambar

Sekarang export cuma `JSON.stringify(tokens)` di client dan gambar hanya berupa path `/uploads/...`, jadi tidak ikut (keterbatasan yang sudah ada).

**Format baru.** `{ "kitablink_theme": 2, "tokens": {...}, "assets": { "<path>": "data:<mime>;base64,..." } }`. Aset dikumpulkan dari: `backgroundImage`, `customFontUrl`, `templates[].config.thumbnailPath`, `templates[].config.imageContentPath`.

**Export.** Server action `exportThemeAction(themeId)` membaca file dari `/uploads`, meng-embed base64, lalu client mengunduh JSON. Path yang tidak ditemukan dilewati (tidak membuat export gagal).

**Import.** `importThemeAction` mendeteksi format v2. Tiap aset di-decode lalu ditulis ulang: gambar lewat `processImage()` (jadi WebP), font lewat util font upload yang ada. Path di tokens/templates diganti dengan path baru. Format lama (tokens polos) tetap diterima. Batas ukuran file import (usulan 15 MB), batas jumlah aset, dan whitelist mime (gambar + font) untuk mencegah file sembarang.

## Perubahan DB
Satu migration: `ALTER TABLE links ADD override_json text`. Tidak ada tabel baru. Jalan otomatis di entrypoint.

## i18n & test
- String baru ID/EN di `lib/i18n.ts`.
- Test (node:test): `applyLinkOverride` (merge, key tidak valid, JSON rusak), normalisasi `templates` di `parseThemeTokens`, `saveThemeAction` tidak menghapus templates, round-trip export→import (tokens + aset), penolakan mime/ukuran tidak valid.

## Urutan kerja (commit dipisah per concern)
1. Migration + `lib/link-override.ts` + test.
2. Render di `LinkCard` + section override di modal.
3. `templates` di tokens + preservasi saat save theme + test.
4. Save as template + picker (pakai, rename, hapus).
5. Export/import v2 dengan aset + test.

## Catatan
- Perubahan #6 (image card overlay) yang belum di-commit tidak disentuh; commit #6 dulu supaya migration 0033-0035 tidak tercampur.
- Ganti theme berarti daftar template ikut berganti (by design). "Copy template ke theme lain" bisa ditambah nanti kalau perlu.
