# Image Buttons Library + Theme Export with Images — Design

Tanggal: 2026-10-02 · Status: menunggu review user
(Menggantikan versi awal "Link Override + Theme Templates". Template link dibatalkan; override per link ditunda, lihat bagian "Ditunda".)

## Masalah
Link dengan card style Image menyimpan gambarnya di `links.thumbnailPath`. Link bukan bagian theme, jadi **export theme tidak membawa gambar itu**. Export juga tidak membawa `backgroundImage` dan `customFontUrl` (cuma path `/uploads/...` yang tidak berlaku di instance lain).

## Tujuan
1. **Library Image Button** (milik user): kumpulan gambar berlabel yang bisa dipakai ulang oleh banyak link.
2. Link card style Image **mereferensi** image button. Ganti gambar di library, semua link yang memakainya ikut berubah.
3. **Export/import theme membawa gambar** (image button yang dipilih user, background, custom font).

Di luar cakupan: template link, override typography/button per link, export `.zip`, preview contoh link.

## 1. Data

Tabel baru `image_buttons`:
| kolom | tipe |
|---|---|
| id | integer PK autoincrement |
| user_id | integer FK users, ON DELETE cascade |
| label | text not null |
| path | text not null (relatif ke `/uploads`, WebP) |
| created_at | integer timestamp default `unixepoch()` |

Kolom baru `links.image_button_id` (integer, nullable, FK `image_buttons.id` ON DELETE set null). Aturan gambar efektif sebuah link: `imageButtonId` terisi → pakai `image_buttons.path`; kalau tidak → `thumbnailPath` (link lama). Satu migration, jalan otomatis di entrypoint.

**Migrasi data.** Migration (atau langkah startup yang idempoten) memindahkan link `displayStyle = 'image'` yang punya `thumbnailPath` ke library: buat satu `image_buttons` per link (label = judul link, `path` = `thumbnailPath` yang sama), isi `image_button_id`, kosongkan `thumbnailPath`. File tidak disalin. Diuji pada salinan DB sebelum dirilis.

## 2. Library UI (Customize Theme, tab "Image Buttons")
- Datanya milik user (global), tab-nya ada di Customize Theme. Alasannya: ganti theme tidak boleh membuat link kehilangan gambar.
- Grid kartu: thumbnail, label, badge "dipakai di N link".
- Tambah: upload + crop (memakai `HeightCropFileInput` yang sudah ada) **atau** placeholder solid (warna + lebar × tinggi px, digenerate server pakai `sharp`, tanpa upload). Label wajib.
- Edit: ganti gambar / crop ulang, rename. Ganti gambar menulis file baru lalu menghapus file lama (setelah `path` di DB diperbarui), semua link ikut berubah.
- Hapus: diblokir kalau `N > 0` dengan pesan "dipakai di N link"; kalau tidak dipakai, hapus row + file.
- Gaya mengikuti modal dan komponen yang ada (font, warna, bentuk tombol, `Switch` untuk toggle).

## 3. Pakai di link
- Add/Edit link → Card style → Image: grid image button (thumbnail + label). Pilih satu → `imageButtonId` terisi.
- Upload manual tetap ada, tapi wajib isi label, dan hasilnya otomatis jadi row `image_buttons` baru yang langsung dipilih. Tidak ada lagi gambar yatim di link.
- Link lama yang sudah dimigrasi tampil sebagai image button yang terpilih; bisa diganti ke yang lain.
- Render (`LinkCard`, `getBoardData`, `getPublicBoardData`, route `/r/[linkId]`) meresolve path gambar lewat join ke `image_buttons`.

## 4. Export/import dengan gambar

**Format v2.** `{ "kitablink_theme": 2, "tokens": {...}, "imageButtons": [{ "label", "file": "<key>" }], "assets": { "<key>": "data:<mime>;base64,..." } }`. Aset berasal dari: image button yang dipilih, `backgroundImage`, `customFontUrl`.

**Dialog export (server action `exportThemeAction`).** Sebelum mengunduh, dialog menampilkan semua image button milik user sebagai baris: thumbnail, label, dan `Switch` pill (sama dengan yang dipakai di modal link).
- Penanda **"Dipakai di theme ini"** muncul pada image button yang dipakai oleh link di page mana pun yang saat ini memakai theme tersebut (`links.image_button_id` join `pages.theme_id`).
- Default: `Switch` menyala untuk yang dipakai di theme ini, mati untuk yang lain.
- Hanya yang menyala ikut ke file export. Background dan custom font theme selalu ikut kalau ada.
- Path yang file-nya tidak ditemukan dilewati, export tidak gagal.

**Import (`importThemeAction`).** Mendeteksi v2. Tiap aset di-decode lalu ditulis ulang: gambar lewat `processImage()` (jadi WebP), font lewat util font upload yang ada. Image button yang masuk dibuat sebagai row baru di library penerima (label sama; duplikat label dipisahkan dengan akhiran angka). Path di tokens diganti ke path baru. Format lama (tokens polos) tetap diterima. Batas ukuran file (usulan 15 MB), batas jumlah aset, dan whitelist mime (gambar + font).

## Test (node:test)
- Resolusi gambar efektif link (imageButtonId vs thumbnailPath).
- Penandaan "dipakai di theme ini" (query).
- Hapus image button ditolak saat dipakai.
- Round-trip export→import (tokens + aset, termasuk label).
- Penolakan mime/ukuran tidak valid.
- Migrasi data link lama pada DB uji.

## Urutan kerja (commit dipisah per concern)
1. Schema + migration + migrasi data + test.
2. Resolusi gambar efektif di board data, `LinkCard`, route redirect.
3. Tab library di Customize Theme (tambah/edit/hapus, placeholder solid).
4. Picker di modal link + upload berlabel.
5. Export/import v2 + dialog `Switch` + test.

## Ditunda
- Override typography/button per link.
- Salin image button antar-user (sharing hanya lewat export/import).
