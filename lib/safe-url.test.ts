import { test } from "node:test";
import assert from "node:assert/strict";
import { assertSafeUrl } from "./safe-url";

test("blokir metadata cloud & skema non-http", async () => {
  await assert.rejects(assertSafeUrl("http://169.254.169.254/latest/meta-data"));
  await assert.rejects(assertSafeUrl("http://[::ffff:169.254.169.254]/"));
  await assert.rejects(assertSafeUrl("file:///etc/passwd"));
});

test("izinkan localhost & IP publik", async () => {
  await assertSafeUrl("http://127.0.0.1:5678/webhook");
  await assertSafeUrl("https://1.1.1.1/");
});
