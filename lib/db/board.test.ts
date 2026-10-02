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
