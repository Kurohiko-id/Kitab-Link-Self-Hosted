# Override Gaya per Link + Live Preview — Design

Tanggal: 2026-10-02 · Status: menunggu review user
Melanjutkan bagian "Ditunda" di `2026-10-02-link-override-and-theme-templates-design.md` (Image Buttons Library). Dibangun di atas branch `image-buttons-library` (modal link yang sama).

## Masalah
Semua gaya tombol (font, surface, radius, border, shadow, warna, hover, alignment) dikontrol theme di level page. Satu link tidak bisa tampil beda tanpa bikin theme baru untuk seluruh page.

## Tujuan
1. Satu link bisa meng-override sebagian gaya theme, dikelompokkan jadi 4 kelompok yang masing-masing bisa dinyalakan sendiri. Kelompok yang tidak dinyalakan tetap mengikuti theme (termasuk kalau theme diubah).
2. Perubahan di modal terlihat **langsung** di preview HP dashboard tanpa menekan Save.
3. Link tanpa override: output identik dengan sekarang.

Di luar cakupan: live preview untuk deskripsi/icon/gambar, live preview di layar < `lg` (preview rail memang disembunyikan di sana), override font upload per link, preset/template override, refactor `theme-editor.tsx`, perubahan REST API v1.

## 1. Data
Kolom baru `links.style_override_json` (text, nullable). `null` = ikut theme sepenuhnya. Isinya objek datar dengan key whitelist:

| Kelompok | Key |
|---|---|
| typography | `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing` |
| shape | `buttonSurface`, `buttonBorderRadius`, `buttonBorderWidth`, `buttonShadow` |
| color | `buttonText`, `cardBackground`, `cardBorder` |
| behavior | `buttonHover`, `pageEntrance`, `buttonAlign`, `linkIconPosition` |

Sebuah kelompok **nyala** kalau semua key-nya ada. Saat toggle dinyalakan, nilainya disalin dari theme saat itu (titik awal), lalu bisa diubah. Dimatikan = key kelompok itu dihapus. `fontFamily: "custom"` memakai `customFontUrl` milik theme (font upload tidak per link). Satu migration, jalan otomatis di entrypoint; link lama otomatis `null`.

## 2. Validasi (`lib/link-style.ts`, pure)
- `LINK_STYLE_GROUPS`: konstanta kelompok → key (satu sumber untuk UI, sanitize, dan resolve).
- `sanitizeLinkOverride(raw: unknown): Partial<ThemeTokens> | null`: parse JSON bila string; buang key di luar whitelist; nilai divalidasi/di-clamp lewat `parseThemeTokens` yang sudah ada (enum tak valid dan angka ngawur dibuang, bukan di-throw); hasil kosong → `null`. Kelompok setengah terisi tetap dipertahankan apa adanya (UI menganggapnya "tidak nyala").
- Dipanggil di `saveLinkAction`, di import backup, dan di draft live preview, jadi satu aturan untuk semua jalur.
- `resolveLinkTheme(theme, override): ThemeTokens` = `{ ...theme, ...override }`; `override` kosong mengembalikan objek `theme` yang sama (tanpa alokasi).

## 3. Render
- `board.ts`: `BoardLink.styleOverride` dan `PublicLink.styleOverride` (`Partial<ThemeTokens> | null`), diparse sekali lewat `sanitizeLinkOverride`. Route `/r/[linkId]` memakai `PublicLink` mentah hanya untuk href, tidak perlu menyuplai gambar/gaya; cukup `styleOverride: null`.
- `LinkCard` baris pertama: `const t = resolveLinkTheme(theme, link.styleOverride)`, lalu semua getter yang ada (`getCardStyle`, `getButtonHoverClass`, `getEntranceClass`, alignment, posisi icon) memakai `t`. Anak (accordion, countdown, discord widget) otomatis ikut.
- Verifikasi saat implementasi: apakah typography (font/size/weight/spacing) sudah dipasang di elemen kartu oleh `getCardStyle`. Kalau masih diwarisi dari container halaman, tambahkan di `getCardStyle` hanya bila nilainya berbeda dari container (supaya link tanpa override tidak berubah).
- Font curated selalu tersedia (variable CSS dimuat global di `lib/fonts.ts`), jadi override font tidak butuh loading tambahan.

