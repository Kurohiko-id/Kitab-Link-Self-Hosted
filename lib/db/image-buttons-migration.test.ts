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
