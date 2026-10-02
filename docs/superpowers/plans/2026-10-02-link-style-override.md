# Link Style Override + Live Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satu link bisa meng-override sebagian gaya theme (4 kelompok: typography, bentuk, warna, hover/tata letak), dan perubahan di modal terlihat langsung di preview HP tanpa Save.

**Architecture:** Kolom `links.style_override_json` berisi subset token theme (whitelist). Modul murni `lib/link-style.ts` (sanitize, resolve, helper toggle kelompok). `LinkCard` memanggil `resolveLinkTheme(theme, link.styleOverride)` di baris pertama sehingga semua getter theme yang sudah ada dipakai ulang. Draft modal diangkat ke `Board` dan ditempel ke `livePreviewBoard` lewat `applyDraftToBoard` (murni).

**Tech Stack:** Next.js (App Router, Server Actions), Drizzle + better-sqlite3, React 19, Tailwind, node:test + tsx.

**Spec:** `docs/superpowers/specs/2026-10-02-link-style-override-design.md`

**Prasyarat:** branch `image-buttons-library` (Image Buttons Library, migration `0036`) sudah di-commit dan dites user. Plan ini membuat migration `0037`. Jalankan semua perintah dari worktree `C:/Users/Kaito/orca/workspaces/Kitab-Link-Self-Hosted/image-buttons-library` (kalau worktree itu di-merge/dihapus, pakai worktree baru dari branch yang sudah berisi 0036, dan `node_modules` HARUS install sungguhan, bukan junction: Turbopack menolak symlink keluar root).

**Koreksi terhadap spec (sengaja):**
1. Spec bagian 2 menyebut validasi "lewat `parseThemeTokens`". Itu keliru: `parseThemeTokens` hanya `{ ...DEFAULT_THEME, ...parsed }` tanpa validasi, dan `lib/theme-form.ts` (yang punya validator enum) meng-import `sharp`/`storage` sehingga tidak bisa dipakai di Client Component. `sanitizeLinkOverride` memakai validator murni sendiri (enum, rentang angka, regex warna) di `lib/link-style.ts`.
2. Spec bagian 3 bilang "verifikasi apakah `getCardStyle` memasang typography". Sudah diverifikasi: TIDAK. Typography halaman diwarisi dari container (`getTypographyStyle` di `lib/theme.ts`). Jadi `LinkCard` menambahkan `getTypographyStyle(theme)` ke style kartu hanya bila link punya key typography di override (`hasTypographyOverride`), supaya link tanpa override tidak berubah.

## Global Constraints

- Migration WAJIB jalan otomatis di startup (`instrumentation.ts` sudah memanggil `migrate`); jangan minta user menjalankan `drizzle-kit migrate`.
- Tidak boleh dependency baru. Test pakai `node:test` (`npm test`, glob `lib/**/*.test.ts`).
- Setiap string UI baru WAJIB ada di **dua locale** (`id` dan `en`) di `lib/i18n.ts`, kalau tidak `tsc` gagal karena `Dictionary` adalah union.
- Komentar kode berbahasa Indonesia informal seperti kode sekitarnya; nama kode tetap Inggris.
- JANGAN jalankan `git add/commit/push` sendiri. Tiap task diakhiri step "Beri user command commit"; command WAJIB diawali `cd "C:/Users/Kaito/orca/workspaces/Kitab-Link-Self-Hosted/image-buttons-library"`, pesan commit TANPA trailer `Co-Authored-By`/`Claude-Session`, commit dipisah per concern.
- `CLAUDE.md` memperingatkan Next.js di sini berbeda dari yang dikenal: plan ini sengaja hanya memakai pola yang sudah ada di repo (SelectField, Switch, Dialog, server action form). Jangan memperkenalkan API Next baru tanpa membaca `node_modules/next/dist/docs/`.
- Tidak ada perubahan `package.json` version (belum ada rilis).
- Link tanpa override HARUS menghasilkan output identik dengan sebelumnya.
- Whitelist key override (satu sumber kebenaran, `LINK_STYLE_GROUPS`): typography = `fontFamily, fontSize, fontWeight, letterSpacing`; shape = `buttonSurface, buttonBorderRadius, buttonBorderWidth, buttonShadow`; color = `buttonText, cardBackground, cardBorder`; behavior = `buttonHover, pageEntrance, buttonAlign, linkIconPosition`.

## Review Focus

Mode kegagalan yang tidak ditulis eksplisit di spec tapi paling mungkin kena user; masing-masing punya test di task pemiliknya:

1. JSON override jahat/rusak (dari backup orang lain atau kolom korup): key asing, `__proto__`, `url(...)` di warna, string raksasa, tipe salah → dibuang, tidak pernah throw atau tembus ke style (Task 1).
2. Link tanpa override: `resolveLinkTheme` mengembalikan objek theme yang SAMA dan `hasTypographyOverride` false, jadi render identik (Task 1).
3. Kelompok setengah terisi (mis. hanya `fontSize`): UI menganggapnya "mati", tapi key yang ada tetap diterapkan saat render dan tidak crash (Task 1).
4. Backup lama tanpa field `styleOverride` tetap bisa di-import (Task 2).
5. Draft create lalu Cancel: preview harus kembali seperti semula; draft untuk link yang tidak ada di preview (nonaktif) tidak boleh melempar error atau menggandakan link; judul kosong tidak mengosongkan judul link di preview (Task 3).
6. Override pada card style Image: border/radius/shadow dari field Image lama tetap menang (Task 2, dijaga urutan penerapan di `LinkCard`).

---

## File Structure

| File | Tugas |
|---|---|
| `lib/db/schema.ts` (ubah) | kolom `links.styleOverrideJson` |
| `drizzle/0037_*.sql` (generate) | `ALTER TABLE links ADD style_override_json` |
| `lib/link-style.ts` (baru) | grup, `sanitizeLinkOverride`, `resolveLinkTheme`, `hasTypographyOverride`, `isGroupOn`, `toggleGroup`, `setOverrideKey`, `cleanOverrideValue`, `serializeLinkOverride` |
| `lib/link-style.test.ts` (baru) | test modul di atas |
| `lib/db/link-style-migration.test.ts` (baru) | test migrasi 0037 |
| `lib/db/board.ts` (ubah) | `BoardLink.styleOverride`, `PublicLink.styleOverride` |
| `app/r/[linkId]/route.ts`, `components/public-page-preview.tsx` (ubah) | isi `styleOverride: null` di literal `PublicLink` |
| `components/link-card.tsx` (ubah) | `resolveLinkTheme` + typography override |
| `lib/backup-link.ts` + `app/dashboard/backup-actions.ts` (ubah) | `restoreLinkRow`, pakai di import |
| `lib/board-draft.ts` (baru) + test | `applyDraftToBoard`, tipe `LinkDraft` |
| `components/ui/dialog.tsx` (ubah) | prop opsional `overlayClassName` |
| `app/dashboard/board.tsx` (ubah) | state draft, `livePreviewBoard` ditempel draft, oper `theme`/`onDraftChange` |
| `app/dashboard/link-form-modal.tsx` (ubah) | state title/styleOverride, emit draft, section override, hidden field |
| `app/dashboard/link-style-override.tsx` (baru) | UI 4 kelompok |
| `app/dashboard/actions.ts` (ubah) | `saveLinkAction` menyimpan `styleOverrideJson` |
| `lib/i18n.ts` (ubah) | string baru ID+EN |

