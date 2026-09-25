"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { cn, FILE_INPUT_CLASS } from "@/lib/utils";
import { ColorPalettePicker } from "@/components/color-palette-picker";
import { ColorSchemePicker } from "@/components/color-scheme-picker";
import {
  THEME_PRESETS,
  DEFAULT_THEME,
  getAnimatedBackgroundClass,
  getPageBackgroundStyle,
  getTextureOverlayStyle,
  getTextureOverlayClass,
  parseThemeTokens,
  type ThemePreset,
  type ThemeTokens,
} from "@/lib/theme";
import { FONT_LIBRARY } from "@/lib/font-library";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { ProfileData } from "@/lib/profile";
import type { PublicBoardData } from "@/lib/db/board";
import { DashboardPreviewPanel } from "@/components/dashboard-preview-panel";
import { Pencil, Trash2, Save, Copy, FileCode, Check, Sparkles } from "lucide-react";
import {
  deleteThemeLibraryAction,
  duplicateThemeAction,
  importThemeAction,
  saveThemeAction,
  setActiveThemeAction,
} from "./theme-actions";

type Tab = "background" | "typography" | "button" | "profile" | "social" | "groups" | "colors";
type OuterTab = "presets" | "custom" | "import";
type LibraryTheme = { id: number; name: string; tokensJson: string; createdAt: Date };

// Context siap-tempel buat AI (ChatGPT/Claude/dll) -- user tinggal copy, jelasin gaya
// yang dia mau, AI balikin JSON yang tinggal di-paste ke form import di bawah. Sengaja
// bahasa Inggris (lebih konsisten dipahami macam-macam model AI) dan field-nya OPSIONAL
// semua -- parseThemeTokens() di lib/theme.ts nge-merge ke DEFAULT_THEME, jadi JSON
// parsial (cuma field yang mau dikustom) tetep valid, gak perlu AI isi semua field.
const AI_THEME_PROMPT = `You are generating a "theme" JSON config for a Kitab Link (link-in-bio) page.
Return ONLY a valid JSON object -- no markdown code fences, no comments, no extra text before/after.
Every field below is OPTIONAL: omit anything you don't want to customize, it will fall back to a sensible default.

Fields:
- backgroundType: "solid" | "gradient" | "aurora" | "glass" | "neon" | "paper" | "pixel" | "lines" | "waves" | "network"
- backgroundColors: string[] of CSS hex colors. Meaning depends on backgroundType -- solid/paper/neon use only [0]; gradient/glass use [0] and [1] for a linear-gradient; aurora uses [0] as the base + [1] and [2] as glowing blob colors.
- text: hex color -- main text color
- textMuted: hex color -- secondary/muted text color
- textShadow: boolean -- adds a subtle text-shadow, useful when backgroundType is busy/patterned
- textBackdrop: boolean -- wraps the name/bio in a translucent blurred chip, useful for very high-contrast patterned backgrounds
- cardBackground: hex or rgba() -- link button/card background color
- cardBorder: hex or rgba() -- link button/card border color
- buttonText: hex color -- link button text color
- fontFamily: "inter" | "poppins" | "jetbrains-mono" | "sora" | "outfit" | "playfair-display" | "press-start-2p" | "roboto-mono" | "space-grotesk"
- fontSize: number (px, 10-32)
- fontWeight: number (400 | 500 | 600 | 700 | 800)
- letterSpacing: number (em, -0.1 to 0.5)
- buttonSurface: "solid" | "transparent" | "glass" | "blur" | "neumorphism" | "pixel"
- buttonBorderRadius: number (px, 0 = square corners, 9999 = full pill)
- buttonBorderWidth: number (px, 0-12)
- buttonShadow: "none" | "sm" | "md" | "lg"
- buttonHover: "none" | "scale" | "lift" | "glow" | "shine"
- pageEntrance: "none" | "fade" | "slide-up" | "pop"
- buttonAlign: "left" | "center"
- profileAvatarShape: "circle" | "rounded" | "square"
- profileBorderStyle: "none" | "solid" | "fade"
- profileBorderWidth: number (px, 0-12)
- profileShadow: "none" | "sm" | "md" | "lg"
- profileShowBanner: boolean
- profileAvatarFloat: boolean -- subtle floating animation on the avatar
- linkIconPosition: "left" | "right" | "edge-left" | "edge-right"
- textureType: "none" | "grain" | "noise" | "watermark" | "snow" | "sakura" | "particle"
- textureOpacity: number (0-1)
- groupLabelAlign: "left" | "center" | "right"
- groupLabelStyle: "plain" | "lines" | "pill" | "underline" | "wave" | "wrap"
- groupWrapBackground: boolean -- only relevant when groupLabelStyle is "wrap"

Example output:
{
  "backgroundType": "gradient",
  "backgroundColors": ["#0f172a", "#312e81"],
  "text": "#f8fafc",
  "cardBackground": "rgba(255,255,255,0.08)",
  "cardBorder": "rgba(255,255,255,0.15)",
  "buttonSurface": "glass",
  "buttonBorderRadius": 16,
  "buttonHover": "glow"
}

Now design a theme based on this description: `;

