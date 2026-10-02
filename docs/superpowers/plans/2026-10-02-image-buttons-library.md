# Image Buttons Library + Theme Export with Images — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Library gambar berlabel ("Image Buttons") yang direferensi link card style Image, plus export/import theme yang ikut membawa gambar.

**Architecture:** Tabel `image_buttons` (milik user) + kolom `links.image_button_id`. `thumbnailPath` di `BoardLink`/`PublicLink` jadi **path efektif** (`COALESCE(image_buttons.path, links.thumbnailPath)`) yang di-resolve di query, jadi `LinkCard`, preview, dan analytics tidak berubah. Export/import v2 = satu file JSON berisi tokens + image button + aset base64, logikanya pure di `lib/theme-bundle.ts`.

**Tech Stack:** Next.js (App Router, Server Actions), Drizzle + better-sqlite3, sharp, node:test + tsx.

**Spec:** `docs/superpowers/specs/2026-10-02-link-override-and-theme-templates-design.md` (isinya sudah diganti jadi spec Image Buttons; nama file lama).

**Deviasi dari spec (sengaja):**
1. Library tampil sebagai **outer tab "Image Buttons"** di Customize Theme (sejajar Presets/Custom/Import), bukan inner tab di dalam `<form>` theme, karena inner tab ada di dalam form simpan theme dan form tidak boleh bersarang.
2. Aset di file export berbentuk `{ kind, ext, b64 }` (bukan data URI) supaya validasi ekstensi/jenis lebih mudah. Isinya sama.
3. Export memakai tokens dari state editor (yang sedang dilihat user, termasuk yang belum disimpan), sama seperti perilaku export sekarang.

## Global Constraints

- Migration WAJIB jalan otomatis di startup (`instrumentation.ts` sudah memanggil `migrate`); jangan minta user menjalankan `drizzle-kit migrate`.
- Semua gambar lewat `processImage()` (sharp, WebP). Jangan simpan file asli.
- Tidak boleh dependency baru (tidak ada zip, tidak ada test framework baru). Test pakai `node:test` (`npm test`, glob `lib/**/*.test.ts`).
- Setiap string UI baru WAJIB ada di **dua locale** (`id` dan `en`) di `lib/i18n.ts`, kalau tidak `tsc` gagal karena `Dictionary` adalah union.
- Komentar kode berbahasa Indonesia informal seperti kode sekitarnya; nama kode tetap Inggris.
- JANGAN jalankan `git add/commit/push` sendiri. Tiap task diakhiri step "Beri user command commit"; command WAJIB diawali `cd "O:/Project 2026/Linktree Alternative/Kitab-Link-Self-Hosted"`, pesan commit TANPA trailer `Co-Authored-By`/`Claude-Session`, dan commit dipisah per concern.
- `CLAUDE.md` memperingatkan Next.js di sini berbeda dari yang dikenal: sebelum menulis kode spesifik-Next yang BARU (bukan menyalin pola yang sudah ada di repo), baca `node_modules/next/dist/docs/`. Plan ini sengaja hanya memakai pola yang sudah ada di repo.
- Tidak ada perubahan `package.json` version (belum ada rilis).

## Review Focus

Mode kegagalan yang tidak ditulis eksplisit di spec tapi paling mungkin kena user; masing-masing punya test di task pemiliknya:

1. Hapus image button yang masih dipakai link → harus ditolak, bukan membuat link kehilangan gambar (Task 3).
2. Link memilih `imageButtonId` milik user lain → harus ditolak (Task 3 `requireOwnedImageButton`).
3. Ganti gambar image button: file baru ditulis, DB diperbarui, baru file lama dihapus; gagal di tengah tidak boleh meninggalkan `path` menunjuk file yang sudah terhapus (Task 3).
4. Page backup/import (`backup-actions.ts`) tidak boleh membawa `imageButtonId` lintas page/instance (Task 2).
5. File import jahat: path traversal di `backgroundImage`/`customFontUrl`, ekstensi di luar whitelist, base64 rusak, terlalu banyak/terlalu besar aset (Task 6).
6. Export saat file aset sudah hilang dari disk → dilewati, export tidak gagal (Task 6).
7. Migrasi data link lama: user berbeda tidak boleh saling berbagi image button, link non-image tidak disentuh (Task 1).

---

## File Structure

| File | Tugas |
|---|---|
| `lib/db/schema.ts` (ubah) | tabel `imageButtons`, kolom `links.imageButtonId` |
| `drizzle/0036_*.sql` (generate + tambah SQL data) | schema + pindah data link image lama |
| `lib/db/test-helpers.ts` (baru) | `applyMigrations(sqlite, from, to)` untuk test |
| `lib/db/board.ts` (ubah) | join image button, `thumbnailPath` efektif, `BoardLink.imageButtonId` |
| `lib/db/analytics.ts` (ubah) | thumbnail efektif untuk tabel link |
| `lib/backup-link.ts` (baru) + `app/dashboard/backup-actions.ts` (ubah) | `stripLink` pure, buang `imageButtonId` |
| `lib/images/placeholder.ts` (baru) | generator placeholder solid |
| `lib/images/image-button-input.ts` (baru) | FormData → WebP buffer (upload ATAU placeholder) |
| `lib/db/image-buttons.ts` (baru) | query: list, owned, usage, create, replace, rename, delete, label unik |
| `app/dashboard/image-button-actions.ts` (baru) | server actions library + `listImageButtonsForExportAction` |
| `app/dashboard/image-button-library.tsx` (baru) | UI tab library |
| `app/dashboard/theme-editor.tsx` (ubah) | outer tab "images", tombol export baru |
| `app/dashboard/link-form-modal.tsx`, `app/dashboard/actions.ts` (ubah) | picker + upload berlabel |
| `app/dashboard/board.tsx`, `app/dashboard/page.tsx` (ubah) | oper `imageButtons` ke modal & ThemeEditor |
| `lib/theme-bundle.ts` (baru) | `buildBundle`/`parseBundle` pure |
| `app/dashboard/theme-bundle-actions.ts` (baru) | `exportThemeBundleAction` (baca disk) |
| `app/dashboard/theme-actions.ts` (ubah) | `importThemeAction` mengenali v2 |
| `app/dashboard/theme-export-dialog.tsx` (baru) | dialog toggle pill |
| `next.config.ts` (ubah) | `bodySizeLimit` 20mb |
| `lib/i18n.ts` (ubah) | string baru ID+EN |

---

### Task 1: Schema, migration, dan pindah data link image lama

**Files:**
- Modify: `lib/db/schema.ts` (tambah tabel sebelum `export const links`, tambah kolom di `links`)
- Create: `drizzle/0036_*.sql` (hasil `drizzle-kit generate`, lalu tambah SQL data)
- Create: `lib/db/test-helpers.ts`
- Test: `lib/db/image-buttons-migration.test.ts`

**Interfaces:**
- Produces: `imageButtons` (drizzle table: `id`, `userId`, `label`, `path`, `createdAt`), `links.imageButtonId: number | null`, helper test `applyMigrations(sqlite: Database.Database, from: number, to?: number): void`, `journalTags(): string[]`.

- [ ] **Step 1: Tulis helper test**

`lib/db/test-helpers.ts`:
```ts
import type Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";

const DRIZZLE_DIR = path.join(process.cwd(), "drizzle");

export function journalTags(): string[] {
  const journal = JSON.parse(readFileSync(path.join(DRIZZLE_DIR, "meta", "_journal.json"), "utf8")) as {
    entries: { tag: string }[];
  };
  return journal.entries.map((e) => e.tag);
}

// Jalanin file migration [from, to) langsung ke sqlite mentah (tanpa drizzle migrator) --
// dipakai test yang butuh state DB "sebelum migration X" buat ngetes migrasi data.
export function applyMigrations(sqlite: Database.Database, from: number, to?: number) {
  for (const tag of journalTags().slice(from, to)) {
    sqlite.exec(readFileSync(path.join(DRIZZLE_DIR, `${tag}.sql`), "utf8"));
  }
}
```

- [ ] **Step 2: Tulis test migrasi yang gagal**

`lib/db/image-buttons-migration.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { applyMigrations, journalTags } from "./test-helpers";

test("migrasi memindahkan link image lama ke library per-user, link lain dibiarkan", () => {
  const tags = journalTags();
  const target = tags.findIndex((tag) => tag.startsWith("0036_"));
  assert.ok(target > 0, "migration 0036 belum ada");

  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  applyMigrations(sqlite, 0, target);

  sqlite.exec(`
    INSERT INTO users (username, password_hash) VALUES ('u1', 'x'), ('u2', 'x');
    INSERT INTO pages (user_id, slug) VALUES (1, 'p1'), (2, 'p2');
    INSERT INTO links (page_id, title, url, display_style, thumbnail_path) VALUES
      (1, 'Promo',  'https://a.test', 'image', 'link-thumbnails/a.webp'),
      (2, 'Banner', 'https://b.test', 'image', 'link-thumbnails/b.webp'),
      (1, 'Rich',   'https://c.test', 'rich',  'link-thumbnails/c.webp'),
      (1, 'NoImg',  'https://d.test', 'image', NULL);
  `);

  applyMigrations(sqlite, target);

  const rows = sqlite
    .prepare(
      `SELECT l.title, l.image_button_id AS btnId, l.thumbnail_path AS thumb, ib.label, ib.path, ib.user_id AS owner
       FROM links l LEFT JOIN image_buttons ib ON ib.id = l.image_button_id ORDER BY l.id`,
    )
    .all() as { title: string; btnId: number | null; thumb: string | null; label: string | null; path: string | null; owner: number | null }[];

  assert.deepEqual(rows[0], { title: "Promo", btnId: rows[0].btnId, thumb: null, label: "Promo", path: "link-thumbnails/a.webp", owner: 1 });
  assert.equal(rows[1].owner, 2);
  assert.equal(rows[1].path, "link-thumbnails/b.webp");
  assert.deepEqual(rows[2], { title: "Rich", btnId: null, thumb: "link-thumbnails/c.webp", label: null, path: null, owner: null });
  assert.equal(rows[3].btnId, null);
  assert.equal((sqlite.prepare("SELECT count(*) AS n FROM image_buttons").get() as { n: number }).n, 2);
});
```