---

### Task 1: Schema, migration, dan modul `lib/link-style.ts`

**Files:**
- Modify: `lib/db/schema.ts` (tambah kolom di `links`, setelah `imageButtonId`)
- Create: `drizzle/0037_*.sql` (hasil `drizzle-kit generate`)
- Create: `lib/link-style.ts`
- Test: `lib/link-style.test.ts`, `lib/db/link-style-migration.test.ts`

**Interfaces:**
- Produces:
  - `LINK_STYLE_GROUPS` (const, 4 kelompok → tuple key), `LINK_STYLE_GROUP_ORDER: LinkStyleGroup[]`
  - `type LinkStyleGroup`, `type LinkStyleKey`, `type LinkStyleOverride = Partial<Pick<ThemeTokens, LinkStyleKey>>`
  - `sanitizeLinkOverride(raw: unknown): LinkStyleOverride | null`
  - `cleanOverrideValue(key: LinkStyleKey, value: unknown): string | number | undefined` (undefined = tidak valid)
  - `resolveLinkTheme(theme: ThemeTokens, override: LinkStyleOverride | null | undefined): ThemeTokens`
  - `hasTypographyOverride(override: LinkStyleOverride | null | undefined): boolean`
  - `isGroupOn(override: LinkStyleOverride | null | undefined, group: LinkStyleGroup): boolean`
  - `toggleGroup(override: LinkStyleOverride | null, group: LinkStyleGroup, on: boolean, theme: ThemeTokens): LinkStyleOverride | null`
  - `setOverrideKey(override: LinkStyleOverride | null, key: LinkStyleKey, value: string | number): LinkStyleOverride`
  - `serializeLinkOverride(raw: unknown): string | null`

- [ ] **Step 1: Tulis test migrasi yang gagal**

`lib/db/link-style-migration.test.ts`:
```ts
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
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --import tsx --test lib/db/link-style-migration.test.ts`
Expected: FAIL dengan `migration 0037 belum ada`.

- [ ] **Step 3: Tambah kolom dan generate migration**

Di `lib/db/schema.ts`, di dalam `links`, tepat setelah baris `imageButtonId: ...`:
```ts
  // Subset token theme (whitelist, lihat lib/link-style.ts) yang menimpa theme page khusus
  // link ini. null = ikut theme sepenuhnya. Selalu lewat sanitizeLinkOverride sebelum disimpan
  // maupun setelah dibaca -- jangan pernah dipercaya mentah.
  styleOverrideJson: text("style_override_json"),
```
Run: `npx drizzle-kit generate`
Expected: file baru `drizzle/0037_<nama_acak>.sql` berisi satu `ALTER TABLE \`links\` ADD \`style_override_json\` text;`.

- [ ] **Step 4: Jalankan test migrasi**

Run: `node --import tsx --test lib/db/link-style-migration.test.ts` → PASS.

- [ ] **Step 5: Tulis test modul yang gagal**

`lib/link-style.test.ts`:
```ts
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
```

- [ ] **Step 6: Jalankan, pastikan gagal**

Run: `node --import tsx --test lib/link-style.test.ts` → FAIL (modul belum ada).

- [ ] **Step 7: Implementasi `lib/link-style.ts`**

