import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import sharp from "sharp";

// Modul db di-cache antar test (1 DB in-memory dipakai bareng), jadi username/slug harus unik per setup.
let seq = 0;

async function setup() {
  const n = ++seq;
  process.env.DATABASE_PATH = ":memory:";
  process.env.UPLOAD_PATH = mkdtempSync(path.join(tmpdir(), "kl-ib-"));
  const { db } = await import("./index");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const schema = await import("./schema");
  const mod = await import("./image-buttons");
  const { resolveUploadPath } = await import("@/lib/images/storage");
  const [u1] = await db.insert(schema.users).values({ username: `u1-${n}`, passwordHash: "x" }).returning();
  const [u2] = await db.insert(schema.users).values({ username: `u2-${n}`, passwordHash: "x" }).returning();
  const [page] = await db.insert(schema.pages).values({ userId: u1.id, slug: `p-${n}` }).returning();
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
