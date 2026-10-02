import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { buildBundle, parseBundle, isBundle, isSafeUploadPath, convertBundleImages, MAX_BUNDLE_ASSETS, type LoadedAsset } from "./theme-bundle";
import { DEFAULT_THEME } from "./theme";

const img = (s: string): LoadedAsset => ({ kind: "image", ext: "webp", data: Buffer.from(s) });
const font: LoadedAsset = { kind: "font", ext: "ttf", data: Buffer.from("fontbytes") };

test("round-trip: tokens, background, font, dan image button + label kembali utuh", () => {
  const bundle = buildBundle({
    tokens: { ...DEFAULT_THEME, backgroundImage: "theme-backgrounds/x.webp", customFontUrl: "theme-fonts/y.ttf" },
    background: img("bg"),
    font,
    buttons: [{ label: "Promo", image: img("a") }, { label: "Banner", image: img("b") }],
  });
  const parsed = parseBundle(JSON.parse(JSON.stringify(bundle)));
  assert.ok(!("error" in parsed));
  assert.equal(parsed.background?.data.toString(), "bg");
  assert.equal(parsed.font?.ext, "ttf");
  assert.deepEqual(parsed.buttons.map((b) => [b.label, b.image.data.toString()]), [["Promo", "a"], ["Banner", "b"]]);
  assert.equal(parsed.tokens.backgroundImage, null);
  assert.equal(parsed.tokens.customFontUrl, null);
});

test("tanpa aset: tokens jadi null untuk background/font", () => {
  const bundle = buildBundle({ tokens: DEFAULT_THEME, background: null, font: null, buttons: [] });
  const parsed = parseBundle(JSON.parse(JSON.stringify(bundle)));
  assert.ok(!("error" in parsed) && parsed.buttons.length === 0 && parsed.background === null);
});

test("format lama / bukan bundle ditolak sebagai wrong_format", () => {
  assert.equal(isBundle({ fontFamily: "inter" }), false);
  assert.deepEqual(parseBundle({ fontFamily: "inter" }), { error: "wrong_format" });
});

test("ekstensi di luar whitelist, base64 rusak, kind salah -> bad_asset", () => {
  const base = { kitablink_theme: 2, tokens: {}, imageButtons: [{ label: "x", asset: "btn0" }] };
  const bad = (asset: unknown) => parseBundle({ ...base, assets: { btn0: asset } });
  assert.deepEqual(bad({ kind: "image", ext: "exe", b64: "AAAA" }), { error: "bad_asset" });
  assert.deepEqual(bad({ kind: "image", ext: "webp", b64: "!!notbase64!!" }), { error: "bad_asset" });
  assert.deepEqual(bad({ kind: "font", ext: "webp", b64: "AAAA" }), { error: "bad_asset" });
  assert.deepEqual(parseBundle({ ...base, assets: {} }), { error: "bad_asset" }); // referensi ke aset yang gak ada
});

test("terlalu banyak aset -> too_large", () => {
  const assets: Record<string, unknown> = {};
  for (let i = 0; i <= MAX_BUNDLE_ASSETS; i++) assets[`a${i}`] = { kind: "image", ext: "webp", b64: "AAAA" };
  assert.deepEqual(parseBundle({ kitablink_theme: 2, tokens: {}, imageButtons: [], assets }), { error: "too_large" });
});

test("convertBundleImages: byte sampah berlabel gambar -> bad_asset (bukan throw), gambar valid -> webp", async () => {
  const png = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#00ff00" } }).png().toBuffer();
  const ok = await convertBundleImages({
    tokens: {},
    background: { kind: "image", ext: "png", data: png },
    font: null,
    buttons: [{ label: "A", image: { kind: "image", ext: "png", data: png } }],
  });
  assert.ok(!("error" in ok));
  assert.equal((await sharp(ok.background!).metadata()).format, "webp");
  assert.equal(ok.buttons[0].label, "A");

  const garbage: LoadedAsset = { kind: "image", ext: "webp", data: Buffer.from("bukan gambar") };
  assert.deepEqual(await convertBundleImages({ tokens: {}, background: null, font: null, buttons: [{ label: "X", image: garbage }] }), { error: "bad_asset" });
  assert.deepEqual(await convertBundleImages({ tokens: {}, background: garbage, font: null, buttons: [] }), { error: "bad_asset" });
});

test("isSafeUploadPath menolak traversal & path absolut", () => {
  assert.equal(isSafeUploadPath("theme-backgrounds/a.webp"), true);
  assert.equal(isSafeUploadPath("../data/kitab-link.db"), false);
  assert.equal(isSafeUploadPath("a/../../b"), false);
  assert.equal(isSafeUploadPath("/etc/passwd"), false);
  assert.equal(isSafeUploadPath("C:\\Windows\\x"), false);
  assert.equal(isSafeUploadPath(""), false);
});