```ts
import { FONT_LIBRARY } from "@/lib/font-library";
import type { ThemeTokens } from "@/lib/theme";

// Override gaya per link: subset token theme yang MENIMPA theme page khusus 1 link.
// Sengaja TIDAK memakai validator lib/theme-form.ts (itu meng-import sharp/storage, server-only)
// -- file ini harus aman di-import dari Client Component (modal link + preview).

export const LINK_STYLE_GROUPS = {
  typography: ["fontFamily", "fontSize", "fontWeight", "letterSpacing"],
  shape: ["buttonSurface", "buttonBorderRadius", "buttonBorderWidth", "buttonShadow"],
  color: ["buttonText", "cardBackground", "cardBorder"],
  behavior: ["buttonHover", "pageEntrance", "buttonAlign", "linkIconPosition"],
} as const;

export type LinkStyleGroup = keyof typeof LINK_STYLE_GROUPS;
export type LinkStyleKey = (typeof LINK_STYLE_GROUPS)[LinkStyleGroup][number];
export type LinkStyleOverride = Partial<Pick<ThemeTokens, LinkStyleKey>>;

export const LINK_STYLE_GROUP_ORDER: LinkStyleGroup[] = ["typography", "shape", "color", "behavior"];

const ALL_KEYS: LinkStyleKey[] = LINK_STYLE_GROUP_ORDER.flatMap((group) => [...LINK_STYLE_GROUPS[group]]);

const ENUMS: Partial<Record<LinkStyleKey, readonly string[]>> = {
  buttonSurface: ["solid", "transparent", "glass", "blur", "neumorphism", "pixel"],
  buttonShadow: ["none", "sm", "md", "lg"],
  buttonHover: ["none", "scale", "lift", "glow", "shine"],
  pageEntrance: ["none", "fade", "slide-up", "pop"],
  buttonAlign: ["left", "center"],
  linkIconPosition: ["left", "right", "edge-left", "edge-right"],
};
const RANGES: Partial<Record<LinkStyleKey, readonly [number, number]>> = {
  fontSize: [10, 32],
  letterSpacing: [-0.1, 0.5],
  buttonBorderRadius: [0, 9999],
  buttonBorderWidth: [0, 12],
};
const FONT_WEIGHTS = [400, 500, 600, 700, 800];
const MAX_COLOR_LENGTH = 64;
// Cuma hex / rgb(a) / hsl(a) polos. Sengaja gak boleh url(), nama warna, atau ";" -- nilainya
// masuk ke inline style halaman publik dan bisa datang dari file backup orang lain.
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC_COLOR = /^(?:rgb|hsl)a?\(\s*[-\d.%\s,/]+\)$/i;

// undefined = nilai gak valid (dibuang). Angka di luar rentang di-clamp, bukan dibuang.
export function cleanOverrideValue(key: LinkStyleKey, value: unknown): string | number | undefined {
  if (key === "fontFamily") {
    return typeof value === "string" && (value === "custom" || FONT_LIBRARY.some((f) => f.key === value)) ? value : undefined;
  }
  if (key === "fontWeight") return typeof value === "number" && FONT_WEIGHTS.includes(value) ? value : undefined;
  const range = RANGES[key];
  if (range) {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    return Math.min(range[1], Math.max(range[0], value));
  }
  const allowed = ENUMS[key];
  if (allowed) return typeof value === "string" && allowed.includes(value) ? value : undefined;
  // Sisanya = key warna.
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  if (color.length === 0 || color.length > MAX_COLOR_LENGTH) return undefined;
  return HEX_COLOR.test(color) || FUNC_COLOR.test(color) ? color : undefined;
}

export function sanitizeLinkOverride(raw: unknown): LinkStyleOverride | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    if (!raw.trim()) return null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const source = parsed as Record<string, unknown>;
  const out: Record<string, string | number> = {};
  // Iterasi whitelist (BUKAN key milik input) -> __proto__/key asing gak pernah tersentuh.
  for (const key of ALL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const value = cleanOverrideValue(key, source[key]);
    if (value !== undefined) out[key] = value;
  }
  return Object.keys(out).length > 0 ? (out as LinkStyleOverride) : null;
}

export function serializeLinkOverride(raw: unknown): string | null {
  const clean = sanitizeLinkOverride(raw);
  return clean ? JSON.stringify(clean) : null;
}

// Tanpa override -> objek theme yang SAMA (bukan salinan), jadi link biasa gak berubah sama sekali.
export function resolveLinkTheme(theme: ThemeTokens, override: LinkStyleOverride | null | undefined): ThemeTokens {
  if (!override || Object.keys(override).length === 0) return theme;
  return { ...theme, ...override };
}

// Typography halaman diwarisi dari container (bukan dari getCardStyle), jadi kartu cuma
// perlu menimpanya sendiri kalau link ini beneran punya override typography.
export function hasTypographyOverride(override: LinkStyleOverride | null | undefined): boolean {
  return !!override && LINK_STYLE_GROUPS.typography.some((key) => key in override);
}

// Kelompok "nyala" = SEMUA key-nya ada. Kelompok setengah terisi dianggap mati di UI, tapi
// key yang ada tetap diterapkan saat render.
export function isGroupOn(override: LinkStyleOverride | null | undefined, group: LinkStyleGroup): boolean {
  return !!override && LINK_STYLE_GROUPS[group].every((key) => key in override);
}

// Nyala: key yang belum ada disalin dari theme (titik awal), yang sudah diubah user dibiarkan.
// Mati: hapus key kelompok itu saja. Hasil kosong -> null (= ikut theme sepenuhnya).
export function toggleGroup(
  override: LinkStyleOverride | null,
  group: LinkStyleGroup,
  on: boolean,
  theme: ThemeTokens,
): LinkStyleOverride | null {
  const next: Record<string, unknown> = { ...(override ?? {}) };
  for (const key of LINK_STYLE_GROUPS[group]) {
    if (on) {
      if (!(key in next)) next[key] = theme[key];
    } else {
      delete next[key];
    }
  }
  return Object.keys(next).length > 0 ? (next as LinkStyleOverride) : null;
}

export function setOverrideKey(
  override: LinkStyleOverride | null,
  key: LinkStyleKey,
  value: string | number,
): LinkStyleOverride {
  return { ...(override ?? {}), [key]: value } as LinkStyleOverride;
}
```

- [ ] **Step 8: Jalankan test + type check**

Run: `node --import tsx --test lib/link-style.test.ts lib/db/link-style-migration.test.ts` → PASS.
Run: `npx tsc --noEmit` → bersih. (Kalau muncul error `LayoutProps` di `app/layout.tsx` itu bawaan worktree yang belum pernah `next build`; abaikan, tapi catat di ledger.)

- [ ] **Step 9: Beri user command commit** (jangan dijalankan sendiri)
```bash
cd "C:/Users/Kaito/orca/workspaces/Kitab-Link-Self-Hosted/image-buttons-library"
git add lib/db/schema.ts drizzle/0037_*.sql drizzle/meta/0037_snapshot.json drizzle/meta/_journal.json lib/db/link-style-migration.test.ts
git commit -m "Add links.style_override_json column"
git add lib/link-style.ts lib/link-style.test.ts
git commit -m "Add link style override sanitizer and resolver"
```

---

### Task 2: Render override di LinkCard, field di board data, backup

**Files:**
- Modify: `lib/db/board.ts` (tipe `BoardLink`, `PublicLink`; kedua entry)
- Modify: `app/r/[linkId]/route.ts`, `components/public-page-preview.tsx` (literal `PublicLink`)
- Modify: `components/link-card.tsx`
- Modify: `lib/backup-link.ts`, `app/dashboard/backup-actions.ts`
- Test: `lib/db/board.test.ts` (tambah test), `lib/backup-link.test.ts` (tambah test)

**Interfaces:**
- Consumes: `LinkStyleOverride`, `sanitizeLinkOverride`, `serializeLinkOverride`, `resolveLinkTheme`, `hasTypographyOverride` (Task 1); `getTypographyStyle` (sudah ada di `lib/theme.ts`).
- Produces: `BoardLink.styleOverride: LinkStyleOverride | null`, `PublicLink.styleOverride: LinkStyleOverride | null`; `restoreLinkRow(link: BackupLink): Omit<BackupLink, "styleOverride"> & { styleOverrideJson: string | null }` dari `@/lib/backup-link`.

- [ ] **Step 1: Tulis test yang gagal**

Tambahkan di akhir `lib/db/board.test.ts`:
```ts
test("styleOverride diparse dari kolom; link lama & JSON korup -> null; key asing dibuang", async () => {
  process.env.DATABASE_PATH = ":memory:";
  const { db } = await import("./index");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  const { users, pages, links } = await import("./schema");
  const { getBoardData, getPublicBoardData } = await import("./board");

  const [user] = await db.insert(users).values({ username: "u-style", passwordHash: "x" }).returning();
  const [page] = await db.insert(pages).values({ userId: user.id, slug: "p-style" }).returning();
  await db.insert(links).values([
    { pageId: page.id, title: "Biasa", url: "https://a.test", orderIndex: 0 },
    { pageId: page.id, title: "Custom", url: "https://b.test", orderIndex: 1, styleOverrideJson: '{"fontSize":22,"evil":1}' },
    { pageId: page.id, title: "Korup", url: "https://c.test", orderIndex: 2, styleOverrideJson: "{bukan json" },
  ]);

  const board = await getBoardData(page.id);
  assert.equal(board.ungrouped[0].styleOverride, null);
  assert.deepEqual(board.ungrouped[1].styleOverride, { fontSize: 22 });
  assert.equal(board.ungrouped[2].styleOverride, null);

  const pub = await getPublicBoardData(page.id);
  assert.deepEqual(pub.ungrouped[1].styleOverride, { fontSize: 22 });
});
```
Tambahkan di akhir `lib/backup-link.test.ts` (dan tambah `restoreLinkRow` ke import `./backup-link`):
```ts
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
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --import tsx --test lib/db/board.test.ts lib/backup-link.test.ts`
Expected: FAIL (`styleOverride` undefined / `restoreLinkRow` belum ada).