// "8-Bit Retro" -> "8R", "Matcha Latte" -> "ML", "Solo" -> "SO".
function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Intl.RelativeTimeFormat (stdlib) ngurusin unit-picking + terjemahan ID/EN sendiri --
// gak perlu nulis tabel "X hari lalu"/"X days ago" manual.
function formatRelativeTime(date: Date, locale: Locale): string {
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs) return rtf.format(Math.round(diffSec / secs), unit);
  }
  return rtf.format(0, "minute");
}

// Native <input type="color"> CUMA nerima "#rrggbb" persis -- banyak preset di sini pake
// rgba() (efek glass, transparansi) yang bakal keputus alpha-nya kalau dipaksa lewat situ.
// Jadi picker native cuma muncul kalau value-nya beneran hex polos, sisanya (rgba/nama
// warna CSS) tetep fallback ke kotak preview statis + edit manual lewat field teks.
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function ColorField({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  name: string;
}) {
  const isPlainHex = HEX_COLOR_RE.test(value);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex items-center gap-2">
        {isPlainHex ? (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            title={label}
            className="size-8 shrink-0 cursor-pointer rounded border p-0"
          />
        ) : (
          <div className="size-8 shrink-0 rounded border" style={{ backgroundColor: value || "transparent" }} />
        )}
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
        <ColorPalettePicker label={label} onPick={onChange} />
      </div>
    </div>
  );
}

