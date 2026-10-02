import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasTypographyOverride,
  isGroupOn,
  resolveLinkTheme,
  sanitizeLinkOverride,
  serializeLinkOverride,
  setOverrideKey,
  toggleGroup,
} from "./link-style";
import { DEFAULT_THEME } from "./theme";

test("sanitize: key asing & __proto__ dibuang, key whitelist valid lolos", () => {
  const raw = '{"fontSize":20,"evil":1,"backgroundImage":"x.webp","__proto__":{"polluted":true}}';
  assert.deepEqual(sanitizeLinkOverride(raw), { fontSize: 20 });
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("sanitize: nilai ngawur dibuang atau di-clamp", () => {
  assert.deepEqual(sanitizeLinkOverride({ fontSize: 999 }), { fontSize: 32 });
  assert.deepEqual(sanitizeLinkOverride({ buttonBorderWidth: -5 }), { buttonBorderWidth: 0 });
  assert.equal(sanitizeLinkOverride({ fontSize: "20" }), null);
  assert.equal(sanitizeLinkOverride({ fontSize: NaN }), null);
  assert.equal(sanitizeLinkOverride({ buttonSurface: "weird" }), null);
  assert.equal(sanitizeLinkOverride({ fontWeight: 450 }), null);
  assert.deepEqual(sanitizeLinkOverride({ fontWeight: 700 }), { fontWeight: 700 });
  assert.equal(sanitizeLinkOverride({ fontFamily: "comic-sans" }), null);
  assert.deepEqual(sanitizeLinkOverride({ fontFamily: "custom" }), { fontFamily: "custom" });
  assert.deepEqual(sanitizeLinkOverride({ fontFamily: "inter" }), { fontFamily: "inter" });
});

test("sanitize: warna hanya hex/rgb/rgba/hsl, bukan url() atau nama atau string panjang", () => {
  for (const ok of ["#fff", "#aabbcc", "#aabbcc80", "rgba(255,255,255,0.1)", "rgb(0 0 0 / 50%)", "hsl(200, 50%, 40%)"]) {
    assert.deepEqual(sanitizeLinkOverride({ cardBackground: ok }), { cardBackground: ok }, ok);
  }
  for (const bad of ["red", "url(http://evil.test/x.png)", "#12", "rgba(0,0,0,1); background:url(x)", "#" + "a".repeat(80)]) {
    assert.equal(sanitizeLinkOverride({ cardBackground: bad }), null, bad);
  }
});

test("sanitize: input bukan objek -> null", () => {
  for (const raw of [null, undefined, "", "{bad", "[]", [], 5, true]) {
    assert.equal(sanitizeLinkOverride(raw), null, String(raw));
  }
  assert.equal(sanitizeLinkOverride({}), null);
});

test("resolveLinkTheme: tanpa override mengembalikan objek theme yang SAMA, override menimpa", () => {
  assert.equal(resolveLinkTheme(DEFAULT_THEME, null), DEFAULT_THEME);
  assert.equal(resolveLinkTheme(DEFAULT_THEME, undefined), DEFAULT_THEME);
  assert.equal(resolveLinkTheme(DEFAULT_THEME, {}), DEFAULT_THEME);
  const out = resolveLinkTheme(DEFAULT_THEME, { fontSize: 22, buttonHover: "lift" });
  assert.equal(out.fontSize, 22);
  assert.equal(out.buttonHover, "lift");
  assert.equal(out.cardBorder, DEFAULT_THEME.cardBorder);
});

test("hasTypographyOverride & isGroupOn: kelompok setengah terisi dianggap mati tapi key-nya tetap terdeteksi", () => {
  assert.equal(hasTypographyOverride(null), false);
  assert.equal(hasTypographyOverride({ buttonHover: "lift" }), false);
  assert.equal(hasTypographyOverride({ fontSize: 20 }), true);
  assert.equal(isGroupOn({ fontSize: 20 }, "typography"), false);
  assert.equal(isGroupOn({ fontFamily: "inter", fontSize: 20, fontWeight: 400, letterSpacing: 0 }, "typography"), true);
  assert.equal(isGroupOn(null, "shape"), false);
});

test("toggleGroup: nyala menyalin nilai theme, mati menghapus key kelompok itu saja, kosong -> null", () => {
  const on = toggleGroup(null, "color", true, DEFAULT_THEME);
  assert.deepEqual(on, { buttonText: DEFAULT_THEME.buttonText, cardBackground: DEFAULT_THEME.cardBackground, cardBorder: DEFAULT_THEME.cardBorder });
  assert.equal(isGroupOn(on, "color"), true);

  const both = toggleGroup(on, "behavior", true, DEFAULT_THEME);
  assert.equal(isGroupOn(both, "color"), true);
  assert.equal(isGroupOn(both, "behavior"), true);

  const offColor = toggleGroup(both, "color", false, DEFAULT_THEME);
  assert.equal(isGroupOn(offColor, "color"), false);
  assert.equal(isGroupOn(offColor, "behavior"), true);

  assert.equal(toggleGroup(on, "color", false, DEFAULT_THEME), null);
});

test("toggleGroup nyala tidak menimpa nilai yang sudah diubah user", () => {
  const edited = setOverrideKey(null, "fontSize", 24);
  const on = toggleGroup(edited, "typography", true, DEFAULT_THEME);
  assert.equal(on?.fontSize, 24);
  assert.equal(isGroupOn(on, "typography"), true);
});

test("serializeLinkOverride: kosong/invalid -> null, valid -> JSON tersanitasi", () => {
  assert.equal(serializeLinkOverride(null), null);
  assert.equal(serializeLinkOverride({ nope: 1 }), null);
  assert.equal(serializeLinkOverride({ fontSize: 99, nope: 1 }), '{"fontSize":32}');
});