- [ ] **Step 3: Ubah `lib/db/board.ts`**

Tambah import:
```ts
import { sanitizeLinkOverride, type LinkStyleOverride } from "@/lib/link-style";
```
Di tipe `BoardLink`, setelah `imageButtonId: number | null;` tambah:
```ts
  // Override gaya per link (sudah tersanitasi), null = ikut theme. Lihat lib/link-style.ts.
  styleOverride: LinkStyleOverride | null;
```
Di tipe `PublicLink`, setelah `iconPosition: IconPosition;` tambah `styleOverride: LinkStyleOverride | null;`.
Di entry `getBoardData` (objek `entry: BoardLink`), setelah `imageButtonId: link.imageButtonId,` tambah `styleOverride: sanitizeLinkOverride(link.styleOverrideJson),`.
Di entry `getPublicBoardData` (objek `entry: PublicLink`), tambah baris yang sama setelah `thumbnailPath: buttonPath ?? link.thumbnailPath,`.

- [ ] **Step 4: Isi literal `PublicLink` lain**

`app/r/[linkId]/route.ts`: di objek `const publicLink: PublicLink = {`, setelah `thumbnailPath: link.thumbnailPath,` tambah `styleOverride: null, // cuma buat hitung href, gaya gak dipakai di sini`.
`components/public-page-preview.tsx`: di `PLACEHOLDER_LINK_BASE` tambahkan `styleOverride: null,`.
Run: `npx tsc --noEmit`. Kalau ada literal `BoardLink`/`PublicLink` lain yang dilaporkan (cari: `grep -rn "iconPosition:" app components lib`), tambahkan `styleOverride: null` di sana.

- [ ] **Step 5: `restoreLinkRow` + pakai di backup**

`lib/backup-link.ts`: tambah import dan fungsi:
```ts
import { serializeLinkOverride } from "@/lib/link-style";
```
(tipe `BackupLink` dan `stripLink` tetap; `BackupLink` otomatis memuat `styleOverride` karena hanya `Omit` 4 key lain.) Tambah di akhir file:
```ts
// Baris siap insert dari BackupLink: styleOverride (objek) diganti kolom JSON tersanitasi.
// Backup lama (sebelum fitur ini) gak punya field-nya -> undefined -> null. Nilai dari file
// orang lain TIDAK dipercaya: selalu lewat sanitizeLinkOverride.
export function restoreLinkRow(link: BackupLink): Omit<BackupLink, "styleOverride"> & { styleOverrideJson: string | null } {
  const { styleOverride, ...rest } = link;
  return { ...rest, styleOverrideJson: serializeLinkOverride(styleOverride) };
}
```
`app/dashboard/backup-actions.ts`: ubah import menjadi `import { restoreLinkRow, stripLink, type BackupLink } from "@/lib/backup-link";` dan di kedua insert ganti `...link,` dengan `...restoreLinkRow(link),` (baris `db.insert(links).values({ ...link, pageId, groupId: null, ... })` dan `values({ ...link, pageId, groupId: createdGroup.id, ... })`).

- [ ] **Step 6: Ubah `components/link-card.tsx`**

Tambah ke import dari `@/lib/theme` (blok import di baris ~1-17) `getTypographyStyle`, dan tambah import baru: `import { hasTypographyOverride, resolveLinkTheme } from "@/lib/link-style";`.
Ganti signature:
```tsx
export function LinkCard({
  link,
  theme: pageTheme,
  index,
  locale = "en",
}: {
  link: PublicLink;
  theme: ThemeTokens;
  index: number;
  locale?: PublicLocale;
}) {
  // Override per link (lib/link-style.ts) digabung ke theme page DI SINI, sekali, supaya
  // semua getter di bawah (kartu, hover, entrance, alignment, posisi icon) dan komponen anak
  // (accordion/countdown/discord) otomatis ikut. Tanpa override, theme-nya objek yang sama.
  const theme = resolveLinkTheme(pageTheme, link.styleOverride);
```
Ganti awal `buttonStyle`:
```tsx
  const buttonStyle = {
    ...getCardStyle(theme),
    // Typography halaman diwarisi dari container (bukan dari getCardStyle) -> baru ditimpa
    // di kartu kalau link ini punya override typography.
    ...(hasTypographyOverride(link.styleOverride) ? getTypographyStyle(theme) : {}),
    ...({ "--kl-index": index, "--kl-glow-color": theme.cardBorder } as React.CSSProperties),
```
(sisa objek `buttonStyle` — blok `link.featured ? {...} : {}` — tidak berubah). Baris `const imageStyle = { ...buttonStyle }` di cabang Image sudah menerapkan `imageHideBorder`/`imageRadius`/`imageShadow` SETELAH spread, jadi field Image tetap menang atas override (prioritas spec); jangan ubah urutannya.

- [ ] **Step 7: Jalankan test + type check + lint**

Run: `node --import tsx --test lib/db/board.test.ts lib/backup-link.test.ts` → PASS.
Run: `npx tsc --noEmit && npx eslint app lib components` → bersih.
Run: `npm test` → semua lulus.

- [ ] **Step 8: Beri user command commit**
```bash
cd "C:/Users/Kaito/orca/workspaces/Kitab-Link-Self-Hosted/image-buttons-library"
git add lib/db/board.ts lib/db/board.test.ts "app/r/[linkId]/route.ts" components/public-page-preview.tsx
git commit -m "Expose per-link style override in board data"
git add components/link-card.tsx
git commit -m "Apply per-link style override in LinkCard"
git add lib/backup-link.ts lib/backup-link.test.ts app/dashboard/backup-actions.ts
git commit -m "Carry style override through page backups with sanitizing"
```

---

### Task 3: Live preview (draft ke preview HP, overlay modal tidak menutup preview)

**Files:**
- Create: `lib/board-draft.ts`
- Test: `lib/board-draft.test.ts`
- Modify: `components/ui/dialog.tsx` (prop `overlayClassName`)
- Modify: `app/dashboard/board.tsx` (state draft, `livePreviewBoard`, oper prop)
- Modify: `app/dashboard/link-form-modal.tsx` (state `title`/`styleOverride`, emit draft, kelas dialog)

**Interfaces:**
- Consumes: `LinkStyleOverride` (Task 1), `PublicLink.styleOverride`, `PublicBoardData`, `DisplayStyle` dari `@/lib/db/board`.
- Produces: `type LinkDraft = { linkId: number | null; groupId: number | null; title: string; displayStyle: DisplayStyle; styleOverride: LinkStyleOverride | null }`; `applyDraftToBoard(board: PublicBoardData, draft: LinkDraft | null): PublicBoardData`; prop `onDraftChange: (draft: LinkDraft | null) => void` di `LinkFormModal`; prop `overlayClassName?: string` di `DialogContent`.

