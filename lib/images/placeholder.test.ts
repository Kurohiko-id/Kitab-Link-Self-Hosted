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
