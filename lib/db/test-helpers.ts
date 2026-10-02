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
