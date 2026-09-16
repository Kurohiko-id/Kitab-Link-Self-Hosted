export async function register() {
  // Guard runtime: node-cron cuma jalan di Node.js runtime, bukan edge.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Auto-migrate SEBELUM apapun lain nyentuh DB (termasuk cek user di bawah) -- fresh
  // volume/container gak punya tabel sama sekali sampai ini jalan. Next.js nge-await
  // register() sampai selesai SEBELUM server mulai nerima request (dikonfirmasi langsung
  // dari source-nya: next-server.js prepareImpl() -> runInstrumentationHookIfAvailable(),
  // gak dibungkus try/catch di level Next-nya), jadi kalau ini throw, server GAGAL BOOT
  // total -- bukan nyala dengan schema rusak. SENGAJA gak ditangkep di sini juga, biar
  // container exit dengan jelas alih-alih diam-diam jalan tanpa tabel yang lengkap.
  //
  // Pakai drizzle-orm/.../migrator (bukan CLI drizzle-kit) -- drizzle-kit itu
  // devDependency, gak ikut ke production install/image.
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { db } = await import("@/lib/db");
  const path = await import("path");
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("[migrate] database schema is up to date");

  // Cetak setup token di sini (pas server BENERAN nyala, bukan pas `next build`) kalau
  // database masih kosong -- tanpa ini, token cuma ke-generate pas /setup pertama kali
  // diakses (lib/auth/setup-token.ts), jadi operator yang langsung ngecek `docker logs`
  // begitu container nyala bakal nemu log kosong dan bingung tokennya di mana.
  //
  // Tetep dibungkus try/catch walau migrate() di atas udah mastiin tabelnya ada -- ini
  // cuma buat kenyamanan log startup, bukan jalur kritis, jadi error apapun di sini
  // (bukan cuma "tabel belum ada") gak boleh sampai gagalin registrasi cron di bawah.
  try {
    const { users } = await import("@/lib/db/schema");
    const [existingUser] = await db.select({ id: users.id }).from(users).limit(1);
    if (!existingUser) {
      const { getSetupToken } = await import("@/lib/auth/setup-token");
      getSetupToken();
    }
  } catch (err) {
    console.error("[setup-token] gagal cek user awal (dilewati, cron tetep jalan):", err);
  }

  const cron = await import("node-cron");
  const { processWebhookQueue } = await import("@/lib/webhooks");
  const { processScheduledRules } = await import("@/lib/scheduled-rules");
  const { checkForUpdates } = await import("@/lib/update-check");
  const { processContentFeeds } = await import("@/lib/content-feeds");
  const { checkDeadLinks } = await import("@/lib/dead-links");
  const { processLiveBadges } = await import("@/lib/live-badge-check");

  // Sesuai docs/arsitektur-link-in-bio.md: cron proses webhook_queue tiap ~10 detik,
  // jalan di proses Next.js yang sama (bukan service terpisah).
  cron.schedule("*/10 * * * * *", () => {
    processWebhookQueue().catch((err) => {
      console.error("[webhook-queue] gagal proses:", err);
    });
  });

  // Auto show/hide berbasis YouTube live — polling tiap 2 menit (tanpa API key,
  // lihat lib/youtube-live.ts).
  cron.schedule("*/2 * * * *", () => {
    processScheduledRules().catch((err) => {
      console.error("[scheduled-rules] gagal proses:", err);
    });
  });

  // Live badge -- SENGAJA cron terpisah dari scheduled-rules di atas (lihat
  // lib/live-badge-check.ts), meski jadwalnya kebetulan sama (2 menit, live status emang
  // time-sensitive).
  cron.schedule("*/2 * * * *", () => {
    processLiveBadges().catch((err) => {
      console.error("[live-badge] gagal proses:", err);
    });
  });

  // Cek rilis terbaru di GitHub sekali pas startup, terus tiap 6 jam.
  checkForUpdates().catch((err) => console.error("[update-check] gagal cek awal:", err));
  cron.schedule("0 */6 * * *", () => {
    checkForUpdates().catch((err) => console.error("[update-check] gagal cek:", err));
  });

  // Auto-fetch konten baru dari RSS feed -- 15 menit cukup buat "upload baru" (bukan
  // sesuatu yang butuh real-time kayak live status), lihat lib/content-feeds.ts.
  cron.schedule("*/15 * * * *", () => {
    processContentFeeds().catch((err) => console.error("[content-feeds] gagal proses:", err));
  });

  // Cek link mati sekali sehari -- link rot lambat, jam 3 pagi biar gak numpuk beban
  // sama cron lain kalau pengguna punya banyak link ke banyak host.
  cron.schedule("0 3 * * *", () => {
    checkDeadLinks().catch((err) => console.error("[dead-links] gagal proses:", err));
  });

  console.log("[cron] webhook queue processor started (every 10s)");
  console.log("[cron] scheduled rules processor started (every 2m)");
  console.log("[cron] live badge processor started (every 2m)");
  console.log("[cron] update checker started (every 6h)");
  console.log("[cron] content feeds processor started (every 15m)");
  console.log("[cron] dead link checker started (daily at 03:00)");
}
