import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Dulu "email" -- diganti username karena app ini gak pernah beneran kirim email (gak
  // ada SMTP, lihat lib/auth/reset-password-token.ts), jadi format email gak relevan,
  // cukup identifier bebas buat login.
  username: text("username").notNull().unique(),
  // Nama yang tampil di sidebar dashboard -- SENGAJA terpisah dari username (yang dipakai
  // login). Null default -> UI fallback ke username kalau belum di-set. Diedit bareng
  // avatarPath lewat popup account (components/sidebar-account.tsx), bukan inline lagi.
  displayName: text("display_name"),
  // Avatar akun/sidebar -- BEDA dari avatar profil per-page (profileJson.avatarPath).
  // Ini identitas si operator dashboard-nya sendiri, bukan konten halaman publik.
  avatarPath: text("avatar_path"),
  passwordHash: text("password_hash").notNull(),
  // Page yang dipilih buat nampil di domain root ("/", tanpa slug di URL) -- null berarti
  // "/" tetep redirect ke /dashboard kayak biasa (lihat app/page.tsx).
  primaryPageId: integer("primary_page_id").references((): AnySQLiteColumn => pages.id, { onDelete: "set null" }),
  // Versi rilis GitHub terakhir yang udah "dilihat"/di-dismiss user dari notif bell icon
  // (lihat lib/update-check.ts) -- null berarti belum pernah dismiss apa-apa.
  lastSeenAppVersion: text("last_seen_app_version"),
  // Hasil cek GitHub Releases terakhir (JSON dari LatestRelease, lihat lib/update-check.ts)
  // -- DULU disimpen di variable module-level (`let cache`), tapi itu gak reliable: Next.js
  // standalone build bisa nge-bundle instrumentation.ts (yang nulis cache) dan Server
  // Component page.tsx (yang baca cache) jadi 2 chunk KOMPILASI TERPISAH, masing-masing
  // punya module instance sendiri -- nulis di satu sisi gak kebaca di sisi lain, notif
  // update jadi gak pernah muncul walau fetch-nya sendiri sukses. Simpen di DB (row tunggal,
  // app ini single-user) biar SATU sumber kebenaran yang reliable dibaca dari mana pun.
  latestReleaseJson: text("latest_release_json"),
  // TOTP 2FA (lihat lib/auth/totp.ts + lib/auth/totp-crypto.ts) -- totpSecret di-ENCRYPT
  // (AES-256-GCM, key di-derive dari master secret), BUKAN plaintext, karena beda dari
  // password (perlu di-decrypt lagi buat verify code, gak bisa cuma di-hash satu arah).
  // totpBackupCodesJson nyimpen array hash (argon2id, one-way, sekali pakai lalu dibuang
  // dari array-nya) -- null/totpEnabled=false berarti 2FA gak aktif.
  totpSecret: text("totp_secret"),
  totpEnabled: integer("totp_enabled", { mode: "boolean" }).notNull().default(false),
  totpBackupCodesJson: text("totp_backup_codes_json"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const themes = sqliteTable("themes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Theme itu library milik user (dipakai ulang lintas page), bukan punya satu page doang.
  // "Applied ke page mana" dicatat di pages.themeId, bukan di sini.
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokensJson: text("tokens_json").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const pages = sqliteTable("pages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  // "subdomain" sengaja gak ada di sini -- gak applicable buat project single-VPS self-
  // hosted kayak gini (butuh wildcard DNS+SSL+reverse-proxy-by-Host-header, itu semua
  // kerjaan infra di luar app, bukan sesuatu yang bisa di-"aktifin" dari dashboard).
  domainType: text("domain_type", {
    enum: ["subpath", "custom_domain"],
  })
    .notNull()
    .default("subpath"),
  domainValue: text("domain_value"),
  domainVerified: integer("domain_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  passwordHash: text("password_hash"),
  profileJson: text("profile_json").notNull().default("{}"),
  themeId: integer("theme_id").references((): AnySQLiteColumn => themes.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const linkGroups = sqliteTable("link_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
});

export const links = sqliteTable("links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => linkGroups.id, {
    onDelete: "set null",
  }),
  orderIndex: integer("order_index").notNull().default(0),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  // "rounded" (dulu ada) dihapus -- shape/radius tombol udah full dikontrol theme
  // (buttonBorderRadius), jadi "pill" vs "rounded" render IDENTIK, cuma bikin bingung ada
  // 2 pilihan yang hasilnya sama. Row lama di database yang masih "rounded" udah dimigrasi
  // ke "pill" (lihat drizzle/ -- ini plain text column, gak ada CHECK constraint DB, jadi
  // ganti union type di sini gak butuh migration SQL).
  displayStyle: text("display_style", { enum: ["pill", "rich", "icon"] })
    .notNull()
    .default("pill"),
  thumbnailPath: text("thumbnail_path"),
  // Format "brand:whatsapp" / "generic:Mail" — null = auto (favicon), lihat lib/icons.ts
  icon: text("icon"),
  scheduleStart: integer("schedule_start", { mode: "timestamp" }),
  scheduleEnd: integer("schedule_end", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  // "url" = link biasa, sisanya nentuin cara render+href-nya (lihat lib/link-render.ts).
  // Kolom `url` dipakai ulang buat semuanya: email -> alamat email, phone/whatsapp ->
  // nomor, file -> path upload sendiri ATAU url eksternal, embed -> url yang di-iframe-in,
  // copy -> teks bebas yang di-copy ke clipboard pas diklik (kode promo, no. rekening, dll),
  // accordion -> JSON stringified array of {label, value} (list yang expand/collapse pas diklik).
  linkType: text("link_type", { enum: ["url", "email", "phone", "whatsapp", "file", "embed", "copy", "accordion"] })
    .notNull()
    .default("url"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  // Cuma relevan buat displayStyle "icon" -- nentuin link ini masuk baris icon atas atau
  // bawah (dua daftar independen, lihat components/social-links-manager.tsx).
  iconPosition: text("icon_position", { enum: ["top", "bottom"] })
    .notNull()
    .default("top"),
  // Hasil cek berkala HTTP status link (cuma linkType "url", lihat lib/dead-links.ts).
  // consecutiveFailures direset ke 0 tiap kali cek sukses -- "dead" cuma ditandai setelah
  // 2x gagal BERTURUT-TURUT, biar network blip sesaat gak langsung nge-flag link sehat.
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  lastCheckStatus: text("last_check_status", { enum: ["ok", "dead"] }),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
});

// Password TAMBAHAN yang cuma valid sampai expiresAt -- beda dari pages.passwordHash
// (password utama, permanen sampai diganti). Dicek belakangan kalau password utama gak
// cocok, lihat app/[slug]/password-actions.ts. "Revoke" = hapus barisnya, gak ada flag
// soft-delete (sama pola kayak api_tokens/revokeApiToken).
export const pageAccessCodes = sqliteTable("page_access_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  codeHash: text("code_hash").notNull(),
  label: text("label"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const apiTokens = sqliteTable("api_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  scopesJson: text("scopes_json").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const webhooks = sqliteTable("webhooks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // null = semua page milik user ini
  pageId: integer("page_id").references(() => pages.id, { onDelete: "cascade" }),
  eventType: text("event_type", {
    enum: ["subscriber.new", "link.clicked", "page.live_status_changed", "test.ping"],
  }).notNull(),
  targetUrl: text("target_url").notNull(),
  secret: text("secret").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const webhookQueue = sqliteTable("webhook_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  webhookId: integer("webhook_id")
    .notNull()
    .references(() => webhooks.id, { onDelete: "cascade" }),
  payloadJson: text("payload_json").notNull(),
  status: text("status", { enum: ["pending", "sent", "failed"] })
    .notNull()
    .default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextRetryAt: integer("next_retry_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const scheduledRules = sqliteTable("scheduled_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  triggerType: text("trigger_type", {
    enum: ["youtube_live", "manual", "weekly_schedule"],
  }).notNull(),
  // youtube_live: { channelUrl: string }
  // weekly_schedule: { days: number[] (0=Minggu..6=Sabtu, sesuai Date.getDay()),
  //                     mode: "show_during" | "hide_during", untilDate: string | null }
  configJson: text("config_json").notNull().default("{}"),
  targetType: text("target_type", { enum: ["group", "link"] }).notNull(),
  // Bukan FK sungguhan karena bisa nunjuk ke link_groups ATAU links tergantung targetType.
  targetId: integer("target_id").notNull(),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  // Dipakai generik buat semua trigger type: "live" = target lagi ditampilkan, "offline" = disembunyikan.
  lastState: text("last_state", { enum: ["live", "offline"] }),
  // Beda sama lastCheckedAt (di-update TIAP tick polling) -- ini cuma keisi pas lastState
  // beneran BERUBAH (mis. dari offline ke live), jadi user bisa liat "terakhir kali rule
  // ini beneran ngetrigger show/hide", bukan cuma "terakhir kali dicoba dicek".
  lastTriggeredAt: integer("last_triggered_at", { mode: "timestamp" }),
});

// Badge "sedang live" di halaman publik -- SENGAJA dipisah total dari scheduledRules
// (bukan reuse rule youtube_live yang buat show/hide group/link), biar 2 fitur ini bisa
// dipakai independen: mau nyalain badge doang tanpa toggle apapun, atau sebaliknya.
// 1 row per page (unique pageId), lihat lib/live-badge-check.ts buat cron pollingnya.
export const liveBadges = sqliteTable("live_badges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id")
    .notNull()
    .unique()
    .references(() => pages.id, { onDelete: "cascade" }),
  channelUrl: text("channel_url").notNull(),
  // Nama yang muncul di badge ("{label} is live now") -- opsional, fallback ke nama
  // profil page kalau kosong (lihat components/public-page-body.tsx).
  label: text("label"),
  isLive: integer("is_live", { mode: "boolean" }).notNull().default(false),
  // URL video live-nya sendiri (bukan URL channel) -- null kalau isLive false.
  videoUrl: text("video_url"),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  // Kapan TERAKHIR KALI berhasil mendeteksi channel-nya lagi live (edge dari offline ->
  // live) -- beda sama lastCheckedAt yang keupdate tiap tick polling walau statusnya sama.
  lastLiveAt: integer("last_live_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Auto-fetch konten baru dari RSS/Atom feed (misal feed channel YouTube) -> tiap ada item
// baru otomatis jadi link baru di paling atas groupId, lihat lib/content-feeds.ts.
// Generik "RSS feed URL" (bukan scraper per-platform) sengaja dipilih -- YouTube native
// punya RSS per channel, platform lain (IG/TikTok) bisa dijembatani lewat RSS-bridge
// pihak ketiga kalau user mau, tanpa app ini perlu scraper rapuh per-platform.
export const contentFeeds = sqliteTable("content_feeds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  groupId: integer("group_id")
    .notNull()
    .references(() => linkGroups.id, { onDelete: "cascade" }),
  feedUrl: text("feed_url").notNull(),
  label: text("label"),
  // true = link baru dibikin displayStyle "rich" + coba fetch thumbnail dari feed-nya;
  // false = "pill" polos, gak ada thumbnail sama sekali (skip fetch gambar).
  richPreview: integer("rich_preview", { mode: "boolean" }).notNull().default(true),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  // GUID/link item feed TERAKHIR yang udah diproses -- item feed yang lebih baru dari ini
  // yang bakal dibikinin link baru. Null = belum pernah dicek (lihat lib/content-feeds.ts).
  lastItemGuid: text("last_item_guid"),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const analyticsEvents = sqliteTable("analytics_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  eventType: text("event_type", { enum: ["page_view", "link_click"] }).notNull(),
  // Null buat page_view. Sengaja BUKAN foreign key ke links -> link yang dihapus gak
  // boleh mecahin/menghapus history event klik lamanya.
  linkId: integer("link_id"),
  // Hostname referrer (mis. "instagram.com"), null kalau direct/gak ada Referer header.
  referrer: text("referrer"),
  deviceType: text("device_type", { enum: ["mobile", "tablet", "desktop"] }),
  // Cuma keisi kalau reverse proxy di depan ngirim header geo (cf-ipcountry dll) --
  // self-hosted tanpa proxy kayak gitu bakal selalu null, lihat lib/geo.ts.
  country: text("country"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Log aktivitas per-page buat tab "Log" di Settings -- action itu key generik (link_created,
// link_shown, group_hidden, theme_changed, dst), detail itu judul link/nama grup/nama theme
// yang relevan. Pesan tampilnya di-compose dari kamus i18n (lihat lib/i18n.ts), BUKAN disimpan
// sebagai kalimat jadi, biar tetep bener kalau user ganti bahasa dashboard ID<->EN.
export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pageId: integer("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  detail: text("detail"),
  // Siapa/apa yang nge-trigger aksi ini -- default "dashboard" (aksi manual user di UI)
  // biar semua call site logActivity() yang UDAH ADA gak perlu diubah sama sekali.
  // "automation" = cron rule (scheduled-rules/content-feeds), "api" = API token eksternal
  // (Stream Deck dkk, lihat app/api/v1/links/[id]/route.ts).
  source: text("source", { enum: ["dashboard", "automation", "api"] })
    .notNull()
    .default("dashboard"),
  // Nama rule automation-nya, atau nama token API-nya -- null kalau source "dashboard".
  sourceLabel: text("source_label"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
