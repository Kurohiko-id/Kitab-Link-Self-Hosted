import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { links, pages } from "@/lib/db/schema";
import { verifyApiToken } from "@/lib/auth/api-tokens";

// PATCH /api/v1/links/:id  { "active": true|false } atau body kosong = toggle.
// Dibikin buat kontrol dari luar (Stream Deck dkk) via satu tombol.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  const identity = await verifyApiToken(token);
  if (!identity) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  if (!identity.scopes.includes("links:write")) {
    return NextResponse.json({ error: "Token tidak punya scope links:write" }, { status: 403 });
  }

  const linkId = Number((await params).id);
  if (!linkId) return NextResponse.json({ error: "ID link tidak valid" }, { status: 400 });

  const [link] = await db
    .select({ id: links.id, isActive: links.isActive, pageId: links.pageId })
    .from(links)
    .innerJoin(pages, eq(pages.id, links.pageId))
    .where(and(eq(links.id, linkId), eq(pages.userId, identity.userId)))
    .limit(1);
  if (!link) return NextResponse.json({ error: "Link tidak ditemukan" }, { status: 404 });

  let body: { active?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // body kosong (mis. request dari Stream Deck tanpa payload) -> toggle
  }

  const nextActive = typeof body.active === "boolean" ? body.active : !link.isActive;
  await db.update(links).set({ isActive: nextActive }).where(eq(links.id, linkId));

  return NextResponse.json({ id: linkId, isActive: nextActive });
}
