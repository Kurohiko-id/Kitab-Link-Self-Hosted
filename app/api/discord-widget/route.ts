import { NextResponse, type NextRequest } from "next/server";
import { fetchDiscordWidgetData } from "@/lib/discord-widget";

// Proxy tipis ke widget.json Discord -- dipanggil dari DiscordWidgetFormModal (live preview
// pas isi form, client component, gak boleh mukul discord.com langsung karena CORS-nya gak
// dijamin) dan tetep kena cache revalidate 60s yang sama kayak jalur server-side lain.
export async function GET(req: NextRequest) {
  const guildId = req.nextUrl.searchParams.get("guildId") ?? "";
  if (!/^\d+$/.test(guildId)) {
    return NextResponse.json({ error: "invalid guildId" }, { status: 400 });
  }
  const data = await fetchDiscordWidgetData(guildId);
  if (!data) {
    return NextResponse.json({ error: "widget unavailable" }, { status: 404 });
  }
  return NextResponse.json(data);
}
