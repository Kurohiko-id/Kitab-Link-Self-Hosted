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