- [ ] **Step 3: Jalankan, pastikan gagal**

Run: `node --import tsx --test lib/db/image-buttons-migration.test.ts`
Expected: FAIL dengan `migration 0036 belum ada`.

- [ ] **Step 4: Ubah schema**

Di `lib/db/schema.ts`, tepat sebelum `export const links = sqliteTable("links", {`:
```ts
// Library gambar berlabel milik user. Link displayStyle "image" nunjuk ke sini lewat
// links.imageButtonId -- ganti gambar di sini otomatis ngubah SEMUA link yang pakai.
export const imageButtons = sqliteTable("image_buttons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  path: text("path").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
```
Di dalam `links`, tepat setelah `thumbnailPath: text("thumbnail_path"),`:
```ts
  // Kalau terisi (cuma displayStyle "image"), gambar tombol diambil dari image_buttons.path
  // dan thumbnailPath diabaikan. Dihapus image button-nya -> set null (tapi UI nolak hapus
  // selama masih dipakai, lihat deleteImageButton).
  imageButtonId: integer("image_button_id").references(() => imageButtons.id, { onDelete: "set null" }),
```

- [ ] **Step 5: Generate migration dan tambah SQL data**

Run: `npx drizzle-kit generate`
Expected: file baru `drizzle/0036_<nama_acak>.sql` berisi `CREATE TABLE image_buttons` dan `ALTER TABLE links ADD image_button_id`. Buka file itu dan TAMBAHKAN di paling bawah:
```sql
--> statement-breakpoint
INSERT INTO `image_buttons` (`user_id`, `label`, `path`)
SELECT `pages`.`user_id`, `links`.`title`, `links`.`thumbnail_path`
FROM `links` INNER JOIN `pages` ON `pages`.`id` = `links`.`page_id`
WHERE `links`.`display_style` = 'image' AND `links`.`thumbnail_path` IS NOT NULL
ORDER BY `links`.`id`;
--> statement-breakpoint
UPDATE `links`
SET `image_button_id` = (SELECT `id` FROM `image_buttons` WHERE `image_buttons`.`path` = `links`.`thumbnail_path` LIMIT 1),
    `thumbnail_path` = NULL
WHERE `display_style` = 'image' AND `thumbnail_path` IS NOT NULL;
```
(Path file upload selalu UUID unik, jadi pencocokan lewat `path` aman.)

- [ ] **Step 6: Jalankan test**

Run: `node --import tsx --test lib/db/image-buttons-migration.test.ts`
Expected: PASS. Lalu `npx tsc --noEmit` — expected bersih (kolom baru belum dipakai).

- [ ] **Step 7: Beri user command commit** (jangan dijalankan sendiri)
```bash
cd "O:/Project 2026/Linktree Alternative/Kitab-Link-Self-Hosted"
git add lib/db/schema.ts drizzle/0036_*.sql drizzle/meta/0036_snapshot.json drizzle/meta/_journal.json lib/db/test-helpers.ts lib/db/image-buttons-migration.test.ts
git commit -m "Add image_buttons table and migrate legacy image-style links into it"
```

---

### Task 2: Resolusi gambar efektif di query + backup aman

**Files:**
- Modify: `lib/db/board.ts` (imports; `BoardLink`; kedua query)
- Modify: `lib/db/analytics.ts:205-260` (query `linkRows`)
- Create: `lib/backup-link.ts`
- Modify: `app/dashboard/backup-actions.ts:24-41,121,129`
- Test: `lib/db/board.test.ts`, `lib/backup-link.test.ts`

**Interfaces:**
- Consumes: `imageButtons`, `links.imageButtonId` (Task 1).
- Produces: `BoardLink.imageButtonId: number | null`; `BoardLink.thumbnailPath` & `PublicLink.thumbnailPath` = path efektif; `stripLink(link: BoardLink): BackupLink` dari `@/lib/backup-link`.

- [ ] **Step 1: Tulis test yang gagal**

`lib/db/board.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { eq } from "drizzle-orm";

test("thumbnailPath efektif = path image button, fallback ke thumbnailPath link; update library ikut", async () => {
  process.env.DATABASE_PATH = ":memory:";
  const { db } = await import("./index");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const { users, pages, links, imageButtons } = await import("./schema");
  const { getBoardData, getPublicBoardData } = await import("./board");

  const [user] = await db.insert(users).values({ username: "u", passwordHash: "x" }).returning();
  const [page] = await db.insert(pages).values({ userId: user.id, slug: "p" }).returning();
  const [btn] = await db.insert(imageButtons).values({ userId: user.id, label: "Promo", path: "image-buttons/a.webp" }).returning();
  await db.insert(links).values([
    { pageId: page.id, title: "ViaButton", url: "https://a.test", displayStyle: "image", imageButtonId: btn.id, orderIndex: 0 },
    { pageId: page.id, title: "Legacy", url: "https://b.test", displayStyle: "rich", thumbnailPath: "link-thumbnails/own.webp", orderIndex: 1 },
  ]);

  const board = await getBoardData(page.id);
  assert.equal(board.ungrouped[0].thumbnailPath, "image-buttons/a.webp");
  assert.equal(board.ungrouped[0].imageButtonId, btn.id);
  assert.equal(board.ungrouped[1].thumbnailPath, "link-thumbnails/own.webp");
  assert.equal(board.ungrouped[1].imageButtonId, null);

  await db.update(imageButtons).set({ path: "image-buttons/b.webp" }).where(eq(imageButtons.id, btn.id));
  const pub = await getPublicBoardData(page.id);
  assert.equal(pub.ungrouped[0].thumbnailPath, "image-buttons/b.webp");
});
```
`lib/backup-link.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { stripLink } from "./backup-link";
import type { BoardLink } from "@/lib/db/board";

test("stripLink membuang id, groupId, thumbnailPath, DAN imageButtonId", () => {
  const link = {
    id: 1, groupId: 2, title: "t", url: "u", thumbnailPath: "x.webp", imageButtonId: 9,
  } as unknown as BoardLink;
  const out = stripLink(link) as Record<string, unknown>;
  for (const key of ["id", "groupId", "thumbnailPath", "imageButtonId"]) assert.equal(key in out, false, key);
  assert.equal(out.title, "t");
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --import tsx --test lib/db/board.test.ts lib/backup-link.test.ts`
Expected: FAIL (`imageButtonId` tidak ada / modul `backup-link` tidak ada).

- [ ] **Step 3: Ubah `lib/db/board.ts`**

Ganti baris 1-3 imports:
```ts
import { and, asc, eq } from "drizzle-orm";
import { db } from "./index";
import { imageButtons, linkGroups, links, pages } from "./schema";
```
Di `BoardLink` (setelah `thumbnailPath: string | null;`) tambah `imageButtonId: number | null;`.

Di `getBoardData`, ganti query `links`:
```ts
    db
      .select({ link: links, buttonPath: imageButtons.path })
      .from(links)
      .leftJoin(imageButtons, eq(links.imageButtonId, imageButtons.id))
      .where(eq(links.pageId, pageId))
      .orderBy(asc(links.orderIndex)),
```
Loop jadi `for (const { link, buttonPath } of linkRows) {` dan di `entry` ganti baris thumbnail:
```ts
      thumbnailPath: buttonPath ?? link.thumbnailPath,
      imageButtonId: link.imageButtonId,
```
Di `getPublicBoardData`, query link jadi:
```ts
    db
      .select({ link: links, buttonPath: imageButtons.path })
      .from(links)
      .leftJoin(imageButtons, eq(links.imageButtonId, imageButtons.id))
      .where(and(eq(links.pageId, pageId), eq(links.isActive, true)))
      .orderBy(asc(links.orderIndex)),
```
Loop `for (const { link, buttonPath } of linkRows) {` dan `thumbnailPath: buttonPath ?? link.thumbnailPath,` (tanpa `imageButtonId` — `PublicLink` tidak berubah).

- [ ] **Step 4: Ubah `lib/db/analytics.ts`**

Tambahkan `imageButtons` ke import dari `./schema` dan `eq`/`sql` ke import `drizzle-orm` bila belum ada. Ganti select `linkRows` (baris ~208-220):
```ts
    db
      .select({
        id: links.id,
        title: links.title,
        icon: links.icon,
        thumbnailPath: sql<string | null>`coalesce(${imageButtons.path}, ${links.thumbnailPath})`,
        linkType: links.linkType,
        url: links.url,
        pageId: links.pageId,
      })
      .from(links)
      .leftJoin(imageButtons, eq(links.imageButtonId, imageButtons.id))
      .where(inArray(links.pageId, pageIds)),
```

- [ ] **Step 5: Buat `lib/backup-link.ts` dan pakai di `backup-actions.ts`**

`lib/backup-link.ts`:
```ts
import type { BoardLink } from "@/lib/db/board";

// imageButtonId SENGAJA dibuang juga: id itu cuma valid di library user/instance asalnya,
// kalau ikut ke backup lalu di-import ke page lain dia nunjuk image button milik orang
// lain (atau id yang gak ada). Gambarnya memang gak ikut backup (sama kayak thumbnailPath).
export type BackupLink = Omit<BoardLink, "id" | "groupId" | "thumbnailPath" | "imageButtonId">;

export function stripLink(link: BoardLink): BackupLink {
  const rest: Partial<BoardLink> = { ...link };
  delete rest.id;
  delete rest.groupId;
  delete rest.thumbnailPath;
  delete rest.imageButtonId;
  return rest as BackupLink;
}
```
Di `app/dashboard/backup-actions.ts`: hapus deklarasi `type BackupLink = ...` (baris 24) dan fungsi `stripLink` (baris ~34-41), tambah `import { stripLink, type BackupLink } from "@/lib/backup-link";`. Di dua `db.insert(links).values({ ...link, ... thumbnailPath: null, ...})` (baris ~121 dan ~129) tambahkan `imageButtonId: null,` di objeknya.

