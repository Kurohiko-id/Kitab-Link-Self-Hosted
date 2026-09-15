# Arsitektur "Link-in-Bio" Custom (mirip LinkBreeze, tapi lebih lengkap)

## 1. Ringkasan Keputusan Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js (App Router, Server Components) | Sama seperti LinkBreeze — cocok karena public page bisa full SSR/ISR, JS di client minim, ringan untuk VPS kecil |
| Database | SQLite (better-sqlite3, WAL mode) + Drizzle ORM | Traffic 10rb/bulan itu ringan & read-heavy → SQLite pas, ga perlu proses DB terpisah yang makan RAM di VPS 2GB |
| Auth | Cookie session HMAC + bcrypt (single-user, tapi arsitektur siap multi-user nanti) | Simpel, tanpa dependency tambahan |
| UI | Tailwind CSS 4 + shadcn/ui | Sudah bagus di LinkBreeze, dipertahankan |
| Drag & Drop | dnd-kit, tapi dengan **nested sortable context** | Fix masalah drag-drop groups di LinkBreeze |
| Image processing | `sharp` (server-side) | Convert semua upload jadi WebP + resize otomatis |
| Scheduler | `node-cron` di dalam proses Next.js (atau container terpisah kecil) | Untuk auto show/hide group berbasis kondisi (live status, jadwal) |
| Reverse proxy / TLS | Caddy | Auto-HTTPS, dan support on-demand TLS untuk custom domain per page |
| Webhook delivery | Tabel `webhook_queue` + cron retry (bukan Redis/BullMQ) | Volume kecil, ga perlu infra tambahan |

**Kenapa tetap Next.js + SQLite, bukan upgrade ke Postgres/Redis:**
10.000 visitor/bulan ≈ 330/hari. Bottleneck bukan di database, tapi di render halaman publik — dan itu sudah ditangani lewat ISR/SSR. Nambah Postgres+Redis di VPS 2 core/2GB cuma nambah overhead ops (butuh RAM buat proses tambahan) tanpa manfaat nyata di skala ini. Kalau nanti mau buka jadi SaaS multi-user beneran, baru saatnya evaluasi ulang.

---

## 2. Data Model

```
users
 └─ id, email, password_hash, created_at

pages                         -- multi-page per akun
 ├─ id, user_id, slug
 ├─ domain_type: 'subpath' | 'subdomain' | 'custom_domain'
 ├─ domain_value (nullable)   -- e.g. "kitabalamak.testing.com" atau "mydomain.com"
 ├─ domain_verified (bool)
 ├─ password_hash (nullable)  -- password-protect per page
 ├─ profile_json (nama, bio, avatar, seo meta)
 ├─ theme_id (FK -> themes)
 └─ created_at

link_groups
 ├─ id, page_id, name, order_index
 ├─ is_visible (bool)          -- manual toggle
 └─ visibility_rule_id (FK -> scheduled_rules, nullable)

links
 ├─ id, page_id, group_id (nullable, null = ungrouped)
 ├─ order_index                -- urutan dalam group
 ├─ title, url, description
 ├─ display_style: 'pill' | 'rounded' | 'rich' | ...
 ├─ thumbnail_path (webp, sudah di-resize)
 ├─ schedule_start, schedule_end (nullable)
 └─ is_active

scheduled_rules              -- otomatisasi show/hide
 ├─ id, page_id
 ├─ trigger_type: 'youtube_live' | 'time_range' | 'manual'
 ├─ config_json               -- e.g. { channel_id: "..." } atau { days: [...], start: "19:00" }
 ├─ target_type: 'group' | 'link'
 ├─ target_id
 └─ last_checked_at, last_state

themes
 ├─ id, page_id (nullable jika preset global), name
 └─ tokens_json (--lb-* CSS vars, sama sistem kayak LinkBreeze)

email_subscribers
 ├─ id, page_id, email, subscribed_at

analytics_events
 ├─ id, page_id, link_id (nullable), event_type ('view'|'click')
 ├─ referrer, created_at (no cookies, no PII lain)

api_tokens
 ├─ id, user_id, token_hash, scopes_json, created_at

webhooks
 ├─ id, user_id, page_id (nullable = semua page), event_type, target_url, secret

webhook_queue
 ├─ id, webhook_id, payload_json, status, attempts, next_retry_at
```

---

## 3. Desain Fitur Kunci

### a. Multi-page (`/main`, `/kitabalamak`, dst)
- Routing publik: `app/[slug]/page.tsx` untuk mode subpath.
- Middleware Next.js cek `Host` header dulu → kalau match `domain_value` di tabel `pages` (custom domain/subdomain), resolve ke page itu langsung tanpa perlu slug di path.
- Dashboard punya **page switcher** di paling atas sidebar (mirip switch workspace), semua tab (Links, Theme, Settings, Analytics) scoped ke page yang aktif.

### b. Link Groups yang benar (fix drag-drop LinkBreeze)
- Gunakan dnd-kit dengan 2 level `SortableContext`:
  1. Level luar: sortable antar-group (drag urutan group)
  2. Level dalam: sortable antar-link di dalam satu group, dan bisa `onDragEnd` pindah `group_id` link ke group lain (drag lintas kontainer, pola "multiple containers" resmi dari dnd-kit)