**Prioritas.** Override per link menang atas theme. Field card style Image yang sudah ada (`imageHideBorder`, `imageRadius`, `imageShadow`) tetap menang atas override untuk border/radius/shadow karena lebih spesifik. Featured tetap menambah ring di atas hasil akhir.

## 4. UI modal (`link-style-override.tsx`, komponen baru mandiri)
Section collapsible "Gaya khusus link ini" di bawah Card style, ditampilkan untuk semua style kecuali `icon` (baris sosmed). Empat baris, tiap baris `Switch` + kontrol ringkas bila nyala: `SelectField`/`Input number`/color picker, memakai label i18n `t.theme.*` yang sudah ada plus judul kelompok baru. String baru di `id` dan `en`. Tidak ada refactor `theme-editor.tsx`.

Form mengirim satu field hidden `styleOverride` (JSON). `saveLinkAction` menyanitasi lalu menyimpan (`null` bila kosong).

## 5. Live preview
- `LinkFormModal` dapat prop `onDraftChange(draft | null)` dengan `draft = { linkId: number | null, groupId: number | null, title, displayStyle, styleOverride }`. `Board` menyimpannya di state.
- `applyDraftToBoard(board: PublicBoardData, draft): PublicBoardData` (pure, `lib/link-style.ts` atau `lib/board-draft.ts`): **edit** → mem-patch link ber-id itu (judul, style, override); **create** → menambah satu link sementara di grup tujuan (judul dari modal, fallback "New link"); draft `null` → board apa adanya. `livePreviewBoard` di `Board` dibungkus fungsi ini.
- Draft disanitasi dengan fungsi yang sama sebelum masuk preview (input setengah ngetik tidak boleh membuat preview error).
- Update draft di-debounce ±80 ms supaya geser color picker/slider tidak merender ulang seluruh `Board` tiap piksel. Modal ditutup (Cancel/Save/Esc) → draft di-reset ke `null`.
- **Overlay.** `components/ui/dialog.tsx` dapat prop opsional `overlayClassName` dan `contentClassName` (kompatibel; dialog lain tidak berubah). Pada layar ≥ `lg`, modal link memakai overlay yang berhenti di tepi rail preview (`right: 510px`, tanpa blur) dan konten dipusatkan di area sisa, sehingga preview terlihat penuh dan tajam selama modal terbuka. Di < `lg` perilaku modal tidak berubah.

## 6. Backup
`BoardLink.styleOverride` ikut export backup page (JSON murni, tanpa id). Import menyanitasi lewat `sanitizeLinkOverride`. Tidak ikut export theme (link bukan bagian theme).

## Test (node:test)
- `sanitizeLinkOverride`: key asing dibuang; enum/angka ngawur dibuang; JSON rusak/null/array → `null`; kelompok setengah terisi dipertahankan; semua key whitelist lolos bila valid.
- `resolveLinkTheme`: override menimpa, `null` mengembalikan theme yang sama, key non-override tidak berubah.
- `board.ts`: round-trip kolom → `styleOverride` terparse; link lama (`null`) → `null`.
- `applyDraftToBoard`: edit mem-patch link yang benar saja; create menambah di grup yang benar dan di ungrouped bila `groupId` null; draft `null` → identik.
- Backup: export menyertakan, import menyanitasi nilai berbahaya.
- Migrasi: `0037` menambah kolom, row lama `null`.
- Manual (user, localhost): toggle tiap kelompok dan lihat preview berubah tanpa Save; Cancel mengembalikan preview; Save bertahan setelah refresh; link tanpa override tak berubah; card style Image tetap menghormati toggle border/radius/shadow lamanya.

## Urutan kerja (commit dipisah per concern)
1. Schema + migration + `lib/link-style.ts` (sanitize/resolve) + test.
2. `board.ts` field `styleOverride`, `LinkCard` memakai `resolveLinkTheme`, route redirect, backup + test.
3. `applyDraftToBoard` + test, prop `overlayClassName`/`contentClassName` di dialog, wiring draft di `Board`.
4. `link-style-override.tsx` di modal + `saveLinkAction` + i18n.

## Ditunda
- Live preview untuk deskripsi/icon/gambar dan di layar < `lg`.
- Override font upload per link, preset override, API v1.
