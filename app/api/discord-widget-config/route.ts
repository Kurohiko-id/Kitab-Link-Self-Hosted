import { NextResponse, type NextRequest } from "next/server";
import { getDiscordWidgetById } from "@/lib/db/discord-widget";
import { fetchDiscordWidgetData } from "@/lib/discord-widget";

// Dipanggil dari DiscordWidgetLinkCard (client component, linkType "discord_widget") --
// link cuma nyimpen `widgetId` (referensi LIVE, bukan snapshot), jadi tiap render butuh
// tarik config aslinya (guildId/style/toggle) dari DB dulu di sini (route handler = server
// context beneran, LinkCard sendiri gak bisa query DB langsung soalnya bisa ke-render dari
// preview dashboard yang client-side). Sekalian fetch data Discord-nya di sini juga (KECUALI
// style "iframe", gak butuh widget.json sama sekali) biar client cukup 1x fetch aja.
export async function GET(req: NextRequest) {
  const widgetIdRaw = req.nextUrl.searchParams.get("widgetId") ?? "";
  const widgetId = Number(widgetIdRaw);
  if (!Number.isFinite(widgetId)) {
    return NextResponse.json({ error: "invalid widgetId" }, { status: 400 });
  }

  const widget = await getDiscordWidgetById(widgetId);
  if (!widget) {
    return NextResponse.json({ error: "widget not found" }, { status: 404 });
  }

  const config = {
    guildId: widget.guildId,
    style: widget.style,
    title: widget.title,
    showMemberCount: widget.showMemberCount,
    showAvatars: widget.showAvatars,
    showVoiceChannels: widget.showVoiceChannels,
    showJoinButton: widget.showJoinButton,
  };

  if (widget.style === "iframe") {
    return NextResponse.json({ config, data: null });
  }

  const data = await fetchDiscordWidgetData(widget.guildId);
  return NextResponse.json({ config, data });
}