- [ ] **Step 1: Tulis test yang gagal**

`lib/board-draft.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDraftToBoard, type LinkDraft } from "./board-draft";
import type { PublicBoardData, PublicLink } from "@/lib/db/board";

const base: Omit<PublicLink, "id" | "title"> = {
  url: "https://a.test", description: null, thumbnailPath: null, imageHideBorder: false, imageHideBackground: false,
  imageShowTitle: false, imageShowContent: false, imageContentPath: null, imageRadius: null, imageShadow: "theme",
  displayStyle: "pill", icon: null, linkType: "url", featured: false, utmSource: null, utmMedium: null, utmCampaign: null,
  iconPosition: "top", styleOverride: null,
};
const link = (id: number, title: string): PublicLink => ({ ...base, id, title });
const board = (): PublicBoardData => ({
  ungrouped: [link(1, "A"), link(2, "B")],
  groups: [{ id: 10, name: "G", links: [link(3, "C")] }],
});
const draft = (over: Partial<LinkDraft> = {}): LinkDraft => ({
  linkId: null, groupId: null, title: "Baru", displayStyle: "pill", styleOverride: null, ...over,
});

test("draft null mengembalikan board yang SAMA", () => {
  const b = board();
  assert.equal(applyDraftToBoard(b, null), b);
});

test("edit: mem-patch link ber-id itu saja (ungrouped dan dalam grup), board asli tidak dimutasi", () => {
  const b = board();
  const out = applyDraftToBoard(b, draft({ linkId: 3, title: "C2", styleOverride: { fontSize: 22 } }));
  assert.equal(out.groups[0].links[0].title, "C2");
  assert.deepEqual(out.groups[0].links[0].styleOverride, { fontSize: 22 });
  assert.equal(out.ungrouped[0].title, "A");
  assert.equal(b.groups[0].links[0].title, "C");

  const out2 = applyDraftToBoard(b, draft({ linkId: 2, title: "B2", displayStyle: "rich" }));
  assert.equal(out2.ungrouped[1].title, "B2");
  assert.equal(out2.ungrouped[1].displayStyle, "rich");
});

test("edit: judul kosong tidak mengosongkan judul link; link yang tidak ada di preview -> board tak berubah isinya", () => {
  const out = applyDraftToBoard(board(), draft({ linkId: 1, title: "  " }));
  assert.equal(out.ungrouped[0].title, "A");
  const missing = applyDraftToBoard(board(), draft({ linkId: 999, title: "X" }));
  assert.deepEqual(missing, board());
});

test("create: menambah satu link sementara di grup tujuan, atau di ungrouped bila groupId null/tidak ada", () => {
  const inGroup = applyDraftToBoard(board(), draft({ groupId: 10, title: "Draf", styleOverride: { buttonHover: "lift" } }));
  assert.equal(inGroup.groups[0].links.length, 2);
  assert.equal(inGroup.groups[0].links[1].title, "Draf");
  assert.deepEqual(inGroup.groups[0].links[1].styleOverride, { buttonHover: "lift" });
  assert.equal(inGroup.ungrouped.length, 2);

  const loose = applyDraftToBoard(board(), draft({ groupId: null }));
  assert.equal(loose.ungrouped.length, 3);
  assert.equal(loose.ungrouped[2].title, "Baru");

  const unknownGroup = applyDraftToBoard(board(), draft({ groupId: 777 }));
  assert.equal(unknownGroup.ungrouped.length, 3);
});

test("create: judul kosong memakai fallback 'New link'", () => {
  const out = applyDraftToBoard(board(), draft({ title: "" }));
  assert.equal(out.ungrouped[2].title, "New link");
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --import tsx --test lib/board-draft.test.ts` → FAIL (modul belum ada).

- [ ] **Step 3: Implementasi `lib/board-draft.ts`**

```ts
import type { DisplayStyle, PublicBoardData, PublicLink } from "@/lib/db/board";
import type { LinkStyleOverride } from "@/lib/link-style";

// Draft = isi modal link yang BELUM disimpan, cuma bagian yang kelihatan di preview HP.
export type LinkDraft = {
  linkId: number | null; // null = link baru (mode create)
  groupId: number | null;
  title: string;
  displayStyle: DisplayStyle;
  styleOverride: LinkStyleOverride | null;
};

// id negatif yang gak bentrok sama placeholder preview (-1, -2) maupun id DB (positif).
const DRAFT_LINK_ID = -999;
const NEW_LINK_FALLBACK_TITLE = "New link";

const DRAFT_LINK_BASE: Omit<PublicLink, "id" | "title" | "displayStyle" | "styleOverride"> = {
  url: "https://example.com",
  description: null,
  thumbnailPath: null,
  imageHideBorder: false,
  imageHideBackground: false,
  imageShowTitle: false,
  imageShowContent: false,
  imageContentPath: null,
  imageRadius: null,
  imageShadow: "theme",
  icon: null,
  linkType: "url",
  featured: false,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  iconPosition: "top",
};

// Pure: board asli gak dimutasi. Dipanggil tiap render Board, jadi harus murah.
export function applyDraftToBoard(board: PublicBoardData, draft: LinkDraft | null): PublicBoardData {
  if (!draft) return board;
  const title = draft.title.trim();

  if (draft.linkId !== null) {
    const patch = (link: PublicLink): PublicLink =>
      link.id === draft.linkId
        ? { ...link, title: title || link.title, displayStyle: draft.displayStyle, styleOverride: draft.styleOverride }
        : link;
    return {
      ungrouped: board.ungrouped.map(patch),
      groups: board.groups.map((group) => ({ ...group, links: group.links.map(patch) })),
    };
  }

  const temp: PublicLink = {
    ...DRAFT_LINK_BASE,
    id: DRAFT_LINK_ID,
    title: title || NEW_LINK_FALLBACK_TITLE,
    displayStyle: draft.displayStyle,
    styleOverride: draft.styleOverride,
  };
  const targetGroup = draft.groupId !== null ? board.groups.find((group) => group.id === draft.groupId) : undefined;
  if (!targetGroup) return { ...board, ungrouped: [...board.ungrouped, temp] };
  return {
    ...board,
    groups: board.groups.map((group) => (group === targetGroup ? { ...group, links: [...group.links, temp] } : group)),
  };
}
```

- [ ] **Step 4: Jalankan test**

Run: `node --import tsx --test lib/board-draft.test.ts` → PASS (5 test).

- [ ] **Step 5: Prop `overlayClassName` di dialog**

Di `components/ui/dialog.tsx`, ganti signature `DialogContent` dan pemanggilan overlay-nya:
```tsx
function DialogContent({
  className,
  overlayClassName,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  overlayClassName?: string
}) {
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
```
(bagian lain tetap). Dialog lain tidak memakai prop ini, jadi perilakunya tidak berubah.

