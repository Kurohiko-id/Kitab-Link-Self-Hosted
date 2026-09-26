"use client";

import { useEffect, useState } from "react";
import { DiscordWidgetCard, type DiscordWidgetDisplayConfig } from "@/components/discord-widget-card";
import { DiscordIframe } from "@/components/discord-iframe";
import type { DiscordWidgetData } from "@/lib/discord-widget";
import type { ThemeTokens } from "@/lib/theme";
import { getPublicDictionary, type PublicLocale } from "@/lib/public-i18n";

type ConfigResponse = { config: DiscordWidgetDisplayConfig & { guildId: string } };

// Client component -- linkType "discord_widget" dirender lewat LinkCard, yang BISA
// ke-reach dari preview dashboard client-side (board.tsx/theme-editor.tsx -> DashboardPreviewPanel
// -> PublicPagePreview -> LinkCard). Komponen async (DiscordWidget, dipakai buat mode
// "floating") gak bisa dipanggil dari jalur itu -- React client gak support async
// function component sama sekali. `widgetId` doang yang disimpen di link.url (referensi
// LIVE) -- config aslinya + data Discord-nya ditarik sekali lewat /api/discord-widget-config
// (proxy server-side, bukan langsung ke discord.com -- gak digantungin ke CORS Discord).
export function DiscordWidgetLinkCard({
  widgetId,
  theme,
  locale,
}: {
  widgetId: number | null;
  theme: ThemeTokens;
  locale?: PublicLocale;
}) {
  const t = getPublicDictionary(locale ?? "en");
  const [result, setResult] = useState<{ config: ConfigResponse["config"]; data: DiscordWidgetData | null } | null>(null);

  useEffect(() => {
    if (widgetId === null) return;
    let cancelled = false;
    fetch(`/api/discord-widget-config?widgetId=${widgetId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setResult(json);
      })
      .catch(() => {
        if (!cancelled) setResult(null);
      });
    return () => {
      cancelled = true;
    };
  }, [widgetId]);

  // Belum ke-fetch/widget udah kehapus/gagal -- diem aja, jangan bikin halaman keliatan
  // rusak gara-gara satu widget gagal muat.
  if (!result) return null;
  if (result.config.style === "iframe") return <DiscordIframe guildId={result.config.guildId} />;
  if (!result.data) return null;

  return <DiscordWidgetCard data={result.data} config={result.config} theme={theme} t={t} />;
}
