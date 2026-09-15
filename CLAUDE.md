# Kitab Link — Project Context

Self-hosted link-in-bio platform (alternatif Linktree), terinspirasi dari LinkBreeze tapi dengan fitur tambahan. Referensi arsitektur lengkap ada di `docs/arsitektur.md` — baca itu dulu untuk keputusan desain sebelum mengerjakan fitur baru.

## Tech Stack
- Framework: Next.js (App Router, Server Components)
- Database: SQLite (better-sqlite3, WAL mode) + Drizzle ORM
- Auth: Cookie-based HMAC session, bcrypt untuk password
- UI: Tailwind CSS + shadcn/ui
- Drag & drop: dnd-kit (pakai nested SortableContext untuk groups+links)
- Image processing: sharp (semua upload wajib dikonversi ke WebP)
- Scheduler: node-cron di dalam proses yang sama (jangan bikin service terpisah)
- Charts: Recharts
- Validation: Zod

## Prinsip Non-Negotiable
1. **Easy to deploy** — harus tetap bisa `docker run` satu baris tanpa setup manual. Migration database WAJIB otomatis jalan di container startup (lewat entrypoint script), user tidak boleh disuruh jalanin `drizzle-kit migrate` manual.
2. **Konfigurasi dari dashboard, bukan .env** — semua setting yang bisa berubah (page settings, theme, domain, dsb) disimpan di database dan diatur lewat UI admin, bukan environment variable atau file config tambahan.
3. **Single-user, tapi multi-page** — satu akun bisa punya banyak "page" (misal `/main`, `/kitabalamak`), masing-masing page independen (links, theme, analytics sendiri-sendiri).
4. Public page harus tetap ringan — utamakan Server Components/SSR, minim client JS.

## Struktur Data Kunci
- `pages` adalah parent dari `links`, `link_groups`, `themes` (per page, bukan global)
- `link_groups` punya `is_visible` manual + opsional `scheduled_rules` untuk automasi (mis. trigger YouTube live)
- Semua gambar upload lewat util `processImage()` (sharp → resize → webp), jangan simpan file asli

## Commands
```bash
npm run dev              # development server
npm run build && npm start   # production
npx drizzle-kit generate # generate migration setelah ubah schema
npx drizzle-kit migrate  # jalankan migration (otomatis juga di container entrypoint)
npm run test             # (isi sesuai testing framework yang dipakai nanti)
```

## Alur Kerja / Fase Build
Ikuti urutan fase di `docs/arsitektur.md` bagian 6 — jangan lompat ke fitur advanced (custom domain, webhook, automation) sebelum fondasi (Fase 1–2) solid.

## Yang HARUS dihindari
- Jangan tambah dependency infra berat (Postgres, Redis, message queue) — traffic project ini kecil (~10rb visitor/bulan), SQLite + cron in-process sudah cukup.
- Jangan taruh secret/API key di kode atau commit ke git.
- Jangan bikin fitur yang butuh user edit file config manual — semua harus lewat dashboard.
- Saat commit, pisah per file/concern (jangan gabung banyak perubahan tidak berhubungan dalam 1 commit).

## Catatan Deploy
Project ini akan di-deploy bareng LinkBreeze lama di 1 VPS untuk sementara (via subdomain `dev.domain.com`, port terpisah) sebelum cutover ke domain utama. Jangan asumsikan project ini satu-satunya yang jalan di server itu.

JANGAN PERNAH menjalankan `git push` secara otomatis.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

untuk design buat konsistent, mulai dari font, pewarnaan, bentuk tombol, design tombol
