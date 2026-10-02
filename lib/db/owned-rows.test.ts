import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// DB temp + migration asli, biar yang dites skema beneran (bukan mock). Import dinamis
// karena lib/db/index.ts baca DATABASE_PATH saat modul di-load.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "owned-rows-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");

async function setup() {
  const { db } = await import("./index");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { users, pages, links, linkGroups } = await import("./schema");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  const [user] = await db.insert(users).values({ username: "t", passwordHash: "x" }).returning();
  const [pageA] = await db.insert(pages).values({ userId: user.id, slug: "a" }).returning();
  const [pageB] = await db.insert(pages).values({ userId: user.id, slug: "b" }).returning();
  const [linkB] = await db.insert(links).values({ pageId: pageB.id, title: "b", url: "https://b.test" }).returning();
  const [groupB] = await db.insert(linkGroups).values({ pageId: pageB.id, name: "gb" }).returning();
  return { pageA, pageB, linkB, groupB };
}

test("link/group page B ditolak kalau dipanggil dengan pageId A, diterima dengan pageId B", async () => {
  const { pageA, pageB, linkB, groupB } = await setup();
  const rows = await import("./owned-rows");

  assert.equal(await rows.findOwnedLink(pageA.id, linkB.id), undefined);
  assert.equal(await rows.findOwnedGroup(pageA.id, groupB.id), undefined);
  await assert.rejects(rows.requireOwnedLink(pageA.id, linkB.id));
  await assert.rejects(rows.requireOwnedGroup(pageA.id, groupB.id));
  await assert.rejects(rows.assertOwnedIds(pageA.id, { linkIds: [linkB.id] }));
  await assert.rejects(rows.assertOwnedIds(pageA.id, { groupIds: [groupB.id] }));

  assert.equal((await rows.requireOwnedLink(pageB.id, linkB.id)).id, linkB.id);
  assert.equal((await rows.requireOwnedGroup(pageB.id, groupB.id)).id, groupB.id);
  await rows.assertOwnedIds(pageB.id, { linkIds: [linkB.id], groupIds: [groupB.id] });
  await rows.assertOwnedIds(pageA.id, {});
});