- [ ] **Step 6: Wiring di `board.tsx`**

Tambah import: `import { applyDraftToBoard, type LinkDraft } from "@/lib/board-draft";`.
Di dekat `const [modalState, setModalState] = useState<LinkModalState | null>(null);` tambah:
```ts
  // Draft isi modal link yang belum disimpan -> ditempel ke preview HP (lihat applyDraftToBoard).
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null);
```
Ganti `const livePreviewBoard: PublicBoardData = {` menjadi `const baseLiveBoard: PublicBoardData = {` dan tepat setelah penutup `  };` objek itu (sebelum `return (`) tambah:
```ts
  const livePreviewBoard = applyDraftToBoard(baseLiveBoard, linkDraft);
```
Di `<LinkFormModal ...>` tambah prop `onDraftChange={setLinkDraft}`.

- [ ] **Step 7: Modal emit draft**

Di `link-form-modal.tsx`:
- Import: ganti `import { useState } from "react";` dengan `import { useEffect, useState } from "react";`; tambah `import type { LinkDraft } from "@/lib/board-draft";` dan `import type { LinkStyleOverride } from "@/lib/link-style";`.
- Props: tambah ke destructure `onDraftChange,` (setelah `onSaved,`) dan ke tipe `onDraftChange: (draft: LinkDraft | null) => void;`.
- State, setelah `const [imageButtonId, ...]`:
```ts
  const [title, setTitle] = useState(state?.mode === "edit" ? state.link.title : "");
  // Setter-nya baru dipakai di Task 4 (UI override); sampai itu state ini cuma dibaca.
  const [styleOverride] = useState<LinkStyleOverride | null>(state?.mode === "edit" ? state.link.styleOverride : null);
```
- Input judul: ganti `<Input id="title" name="title" defaultValue={state.mode === "edit" ? state.link.title : ""} required />` dengan `<Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />`.
- Effect (setelah semua `useState`, sebelum `async function handleSubmit`):
```ts
  // Kirim draft ke Board buat live preview (debounce biar geser slider/color picker gak
  // merender ulang seluruh Board tiap piksel). Modal ditutup/di-unmount -> draft dibuang.
  const draftLinkId = state?.mode === "edit" ? state.link.id : null;
  useEffect(() => {
    if (!state) {
      onDraftChange(null);
      return;
    }
    const groupId = target.startsWith("group:") ? Number(target.slice("group:".length)) : null;
    const timer = setTimeout(() => {
      onDraftChange({ linkId: draftLinkId, groupId, title, displayStyle, styleOverride });
    }, 80);
    return () => clearTimeout(timer);
  }, [state, draftLinkId, target, title, displayStyle, styleOverride, onDraftChange]);
  useEffect(() => () => onDraftChange(null), [onDraftChange]);
```
- Kelas dialog: ganti `<DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">` dengan
```tsx
      <DialogContent
        // Di layar lebar rail preview (510px, fixed di kanan) harus tetap terlihat: overlay
        // berhenti di tepi rail dan modal dipusatkan di area sisa.
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg lg:left-[calc((100%-510px)/2)]"
        overlayClassName="lg:right-[510px]"
      >
```

- [ ] **Step 8: Verifikasi**

Run: `npx tsc --noEmit && npx eslint app lib components && npm test` → bersih/lulus.
Manual (user, localhost): buka Edit Link → ketik judul baru, preview HP berubah tanpa Save; ganti Card style → preview ikut; tutup modal (Cancel/X) → preview kembali ke semula; klik Add link → preview menampilkan link "New link"/judul yang diketik, hilang saat Cancel; di layar ≥ lg modal tidak menutupi preview (overlay berhenti di tepi rail).

- [ ] **Step 9: Beri user command commit**
```bash
cd "C:/Users/Kaito/orca/workspaces/Kitab-Link-Self-Hosted/image-buttons-library"
git add lib/board-draft.ts lib/board-draft.test.ts
git commit -m "Add applyDraftToBoard for live link preview"
git add components/ui/dialog.tsx app/dashboard/board.tsx app/dashboard/link-form-modal.tsx
git commit -m "Wire link modal draft into the dashboard live preview"
```

---

### Task 4: UI override di modal + simpan lewat `saveLinkAction`

**Files:**
- Create: `app/dashboard/link-style-override.tsx`
- Modify: `app/dashboard/link-form-modal.tsx` (setter state, section, hidden field, prop `theme`)
- Modify: `app/dashboard/board.tsx` (oper `theme={tokens}`)
- Modify: `app/dashboard/actions.ts` (`saveLinkAction`)
- Modify: `lib/i18n.ts` (key `linkModal.*`)

**Interfaces:**
- Consumes: semua export Task 1 (`LINK_STYLE_GROUP_ORDER`, `isGroupOn`, `toggleGroup`, `setOverrideKey`, `cleanOverrideValue`, `serializeLinkOverride`, tipe), `FONT_LIBRARY`, `SelectField`, `Switch`, label `t.theme.*` yang sudah ada.
- Produces: `<LinkStyleOverrideSection theme={ThemeTokens} value={LinkStyleOverride | null} onChange={(next) => void} t={Dictionary} />`; field form `styleOverride` (JSON string, kosong = null); prop `theme: ThemeTokens` di `LinkFormModal`.

- [ ] **Step 1: Tambah string i18n (kedua locale)**

Di `linkModal` locale `id`, setelah baris `imageNewLabelPlaceholder: "Label (wajib untuk gambar baru)",`:
```ts
      styleOverrideTitle: "Gaya khusus link ini",
      styleOverrideDesc: "Nyalakan kelompok yang mau beda dari theme. Yang dimatikan tetap ikut theme, termasuk kalau theme diubah.",
      styleGroupTypography: "Tipografi",
      styleGroupShape: "Bentuk & permukaan",
      styleGroupColor: "Warna",
      styleGroupBehavior: "Hover & tata letak",
```
Di `linkModal` locale `en`, setelah `imageNewLabelPlaceholder: "Label (required for a new image)",`:
```ts
      styleOverrideTitle: "Custom style for this link",
      styleOverrideDesc: "Turn on the groups you want to differ from the theme. Groups left off keep following the theme, even when it changes.",
      styleGroupTypography: "Typography",
      styleGroupShape: "Shape & surface",
      styleGroupColor: "Colors",
      styleGroupBehavior: "Hover & layout",
```

- [ ] **Step 2: Buat komponen**

