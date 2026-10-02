"use client";

import { useState, type ReactNode } from "react";
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

// Teks warna punya state lokal sendiri (bukan di-key ke nilai override): nilai valid di tengah
// ngetik (mis. "#ff0") ikut dikirim ke atas, dan input gak boleh remount -- fokus bakal hilang.
function ColorField({
  id,
  label,
  initial,
  onValid,
}: {
  id: string;
  label: string;
  initial: string;
  onValid: (value: string) => void;
}) {
  const [text, setText] = useState(initial);
  const update = (next: string) => {
    setText(next);
    onValid(next);
  };
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={label}
        className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
        value={toSwatchHex(text)}
        onChange={(e) => update(e.target.value)}
      />
      <Input id={id} value={text} onChange={(e) => update(e.target.value)} />
    </div>
  );
}

// Input angka terkontrol dengan state teks lokal: kosong/setengah ngetik ("-", "1.") tetap
// boleh tampil, tapi cuma angka valid yang dikirim ke atas. Jangan pakai defaultValue yang
// ngikutin nilai override -- Base UI Input protes kalau defaultValue berubah setelah mount.
function NumberField({
  id,
  min,
  max,
  step,
  initial,
  onValid,
}: {
  id: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  onValid: (value: number) => void;
}) {
  const [text, setText] = useState(String(initial));
  return (
    <Input
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = e.target.valueAsNumber;
        if (Number.isFinite(n)) onValid(n);
      }}
    />
  );
}

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
        <NumberField id={id} min={def.min} max={def.max} step={def.step} initial={Number(current)} onValid={emit} />
      ) : (
        <ColorField id={id} label={def.label(t)} initial={String(current)} onValid={emit} />
      )}
    </div>
  );
}

export function LinkStyleOverrideSection({
  theme,
  value,
  onChange,
  stage,
  t,
}: {
  theme: ThemeTokens;
  value: LinkStyleOverride | null;
  onChange: (next: LinkStyleOverride | null) => void;
  // Panggung preview (LinkStyleStage) -- ditaruh paling atas isi section, nempel pas di-scroll.
  stage: ReactNode;
  t: Dictionary;
}) {
  // Konstan sejak mount: <details> native yang ngatur buka/tutup sendiri (sama kayak UTM), React
  // cuma nentuin kondisi awalnya -- kalau udah ada override, section langsung kebuka.
  const [initialOpen] = useState(() => value !== null);
  const override = value ?? {};
  const activeCount = LINK_STYLE_GROUP_ORDER.filter((group) => isGroupOn(value, group)).length;

  return (
    <details className="group rounded-lg border p-3" open={initialOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
        <span>
          {t.linkModal.styleOverrideTitle}
          {activeCount > 0 ? <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">{activeCount}</span> : null}
        </span>
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {stage}
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
      </div>
    </details>
  );
}
