import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { discordWidgets, pages } from "@/lib/db/schema";
import { verifyApiToken } from "@/lib/auth/api-tokens";
import { logActivity } from "@/lib/db/activity-log";

// GET /api/v1/discord-widgets/:id -> status 1 widget doang (polling dari luar).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  const identity = await verifyApiToken(token);
  if (!identity) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  if (!identity.scopes.includes("discord:read")) {
    return NextResponse.json({ error: "Token tidak punya scope discord:read" }, { status: 403 });
  }

  const widgetId = Number((await params).id);
  if (!widgetId) return NextResponse.json({ error: "ID widget tidak valid" }, { status: 400 });

  const [widget] = await db
    .select({ id: discordWidgets.id, name: discordWidgets.name, isEnabled: discordWidgets.isEnabled })
    .from(discordWidgets)
    .innerJoin(pages, eq(pages.id, discordWidgets.pageId))
    .where(and(eq(discordWidgets.id, widgetId), eq(pages.userId, identity.userId)))
    .limit(1);
  if (!widget) return NextResponse.json({ error: "Widget tidak ditemukan" }, { status: 404 });

  return NextResponse.json(widget);
}

// PATCH /api/v1/discord-widgets/:id  { "enabled": true|false } atau body kosong = toggle.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  const identity = await verifyApiToken(token);
  if (!identity) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  if (!identity.scopes.includes("discord:write")) {
    return NextResponse.json({ error: "Token tidak punya scope discord:write" }, { status: 403 });
  }

  const widgetId = Number((await params).id);
  if (!widgetId) return NextResponse.json({ error: "ID widget tidak valid" }, { status: 400 });

  const [widget] = await db
    .select({ id: discordWidgets.id, name: discordWidgets.name, isEnabled: discordWidgets.isEnabled, pageId: discordWidgets.pageId })
    .from(discordWidgets)
    .innerJoin(pages, eq(pages.id, discordWidgets.pageId))
    .where(and(eq(discordWidgets.id, widgetId), eq(pages.userId, identity.userId)))
    .limit(1);
  if (!widget) return NextResponse.json({ error: "Widget tidak ditemukan" }, { status: 404 });

  let body: { enabled?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // body kosong -> toggle
  }

  const nextEnabled = typeof body.enabled === "boolean" ? body.enabled : !widget.isEnabled;
  await db.update(discordWidgets).set({ isEnabled: nextEnabled }).where(eq(discordWidgets.id, widgetId));
  logActivity(widget.pageId, nextEnabled ? "discord_widget_enabled" : "discord_widget_disabled", widget.name, "api", identity.name);

  return NextResponse.json({ id: widgetId, isEnabled: nextEnabled });
}