- [ ] **Step 6: Jalankan test + type check**

Run: `node --import tsx --test lib/db/board.test.ts lib/backup-link.test.ts` → PASS.
Run: `npx tsc --noEmit`. Kalau ada error "property imageButtonId missing" di tempat lain yang membuat objek `BoardLink` (cari: `grep -rn "BoardLink = {" app components lib`), tambahkan `imageButtonId: null` di literal itu. Expected akhir: bersih.

- [ ] **Step 7: Beri user command commit**
```bash
cd "O:/Project 2026/Linktree Alternative/Kitab-Link-Self-Hosted"
git add lib/db/board.ts lib/db/board.test.ts lib/db/analytics.ts
git commit -m "Resolve effective link image through image_buttons in board and analytics queries"
git add lib/backup-link.ts lib/backup-link.test.ts app/dashboard/backup-actions.ts
git commit -m "Keep imageButtonId out of page backups"
```

---

### Task 3: Modul image button (query, placeholder, input, actions)

**Files:**
- Create: `lib/images/placeholder.ts`, `lib/images/image-button-input.ts`, `lib/db/image-buttons.ts`, `app/dashboard/image-button-actions.ts`
- Test: `lib/images/placeholder.test.ts`, `lib/images/image-button-input.test.ts`, `lib/db/image-buttons.test.ts`

**Interfaces:**
- Consumes: `imageButtons`, `links`, `pages` (schema), `processImage`, `saveImage`, `deleteImage`.
- Produces:
  - `makePlaceholder(color: string, width: number, height: number): Promise<Buffer>`; `validatePlaceholder(...) : string | null`
  - `readImageButtonWebp(formData: FormData, fileField?: string): Promise<{ webp: Buffer } | { error: string }>` (mode `placeholder` membaca `placeholderColor/Width/Height`; selain itu membaca file di `fileField`, default `"image"`)
  - `ImageButtonRow = { id; label; path; createdAt: Date; usedCount: number }`
  - `listImageButtons(userId): Promise<ImageButtonRow[]>`
  - `listImageButtonsForExport(userId, themeId): Promise<(ImageButtonRow & { usedInTheme: boolean })[]>`
  - `requireOwnedImageButton(userId, id): Promise<{id; label; path; userId}>` (throw kalau bukan milik)
  - `createImageButton(userId, label, webp: Buffer): Promise<{ id: number; path: string }>`
  - `replaceImageButtonImage(userId, id, webp: Buffer): Promise<void>`
  - `renameImageButton(userId, id, label: string): Promise<void>`
  - `deleteImageButton(userId, id): Promise<{ ok: true } | { error: "in_use"; count: number }>`
  - `uniqueImageButtonLabel(userId, base): Promise<string>`
  - Server actions di `image-button-actions.ts` (semua `Promise<{ error?: string }>` kecuali disebut): `createImageButtonAction(formData)`, `replaceImageButtonImageAction(id, formData)`, `renameImageButtonAction(id, label)`, `deleteImageButtonAction(id)`, `listImageButtonsForExportAction(themeId)`.

- [ ] **Step 1: Tulis test placeholder dan input yang gagal**

`lib/images/placeholder.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { makePlaceholder, validatePlaceholder } from "./placeholder";

test("makePlaceholder menghasilkan WebP dengan ukuran persis", async () => {
  const buf = await makePlaceholder("#112233", 320, 56);
  const meta = await sharp(buf).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 320);
  assert.equal(meta.height, 56);
});

test("validatePlaceholder menolak warna & ukuran ngawur", () => {
  assert.equal(validatePlaceholder("#000000", 100, 50), null);
  assert.equal(validatePlaceholder("red", 100, 50), "Warna harus format #RRGGBB.");
  assert.ok(validatePlaceholder("#000000", 5, 50));
  assert.ok(validatePlaceholder("#000000", 100, 99999));
  assert.ok(validatePlaceholder("#000000", 10.5, 50));
});
```
`lib/images/image-button-input.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readImageButtonWebp } from "./image-button-input";

test("mode placeholder", async () => {
  const fd = new FormData();
  fd.set("mode", "placeholder");
  fd.set("placeholderColor", "#000000");
  fd.set("placeholderWidth", "200");
  fd.set("placeholderHeight", "40");
  const out = await readImageButtonWebp(fd);
  assert.ok("webp" in out);
  assert.equal((await sharp(out.webp).metadata()).height, 40);
});

test("mode upload: file gambar jadi WebP, non-gambar ditolak, kosong ditolak", async () => {
  const png = await sharp({ create: { width: 64, height: 32, channels: 3, background: "#ff0000" } }).png().toBuffer();
  const fd = new FormData();
  fd.set("image", new File([new Uint8Array(png)], "a.png", { type: "image/png" }));
  const ok = await readImageButtonWebp(fd);
  assert.ok("webp" in ok);
  assert.equal((await sharp(ok.webp).metadata()).format, "webp");

  const bad = new FormData();
  bad.set("image", new File(["hi"], "a.txt", { type: "text/plain" }));
  assert.ok("error" in (await readImageButtonWebp(bad)));
  assert.ok("error" in (await readImageButtonWebp(new FormData())));
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --import tsx --test lib/images/placeholder.test.ts lib/images/image-button-input.test.ts`
Expected: FAIL (modul belum ada).

- [ ] **Step 3: Implementasi placeholder dan input**

`lib/images/placeholder.ts`:
```ts
import sharp from "sharp";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const MIN_SIDE = 16;
const MAX_SIDE = 2000;

// Mengembalikan pesan error (buat ditampilkan) atau null kalau valid.
export function validatePlaceholder(color: string, width: number, height: number): string | null {
  if (!HEX_COLOR.test(color)) return "Warna harus format #RRGGBB.";
  if (!Number.isInteger(width) || !Number.isInteger(height)) return "Lebar dan tinggi harus angka bulat.";
  if (width < MIN_SIDE || height < MIN_SIDE || width > MAX_SIDE || height > MAX_SIDE) {
    return `Lebar dan tinggi harus antara ${MIN_SIDE} dan ${MAX_SIDE} px.`;
  }
  return null;
}

// Gambar solid sebagai "wajah" image button sementara (buat nyetup/nge-test tampilan theme).
export async function makePlaceholder(color: string, width: number, height: number): Promise<Buffer> {
  const error = validatePlaceholder(color, width, height);
  if (error) throw new Error(error);
  return sharp({ create: { width, height, channels: 3, background: color } })
    .webp({ quality: 80 })
    .toBuffer();
}
```
`lib/images/image-button-input.ts`:
```ts
import { processImage } from "@/lib/images/process-image";
import { makePlaceholder, validatePlaceholder } from "@/lib/images/placeholder";

export const MAX_IMAGE_BUTTON_WIDTH = 1600;

// Satu pintu buat "dari form jadi buffer WebP" -- dipakai library image button (upload ATAU
// placeholder) dan form link (upload baru, fileField beda). Gak nyentuh DB/disk.
export async function readImageButtonWebp(
  formData: FormData,
  fileField = "image",
): Promise<{ webp: Buffer } | { error: string }> {
  if (formData.get("mode") === "placeholder") {
    const color = String(formData.get("placeholderColor") ?? "");
    const width = Number(formData.get("placeholderWidth"));
    const height = Number(formData.get("placeholderHeight"));
    const error = validatePlaceholder(color, width, height);
    if (error) return { error };
    return { webp: await makePlaceholder(color, width, height) };
  }

  const file = formData.get(fileField);
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih gambar dulu." };
  if (!file.type.startsWith("image/")) return { error: "File yang diupload harus berupa gambar." };
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    return { webp: await processImage(buffer, MAX_IMAGE_BUTTON_WIDTH) };
  } catch {
    return { error: "Gambar tidak bisa diproses." };
  }
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `node --import tsx --test lib/images/placeholder.test.ts lib/images/image-button-input.test.ts` → PASS.

- [ ] **Step 5: Tulis test modul DB yang gagal**

`lib/db/image-buttons.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import sharp from "sharp";

async function setup() {
  process.env.DATABASE_PATH = ":memory:";
  process.env.UPLOAD_PATH = mkdtempSync(path.join(tmpdir(), "kl-ib-"));
  const { db } = await import("./index");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const schema = await import("./schema");
  const mod = await import("./image-buttons");
  const { resolveUploadPath } = await import("@/lib/images/storage");
  const [u1] = await db.insert(schema.users).values({ username: "u1", passwordHash: "x" }).returning();
  const [u2] = await db.insert(schema.users).values({ username: "u2", passwordHash: "x" }).returning();
  const [page] = await db.insert(schema.pages).values({ userId: u1.id, slug: "p" }).returning();
  const webp = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#000" } }).webp().toBuffer();
  return { db, schema, mod, resolveUploadPath, u1, u2, page, webp };
}

test("hapus image button yang dipakai link ditolak; yang bebas dihapus beserta filenya", async () => {
  const { db, schema, mod, resolveUploadPath, u1, page, webp } = await setup();
  const used = await mod.createImageButton(u1.id, "Used", webp);
  const free = await mod.createImageButton(u1.id, "Free", webp);
  await db.insert(schema.links).values({ pageId: page.id, title: "L", url: "https://a.test", displayStyle: "image", imageButtonId: used.id });

  assert.deepEqual(await mod.deleteImageButton(u1.id, used.id), { error: "in_use", count: 1 });
  assert.ok(existsSync(resolveUploadPath(used.path)));

  assert.deepEqual(await mod.deleteImageButton(u1.id, free.id), { ok: true });
  assert.equal(existsSync(resolveUploadPath(free.path)), false);

  const list = await mod.listImageButtons(u1.id);
  assert.equal(list.length, 1);
  assert.equal(list[0].usedCount, 1);
});

