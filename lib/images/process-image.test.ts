import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { processImage } from "./process-image";

async function makeTwoFrameGif(): Promise<Buffer> {
  const frame = (color: string) => sharp({ create: { width: 20, height: 20, channels: 3, background: color } }).png().toBuffer();
  return sharp([await frame("#ff0000"), await frame("#0000ff")], { join: { animated: true } })
    .gif({ loop: 0, delay: [100, 100] })
    .toBuffer();
}

test("processImage default: GIF animasi jadi WebP statis", async () => {
  const out = await processImage(await makeTwoFrameGif(), 20);
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "webp");
  assert.ok((meta.pages ?? 1) === 1);
});

test("processImage animated=true: animasi GIF tetap jalan di WebP", async () => {
  const out = await processImage(await makeTwoFrameGif(), 20, true);
  const meta = await sharp(out, { animated: true }).metadata();
  assert.equal(meta.format, "webp");
  assert.ok((meta.pages ?? 1) > 1);
});