- Tiap group ada toggle `is_visible` manual, plus opsi attach ke `scheduled_rules` untuk otomatis.

### c. Auto show/hide berbasis YouTube Live
- Cron job (tiap 1–2 menit) hit YouTube Data API v3 endpoint `search?eventType=live&channelId=...&type=video` untuk channel yang didaftarkan di `scheduled_rules.config_json`.
- Kalau status live berubah, update `link_groups.is_visible` (atau `links.is_active`) sesuai `target_id`.
- Simpan `last_state` biar ga hit API sia-sia / bisa debug kalau salah update.
- Alternatif lebih efisien: YouTube support PubSubHubbub push notification untuk video baru, tapi untuk status "live sekarang" polling tetap paling reliable — dengan traffic kamu, polling tiap 1-2 menit itu murah kok.

### d. Rich preview card (fix versi yang gak jalan di LinkBreeze)
- `display_style: 'rich'` render: thumbnail besar (rasio 16:9 atau 1:1 sesuai upload) + title + description di bawah/sebelah, mirip card OG preview.
- Kalau link tidak punya thumbnail manual, fallback fetch OG image dari URL tujuan (cache hasilnya, jangan fetch tiap request).

### e. Auto-convert upload ke WebP
- Semua endpoint upload gambar (avatar, link thumbnail, background theme) lewat satu util `processImage()`:
  - `sharp(input).resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 80 }).toFile(...)`
  - Simpan hanya hasil WebP, buang file asli.
  - Opsional: generate 2 ukuran (thumbnail kecil utk list, ukuran besar utk rich card).

### f. Custom domain / subdomain / subpath — 3 mode sekaligus
- User pilih mode per page:
  - **Subpath**: `testing.com/kitabalamak` (default, tanpa setup tambahan)
  - **Subdomain**: `kitabalamak.testing.com` — user tinggal tambah wildcard DNS `*.testing.com` sekali, sisanya otomatis
  - **Custom domain**: `domainlain.com` — user arahkan CNAME ke server, sistem verifikasi via TXT record check, lalu Caddy handle TLS on-demand
- Implementasi: Caddy config pakai `on_demand_tls` dengan endpoint verifikasi ke Next.js app (cek domain itu terdaftar & `domain_verified = true` sebelum Caddy keluarin sertifikat — penting biar ga disalahgunakan orang lain).

### g. Password-protect per page
- `pages.password_hash` (bcrypt). Saat visitor akses page yang di-protect, redirect ke form password → set cookie session scoped ke page tsb (bukan session akun) → baru render halaman.

### h. API & Webhook
- API token per user (scope terbatas: read-only analytics, atau write links).
- Webhook event contoh: `subscriber.new`, `link.clicked` (bisa threshold, misal tiap kelipatan 100 klik), `page.live_status_changed` (berguna buat integrasi ke n8n pas YouTube live nyala).
- Delivery: masuk `webhook_queue`, cron proses tiap ~10 detik, retry pakai exponential backoff, sign payload pakai HMAC (secret per webhook) biar penerima bisa verifikasi keasliannya.

---

## 4. Dashboard Redesign (karena mau redesign total)

Struktur navigasi disarankan:

```
Sidebar:
 [Page Switcher: main ▾]  <- dropdown pilih/tambah page
 ─────────────
 Overview (ringkasan analytics semua page)
 Links & Groups
 Theme
 Domain & Access (custom domain, password)
 Automation (scheduled rules / YouTube live trigger)
 Integrations (API tokens, webhooks)
 Settings (profile, SEO)
```
- Overview page kasih insight lebih tajam: trend klik per link (bukan cuma angka mentah), top referrer, dan link mana yang under-performing.
- Links & Groups jadi satu canvas drag-drop besar (bukan halaman terpisah kecil-kecil kayak biasanya), supaya reorder group+link kerasa natural.

---

## 5. Deployment (VPS 2 Core / 2GB RAM)

```yaml
# docker-compose.yml
services:
  app:
    build: .
    volumes:
      - app-data:/app/data        # sqlite db + uploaded webp images
    restart: unless-stopped

  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    restart: unless-stopped

volumes:
  app-data:
  caddy-data:
```
- Resource kecil: app Next.js + SQLite realistanya < 300–400MB RAM idle, cukup lega di 2GB.
- Cron job jalan di dalam proses app yang sama (pakai `node-cron`) — jangan bikin container terpisah, ga perlu untuk skala ini.

---

## 6. Urutan Build yang Disarankan (fase)

1. **Fase 1 — Fondasi**: schema `users`, `pages`, `links`, `link_groups`, `themes` + routing multi-page (subpath dulu) + auth
2. **Fase 2 — Fix core UX**: drag-drop nested groups + hide/show manual + rich preview card + auto-webp upload
3. **Fase 3 — Redesign dashboard**: layout baru sesuai struktur di atas
4. **Fase 4 — Advanced**: custom domain/subdomain + password-protect page
5. **Fase 5 — Automation & integrasi**: scheduled_rules (YouTube live) + API tokens + webhook

Mulai dari Fase 1–2 dulu biar cepat kepake, baru lanjut ke fitur yang lebih kompleks (domain & automation butuh setup infra tambahan di luar kode).