test("requireOwnedImageButton menolak milik user lain", async () => {
  const { mod, u1, u2, webp } = await setup();
  const btn = await mod.createImageButton(u1.id, "Mine", webp);
  await assert.rejects(() => mod.requireOwnedImageButton(u2.id, btn.id));
  assert.equal((await mod.requireOwnedImageButton(u1.id, btn.id)).label, "Mine");
});

test("replaceImageButtonImage: path baru di DB, file lama dihapus, file baru ada", async () => {
  const { mod, resolveUploadPath, u1, webp } = await setup();
  const btn = await mod.createImageButton(u1.id, "R", webp);
  await mod.replaceImageButtonImage(u1.id, btn.id, webp);
  const after = await mod.requireOwnedImageButton(u1.id, btn.id);
  assert.notEqual(after.path, btn.path);
  assert.equal(existsSync(resolveUploadPath(btn.path)), false);
  assert.ok(existsSync(resolveUploadPath(after.path)));
});

test("listImageButtonsForExport menandai usedInTheme berdasar theme page yang memakai link-nya", async () => {
  const { db, schema, mod, u1, page, webp } = await setup();
  const [theme] = await db.insert(schema.themes).values({ userId: u1.id, name: "T" }).returning();
  const [other] = await db.insert(schema.themes).values({ userId: u1.id, name: "O" }).returning();
  const a = await mod.createImageButton(u1.id, "A", webp);
  await mod.createImageButton(u1.id, "B", webp);
  await db.update(schema.pages).set({ themeId: theme.id }).where(eq(schema.pages.id, page.id));
  await db.insert(schema.links).values({ pageId: page.id, title: "L", url: "https://a.test", displayStyle: "image", imageButtonId: a.id });

  const forTheme = await mod.listImageButtonsForExport(u1.id, theme.id);
  assert.deepEqual(forTheme.map((b) => [b.label, b.usedInTheme]).sort(), [["A", true], ["B", false]]);
  const forOther = await mod.listImageButtonsForExport(u1.id, other.id);
  assert.ok(forOther.every((b) => !b.usedInTheme));
});

test("uniqueImageButtonLabel menambah akhiran angka", async () => {
  const { mod, u1, webp } = await setup();
  await mod.createImageButton(u1.id, "Promo", webp);
  assert.equal(await mod.uniqueImageButtonLabel(u1.id, "Promo"), "Promo (2)");
  assert.equal(await mod.uniqueImageButtonLabel(u1.id, "Baru"), "Baru");
});
```

- [ ] **Step 6: Jalankan, pastikan gagal**

Run: `node --import tsx --test lib/db/image-buttons.test.ts` → FAIL (modul belum ada).

- [ ] **Step 7: Implementasi `lib/db/image-buttons.ts`**

```ts
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { imageButtons, links } from "./schema";
import { deleteImage, saveImage } from "@/lib/images/storage";

export type ImageButtonRow = {
  id: number;
  label: string;
  path: string;
  createdAt: Date;
  usedCount: number;
};

// Subquery korelasi ditulis string mentah (bukan ${imageButtons.id}) -- drizzle bisa render
// kolom luar tanpa prefix tabel di select satu-tabel, dan "id" polos bakal nyangkut ke
// tabel dalam (links.id) -> hitungannya salah diam-diam.
const usedCountSql = sql<number>`(select count(*) from links where links.image_button_id = image_buttons.id)`;

export async function listImageButtons(userId: number): Promise<ImageButtonRow[]> {
  return db
    .select({
      id: imageButtons.id,
      label: imageButtons.label,
      path: imageButtons.path,
      createdAt: imageButtons.createdAt,
      usedCount: usedCountSql,
    })
    .from(imageButtons)
    .where(eq(imageButtons.userId, userId))
    .orderBy(desc(imageButtons.createdAt), desc(imageButtons.id));
}

// usedInTheme = ada link (di page mana pun) yang pakai image button ini DAN page-nya lagi
// memakai theme itu. Buat penanda di dialog export.
export async function listImageButtonsForExport(userId: number, themeId: number) {
  return db
    .select({
      id: imageButtons.id,
      label: imageButtons.label,
      path: imageButtons.path,
      createdAt: imageButtons.createdAt,
      usedCount: usedCountSql,
      usedInTheme: sql<number>`exists(select 1 from links join pages on pages.id = links.page_id where links.image_button_id = image_buttons.id and pages.theme_id = ${themeId})`.mapWith(Boolean),
    })
    .from(imageButtons)
    .where(eq(imageButtons.userId, userId))
    .orderBy(desc(imageButtons.createdAt), desc(imageButtons.id));
}