// Avatar swatch di kiri (bukan strip full-width lagi) -- render getPageBackgroundStyle+
// texture beneran (bukan cuma dot warna polos) biar pattern kayak Japanese Wave tetep
// keliatan, dan deskripsi singkat di kanan biar gak cuma ngandelin nama doang buat tau
// "ini theme kayak apa". Tombol aksi dikasih border+warna (bukan flat bg-muted/plain text
// lagi) biar jelas kebaca sebagai tombol, bukan cuma teks.
// Card ini BUKAN satu <button> gede -- preset butuh 2 tombol (Apply/Edit) dan "Theme Saya"
// butuh tombol Hapus di DALAM card yang sama, nested <button> di dalam <button> itu invalid
// HTML. Wrapper jadi <div>, baris atas (avatar+nama+deskripsi, buat preview) jadi <button>
// sendiri, tombol aksi di baris bawah jadi sibling-nya (di-indent pl-20 biar sejajar teks).
function GalleryCard({
  name,
  description,
  tokens,
  active,
  isPreset,
  createdLabel,
  onClick,
  onApply,
  onEdit,
  onDelete,
  t,
}: {
  name: string;
  description?: string;
  tokens: ThemeTokens;
  active: boolean;
  isPreset: boolean;
  createdLabel?: string;
  onClick: () => void;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  t: Dictionary;
}) {
  const accent = tokens.backgroundColors[1] || tokens.cardBorder || tokens.backgroundColors[0];
  const textureStyle = getTextureOverlayStyle(tokens);
  const textureClass = getTextureOverlayClass(tokens);

  return (
    <div
      className={cn(
        // border-2 SELALU (bukan cuma pas active) biar gak ada layout shift 1-2px pas
        // status active berubah -- yang berubah cuma warnanya (transparent <-> primary).
        "overflow-hidden rounded-xl border-2 bg-card transition-colors",
        active ? "border-primary" : "border-border hover:border-primary/50",
      )}
    >
      <button type="button" onClick={onClick} className="flex w-full items-start gap-3 p-3 pb-2 text-left">
        <div
          className={cn("relative size-14 shrink-0 overflow-hidden rounded-xl", getAnimatedBackgroundClass(tokens))}
          style={getPageBackgroundStyle(tokens)}
        >
          {textureStyle ? <div style={textureStyle} /> : null}
          {textureClass ? <div className={textureClass} style={{ opacity: tokens.textureOpacity }} /> : null}
          <span
            className="absolute inset-x-1 bottom-1 rounded px-1 py-0.5 text-center text-[10px] font-bold text-white"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
          >
            {isPreset ? "Aa" : initialsFromName(name)}
          </span>
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
            {isPreset ? (
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
            ) : active ? (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase">
                {t.theme.libraryActive}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description ?? createdLabel}</p>
        </div>
      </button>

      <div className="flex items-center gap-2 pr-3 pb-3 pl-20 text-xs">
        {isPreset ? (
          <>
            <button
              type="button"
              onClick={onApply}
              className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              {t.theme.presetsApply}
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Pencil className="size-3" />
              {t.theme.presetsEdit}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Pencil className="size-3" />
              {t.common.edit}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
              title={t.common.delete}
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ThemeEditor({
  pageId,
  activeThemeId,
  library,
  initialTokens,
  profile,
  fallbackName,
  previewBoard,
  t,
  locale,
}: {
  pageId: number;
  activeThemeId: number | null;
  library: LibraryTheme[];
  initialTokens: ThemeTokens;
  profile: ProfileData;
  fallbackName: string;
  previewBoard: PublicBoardData;
  t: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const [syncedActiveId, setSyncedActiveId] = useState(activeThemeId);
  const [editingId, setEditingId] = useState<number | null>(activeThemeId);
  const [tokens, setTokens] = useState<ThemeTokens>(initialTokens);
  const [colorsInput, setColorsInput] = useState(initialTokens.backgroundColors.join(", "));
  const [name, setName] = useState(library.find((l) => l.id === activeThemeId)?.name ?? "");
  const [tab, setTab] = useState<Tab>("background");
  const customizeRef = useRef<HTMLDivElement>(null);
  // Selalu mulai dari gallery Presets (bukan Custom) -- biar gampang liat-liat/bandingin
  // preset dulu tiap buka tab Theme, gak langsung nyemplung ke theme yang lagi dipake.
  const [outerTab, setOuterTab] = useState<OuterTab>("presets");
  // Preset yang lagi "dicoba liat" doang di preview kanan -- BEDA sama tokens/editingId
  // (itu punya theme beneran yang lagi diedit). Klik preset TIDAK langsung duplicate+apply
  // lagi (dulu gini, keluhan user: bolak-balik & numpuk duplicate cuma buat ngecek
  // preview). Baru di-duplicate+apply pas user pencet tombol "Pakai theme ini".
  const [previewPreset, setPreviewPreset] = useState<ThemePreset | null>(null);
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Manual (bukan <form action={importThemeAction.bind(...)}>) -- butuh baca return
  // value action-nya buat nampilin notif error (JSON invalid / bukan objek theme),
  // <form action> gak ngasih akses ke return value itu ke UI.
  async function handleImportTheme(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setImportError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const result = await importThemeAction(pageId, formData);
    if (result.error === "empty") setImportError(t.theme.importErrorEmpty);
    else if (result.error === "invalid_json") setImportError(t.theme.importErrorInvalidJson);
    else if (result.error === "wrong_format") setImportError(t.theme.importErrorWrongFormat);
    else {
      form.reset();
      router.refresh();
    }
  }

  function copyAiPrompt() {
    navigator.clipboard.writeText(AI_THEME_PROMPT);
    setAiPromptCopied(true);
    setTimeout(() => setAiPromptCopied(false), 1500);
  }

  function switchOuterTab(next: OuterTab) {
    setOuterTab(next);
    if (next !== "presets") setPreviewPreset(null);
  }

  // Perubahan dari luar (mis. form Import) -> resync state lokal. Di-set saat render
  // (bukan useEffect) biar gak ada cascading render ekstra.
  if (activeThemeId !== syncedActiveId) {
    setSyncedActiveId(activeThemeId);
    setEditingId(activeThemeId);
    const activeLib = library.find((l) => l.id === activeThemeId);
    const freshTokens = activeLib ? parseThemeTokens(activeLib.tokensJson) : DEFAULT_THEME;
    setTokens(freshTokens);
    setColorsInput(freshTokens.backgroundColors.join(", "));
    setName(activeLib?.name ?? "");
  }

  function updateColors(raw: string) {
    setColorsInput(raw);
    setTokens((prev) => ({
      ...prev,
      backgroundColors: raw
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    }));
  }

  // Klik card preset cuma preview doang (lihat previewPreset di atas) -- belum nyimpen
  // apa-apa ke database, belum nge-duplicate. Baru kepake/tersimpan pas commitPreset,
  // dipicu tombol "Apply"/"Edit" DI DALAM card-nya sendiri (bukan tombol terpisah lagi).
  function handleClickPreset(preset: ThemePreset) {
    setPreviewPreset((current) => (current?.id === preset.id ? null : preset));
  }

  // thenEdit=false ("Apply") -> langsung kepake di page, tetep di tab Presets biar gampang
  // lanjut coba-coba yang lain. thenEdit=true ("Edit") -> sama, tapi lanjut ke tab Custom.
  async function commitPreset(preset: ThemePreset, thenEdit: boolean) {
    const created = await duplicateThemeAction(pageId, preset.tokens, preset.name);
    setEditingId(created.id);
    setSyncedActiveId(created.id);
    setTokens(preset.tokens);
    setColorsInput(preset.tokens.backgroundColors.join(", "));
    setName(created.name);
    setPreviewPreset(null);
    if (thenEdit) setOuterTab("custom");
    router.refresh();
  }

  async function handleClickLibrary(theme: LibraryTheme) {
    await setActiveThemeAction(pageId, theme.id);
    const freshTokens = parseThemeTokens(theme.tokensJson);
    setEditingId(theme.id);
    setSyncedActiveId(theme.id);
    setTokens(freshTokens);
    setColorsInput(freshTokens.backgroundColors.join(", "));
    setName(theme.name);
    setOuterTab("custom");
    router.refresh();
  }

  async function handleDuplicate() {
    const created = await duplicateThemeAction(pageId, tokens, name || "Custom");
    setEditingId(created.id);
    setSyncedActiveId(created.id);
    setName(created.name);
    router.refresh();
  }

  async function handleDelete() {
    if (!editingId) return;
    await deleteThemeLibraryAction(editingId);
    setEditingId(null);
    setSyncedActiveId(null);
    router.refresh();
  }

  // Dipanggil dari tombol Hapus DI DALAM card "Theme Saya" -- beda sama handleDelete di
  // atas (itu hapus yang lagi diedit/editingId), ini bisa hapus theme MANAPUN di library
  // langsung dari card-nya, gak perlu buka form edit dulu.
  async function handleDeleteLibrary(themeId: number) {
    await deleteThemeLibraryAction(themeId);
    if (themeId === editingId) {
      setEditingId(null);
      setSyncedActiveId(null);
    }
    router.refresh();
  }

  // onSubmit + preventDefault, BUKAN <form action={saveThemeAction.bind(...)}> langsung --
  // React 19 auto-reset form (termasuk field yang "ketutup" controlled tapi native select-nya
  // tetep kena native form.reset()) begitu form action sukses, bikin dropdown/input di form
  // ini kelihatan balik ke nilai LAMA sesaat abis Simpan (baru bener lagi pas di-refresh
  // manual). onSubmit manual ngelewatin lifecycle form-action itu sama sekali.
  async function handleSaveTheme(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;
    const formData = new FormData(e.currentTarget);
    await saveThemeAction(pageId, editingId, formData);
    router.refresh();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(tokens, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "theme").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const TAB_LABELS: Record<Tab, string> = {
    background: t.theme.tabBackground,
    typography: t.theme.tabTypography,
    button: t.theme.tabButton,
    profile: t.theme.tabProfile,
    social: t.theme.tabSocial,
    groups: t.theme.tabGroups,
    colors: t.theme.tabColors,
  };
  const OUTER_TAB_LABELS: Record<OuterTab, string> = {
    presets: t.theme.presetsTitle,
    custom: t.theme.customTitle,
    import: t.theme.importTitle,
  };
  const isPresetSelected = editingId === null;

  return (
    // Kolom kiri SENGAJA flexible (bukan lebar tetap) -- dulu ada 3 kolom lebar-tetap
    // (preset 42rem + customize + preview 20rem) yang berebut ruang, bikin kolom
    // customize keremes ampir hilang di window antara 1280px-an sampai ~1330px. Preview
    // kanan sekarang position:fixed (lihat DashboardPreviewPanel) -- kolom kiri ini cuma
    // butuh nyisain lebar spacer-nya, gak perlu lagi tinggi-tetap+overflow-y-auto sendiri.
    <div className="flex flex-col gap-6 xl:flex-row xl:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1.5 shadow-sm">
          {(["presets", "custom", "import"] as OuterTab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => switchOuterTab(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                outerTab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {OUTER_TAB_LABELS[key]}
            </button>
          ))}
        </div>

        {outerTab === "presets" ? (
          <div>
            <h2 className="text-sm font-semibold">{t.theme.presetsTitle}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.theme.presetsPreviewHint}</p>
            {/* auto-fill minmax -- biar jumlah kolom nyesuaiin lebar layar sendiri (misal
                18:9/ultrawide bisa muat 3+), gak kepatok 2 kolom padahal ruangnya cukup. */}
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {THEME_PRESETS.map((preset) => (
                <GalleryCard
                  key={preset.id}
                  name={preset.name}
                  description={preset.description}
                  tokens={preset.tokens}
                  active={previewPreset?.id === preset.id}
                  isPreset
                  onClick={() => handleClickPreset(preset)}
                  onApply={() => commitPreset(preset, false)}
                  onEdit={() => commitPreset(preset, true)}
                  t={t}
                />
              ))}
            </div>
          </div>
        ) : null}

        {outerTab === "custom" ? (
          <>
            {library.length > 0 ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">{t.theme.customTitle}</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => customizeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    {t.theme.jumpToCustomize}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.theme.customDesc}</p>
                <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                  {library.map((theme) => (
                    <GalleryCard
                      key={theme.id}
                      name={theme.name}
                      tokens={parseThemeTokens(theme.tokensJson)}
                      active={theme.id === editingId}
                      isPreset={false}
                      createdLabel={formatRelativeTime(theme.createdAt, locale)}
                      onClick={() => handleClickLibrary(theme)}
                      onEdit={() => handleClickLibrary(theme)}
                      onDelete={() => handleDeleteLibrary(theme.id)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div ref={customizeRef}>
      {!isPresetSelected ? (
        <div className="flex flex-col gap-6">
          <form
            onSubmit={handleSaveTheme}
            className="rounded-xl border bg-card p-5 shadow-sm"
            // Tiap tab body (Background/Typography/dst) tingginya beda-beda, tapi semuanya
            // tetep di DOM (cuma di-toggle hidden/flex) -- browser (Chrome) punya "scroll
            // anchoring" yang otomatis nge-geser posisi scroll pas tinggi konten di atas
            // area yang keliatan berubah, efeknya kerasa kayak "lompat-lompat sendiri" pas
            // ganti tab. Dimatiin di sini spesifik, bukan asal taruh di container gede.
            style={{ overflowAnchor: "none" }}
          >
            <div className="flex items-center justify-between gap-3 border-b pb-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">{t.theme.customizeFormTitle}</h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {t.theme.customizeFormSubtitle} <span className="font-medium text-primary">{name}</span>
                </p>
              </div>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-36 shrink-0 rounded-full text-center font-medium sm:w-44"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-1 rounded-xl bg-muted p-1.5">
              {(["background", "typography", "button", "profile", "social", "groups", "colors"] as Tab[]).map((tabKey) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setTab(tabKey)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    tab === tabKey
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TAB_LABELS[tabKey]}
                </button>
              ))}
            </div>

            <div className={cn("mt-4 flex-col gap-3", tab === "background" ? "flex" : "hidden")}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="containerWidth">{t.theme.containerWidth}</Label>
                <Input
                  id="containerWidth"
                  name="containerWidth"
                  type="number"
                  min={320}
                  max={720}
                  step={10}
                  value={tokens.containerWidth}
                  onChange={(e) => setTokens((prev) => ({ ...prev, containerWidth: Number(e.target.value) }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="backgroundType">{t.theme.backgroundType}</Label>
                <SelectField
                  id="backgroundType"
                  name="backgroundType"
                  value={tokens.backgroundType}
                  onChange={(e) =>
                    setTokens((prev) => ({ ...prev, backgroundType: e.target.value as ThemeTokens["backgroundType"] }))
                  }
                >
                  <option value="solid">{t.theme.bgSolid}</option>
                  <option value="gradient">{t.theme.bgGradient}</option>
                  <option value="aurora">{t.theme.bgAurora}</option>
                  <option value="glass">{t.theme.bgGlass}</option>
                  <option value="neon">{t.theme.bgNeon}</option>
                  <option value="paper">{t.theme.bgPaper}</option>
                  <option value="pixel">{t.theme.bgPixel}</option>
                  <option value="lines">{t.theme.bgLines}</option>
                  <option value="waves">{t.theme.bgWaves}</option>
                  <option value="network">{t.theme.bgNetwork}</option>
                </SelectField>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="backgroundColors">{t.theme.backgroundColors}</Label>
                <Input
                  id="backgroundColors"
                  name="backgroundColors"
                  value={colorsInput}
                  onChange={(e) => updateColors(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="backgroundImage">{t.theme.backgroundImage}</Label>
                {tokens.backgroundImage ? (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview background yang sudah diupload */}
                    <img src={`/uploads/${tokens.backgroundImage}`} alt="" className="h-16 w-28 rounded object-cover" />
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input type="checkbox" name="removeBackgroundImage" value="1" />
                      {t.theme.removeBackgroundImage}
                    </label>
                  </div>
                ) : null}
                <input
                  id="backgroundImage"
                  name="backgroundImage"
                  type="file"
                  accept="image/*"
                  className={FILE_INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="textureType">{t.theme.textureType}</Label>
                  <SelectField
                    id="textureType"
                    name="textureType"
                    value={tokens.textureType}
                    onChange={(e) => setTokens((prev) => ({ ...prev, textureType: e.target.value as ThemeTokens["textureType"] }))}
                  >
                    <option value="none">{t.theme.textureNone}</option>
                    <option value="grain">{t.theme.textureGrain}</option>
                    <option value="noise">{t.theme.textureNoise}</option>
                    <option value="watermark">{t.theme.textureWatermark}</option>
                    <option value="snow">{t.theme.textureSnow}</option>
                    <option value="sakura">{t.theme.textureSakura}</option>
                    <option value="particle">{t.theme.textureParticle}</option>
                  </SelectField>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="textureOpacity">{t.theme.textureOpacity}</Label>
                  <Input
                    id="textureOpacity"
                    name="textureOpacity"
                    type="number"
                    step={0.05}
                    min={0}
                    max={1}
                    value={tokens.textureOpacity}
                    onChange={(e) => setTokens((prev) => ({ ...prev, textureOpacity: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            <div className={cn("mt-3 flex-col gap-3", tab === "typography" ? "flex" : "hidden")}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fontFamily">{t.theme.font}</Label>
                <SelectField
                  id="fontFamily"
                  name="fontFamily"
                  value={tokens.fontFamily}
                  onChange={(e) => setTokens((prev) => ({ ...prev, fontFamily: e.target.value }))}
                >
                  {FONT_LIBRARY.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                  <option value="custom">{t.theme.fontCustom}</option>
                </SelectField>
              </div>

              {tokens.fontFamily === "custom" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="customFont">{t.theme.uploadCustomFont}</Label>
                  {tokens.customFontUrl ? (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input type="checkbox" name="removeCustomFont" value="1" />
                      {t.theme.removeCustomFont}
                    </label>
                  ) : null}
                  <input
                    id="customFont"
                    name="customFont"
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    className={FILE_INPUT_CLASS}
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fontSize">{t.theme.fontSize}</Label>
                  <Input
                    id="fontSize"
                    name="fontSize"
                    type="number"
                    min={10}
                    max={32}
                    value={tokens.fontSize}
                    onChange={(e) => setTokens((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fontWeight">{t.theme.fontWeight}</Label>
                  <SelectField
                    id="fontWeight"
                    name="fontWeight"
                    value={tokens.fontWeight}
                    onChange={(e) => setTokens((prev) => ({ ...prev, fontWeight: Number(e.target.value) }))}
                  >
                    {[400, 500, 600, 700, 800].map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="letterSpacing">{t.theme.letterSpacing}</Label>
                  <Input
                    id="letterSpacing"
                    name="letterSpacing"
                    type="number"
                    step={0.01}
                    min={-0.1}
                    max={0.5}
                    value={tokens.letterSpacing}
                    onChange={(e) => setTokens((prev) => ({ ...prev, letterSpacing: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            <div className={cn("mt-3 flex-col gap-3", tab === "button" ? "flex" : "hidden")}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="buttonSurface">{t.theme.buttonSurface}</Label>
                  <SelectField
                    id="buttonSurface"
                    name="buttonSurface"
                    value={tokens.buttonSurface}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, buttonSurface: e.target.value as ThemeTokens["buttonSurface"] }))
                    }
                  >
                    <option value="solid">{t.theme.surfaceSolid}</option>
                    <option value="transparent">{t.theme.surfaceTransparent}</option>
                    <option value="glass">{t.theme.surfaceGlass}</option>
                    <option value="blur">{t.theme.surfaceBlur}</option>
                    <option value="neumorphism">{t.theme.surfaceNeumorphism}</option>
                    <option value="pixel">{t.theme.surfacePixel}</option>
                  </SelectField>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="buttonShadow">{t.theme.buttonShadow}</Label>
                  <SelectField
                    id="buttonShadow"
                    name="buttonShadow"
                    value={tokens.buttonShadow}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, buttonShadow: e.target.value as ThemeTokens["buttonShadow"] }))
                    }
                  >
                    <option value="none">{t.theme.shadowNone}</option>
                    <option value="sm">{t.theme.shadowSm}</option>
                    <option value="md">{t.theme.shadowMd}</option>
                    <option value="lg">{t.theme.shadowLg}</option>
                  </SelectField>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="buttonBorderRadius">{t.theme.buttonBorderRadius}</Label>
                  <Input
                    id="buttonBorderRadius"
                    name="buttonBorderRadius"
                    type="number"
                    min={0}
                    max={9999}
                    value={tokens.buttonBorderRadius}
                    onChange={(e) => setTokens((prev) => ({ ...prev, buttonBorderRadius: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="buttonBorderWidth">{t.theme.buttonBorderWidth}</Label>
                  <Input
                    id="buttonBorderWidth"
                    name="buttonBorderWidth"
                    type="number"
                    min={0}
                    max={12}
                    value={tokens.buttonBorderWidth}
                    onChange={(e) => setTokens((prev) => ({ ...prev, buttonBorderWidth: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="buttonHover">{t.theme.buttonHover}</Label>
                  <SelectField
                    id="buttonHover"
                    name="buttonHover"
                    value={tokens.buttonHover}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, buttonHover: e.target.value as ThemeTokens["buttonHover"] }))
                    }
                  >
                    <option value="none">{t.theme.hoverNone}</option>
                    <option value="scale">{t.theme.hoverScale}</option>
                    <option value="lift">{t.theme.hoverLift}</option>
                    <option value="glow">{t.theme.hoverGlow}</option>
                    <option value="shine">{t.theme.hoverShine}</option>
                  </SelectField>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pageEntrance">{t.theme.pageEntrance}</Label>
                  <SelectField
                    id="pageEntrance"
                    name="pageEntrance"
                    value={tokens.pageEntrance}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, pageEntrance: e.target.value as ThemeTokens["pageEntrance"] }))
                    }
                  >
                    <option value="none">{t.theme.entranceNone}</option>
                    <option value="fade">{t.theme.entranceFade}</option>
                    <option value="slide-up">{t.theme.entranceSlideUp}</option>
                    <option value="pop">{t.theme.entrancePop}</option>
                  </SelectField>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="buttonAlign">{t.theme.buttonAlign}</Label>
                  <SelectField
                    id="buttonAlign"
                    name="buttonAlign"
                    value={tokens.buttonAlign}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, buttonAlign: e.target.value as ThemeTokens["buttonAlign"] }))
                    }
                  >
                    <option value="left">{t.theme.alignLeft}</option>
                    <option value="center">{t.theme.alignCenter}</option>
                  </SelectField>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="linkIconPosition">{t.theme.linkIconPosition}</Label>
                <SelectField
                  id="linkIconPosition"
                  name="linkIconPosition"
                  value={tokens.linkIconPosition}
                  onChange={(e) =>
                    setTokens((prev) => ({ ...prev, linkIconPosition: e.target.value as ThemeTokens["linkIconPosition"] }))
                  }
                >
                  <option value="left">{t.theme.iconLeft}</option>
                  <option value="right">{t.theme.iconRight}</option>
                  <option value="edge-left">{t.theme.iconEdgeLeft}</option>
                  <option value="edge-right">{t.theme.iconEdgeRight}</option>
                </SelectField>
              </div>
            </div>

            <div className={cn("mt-3 flex-col gap-3", tab === "profile" ? "flex" : "hidden")}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileAvatarShape">{t.theme.profileAvatarShape}</Label>
                  <SelectField
                    id="profileAvatarShape"
                    name="profileAvatarShape"
                    value={tokens.profileAvatarShape}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, profileAvatarShape: e.target.value as ThemeTokens["profileAvatarShape"] }))
                    }
                  >
                    <option value="circle">{t.theme.avatarCircle}</option>
                    <option value="rounded">{t.theme.avatarRounded}</option>
                    <option value="square">{t.theme.avatarSquare}</option>
                  </SelectField>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileBorderStyle">{t.theme.profileBorderStyle}</Label>
                  <SelectField
                    id="profileBorderStyle"
                    name="profileBorderStyle"
                    value={tokens.profileBorderStyle}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, profileBorderStyle: e.target.value as ThemeTokens["profileBorderStyle"] }))
                    }
                  >
                    <option value="none">{t.theme.borderNone}</option>
                    <option value="solid">{t.theme.borderSolid}</option>
                    <option value="fade">{t.theme.borderFade}</option>
                  </SelectField>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileBorderWidth">{t.theme.profileBorderWidth}</Label>
                  <Input
                    id="profileBorderWidth"
                    name="profileBorderWidth"
                    type="number"
                    min={0}
                    max={12}
                    value={tokens.profileBorderWidth}
                    onChange={(e) => setTokens((prev) => ({ ...prev, profileBorderWidth: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="profileShadow">{t.theme.profileShadow}</Label>
                  <SelectField
                    id="profileShadow"
                    name="profileShadow"
                    value={tokens.profileShadow}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, profileShadow: e.target.value as ThemeTokens["profileShadow"] }))
                    }
                  >
                    <option value="none">{t.theme.shadowNone}</option>
                    <option value="sm">{t.theme.shadowSm}</option>
                    <option value="md">{t.theme.shadowMd}</option>
                    <option value="lg">{t.theme.shadowLg}</option>
                  </SelectField>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                <span className="font-medium">{t.theme.profileShowBanner}</span>
                <input
                  type="checkbox"
                  name="profileShowBanner"
                  value="1"
                  checked={tokens.profileShowBanner}
                  onChange={(e) => setTokens((prev) => ({ ...prev, profileShowBanner: e.target.checked }))}
                  className="size-4 rounded accent-primary"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                <span className="font-medium">{t.theme.profileAvatarFloat}</span>
                <input
                  type="checkbox"
                  name="profileAvatarFloat"
                  value="1"
                  checked={tokens.profileAvatarFloat}
                  onChange={(e) => setTokens((prev) => ({ ...prev, profileAvatarFloat: e.target.checked }))}
                  className="size-4 rounded accent-primary"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{t.theme.textShadow}</span>
                  <p className="text-xs text-muted-foreground">{t.theme.textShadowHint}</p>
                </div>
                <input
                  type="checkbox"
                  name="textShadow"
                  value="1"
                  checked={tokens.textShadow}
                  onChange={(e) => setTokens((prev) => ({ ...prev, textShadow: e.target.checked }))}
                  className="size-4 shrink-0 rounded accent-primary"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{t.theme.textBackdrop}</span>
                  <p className="text-xs text-muted-foreground">{t.theme.textBackdropHint}</p>
                </div>
                <input
                  type="checkbox"
                  name="textBackdrop"
                  value="1"
                  checked={tokens.textBackdrop}
                  onChange={(e) => setTokens((prev) => ({ ...prev, textBackdrop: e.target.checked }))}
                  className="size-4 shrink-0 rounded accent-primary"
                />
              </label>
            </div>

            <div className={cn("mt-3 flex-col gap-3", tab === "social" ? "flex" : "hidden")}>
              <p className="text-xs text-muted-foreground">{t.theme.socialTabDesc}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="socialIconShape">{t.theme.socialIconShape}</Label>
                  <SelectField
                    id="socialIconShape"
                    name="socialIconShape"
                    value={tokens.socialIconShape}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, socialIconShape: e.target.value as ThemeTokens["socialIconShape"] }))
                    }
                  >
                    <option value="circle">{t.theme.avatarCircle}</option>
                    <option value="rounded">{t.theme.avatarRounded}</option>
                    <option value="square">{t.theme.avatarSquare}</option>
                  </SelectField>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="socialIconSurface">{t.theme.socialIconSurface}</Label>
                  <SelectField
                    id="socialIconSurface"
                    name="socialIconSurface"
                    value={tokens.socialIconSurface}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, socialIconSurface: e.target.value as ThemeTokens["socialIconSurface"] }))
                    }
                  >
                    <option value="filled">{t.theme.socialSurfaceFilled}</option>
                    <option value="transparent">{t.theme.surfaceTransparent}</option>
                  </SelectField>
                </div>
              </div>

              {tokens.socialIconShape === "rounded" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="socialIconRadius">{t.theme.socialIconRadius}</Label>
                  <Input
                    id="socialIconRadius"
                    name="socialIconRadius"
                    type="number"
                    min={0}
                    max={9999}
                    value={tokens.socialIconRadius}
                    onChange={(e) => setTokens((prev) => ({ ...prev, socialIconRadius: Number(e.target.value) }))}
                  />
                </div>
              ) : (
                // Tetep kirim nilainya biar gak ilang pas shape lain aktif (input hidden,
                // radius-nya cuma gak relevan buat shape circle/square).
                <input type="hidden" name="socialIconRadius" value={tokens.socialIconRadius} />
              )}
            </div>

            <div className={cn("mt-3 flex-col gap-3", tab === "groups" ? "flex" : "hidden")}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="groupLabelAlign">{t.theme.groupLabelAlign}</Label>
                  <SelectField
                    id="groupLabelAlign"
                    name="groupLabelAlign"
                    value={tokens.groupLabelAlign}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, groupLabelAlign: e.target.value as ThemeTokens["groupLabelAlign"] }))
                    }
                  >
                    <option value="left">{t.theme.alignLeft}</option>
                    <option value="center">{t.theme.alignCenter}</option>
                    <option value="right">{t.theme.alignRight}</option>
                  </SelectField>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="groupLabelStyle">{t.theme.groupLabelStyle}</Label>
                  <SelectField
                    id="groupLabelStyle"
                    name="groupLabelStyle"
                    value={tokens.groupLabelStyle}
                    onChange={(e) =>
                      setTokens((prev) => ({ ...prev, groupLabelStyle: e.target.value as ThemeTokens["groupLabelStyle"] }))
                    }
                  >
                    <option value="plain">{t.theme.groupStylePlain}</option>
                    <option value="lines">{t.theme.groupStyleLines}</option>
                    <option value="wave">{t.theme.groupStyleWave}</option>
                    <option value="pill">{t.theme.groupStylePill}</option>
                    <option value="underline">{t.theme.groupStyleUnderline}</option>
                    <option value="wrap">{t.theme.groupStyleWrap}</option>
                  </SelectField>
                </div>
              </div>

              {tokens.groupLabelStyle === "wrap" ? (
                <label className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                  <span className="font-medium">{t.theme.groupWrapBackground}</span>
                  <input
                    type="checkbox"
                    name="groupWrapBackground"
                    value="1"
                    checked={tokens.groupWrapBackground}
                    onChange={(e) => setTokens((prev) => ({ ...prev, groupWrapBackground: e.target.checked }))}
                    className="size-4 rounded accent-primary"
                  />
                </label>
              ) : null}
            </div>

            <div className={cn("mt-3 flex flex-col gap-4", tab === "colors" ? "flex" : "hidden")}>
              <ColorSchemePicker
                onPick={(scheme) => {
                  updateColors(scheme.background);
                  setTokens((p) => ({
                    ...p,
                    backgroundType: "solid",
                    text: scheme.text,
                    textMuted: scheme.textMuted,
                    cardBackground: scheme.cardBackground,
                    cardBorder: scheme.cardBorder,
                    buttonText: scheme.buttonText,
                  }));
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <ColorField label={t.theme.text} name="text" value={tokens.text} onChange={(v) => setTokens((p) => ({ ...p, text: v }))} />
                <ColorField
                  label={t.theme.textMuted}
                  name="textMuted"
                  value={tokens.textMuted}
                  onChange={(v) => setTokens((p) => ({ ...p, textMuted: v }))}
                />
                <ColorField
                  label={t.theme.cardBackground}
                  name="cardBackground"
                  value={tokens.cardBackground}
                  onChange={(v) => setTokens((p) => ({ ...p, cardBackground: v }))}
                />
                <ColorField
                  label={t.theme.cardBorder}
                  name="cardBorder"
                  value={tokens.cardBorder}
                  onChange={(v) => setTokens((p) => ({ ...p, cardBorder: v }))}
                />
                <ColorField
                  label={t.theme.buttonText}
                  name="buttonText"
                  value={tokens.buttonText}
                  onChange={(v) => setTokens((p) => ({ ...p, buttonText: v }))}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="gap-1.5 rounded-full">
                  <Save className="size-3.5" />
                  {t.common.save}
                </Button>
                <Button type="button" variant="secondary" className="gap-1.5 rounded-full" onClick={handleDuplicate}>
                  <Copy className="size-3.5" />
                  {t.theme.duplicate}
                </Button>
                <Button type="button" variant="secondary" className="gap-1.5 rounded-full" onClick={exportJson}>
                  <FileCode className="size-3.5" />
                  {t.theme.exportJson}
                </Button>
              </div>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-sm font-medium text-destructive transition-colors hover:text-destructive/80"
              >
                <Trash2 className="size-3.5" />
                {t.common.delete}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.theme.emptyHint}
        </div>
      )}
            </div>
          </>
        ) : null}

        {outerTab === "import" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">{t.theme.aiPromptTitle}</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t.theme.aiPromptDesc}</p>
              <pre className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {AI_THEME_PROMPT}
              </pre>
              <Button type="button" size="sm" variant="outline" className="mt-3 gap-1.5" onClick={copyAiPrompt}>
                {aiPromptCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {aiPromptCopied ? t.theme.aiPromptCopied : t.theme.aiPromptCopy}
              </Button>
            </div>

            <form onSubmit={handleImportTheme} className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">{t.theme.importTitle}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t.theme.importDesc}</p>
            <input
              type="file"
              name="file"
              accept="application/json"
              className={cn("mt-3", FILE_INPUT_CLASS)}
            />
            <Textarea name="json" rows={3} placeholder={t.theme.importPlaceholder} className="mt-2 font-mono text-xs" />
            {importError ? (
              <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {importError}
              </p>
            ) : null}
            <Button type="submit" size="sm" variant="outline" className="mt-3">
              {t.theme.importApply}
            </Button>
            </form>
          </div>
        ) : null}
      </div>

      {!isPresetSelected || previewPreset ? (
        <DashboardPreviewPanel
          tokens={previewPreset ? previewPreset.tokens : tokens}
          profile={profile}
          fallbackName={fallbackName}
          previewBoard={previewBoard}
          t={t}
          showFrom="xl"
          previewingLabel={
            previewPreset ? (
              <>
                {t.theme.presetsPreviewing} <span className="text-sidebar-primary-foreground">{previewPreset.name}</span>
              </>
            ) : undefined
          }
        />
      ) : null}
    </div>
  );
}
