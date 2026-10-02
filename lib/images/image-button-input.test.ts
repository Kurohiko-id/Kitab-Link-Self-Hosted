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