export async function requireOwnedImageButton(userId: number, id: number) {
  const [row] = await db
    .select()
    .from(imageButtons)
    .where(and(eq(imageButtons.id, id), eq(imageButtons.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Image button tidak ditemukan atau bukan milik Anda.");
  return row;
}

export async function createImageButton(userId: number, label: string, webp: Buffer) {
  const path = await saveImage(webp, "image-buttons");
  const [row] = await db.insert(imageButtons).values({ userId, label, path }).returning();
  return { id: row.id, path: row.path };
}

// Urutan: tulis file baru -> update DB -> baru hapus file lama. Kalau gagal di tengah,
// path di DB gak pernah nunjuk file yang udah kehapus.
export async function replaceImageButtonImage(userId: number, id: number, webp: Buffer) {
  const existing = await requireOwnedImageButton(userId, id);
  const newPath = await saveImage(webp, "image-buttons");
  await db.update(imageButtons).set({ path: newPath }).where(eq(imageButtons.id, id));
  await deleteImage(existing.path);
}

export async function renameImageButton(userId: number, id: number, label: string) {
  await requireOwnedImageButton(userId, id);
  await db.update(imageButtons).set({ label }).where(eq(imageButtons.id, id));
}

export async function deleteImageButton(
  userId: number,
  id: number,
): Promise<{ ok: true } | { error: "in_use"; count: number }> {
  const existing = await requireOwnedImageButton(userId, id);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(links)
    .where(eq(links.imageButtonId, id));
  if (count > 0) return { error: "in_use", count };
  await db.delete(imageButtons).where(eq(imageButtons.id, id));
  await deleteImage(existing.path);
  return { ok: true };
}

// Dipakai import theme (label dari file orang lain bisa bentrok sama punya sendiri).
export async function uniqueImageButtonLabel(userId: number, base: string): Promise<string> {
  const rows = await db.select({ label: imageButtons.label }).from(imageButtons).where(eq(imageButtons.userId, userId));
  const labels = new Set(rows.map((r) => r.label));
  if (!labels.has(base)) return base;
  let i = 2;
  while (labels.has(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}
```

- [ ] **Step 8: Jalankan test, pastikan lulus**

Run: `node --import tsx --test lib/db/image-buttons.test.ts` → PASS (5 test).

- [ ] **Step 9: Implementasi server actions**

`app/dashboard/image-button-actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { readImageButtonWebp } from "@/lib/images/image-button-input";
import {
  createImageButton,
  deleteImageButton,
  listImageButtonsForExport,
  renameImageButton,
  replaceImageButtonImage,
} from "@/lib/db/image-buttons";
import { requireOwnedTheme } from "@/lib/db/theme";

type Result = { error?: string };

export async function createImageButtonAction(formData: FormData): Promise<Result> {
  const session = await requireSession();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Label wajib diisi." };
  const input = await readImageButtonWebp(formData);
  if ("error" in input) return { error: input.error };
  await createImageButton(session.userId, label, input.webp);
  revalidatePath("/dashboard");
  return {};
}

export async function replaceImageButtonImageAction(id: number, formData: FormData): Promise<Result> {
  const session = await requireSession();
  const input = await readImageButtonWebp(formData);
  if ("error" in input) return { error: input.error };
  await replaceImageButtonImage(session.userId, id, input.webp);
  // Gambar link berubah di halaman publik juga.
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
  return {};
}

export async function renameImageButtonAction(id: number, label: string): Promise<Result> {
  const session = await requireSession();
  const trimmed = label.trim();
  if (!trimmed) return { error: "Label wajib diisi." };
  await renameImageButton(session.userId, id, trimmed);
  revalidatePath("/dashboard");
  return {};
}

export async function deleteImageButtonAction(id: number): Promise<Result> {
  const session = await requireSession();
  const result = await deleteImageButton(session.userId, id);
  if ("error" in result) return { error: `Tidak bisa dihapus: dipakai di ${result.count} link.` };
  revalidatePath("/dashboard");
  return {};
}

export async function listImageButtonsForExportAction(themeId: number) {
  const session = await requireSession();
  await requireOwnedTheme(session.userId, themeId);
  return listImageButtonsForExport(session.userId, themeId);
}
```
Run: `npx tsc --noEmit` → bersih.

- [ ] **Step 10: Beri user command commit**
```bash
cd "O:/Project 2026/Linktree Alternative/Kitab-Link-Self-Hosted"
git add lib/images/placeholder.ts lib/images/placeholder.test.ts lib/images/image-button-input.ts lib/images/image-button-input.test.ts
git commit -m "Add placeholder generator and image button form input reader"
git add lib/db/image-buttons.ts lib/db/image-buttons.test.ts app/dashboard/image-button-actions.ts
git commit -m "Add image button queries and server actions"
```

---

### Task 4: UI library (outer tab "Image Buttons")

**Files:**
- Create: `app/dashboard/image-button-library.tsx`
- Modify: `app/dashboard/theme-editor.tsx` (type `OuterTab`, tab bar, render, props)
- Modify: `app/dashboard/page.tsx` (load + oper `imageButtons` ke `ThemeSection` → `ThemeEditor`)
- Modify: `lib/i18n.ts` (section `imageButtons` di kedua locale)

**Interfaces:**
- Consumes: `ImageButtonRow` (Task 3), action `create/replace/rename/deleteImageButtonAction`.
- Produces: `<ImageButtonLibrary buttons={ImageButtonRow[]} containerWidth={number} t={Dictionary} />`; prop baru `imageButtons: ImageButtonRow[]` di `ThemeEditor`; variabel `imageButtonLibrary` di `page.tsx`.

- [ ] **Step 1: Tambah string i18n (kedua locale)**

Cari awal tiap locale: `grep -n "^  id: {\|^  en: {" lib/i18n.ts`. Tepat setelah baris `  id: {` sisipkan, dan tepat setelah baris `  en: {` sisipkan versi Inggris:

ID:
```ts
    imageButtons: {
      tabTitle: "Image Buttons",
      title: "Library Image Button",
      desc: "Kumpulan gambar berlabel buat tombol card style Image. Ganti gambar di sini, semua link yang memakainya ikut berubah.",
      addTitle: "Tambah image button",
      labelField: "Label",
      labelPlaceholder: "mis. Banner Promo Oktober",
      modeUpload: "Upload gambar",
      modePlaceholder: "Placeholder solid",
      colorLabel: "Warna",
      widthLabel: "Lebar (px)",
      heightLabel: "Tinggi (px)",
      createButton: "Simpan image button",
      emptyHint: "Belum ada image button. Tambahkan yang pertama di atas.",
      usedIn: "Dipakai di {count} link",
      unused: "Belum dipakai",
      replaceImage: "Ganti gambar",
      replaceTitle: "Ganti gambar",
      replaceApply: "Ganti",
      rename: "Ganti label",
      delete: "Hapus",
      deleteConfirm: "Hapus image button ini?",
    },
```
EN:
```ts
    imageButtons: {
      tabTitle: "Image Buttons",
      title: "Image Button library",
      desc: "Labeled images for the Image card style. Replace an image here and every link using it changes too.",
      addTitle: "Add image button",
      labelField: "Label",
      labelPlaceholder: "e.g. October Promo Banner",
      modeUpload: "Upload image",
      modePlaceholder: "Solid placeholder",
      colorLabel: "Color",
      widthLabel: "Width (px)",
      heightLabel: "Height (px)",
      createButton: "Save image button",
      emptyHint: "No image buttons yet. Add your first one above.",
      usedIn: "Used in {count} links",
      unused: "Not used yet",
      replaceImage: "Replace image",
      replaceTitle: "Replace image",
      replaceApply: "Replace",
      rename: "Rename",
      delete: "Delete",
      deleteConfirm: "Delete this image button?",
    },
```

- [ ] **Step 2: Buat komponen library**

`app/dashboard/image-button-library.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeightCropFileInput } from "@/components/height-crop-file-input";
import { cn, FILE_INPUT_CLASS } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";
import type { ImageButtonRow } from "@/lib/db/image-buttons";
import {
  createImageButtonAction,
  deleteImageButtonAction,
  renameImageButtonAction,
  replaceImageButtonImageAction,
} from "./image-button-actions";

type Mode = "upload" | "placeholder";

// Pilihan sumber gambar: upload+crop (komponen yang sama kayak card style Image) atau
// placeholder solid (digenerate server). Field mode/placeholder* dibaca readImageButtonWebp.
function SourceFields({ t, outputWidth }: { t: Dictionary; outputWidth: number }) {
  const [mode, setMode] = useState<Mode>("upload");
  const labels: Record<Mode, string> = { upload: t.imageButtons.modeUpload, placeholder: t.imageButtons.modePlaceholder };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(["upload", "placeholder"] as Mode[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              "flex-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              mode === key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={mode} />
      {mode === "upload" ? (
        <HeightCropFileInput id="ib-image" name="image" outputWidth={outputWidth} className={FILE_INPUT_CLASS} t={t} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ib-color" className="text-xs">{t.imageButtons.colorLabel}</Label>
            <Input id="ib-color" name="placeholderColor" type="color" defaultValue="#000000" className="h-9 p-1" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ib-width" className="text-xs">{t.imageButtons.widthLabel}</Label>
            <Input id="ib-width" name="placeholderWidth" type="number" min={16} max={2000} defaultValue={outputWidth} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ib-height" className="text-xs">{t.imageButtons.heightLabel}</Label>
            <Input id="ib-height" name="placeholderHeight" type="number" min={16} max={2000} defaultValue={56} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ImageButtonLibrary({
  buttons,
  containerWidth,
  t,
}: {
  buttons: ImageButtonRow[];
  containerWidth: number;
  t: Dictionary;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [replacing, setReplacing] = useState<ImageButtonRow | null>(null);
  // Bump setiap create sukses -> remount form biar file input + crop bersih lagi.
  const [formKey, setFormKey] = useState(0);

  // onSubmit manual (bukan form action) -- React 19 auto-reset form abis action sukses
  // bikin input kelihatan balik ke nilai lama; kita reset sendiri lewat formKey.
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createImageButtonAction(new FormData(e.currentTarget));
    setPending(false);
    if (result.error) return setError(result.error);
    setFormKey((k) => k + 1);
    router.refresh();
  }

  async function handleReplace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!replacing) return;
    setPending(true);
    setError(null);
    const result = await replaceImageButtonImageAction(replacing.id, new FormData(e.currentTarget));
    setPending(false);
    if (result.error) return setError(result.error);
    setReplacing(null);
    router.refresh();
  }

  async function handleRename(button: ImageButtonRow, label: string) {
    if (!label.trim() || label === button.label) return;
    const result = await renameImageButtonAction(button.id, label);
    if (result.error) setError(result.error);
    router.refresh();
  }

  async function handleDelete(button: ImageButtonRow) {
    if (!window.confirm(t.imageButtons.deleteConfirm)) return;
    const result = await deleteImageButtonAction(button.id);
    if (result.error) setError(result.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold">{t.imageButtons.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t.imageButtons.desc}</p>

        <form key={formKey} onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 rounded-lg border bg-muted/50 p-3">
          <p className="text-xs font-medium">{t.imageButtons.addTitle}</p>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ib-label" className="text-xs">{t.imageButtons.labelField}</Label>
            <Input id="ib-label" name="label" placeholder={t.imageButtons.labelPlaceholder} required />
          </div>
          <SourceFields t={t} outputWidth={containerWidth} />
          <div>
            <Button type="submit" size="sm" disabled={pending}>{t.imageButtons.createButton}</Button>
          </div>
        </form>

        {error ? (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {buttons.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.imageButtons.emptyHint}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {buttons.map((button) => (
            <div key={button.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- gambar sudah diproses jadi webp sendiri */}
              <img src={`/uploads/${button.path}`} alt="" className="max-h-24 w-full rounded-lg object-contain" />
              <Input
                defaultValue={button.label}
                aria-label={t.imageButtons.rename}
                onBlur={(e) => handleRename(button, e.target.value)}
                className="h-8 text-sm font-medium"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {button.usedCount > 0 ? t.imageButtons.usedIn.replace("{count}", String(button.usedCount)) : t.imageButtons.unused}
                </span>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setReplacing(button)}>
                    <Pencil className="size-3.5" />
                    {t.imageButtons.replaceImage}
                  </Button>
                  <Button type="button" size="icon" variant="outline" title={t.imageButtons.delete} onClick={() => handleDelete(button)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {replacing ? (
        <Dialog open onOpenChange={(open) => !open && setReplacing(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t.imageButtons.replaceTitle}: {replacing.label}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReplace} className="flex flex-col gap-3">
              <SourceFields t={t} outputWidth={containerWidth} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReplacing(null)}>{t.common.cancel}</Button>
                <Button type="submit" disabled={pending}>{t.imageButtons.replaceApply}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Sambungkan ke `theme-editor.tsx`**

- Baris 39: `type OuterTab = "presets" | "custom" | "images" | "import";`
- Tab bar (baris ~669): `(["presets", "custom", "images", "import"] as OuterTab[])`.
- `OUTER_TAB_LABELS` (baris ~636): tambah `images: t.imageButtons.tabTitle,`.
- Import baru di atas file: `import { ImageButtonLibrary } from "./image-button-library";` dan `import type { ImageButtonRow } from "@/lib/db/image-buttons";`.
- Props `ThemeEditor` (tipe di baris ~440 dan destructure di atasnya): tambah `imageButtons: ImageButtonRow[];` / `imageButtons,`.
- Tepat sebelum blok `{outerTab === "import" ? (` (baris ~1491) tambah:
```tsx
        {outerTab === "images" ? (
          <ImageButtonLibrary buttons={imageButtons} containerWidth={tokens.containerWidth} t={t} />
        ) : null}
```

- [ ] **Step 4: Sambungkan ke `page.tsx`**

- Import: `import { listImageButtons } from "@/lib/db/image-buttons";`
- Setelah blok `const [themeLibrary, themePreviewBoard] = ...` (baris ~246) tambah:
```ts
  const imageButtonLibrary =
    activeTab === "theme" || activeTab === "links" ? await listImageButtons(session.userId) : [];
```
- Di `<ThemeSection ...>` (baris ~434) tambah prop `imageButtons={imageButtonLibrary}`; di definisi `ThemeSection` (baris ~672) tambahkan `imageButtons` ke destructure + tipe `imageButtons: Awaited<ReturnType<typeof listImageButtons>>;` dan teruskan `imageButtons={imageButtons}` ke `<ThemeEditor>`.

- [ ] **Step 5: Verifikasi**

Run: `npx tsc --noEmit && npm run lint` → bersih. Uji manual di http://localhost:3000/dashboard?tab=theme : buka tab "Image Buttons", tambah satu lewat upload dan satu lewat placeholder (warna #000000, 600×56), rename lewat blur, ganti gambar lewat dialog, hapus yang belum dipakai. Expected: kartu muncul, label tersimpan setelah refresh, "Belum dipakai" tampil.

- [ ] **Step 6: Beri user command commit**
```bash
cd "O:/Project 2026/Linktree Alternative/Kitab-Link-Self-Hosted"
git add lib/i18n.ts app/dashboard/image-button-library.tsx app/dashboard/theme-editor.tsx app/dashboard/page.tsx
git commit -m "Add Image Buttons library tab to theme customization"
```

---

### Task 5: Picker di modal link + upload berlabel

**Files:**
- Modify: `app/dashboard/link-form-modal.tsx` (state, bagian `displayStyle === "image"` baris ~438-474, props)
- Modify: `app/dashboard/actions.ts` (`saveLinkAction`)
- Modify: `app/dashboard/board.tsx` (prop `imageButtons` → `LinkFormModal`), `app/dashboard/page.tsx` (oper ke `<Board>`)
- Modify: `lib/i18n.ts` (key `linkModal.*`)

**Interfaces:**
- Consumes: `ImageButtonRow`, `readImageButtonWebp(formData, "newImageButtonFile")`, `createImageButton`, `requireOwnedImageButton`.
- Produces: form field `imageButtonId` (id terpilih), `newImageButtonLabel`, `newImageButtonFile`; `saveLinkAction` menyimpan `links.imageButtonId`.

- [ ] **Step 1: Tambah string i18n**

Di `linkModal` kedua locale, setelah baris `imageMainLabel: ...` tambahkan:
ID:
```ts
      imagePickerLabel: "Pilih image button",
      imagePickerEmpty: "Belum ada image button. Upload gambar baru di bawah, atau buat di Theme > Image Buttons.",
      imageUploadNewLabel: "Atau upload gambar baru",
      imageNewLabelPlaceholder: "Label (wajib untuk gambar baru)",
```
EN:
```ts
      imagePickerLabel: "Pick an image button",
      imagePickerEmpty: "No image buttons yet. Upload a new image below, or create one under Theme > Image Buttons.",
      imageUploadNewLabel: "Or upload a new image",
      imageNewLabelPlaceholder: "Label (required for a new image)",
```
(Pesan error validasi dikembalikan `saveLinkAction` sebagai string Indonesia hardcoded, sama seperti error lain di fungsi itu; tidak butuh key i18n.)

- [ ] **Step 2: Ubah `saveLinkAction`**

Di `app/dashboard/actions.ts` tambah import:
```ts
import { readImageButtonWebp } from "@/lib/images/image-button-input";
import { createImageButton, requireOwnedImageButton } from "@/lib/db/image-buttons";
```
`await requireOwnedPage(pageId);` di awal fungsi (baris 133) diubah jadi `const page = await requireOwnedPage(pageId);`.
Tepat sebelum `const values = {` (baris ~202) sisipkan:
```ts
  // Card style Image: gambar datang dari library (imageButtonId) ATAU upload baru yang wajib
  // berlabel dan otomatis masuk library. Style lain gak pakai image button sama sekali.
  let imageButtonId: number | null = null;
  if (displayStyle === "image") {
    const newFile = formData.get("newImageButtonFile");
    if (newFile instanceof File && newFile.size > 0) {
      const newLabel = String(formData.get("newImageButtonLabel") ?? "").trim();
      if (!newLabel) return { error: "Label wajib diisi untuk gambar yang diupload." };
      const input = await readImageButtonWebp(formData, "newImageButtonFile");
      if ("error" in input) return { error: input.error };
      imageButtonId = (await createImageButton(page.userId, newLabel, input.webp)).id;
    } else {
      const picked = Number(formData.get("imageButtonId"));
      if (Number.isInteger(picked) && picked > 0) {
        await requireOwnedImageButton(page.userId, picked); // tolak id milik user lain
        imageButtonId = picked;
      }
    }
    if (imageButtonId === null) {
      const [current] = linkId ? await db.select().from(links).where(eq(links.id, linkId)).limit(1) : [];
      if (!current?.thumbnailPath) return { error: "Pilih image button atau upload gambar baru." };
    }
  }
```
Dan tambahkan `imageButtonId,` ke objek `values` (setelah `imageShadow,`). (Untuk style non-image `imageButtonId` bernilai `null`, jadi mengganti style dari image ke lain otomatis melepas referensinya.)

- [ ] **Step 3: Ubah modal**

Di `link-form-modal.tsx`:
- Import: `import type { ImageButtonRow } from "@/lib/db/image-buttons";`
- Props `LinkFormModal` (tipe di baris ~96-110): tambah `imageButtons: ImageButtonRow[];` dan destructure `imageButtons`.
- State (dekat `imageHideBackground`, baris ~160):
```ts
  const [imageButtonId, setImageButtonId] = useState<number | null>(state?.mode === "edit" ? state.link.imageButtonId : null);
```
- Ganti blok `<div className="flex flex-col gap-2"> <Label ...>{t.linkModal.imageMainLabel}</Label> ... </div>` plus `<input type="hidden" name="removeThumbnail" .../>` (baris 444-474) dengan:
```tsx
              <div className="flex flex-col gap-2">
                <Label className="text-xs">{t.linkModal.imagePickerLabel}</Label>
                {imageButtons.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t.linkModal.imagePickerEmpty}</p>
                ) : (
                  <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto">
                    {imageButtons.map((button) => (
                      <button
                        key={button.id}
                        type="button"
                        onClick={() => setImageButtonId(button.id)}
                        className={cn(
                          "flex flex-col gap-1 rounded-lg border bg-card p-2 text-left transition-colors",
                          imageButtonId === button.id ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- gambar sudah webp */}
                        <img src={`/uploads/${button.path}`} alt="" className="max-h-12 w-full rounded object-contain" />
                        <span className="truncate text-xs font-medium">{button.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                <input type="hidden" name="imageButtonId" value={imageButtonId ?? ""} />
              </div>

              <div className="flex flex-col gap-2 border-t pt-3">
                <Label className="text-xs">{t.linkModal.imageUploadNewLabel}</Label>
                <Input name="newImageButtonLabel" placeholder={t.linkModal.imageNewLabelPlaceholder} />
                <HeightCropFileInput
                  id="newImageButtonFile"
                  name="newImageButtonFile"
                  outputWidth={containerWidth}
                  className={FILE_INPUT_CLASS}
                  t={t}
                />
              </div>
```
- JANGAN hapus state `removeThumbnail`/`setRemoveThumbnail`: tab media thumbnail untuk style non-image masih memakainya lewat `removeMedia`. Cukup hapus penggunaannya di blok image di atas.

- [ ] **Step 4: Oper prop dari `board.tsx` dan `page.tsx`**

`board.tsx`: tambah ke props `Board` (baris ~327-347) `imageButtons: ImageButtonRow[]` (+ import tipe) dan teruskan `imageButtons={imageButtons}` ke `<LinkFormModal>` (baris ~704).
`page.tsx`: di `<Board ...>` (baris ~411) tambah `imageButtons={imageButtonLibrary}` (variabel dari Task 4).

- [ ] **Step 5: Verifikasi**

Run: `npx tsc --noEmit && npm run lint && npm test` → bersih/lulus.
Manual di http://localhost:3000/dashboard?tab=links: (a) edit link image hasil migrasi → image button-nya terpilih (border biru); (b) pilih image button lain, simpan → preview HP berganti; (c) ganti gambar button itu di Theme > Image Buttons → preview link ikut berubah tanpa edit link; (d) tambah link baru card style Image dengan upload baru TANPA label → muncul error label; dengan label → muncul di library; (e) coba hapus image button yang dipakai → ditolak "dipakai di N link".

- [ ] **Step 6: Beri user command commit**
```bash
cd "O:/Project 2026/Linktree Alternative/Kitab-Link-Self-Hosted"
git add app/dashboard/actions.ts lib/i18n.ts app/dashboard/link-form-modal.tsx app/dashboard/board.tsx app/dashboard/page.tsx
git commit -m "Pick or upload labeled image buttons in the link form"
```

---

### Task 6: Export/import theme v2 dengan gambar

**Files:**
- Create: `lib/theme-bundle.ts`, `app/dashboard/theme-bundle-actions.ts`, `app/dashboard/theme-export-dialog.tsx`
- Test: `lib/theme-bundle.test.ts`
- Modify: `app/dashboard/theme-actions.ts` (`importThemeAction`), `app/dashboard/theme-editor.tsx` (tombol export, pesan error import), `next.config.ts`, `lib/i18n.ts`

**Interfaces:**
- Consumes: `listImageButtonsForExportAction`, `uniqueImageButtonLabel`, `createImageButton`, `listImageButtons`, `parseThemeTokens`, `saveImage/saveFont/resolveUploadPath`, `processImage`.
- Produces:
  - `type LoadedAsset = { kind: "image" | "font"; ext: string; data: Buffer }`
  - `buildBundle({ tokens, background, font, buttons }): ThemeBundle`
  - `parseBundle(raw: unknown): ParsedBundle | { error: "wrong_format" | "too_large" | "bad_asset" }` dengan `ParsedBundle = { tokens: Record<string, unknown>; background: LoadedAsset | null; font: LoadedAsset | null; buttons: { label: string; image: LoadedAsset }[] }`
  - `isBundle(value: unknown): boolean`
  - `isSafeUploadPath(p: string): boolean`
  - `exportThemeBundleAction(tokens: ThemeTokens, buttonIds: number[]): Promise<{ json: string } | { error: string }>`
  - `ImportThemeResult` error union ditambah `"too_large" | "bad_asset"`.

- [ ] **Step 1: Tulis test bundle yang gagal**

`lib/theme-bundle.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBundle, parseBundle, isBundle, isSafeUploadPath, MAX_BUNDLE_ASSETS, type LoadedAsset } from "./theme-bundle";
import { DEFAULT_THEME } from "./theme";

const img = (s: string): LoadedAsset => ({ kind: "image", ext: "webp", data: Buffer.from(s) });
const font: LoadedAsset = { kind: "font", ext: "ttf", data: Buffer.from("fontbytes") };

test("round-trip: tokens, background, font, dan image button + label kembali utuh", () => {
  const bundle = buildBundle({
    tokens: { ...DEFAULT_THEME, backgroundImage: "theme-backgrounds/x.webp", customFontUrl: "theme-fonts/y.ttf" },
    background: img("bg"),
    font,
    buttons: [{ label: "Promo", image: img("a") }, { label: "Banner", image: img("b") }],
  });
  const parsed = parseBundle(JSON.parse(JSON.stringify(bundle)));
  assert.ok(!("error" in parsed));
  assert.equal(parsed.background?.data.toString(), "bg");
  assert.equal(parsed.font?.ext, "ttf");
  assert.deepEqual(parsed.buttons.map((b) => [b.label, b.image.data.toString()]), [["Promo", "a"], ["Banner", "b"]]);
  assert.equal(parsed.tokens.backgroundImage, null);
  assert.equal(parsed.tokens.customFontUrl, null);
});

test("tanpa aset: tokens jadi null untuk background/font", () => {
  const bundle = buildBundle({ tokens: DEFAULT_THEME, background: null, font: null, buttons: [] });
  const parsed = parseBundle(JSON.parse(JSON.stringify(bundle)));
  assert.ok(!("error" in parsed) && parsed.buttons.length === 0 && parsed.background === null);
});

test("format lama / bukan bundle ditolak sebagai wrong_format", () => {
  assert.equal(isBundle({ fontFamily: "inter" }), false);
  assert.deepEqual(parseBundle({ fontFamily: "inter" }), { error: "wrong_format" });
});

test("ekstensi di luar whitelist, base64 rusak, kind salah -> bad_asset", () => {
  const base = { kitablink_theme: 2, tokens: {}, imageButtons: [{ label: "x", asset: "btn0" }] };
  const bad = (asset: unknown) => parseBundle({ ...base, assets: { btn0: asset } });
  assert.deepEqual(bad({ kind: "image", ext: "exe", b64: "AAAA" }), { error: "bad_asset" });
  assert.deepEqual(bad({ kind: "image", ext: "webp", b64: "!!notbase64!!" }), { error: "bad_asset" });
  assert.deepEqual(bad({ kind: "font", ext: "webp", b64: "AAAA" }), { error: "bad_asset" });
  assert.deepEqual(parseBundle({ ...base, assets: {} }), { error: "bad_asset" }); // referensi ke aset yang gak ada
});

test("terlalu banyak aset -> too_large", () => {
  const assets: Record<string, unknown> = {};
  for (let i = 0; i <= MAX_BUNDLE_ASSETS; i++) assets[`a${i}`] = { kind: "image", ext: "webp", b64: "AAAA" };
  assert.deepEqual(parseBundle({ kitablink_theme: 2, tokens: {}, imageButtons: [], assets }), { error: "too_large" });
});

test("isSafeUploadPath menolak traversal & path absolut", () => {
  assert.equal(isSafeUploadPath("theme-backgrounds/a.webp"), true);
  assert.equal(isSafeUploadPath("../data/kitab-link.db"), false);
  assert.equal(isSafeUploadPath("a/../../b"), false);
  assert.equal(isSafeUploadPath("/etc/passwd"), false);
  assert.equal(isSafeUploadPath("C:\\Windows\\x"), false);
  assert.equal(isSafeUploadPath(""), false);
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --import tsx --test lib/theme-bundle.test.ts` → FAIL (modul belum ada).

- [ ] **Step 3: Implementasi `lib/theme-bundle.ts`**

```ts
import { FONT_UPLOAD_EXTENSIONS } from "@/lib/font-library";
import type { ThemeTokens } from "@/lib/theme";

export const BUNDLE_VERSION = 2;
export const MAX_BUNDLE_ASSETS = 100;
export const MAX_BUNDLE_BYTES = 15 * 1024 * 1024; // total ukuran aset setelah di-decode
const IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg", "gif"];
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

export type LoadedAsset = { kind: "image" | "font"; ext: string; data: Buffer };
type BundleAsset = { kind: "image" | "font"; ext: string; b64: string };
export type ThemeBundle = {
  kitablink_theme: 2;
  tokens: Record<string, unknown>;
  imageButtons: { label: string; asset: string }[];
  assets: Record<string, BundleAsset>;
};
export type ParsedBundle = {
  tokens: Record<string, unknown>;
  background: LoadedAsset | null;
  font: LoadedAsset | null;
  buttons: { label: string; image: LoadedAsset }[];
};
export type BundleError = "wrong_format" | "too_large" | "bad_asset";

export function isBundle(value: unknown): boolean {
  return typeof value === "object" && value !== null && (value as { kitablink_theme?: unknown }).kitablink_theme === BUNDLE_VERSION;
}

// Path upload relatif yang aman dibaca dari disk -- tokens bisa datang dari file import
// orang lain, jadi backgroundImage/customFontUrl gak boleh dipakai buat baca file di luar
// folder uploads.
export function isSafeUploadPath(p: string): boolean {
  if (!p || p.startsWith("/") || p.includes("\\") || /^[a-zA-Z]:/.test(p)) return false;
  return !p.split("/").some((part) => part === ".." || part === "");
}

const toBundleAsset = (a: LoadedAsset): BundleAsset => ({ kind: a.kind, ext: a.ext, b64: a.data.toString("base64") });

export function buildBundle(input: {
  tokens: ThemeTokens;
  background: LoadedAsset | null;
  font: LoadedAsset | null;
  buttons: { label: string; image: LoadedAsset }[];
}): ThemeBundle {
  const assets: Record<string, BundleAsset> = {};
  const tokens: Record<string, unknown> = { ...input.tokens, backgroundImage: null, customFontUrl: null };
  if (input.background) {
    assets.bg = toBundleAsset(input.background);
    tokens.backgroundImage = "asset:bg";
  }
  if (input.font) {
    assets.font = toBundleAsset(input.font);
    tokens.customFontUrl = "asset:font";
  }
  const imageButtons = input.buttons.map((button, i) => {
    assets[`btn${i}`] = toBundleAsset(button.image);
    return { label: button.label, asset: `btn${i}` };
  });
  return { kitablink_theme: BUNDLE_VERSION, tokens, imageButtons, assets };
}

export function parseBundle(raw: unknown): ParsedBundle | { error: BundleError } {
  if (!isBundle(raw)) return { error: "wrong_format" };
  const bundle = raw as Partial<ThemeBundle>;
  if (typeof bundle.tokens !== "object" || bundle.tokens === null || Array.isArray(bundle.tokens)) {
    return { error: "wrong_format" };
  }
  const rawAssets = typeof bundle.assets === "object" && bundle.assets !== null ? bundle.assets : {};
  const keys = Object.keys(rawAssets);
  if (keys.length > MAX_BUNDLE_ASSETS) return { error: "too_large" };

  const decoded = new Map<string, LoadedAsset>();
  let total = 0;
  for (const key of keys) {
    const asset = rawAssets[key] as Partial<BundleAsset> | undefined;
    if (!asset || (asset.kind !== "image" && asset.kind !== "font")) return { error: "bad_asset" };
    const ext = String(asset.ext ?? "").toLowerCase();
    const allowed = asset.kind === "image" ? IMAGE_EXTENSIONS : FONT_UPLOAD_EXTENSIONS;
    if (!allowed.includes(ext)) return { error: "bad_asset" };
    if (typeof asset.b64 !== "string" || !BASE64.test(asset.b64)) return { error: "bad_asset" };
    const data = Buffer.from(asset.b64, "base64");
    total += data.length;
    if (total > MAX_BUNDLE_BYTES) return { error: "too_large" };
    decoded.set(key, { kind: asset.kind, ext, data });
  }

  const resolve = (ref: unknown, kind: "image" | "font"): LoadedAsset | null | "bad" => {
    if (typeof ref !== "string" || !ref.startsWith("asset:")) return null;
    const asset = decoded.get(ref.slice("asset:".length));
    return asset && asset.kind === kind ? asset : "bad";
  };
  const background = resolve(bundle.tokens.backgroundImage, "image");
  const font = resolve(bundle.tokens.customFontUrl, "font");
  if (background === "bad" || font === "bad") return { error: "bad_asset" };

  const buttons: ParsedBundle["buttons"] = [];
  for (const entry of Array.isArray(bundle.imageButtons) ? bundle.imageButtons : []) {
    const label = typeof entry?.label === "string" ? entry.label.trim() : "";
    const image = typeof entry?.asset === "string" ? decoded.get(entry.asset) : undefined;
    if (!label || !image || image.kind !== "image") return { error: "bad_asset" };
    buttons.push({ label, image });
  }

  return { tokens: { ...bundle.tokens, backgroundImage: null, customFontUrl: null }, background, font, buttons };
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `node --import tsx --test lib/theme-bundle.test.ts` → PASS (6 test).

- [ ] **Step 5: Server action export**

`app/dashboard/theme-bundle-actions.ts`:
```ts
"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireSession } from "@/lib/auth/require-session";
import { listImageButtons } from "@/lib/db/image-buttons";
import { resolveUploadPath } from "@/lib/images/storage";
import { parseThemeTokens, type ThemeTokens } from "@/lib/theme";
import { buildBundle, isSafeUploadPath, type LoadedAsset } from "@/lib/theme-bundle";

// File yang udah hilang dari disk dilewati (null), export gak boleh gagal gara-gara itu.
async function loadAsset(kind: "image" | "font", relativePath: string | null): Promise<LoadedAsset | null> {
  if (!relativePath || !isSafeUploadPath(relativePath)) return null;
  try {
    const data = await readFile(resolveUploadPath(relativePath));
    const ext = path.extname(relativePath).slice(1).toLowerCase();
    return { kind, ext, data };
  } catch {
    return null;
  }
}

// tokens datang dari state editor (termasuk yang belum disimpan) -- sama kayak export
// lama yang cuma stringify state client. buttonIds di-filter ke milik user sendiri.
export async function exportThemeBundleAction(
  tokens: ThemeTokens,
  buttonIds: number[],
): Promise<{ json: string } | { error: string }> {
  const session = await requireSession();
  const safeTokens = parseThemeTokens(JSON.stringify(tokens));
  const mine = await listImageButtons(session.userId);
  const chosen = mine.filter((b) => buttonIds.includes(b.id));

  const buttons: { label: string; image: LoadedAsset }[] = [];
  for (const button of chosen) {
    const image = await loadAsset("image", button.path);
    if (image) buttons.push({ label: button.label, image });
  }
  const bundle = buildBundle({
    tokens: safeTokens,
    background: await loadAsset("image", safeTokens.backgroundImage),
    font: await loadAsset("font", safeTokens.customFontUrl),
    buttons,
  });
  return { json: JSON.stringify(bundle) };
}
```

- [ ] **Step 6: Import mengenali v2**

Di `app/dashboard/theme-actions.ts`: tambah import
```ts
import { isBundle, parseBundle } from "@/lib/theme-bundle";
import { processImage } from "@/lib/images/process-image";
import { saveFont, saveImage } from "@/lib/images/storage";
import { createImageButton, uniqueImageButtonLabel } from "@/lib/db/image-buttons";
```
Ubah tipe (baris 61): `export type ImportThemeResult = { error: "empty" | "invalid_json" | "wrong_format" | "too_large" | "bad_asset" } | { error?: undefined };`
Setelah pemeriksaan `wrong_format` (baris 79) dan sebelum `const next = parseThemeTokens(...)` sisipkan:
```ts
  let importedTokens: unknown = parsed;
  if (isBundle(parsed)) {
    const bundle = parseBundle(parsed);
    if ("error" in bundle) return { error: bundle.error };
    const tokens: Record<string, unknown> = { ...bundle.tokens };
    if (bundle.background) {
      const webp = await processImage(bundle.background.data, 1600);
      tokens.backgroundImage = await saveImage(webp, "theme-backgrounds");
    }
    if (bundle.font) tokens.customFontUrl = await saveFont(bundle.font.data, bundle.font.ext);
    for (const button of bundle.buttons) {
      const label = await uniqueImageButtonLabel(page.userId, button.label);
      await createImageButton(page.userId, label, await processImage(button.image.data, 1600));
    }
    importedTokens = tokens;
  }
```
dan ganti `const next = parseThemeTokens(JSON.stringify(parsed));` dengan `const next = parseThemeTokens(JSON.stringify(importedTokens));`.

- [ ] **Step 7: Naikkan batas body server action**

`next.config.ts`: ganti `bodySizeLimit: "8mb",` dengan `bodySizeLimit: "20mb",` dan tambah satu kalimat di komentarnya: "20MB karena import theme v2 membawa aset base64 (batas aset 15MB + overhead)".

- [ ] **Step 8: String i18n export/import**

Di `theme` kedua locale, setelah `exportJson: ...`:
ID:
```ts
      exportDialogTitle: "Export theme",
      exportDialogDesc: "Pilih image button yang ikut dibawa di file export. Background dan font theme otomatis ikut.",
      exportUsedBadge: "Dipakai di theme ini",
      exportDownload: "Download",
      exportFailed: "Export gagal.",
      importErrorTooLarge: "File terlalu besar atau berisi terlalu banyak gambar.",
      importErrorBadAsset: "File berisi gambar/font yang tidak valid.",
```
EN:
```ts
      exportDialogTitle: "Export theme",
      exportDialogDesc: "Choose which image buttons are included in the export. The theme background and font are always included.",
      exportUsedBadge: "Used in this theme",
      exportDownload: "Download",
      exportFailed: "Export failed.",
      importErrorTooLarge: "The file is too large or contains too many images.",
      importErrorBadAsset: "The file contains an invalid image or font.",
```

- [ ] **Step 9: Dialog export**

`app/dashboard/theme-export-dialog.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { Dictionary } from "@/lib/i18n";
import type { ThemeTokens } from "@/lib/theme";
import { exportThemeBundleAction } from "./theme-bundle-actions";

export type ExportRow = { id: number; label: string; path: string; usedInTheme: boolean };

export function downloadJson(json: string, name: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(name || "theme").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ThemeExportDialog({
  rows,
  tokens,
  themeName,
  t,
  onClose,
}: {
  rows: ExportRow[];
  tokens: ThemeTokens;
  themeName: string;
  t: Dictionary;
  onClose: () => void;
}) {
  // Default: nyala cuma buat yang dipakai di theme ini, sisanya mati (gambar pribadi
  // yang gak nyambung ke theme gak ikut kekirim tanpa sengaja).
  const [selected, setSelected] = useState<Set<number>>(() => new Set(rows.filter((r) => r.usedInTheme).map((r) => r.id)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleDownload() {
    setPending(true);
    setError(null);
    const result = await exportThemeBundleAction(tokens, [...selected]);
    setPending(false);
    if ("error" in result) return setError(result.error || t.theme.exportFailed);
    downloadJson(result.json, themeName);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.theme.exportDialogTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t.theme.exportDialogDesc}</p>
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border p-2">
              <div className="flex min-w-0 items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- gambar sudah webp */}
                <img src={`/uploads/${row.path}`} alt="" className="h-10 w-16 shrink-0 rounded object-contain" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.label}</p>
                  {row.usedInTheme ? <p className="text-[11px] font-medium text-primary">{t.theme.exportUsedBadge}</p> : null}
                </div>
              </div>
              <Switch checked={selected.has(row.id)} onCheckedChange={(on) => toggle(row.id, on)} />
            </div>
          ))}
        </div>
        {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button type="button" onClick={handleDownload} disabled={pending}>{t.theme.exportDownload}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 10: Ganti tombol export di `theme-editor.tsx`**

- Import: `import { ThemeExportDialog, downloadJson, type ExportRow } from "./theme-export-dialog";`, `import { exportThemeBundleAction } from "./theme-bundle-actions";`, dan tambahkan `listImageButtonsForExportAction` ke import dari `./image-button-actions`.
- State: `const [exportRows, setExportRows] = useState<ExportRow[] | null>(null);`
- Ganti fungsi `exportJson` (baris 617-625) dengan:
```ts
  // Tanpa image button di library -> langsung download (gak perlu dialog pilih apa-apa).
  async function exportJson() {
    if (!editingId) return;
    const rows = await listImageButtonsForExportAction(editingId);
    if (rows.length === 0) {
      const result = await exportThemeBundleAction(tokens, []);
      if ("json" in result) downloadJson(result.json, name);
      return;
    }
    setExportRows(rows.map((r) => ({ id: r.id, label: r.label, path: r.path, usedInTheme: r.usedInTheme })));
  }
```
- Tepat sebelum `{!isPresetSelected || previewPreset ? (` untuk `DashboardPreviewPanel` (baris ~1531) tambah:
```tsx
      {exportRows ? (
        <ThemeExportDialog rows={exportRows} tokens={tokens} themeName={name} t={t} onClose={() => setExportRows(null)} />
      ) : null}
```
- Di `handleImportTheme` (baris 486-488) tambah:
```ts
    else if (result.error === "too_large") setImportError(t.theme.importErrorTooLarge);
    else if (result.error === "bad_asset") setImportError(t.theme.importErrorBadAsset);
```

- [ ] **Step 11: Verifikasi penuh**

Run: `npx tsc --noEmit && npm run lint && npm test` → semua lulus.
Manual (pakai data uji TERPISAH, jangan mutasi data asli — buat user/theme uji atau backup DB dulu):
1. Theme dengan background image + minimal 2 image button, salah satu dipakai link di page yang memakai theme itu. Klik Export JSON → dialog tampil; yang dipakai bertanda "Dipakai di theme ini" dan menyala, yang lain mati. Download.
2. Buka file JSON: ada `kitablink_theme: 2`, `assets`, tidak ada path `/uploads` di `tokens`.
3. Import file itu (tab Import) → theme baru terbentuk dengan background tampil, dan image button yang diekspor muncul di tab Image Buttons (label dengan akhiran `(2)` bila bentrok).
4. File lama (JSON tokens polos) masih bisa diimport.
5. Edit file: ubah satu `ext` jadi `exe` → import menampilkan "File berisi gambar/font yang tidak valid."

- [ ] **Step 12: Beri user command commit**
```bash
cd "O:/Project 2026/Linktree Alternative/Kitab-Link-Self-Hosted"
git add lib/theme-bundle.ts lib/theme-bundle.test.ts
git commit -m "Add theme bundle format v2 (build/parse with embedded assets)"
git add app/dashboard/theme-bundle-actions.ts app/dashboard/theme-export-dialog.tsx app/dashboard/theme-actions.ts app/dashboard/theme-editor.tsx next.config.ts lib/i18n.ts
git commit -m "Export and import themes with image buttons, background, and custom font"
```

---

## Self-Review

**Spec coverage:** data & migrasi (Task 1) · resolusi efektif + semua konsumen `thumbnailPath` (Task 2: board, public, analytics; `app/r/[linkId]/route.ts` tidak perlu diubah karena hanya memakai row `links` mentah untuk menghitung href, tidak menampilkan gambar) · library CRUD + placeholder + blokir hapus (Task 3-4) · pakai di link + upload berlabel wajib (Task 5) · dialog export dengan toggle pill + penanda + default (Task 6) · import v2 + validasi + format lama tetap jalan (Task 6) · test untuk semua baris Review Focus. Spec "link lama otomatis dipindah" = Task 1.

**Placeholder scan:** tidak ada TBD/TODO. Satu tempat bersyarat sengaja eksplisit: Task 2 Step 6 (tambah `imageButtonId: null` di literal `BoardLink` lain bila `tsc` melaporkannya, dengan perintah grep untuk menemukannya).

**Konsistensi tipe:** `ImageButtonRow` (Task 3) dipakai Task 4/5; `LoadedAsset`/`ParsedBundle` (Task 6) konsisten antara `theme-bundle.ts`, action export, dan import; `ExportRow` di dialog cocok dengan hasil `listImageButtonsForExportAction` (field `usedCount`/`createdAt` diabaikan saat map). `BoardLink.imageButtonId` (Task 2) dipakai modal (Task 5). `imageButtonLibrary` di `page.tsx` dibuat di Task 4 dan dipakai Task 5.

**Risiko yang diketahui:** nama tabel/kolom di raw SQL (`links.image_button_id`, `image_buttons`, `pages.theme_id`) harus sama dengan hasil `drizzle-kit generate`; test Task 3 akan gagal keras bila beda. Raw SQL korelasi di `usedCountSql` sengaja memakai nama tabel literal, bukan referensi kolom drizzle.
