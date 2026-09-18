# Kitab Link

Self-hosted link-in-bio — alternatif Linktree tanpa iklan, tanpa biaya bulanan, dan datanya 100% punya kamu sendiri. Deploy 1 command lewat Docker, semua konfigurasi diatur dari dashboard (bukan file `.env`).

## Fitur

- **Multi-page dalam 1 akun** — kelola banyak halaman link (`/main`, `/side-project`, dst), masing-masing independen (link, tema, analytics sendiri-sendiri).
- **Drag & drop link + grup** — susun ulang link dan grup langsung dari dashboard, lengkap dengan show/hide manual.
- **Tema fleksibel** — preset siap pakai, editor penuh (warna, font, tombol, background animasi), plus export/import JSON dan library tema per akun.
- **Tipe link lengkap** — URL biasa, WhatsApp (auto-format nomor), email, telepon, file upload, embed, accordion, dan crop gambar built-in buat avatar/thumbnail.
- **Analytics** — views & klik per link/page, breakdown referrer, device, dan negara.
- **Automation** — jadwal show/hide grup mingguan, badge "sedang live" otomatis (deteksi YouTube tanpa API key), auto-post dari RSS/Atom feed.
- **Keamanan** — password-protect per page, kode akses sementara, 2FA (TOTP), API token + webhook buat integrasi eksternal.
- **Backup & restore** — export/import link+grup (beserta icon) jadi file JSON.
- **Log aktivitas** — riwayat perubahan link, grup, dan tema per page.
- **SEO & branding** — custom OG image, favicon, custom CSS, privacy policy halaman sendiri, watermark yang bisa dimatiin.
- **i18n** — dashboard & login mendukung Bahasa Indonesia dan English.

## Quick Start (Docker)

Cara tercepat, pakai image yang udah di-build (dari GHCR):

```bash
curl -O https://raw.githubusercontent.com/Kurohiko-id/Kitab-Link-Self-Hosted/main/docker-compose.yml
docker compose up -d
```

Migration database jalan otomatis pas container start. Buka `http://localhost:3000/setup` buat bikin akun admin pertama.

**Update ke versi terbaru:**

```bash
docker compose pull && docker compose up -d
```

**Lupa password?**

Aplikasi ini gak pakai email/SMTP (single-user self-hosted, sengaja tanpa infra tambahan), jadi reset password dilakuin lewat log container, bukan lewat email:

1. Buka `/login/forgot-password`, masukin email akun kamu.
2. Cek log container buat lihat token reset-nya (berlaku 15 menit):
   ```bash
   docker logs <nama-container>
   ```
   Cari baris `Password reset token buat ...`.
3. Buka `/login/reset-password`, masukin email, token, dan password baru.

## Tech Stack

- **Framework:** Next.js (App Router, React Server Components)
- **Database:** SQLite (better-sqlite3, WAL mode) + Drizzle ORM — satu file, gak butuh Postgres/MySQL terpisah
- **Auth:** Cookie-based session (HMAC), argon2 untuk hash password, TOTP untuk 2FA
- **UI:** Tailwind CSS + shadcn/ui
- **Drag & drop:** dnd-kit
- **Image processing:** sharp (semua upload otomatis dikonversi ke WebP)
- **Scheduler:** node-cron (in-process, gak perlu service terpisah)

## Development

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Migration jalan otomatis lewat Drizzle saat pertama kali start; kalau perlu manual:

```bash
npx drizzle-kit generate   # setelah ubah schema
npx drizzle-kit migrate
```

## License

[MIT](./LICENSE) — bebas dipakai, dimodifikasi, dan di-deploy ulang.

## Credits

Dibuat oleh **[Kurohiko](https://github.com/Kurohiko-id)**. Kalau project ini kepake dan pengen support, boleh mampir ke [Saweria](https://saweria.co/Kurohiko).
