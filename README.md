<p align="center">
  <img src="public/logo.png" alt="Kitab Link" width="96">
</p>

# Kitab Link

Self-hosted link-in-bio alternative to Linktree — no ads, no monthly fees, and your data stays completely yours. Deploy in 1 command via Docker, configure everything from the dashboard (not via `.env` files).

🌐 [Website](https://kitablink.my.id) • 🚀 [Live Demo](https://kurohiko.id) • 📖 [Docs](https://kitablink.my.id/docs) • ☕ [Support](https://saweria.co/Kurohiko) • 💎 [Top Up](https://kurohikotopup.com)

## Features

- **Multiple pages in 1 account** — manage many link pages (`/main`, `/side-project`, etc.), each independent (links, theme, analytics).
- **Drag & drop links + groups** — reorder links and groups directly from the dashboard, with manual show/hide toggle.
- **Flexible theming** — ready-to-use presets, full editor (colors, fonts, buttons, animated backgrounds), plus JSON export/import and per-account theme library.
- **Complete link types** — regular URLs, WhatsApp (auto-format numbers), email, phone, file uploads, embeds, accordions, and built-in image cropping for avatars/thumbnails.
- **Analytics** — views & clicks per link/page, breakdown by referrer, device, and country.
- **Automation** — weekly scheduled show/hide for groups, automatic "live now" badge (YouTube detection without API key), auto-post from RSS/Atom feeds.
- **Security** — per-page password protection, temporary access codes, 2FA (TOTP), API tokens + webhooks for external integrations.
- **Backup & restore** — export/import links+groups (including icons) as JSON files.
- **Activity log** — change history for links, groups, and themes per page.
- **SEO & branding** — custom OG images, favicon, custom CSS, self-hosted privacy policy page, optional watermarks.
- **i18n** — dashboard & login support Indonesian and English.

## Quick Start (Docker)

Fastest way — use the pre-built image from GHCR:

```bash
curl -O https://raw.githubusercontent.com/Kurohiko-id/Kitab-Link-Self-Hosted/main/docker-compose.yml
docker compose up -d
```

Database migration runs automatically on container start. Open `http://localhost:3000/setup` to create your first admin account.

### Easy Installation Method (recommended)

An interactive installer that handles the whole setup for you:

```bash
curl -fsSL https://raw.githubusercontent.com/Kurohiko-id/Kitab-Link-Self-Hosted/main/install.sh | bash
```

- **Installs Docker automatically** if it isn't already on the server.
- **Installs and configures Caddy automatically** (or hooks into your existing Caddy if you already run other apps/domains on this server) — HTTPS, reverse proxy, everything wired for you.
- Just answers a few quick questions (language, install folder, domain, container name) and takes care of the rest.

Leave the domain question empty if you just want plain `IP:3000` access — no reverse proxy needed in that case.

Full walkthrough with screenshots: [Easy Installation Method](https://kitablink.my.id/docs#easy-install) in the docs.

Want full control instead, or already have other apps/domains on the server? Follow the [Manual Installation](https://kitablink.my.id/docs/manual-install.html) guide in the docs — it walks you through everything step by step, nice and slow. There's also a [video walkthrough on YouTube](https://www.youtube.com/watch?v=8lAqI0KibbU).

**Update to latest version:**

```bash
docker compose pull && docker compose up -d
```

**Forgot password?**

This app doesn't use email/SMTP (single-user self-hosted, intentionally minimal infrastructure), so password reset happens via container logs:

1. Go to `/login/forgot-password` and enter your username.
2. Check the container logs for your reset token (valid for 15 minutes):
   ```bash
   docker logs <container-name>
   ```
   Look for the line `Password reset token buat ...`.
3. Go to `/login/reset-password`, enter your username, token, and new password.

## Tech Stack

- **Framework:** Next.js (App Router, React Server Components)
- **Database:** SQLite (better-sqlite3, WAL mode) + Drizzle ORM — single file, no need for separate Postgres/MySQL
- **Auth:** Cookie-based session (HMAC), argon2 for password hashing, TOTP for 2FA
- **UI:** Tailwind CSS + shadcn/ui
- **Drag & drop:** dnd-kit
- **Image processing:** sharp (all uploads automatically converted to WebP)
- **Scheduler:** node-cron (in-process, no separate service needed)

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Database migration runs automatically on first start via Drizzle; if you need to run it manually:

```bash
npx drizzle-kit generate   # after schema changes
npx drizzle-kit migrate
```

## License

[MIT](./LICENSE) — free to use, modify, and deploy.

## Credits

Created by **[Kurohiko](https://github.com/Kurohiko-id)**. If you find this project useful and want to support, visit [Saweria](https://saweria.co/Kurohiko), or top up your games at [KurohikoTopUp.com](https://kurohikotopup.com).
