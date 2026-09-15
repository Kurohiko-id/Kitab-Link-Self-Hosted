import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { links, pages } from "@/lib/db/schema";
import { verifyApiToken } from "@/lib/auth/api-tokens";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  const identity = await verifyApiToken(token);
  if (!identity) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  if (!identity.scopes.includes("links:read")) {
    return NextResponse.json({ error: "Token tidak punya scope links:read" }, { status: 403 });
  }

  const pageId = Number(new URL(req.url).searchParams.get("pageId"));
  if (!pageId) {
    return NextResponse.json({ error: "Query param pageId wajib diisi" }, { status: 400 });
  }

  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, identity.userId)))
    .limit(1);
  if (!page) return NextResponse.json({ error: "Page tidak ditemukan" }, { status: 404 });

  const rows = await db.select().from(links).where(eq(links.pageId, pageId));
  return NextResponse.json({
    links: rows.map((l) => ({
      id: l.id,
      title: l.title,
      url: l.url,
      isActive: l.isActive,
      displayStyle: l.displayStyle,
    })),
  });
}
