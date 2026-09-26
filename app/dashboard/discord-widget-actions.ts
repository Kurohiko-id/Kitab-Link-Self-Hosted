"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { discordWidgets } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import { fetchDiscordWidgetData } from "@/lib/discord-widget";

export type SaveDiscordWidgetState = { error?: string } | undefined;

type FloatingPosition = "left-top" | "left-middle" | "left-bottom" | "right-top" | "right-middle" | "right-bottom";
const FLOATING_POSITIONS: FloatingPosition[] = ["left-top", "left-middle", "left-bottom", "right-top", "right-middle", "right-bottom"];

// widgetId null = bikin baru, ada = update row itu punya page ini. Nge-tes fetch ke
// widget.json dulu SEBELUM nyimpen -- biar user langsung tau kalau Server ID salah /
// "Enable Server Widget"-nya belum dinyalain, bukan baru ketauan pas buka halaman publik.
export async function saveDiscordWidgetAction(
  pageId: number,
  widgetId: number | null,
  _prevState: SaveDiscordWidgetState,
  formData: FormData,
): Promise<SaveDiscordWidgetState> {
  await requireOwnedPage(pageId);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama widget wajib diisi." };

  const guildId = String(formData.get("guildId") ?? "").trim();
  if (!/^\d+$/.test(guildId)) {
    return { error: "Server ID harus berupa angka (klik kanan nama server di Discord > Copy Server ID)." };
  }

  const widgetData = await fetchDiscordWidgetData(guildId);
  if (!widgetData) {
    return {
      error: "Gagal ambil data widget. Pastikan Server ID benar dan \"Enable Server Widget\" udah dinyalain di Discord (Server Settings > Widget).",
    };
  }

  const styleRaw = formData.get("style");
  const style = styleRaw === "discord" || styleRaw === "classic" || styleRaw === "iframe" ? styleRaw : "custom";
  const placementMode = formData.get("placementMode") === "floating" ? "floating" : "inline";
  const floatingPositionRaw = String(formData.get("floatingPosition") ?? "") as FloatingPosition;
  const floatingPosition =
    placementMode === "floating" && FLOATING_POSITIONS.includes(floatingPositionRaw) ? floatingPositionRaw : null;
  if (placementMode === "floating" && !floatingPosition) {
    return { error: "Pilih posisi floating-nya." };
  }

  const title = String(formData.get("title") ?? "").trim() || null;
  const showMemberCount = formData.get("showMemberCount") === "1";
  const showAvatars = formData.get("showAvatars") === "1";
  const showVoiceChannels = formData.get("showVoiceChannels") === "1";
  const showJoinButton = formData.get("showJoinButton") === "1";

  const values = {
    name,
    guildId,
    style,
    placementMode,
    floatingPosition,
    title,
    showMemberCount,
    showAvatars,
    showVoiceChannels,
    showJoinButton,
  } as const;

  if (widgetId) {
    await db.update(discordWidgets).set(values).where(and(eq(discordWidgets.id, widgetId), eq(discordWidgets.pageId, pageId)));
  } else {
    await db.insert(discordWidgets).values({ pageId, ...values });
  }

  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
}

export async function deleteDiscordWidgetAction(pageId: number, widgetId: number) {
  await requireOwnedPage(pageId);
  await db.delete(discordWidgets).where(and(eq(discordWidgets.id, widgetId), eq(discordWidgets.pageId, pageId)));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
}