`app/dashboard/link-style-override.tsx`:
```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { FONT_LIBRARY } from "@/lib/font-library";
import {
  LINK_STYLE_GROUP_ORDER,
  cleanOverrideValue,
  isGroupOn,
  setOverrideKey,
  toggleGroup,
  type LinkStyleGroup,
  type LinkStyleKey,
  type LinkStyleOverride,
} from "@/lib/link-style";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";
import type { ThemeTokens } from "@/lib/theme";

type Option = { value: string | number; label: string };
type FieldDef =
  | { kind: "select"; key: LinkStyleKey; label: (t: Dictionary) => string; options: (t: Dictionary) => Option[] }
  | { kind: "number"; key: LinkStyleKey; label: (t: Dictionary) => string; min: number; max: number; step: number }
  | { kind: "color"; key: LinkStyleKey; label: (t: Dictionary) => string };

// Label & opsi sengaja memakai string t.theme.* yang sama dengan editor theme -- satu
// bahasa di seluruh dashboard, gak ada terjemahan kedua yang bisa beda.
const FIELDS: Record<LinkStyleGroup, FieldDef[]> = {
  typography: [
    {
      kind: "select",
      key: "fontFamily",
      label: (t) => t.theme.font,
      options: (t) => [...FONT_LIBRARY.map((f) => ({ value: f.key, label: f.label })), { value: "custom", label: t.theme.fontCustom }],
    },
    { kind: "number", key: "fontSize", label: (t) => t.theme.fontSize, min: 10, max: 32, step: 1 },
    {
      kind: "select",
      key: "fontWeight",
      label: (t) => t.theme.fontWeight,
      options: () => [400, 500, 600, 700, 800].map((w) => ({ value: w, label: String(w) })),
    },
    { kind: "number", key: "letterSpacing", label: (t) => t.theme.letterSpacing, min: -0.1, max: 0.5, step: 0.01 },
  ],
  shape: [
    {
      kind: "select",
      key: "buttonSurface",
      label: (t) => t.theme.buttonSurface,
      options: (t) => [
        { value: "solid", label: t.theme.surfaceSolid },
        { value: "transparent", label: t.theme.surfaceTransparent },
        { value: "glass", label: t.theme.surfaceGlass },
        { value: "blur", label: t.theme.surfaceBlur },
        { value: "neumorphism", label: t.theme.surfaceNeumorphism },
        { value: "pixel", label: t.theme.surfacePixel },
      ],
    },
    { kind: "number", key: "buttonBorderRadius", label: (t) => t.theme.buttonBorderRadius, min: 0, max: 9999, step: 1 },
    { kind: "number", key: "buttonBorderWidth", label: (t) => t.theme.buttonBorderWidth, min: 0, max: 12, step: 1 },
    {
      kind: "select",
      key: "buttonShadow",
      label: (t) => t.theme.buttonShadow,
      options: (t) => [
        { value: "none", label: t.theme.shadowNone },
        { value: "sm", label: t.theme.shadowSm },
        { value: "md", label: t.theme.shadowMd },
        { value: "lg", label: t.theme.shadowLg },
      ],
    },
  ],
  color: [
    { kind: "color", key: "buttonText", label: (t) => t.theme.buttonText },
    { kind: "color", key: "cardBackground", label: (t) => t.theme.cardBackground },
    { kind: "color", key: "cardBorder", label: (t) => t.theme.cardBorder },
  ],
  behavior: [
    {
      kind: "select",
      key: "buttonHover",
      label: (t) => t.theme.buttonHover,
      options: (t) => [
        { value: "none", label: t.theme.hoverNone },
        { value: "scale", label: t.theme.hoverScale },
        { value: "lift", label: t.theme.hoverLift },
        { value: "glow", label: t.theme.hoverGlow },
        { value: "shine", label: t.theme.hoverShine },
      ],
    },
    {
      kind: "select",
      key: "pageEntrance",
      label: (t) => t.theme.pageEntrance,
      options: (t) => [
        { value: "none", label: t.theme.entranceNone },
        { value: "fade", label: t.theme.entranceFade },
        { value: "slide-up", label: t.theme.entranceSlideUp },
        { value: "pop", label: t.theme.entrancePop },
      ],
    },
    {
      kind: "select",
      key: "buttonAlign",
      label: (t) => t.theme.buttonAlign,
      options: (t) => [
        { value: "left", label: t.theme.alignLeft },
        { value: "center", label: t.theme.alignCenter },
      ],
    },
    {
      kind: "select",
      key: "linkIconPosition",
      label: (t) => t.theme.linkIconPosition,
      options: (t) => [
        { value: "left", label: t.theme.iconLeft },
        { value: "right", label: t.theme.iconRight },
        { value: "edge-left", label: t.theme.iconEdgeLeft },
        { value: "edge-right", label: t.theme.iconEdgeRight },
      ],
    },
  ],
};

const GROUP_TITLE: Record<LinkStyleGroup, (t: Dictionary) => string> = {
  typography: (t) => t.linkModal.styleGroupTypography,
  shape: (t) => t.linkModal.styleGroupShape,
  color: (t) => t.linkModal.styleGroupColor,
  behavior: (t) => t.linkModal.styleGroupBehavior,
};

// <input type="color"> cuma ngerti #rrggbb (tanpa alpha) -> nilai rgba() ditampilkan hitam di
// swatch-nya, tapi kolom teks di sebelahnya tetap sumber kebenaran.
const toSwatchHex = (value: string) => (/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000");

function FieldControl({
  def,
  override,
  theme,
  onChange,
  t,
}: {
  def: FieldDef;
  override: LinkStyleOverride;
  theme: ThemeTokens;
  onChange: (key: LinkStyleKey, value: string | number) => void;
  t: Dictionary;
}) {
  const current = override[def.key as keyof LinkStyleOverride] ?? theme[def.key];
  const id = `ls-${def.key}`;
  // Nilai invalid (angka kosong, warna setengah ngetik) TIDAK dikirim ke atas -- state override
  // dan preview tetap di nilai valid terakhir, jadi gak ada kondisi setengah rusak.
  const emit = (raw: unknown) => {
    const value = cleanOverrideValue(def.key, raw);
    if (value !== undefined) onChange(def.key, value);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">{def.label(t)}</Label>
      {def.kind === "select" ? (
        <SelectField
          id={id}
          value={String(current)}
          onChange={(e) => {
            const opt = def.options(t).find((o) => String(o.value) === e.target.value);
            if (opt) emit(opt.value);
          }}
        >
          {def.options(t).map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </SelectField>
      ) : def.kind === "number" ? (
        // defaultValue (bukan value): input angka controlled gak bisa dikosongkan buat ngetik ulang.
        <Input id={id} type="number" min={def.min} max={def.max} step={def.step} defaultValue={Number(current)} onChange={(e) => emit(e.target.valueAsNumber)} />
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={def.label(t)}
            className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
            value={toSwatchHex(String(current))}
            onChange={(e) => emit(e.target.value)}
          />
          <Input id={id} defaultValue={String(current)} key={String(current)} onChange={(e) => emit(e.target.value)} />
        </div>
      )}
    </div>
  );
}

export function LinkStyleOverrideSection({
  theme,
  value,
  onChange,
  t,
}: {
  theme: ThemeTokens;
  value: LinkStyleOverride | null;
  onChange: (next: LinkStyleOverride | null) => void;
  t: Dictionary;
}) {
  const [open, setOpen] = useState(() => value !== null);
  const override = value ?? {};
  const activeCount = LINK_STYLE_GROUP_ORDER.filter((group) => isGroupOn(value, group)).length;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center justify-between gap-2 text-left">
        <span className="text-xs font-medium">
          {t.linkModal.styleOverrideTitle}
          {activeCount > 0 ? <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">{activeCount}</span> : null}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <>
          <p className="text-xs text-muted-foreground">{t.linkModal.styleOverrideDesc}</p>
          {LINK_STYLE_GROUP_ORDER.map((group) => {
            const on = isGroupOn(value, group);
            return (
              <div key={group} className="flex flex-col gap-2 border-t pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{GROUP_TITLE[group](t)}</span>
                  <Switch checked={on} onCheckedChange={(next) => onChange(toggleGroup(value, group, next, theme))} />
                </div>
                {on ? (
                  <div className="grid grid-cols-2 gap-3">
                    {FIELDS[group].map((def) => (
                      <FieldControl
                        key={def.key}
                        def={def}
                        override={override}
                        theme={theme}
                        onChange={(key, next) => onChange(setOverrideKey(value, key, next))}
                        t={t}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Pasang di modal**

Di `link-form-modal.tsx`:
- Import: `import { LinkStyleOverrideSection } from "./link-style-override";` dan `import type { ThemeTokens } from "@/lib/theme";`.
- Props: tambah `theme: ThemeTokens;` di tipe dan `theme,` di destructure (dekat `containerWidth`).
- State: ubah `const [styleOverride] = useState<...>` menjadi `const [styleOverride, setStyleOverride] = useState<LinkStyleOverride | null>(...)` dan hapus komentar "Setter-nya baru dipakai di Task 4".
- Tepat SEBELUM blok `{linkType !== "discord_widget" && displayStyle !== "image" ? (` yang pertama (setelah bagian Group/Card style, baris ~381), sisipkan section + hidden field:
```tsx
          {displayStyle !== "icon" ? (
            <>
              <LinkStyleOverrideSection theme={theme} value={styleOverride} onChange={setStyleOverride} t={t} />
              <input type="hidden" name="styleOverride" value={styleOverride ? JSON.stringify(styleOverride) : ""} />
            </>
          ) : null}
```
Di `board.tsx` tambah ke `<LinkFormModal ...>` prop `theme={tokens}`.

- [ ] **Step 4: `saveLinkAction`**

Di `app/dashboard/actions.ts` tambah import `import { serializeLinkOverride } from "@/lib/link-style";`. Tepat sebelum `const values = {` (setelah blok image button) tambah:
```ts
  // Override gaya per link: SELALU disanitasi di server (form bisa dipalsukan), dan baris
  // sosmed (displayStyle "icon") gak punya gaya per link.
  const styleOverrideJson = displayStyle === "icon" ? null : serializeLinkOverride(formData.get("styleOverride"));
```
Dan tambahkan `styleOverrideJson,` ke objek `values` (setelah `imageButtonId,`).

- [ ] **Step 5: Verifikasi**

Run: `npx tsc --noEmit && npx eslint app lib components && npm test` → bersih/lulus.
Manual (user, localhost, pakai salinan data uji): (a) Edit link → buka "Gaya khusus link ini", nyalakan Tipografi → preview HP langsung berubah saat font/ukuran diganti, TANPA Save; (b) nyalakan Warna lalu ketik `url(x)` di kolom warna → tidak ada perubahan/tidak error; ketik `#ff0066` → preview berubah; (c) matikan kelompok → kembali ikut theme; (d) Save, refresh halaman → override bertahan dan tampil di halaman publik `/<slug>`; (e) ganti theme page → kelompok yang mati ikut theme baru, yang nyala tetap; (f) link tanpa override tampil identik dengan sebelum fitur ini; (g) card style Image: toggle "Remove border" lama tetap menang atas border dari override; (h) export lalu import backup page → override ikut.

- [ ] **Step 6: Beri user command commit**
```bash
cd "C:/Users/Kaito/orca/workspaces/Kitab-Link-Self-Hosted/image-buttons-library"
git add app/dashboard/actions.ts
git commit -m "Save sanitized per-link style override in saveLinkAction"
git add lib/i18n.ts app/dashboard/link-style-override.tsx app/dashboard/link-form-modal.tsx app/dashboard/board.tsx
git commit -m "Add per-link style override section to the link modal"
```

---

## Self-Review

**Spec coverage:** data + migration (Task 1) · sanitize/resolve/prioritas/typography (Task 1-2, prioritas Image dijaga urutan di `LinkCard`) · render + `board.ts` + redirect route (Task 2) · backup export/import tersanitasi (Task 2) · live preview, draft, overlay (Task 3) · UI modal 4 kelompok + simpan (Task 4) · test untuk setiap baris Review Focus. Spec "tidak ikut export theme" dipenuhi dengan tidak menyentuh `theme-bundle`. Spec "REST API v1 tidak diubah" dipenuhi (tidak disentuh).

**Placeholder scan:** tidak ada TBD/TODO. Satu langkah bersyarat sengaja eksplisit: Task 2 Step 4 (literal `BoardLink`/`PublicLink` lain bila `tsc` melaporkannya, dengan perintah grep).

**Konsistensi tipe:** `LinkStyleOverride`, `LinkStyleKey`, `LinkStyleGroup`, `sanitizeLinkOverride`, `serializeLinkOverride`, `resolveLinkTheme`, `hasTypographyOverride`, `isGroupOn`, `toggleGroup`, `setOverrideKey`, `cleanOverrideValue` didefinisikan di Task 1 dan dipakai dengan nama/signature yang sama di Task 2-4. `LinkDraft`/`applyDraftToBoard` didefinisikan di Task 3 dan dipakai di `Board` + modal Task 3. `restoreLinkRow` didefinisikan dan dipakai di Task 2. Prop `theme`/`onDraftChange` ditambahkan di `LinkFormModal` pada task yang membuatnya (Task 3: `onDraftChange`, Task 4: `theme`) dan di-oper dari `Board` di task yang sama.

**Risiko yang diketahui:**
- Override typography memakai `getTypographyStyle(theme)` pada kartu; `fontSize` token adalah angka px sehingga React menambahkan `px` otomatis (sama seperti di container halaman).
- Overlay `lg:right-[510px]` mengandalkan lebar rail 510px yang hard-coded di `components/dashboard-preview-panel.tsx`; kalau lebar rail diubah, ubah juga dua angka di `link-form-modal.tsx`.
- Live preview tidak ada di layar < `lg` (rail disembunyikan di sana); itu keterbatasan yang disepakati di spec.
