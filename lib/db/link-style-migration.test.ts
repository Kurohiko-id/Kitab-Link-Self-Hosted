import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { applyMigrations, journalTags } from "./test-helpers";

test("migrasi 0037 menambah style_override_json, link lama tetap null dan bisa diisi", () => {
  const target = journalTags().findIndex((tag) => tag.startsWith("0037_"));
  assert.ok(target > 0, "migration 0037 belum ada");

  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  applyMigrations(sqlite, 0, target);
  sqlite.exec(`
    INSERT INTO users (username, password_hash) VALUES ('u1', 'x');
    INSERT INTO pages (user_id, slug) VALUES (1, 'p1');
    INSERT INTO links (page_id, title, url) VALUES (1, 'Lama', 'https://a.test');
  `);

  applyMigrations(sqlite, target);

  const row = sqlite.prepare("SELECT style_override_json AS s FROM links WHERE title = 'Lama'").get() as { s: string | null };
  assert.equal(row.s, null);
  sqlite.prepare("UPDATE links SET style_override_json = ? WHERE title = 'Lama'").run('{"fontSize":20}');
  const after = sqlite.prepare("SELECT style_override_json AS s FROM links WHERE title = 'Lama'").get() as { s: string };
  assert.equal(after.s, '{"fontSize":20}');
});
