import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreLinkRow, stripLink } from "./backup-link";
import type { BoardLink } from "@/lib/db/board";

test("stripLink membuang id, groupId, thumbnailPath, DAN imageButtonId", () => {
  const link = {
    id: 1, groupId: 2, title: "t", url: "u", thumbnailPath: "x.webp", imageButtonId: 9,
  } as unknown as BoardLink;
  const out = stripLink(link) as Record<string, unknown>;
  for (const key of ["id", "groupId", "thumbnailPath", "imageButtonId"]) assert.equal(key in out, false, key);
  assert.equal(out.title, "t");
});

test("stripLink mempertahankan styleOverride; restoreLinkRow menyanitasi & backup lama tanpa field tetap aman", () => {
  const link = { id: 1, groupId: null, title: "t", url: "u", thumbnailPath: null, imageButtonId: null, styleOverride: { fontSize: 20 } } as unknown as BoardLink;
  const stripped = stripLink(link);
  assert.deepEqual((stripped as Record<string, unknown>).styleOverride, { fontSize: 20 });

  const row = restoreLinkRow(stripped) as Record<string, unknown>;
  assert.equal(row.styleOverrideJson, '{"fontSize":20}');
  assert.equal("styleOverride" in row, false);

  const evil = restoreLinkRow({ title: "t", url: "u", styleOverride: { fontSize: 999, cardBackground: "url(x)", nope: 1 } } as never) as Record<string, unknown>;
  assert.equal(evil.styleOverrideJson, '{"fontSize":32}');

  const old = restoreLinkRow({ title: "t", url: "u" } as never) as Record<string, unknown>;
  assert.equal(old.styleOverrideJson, null);
});
