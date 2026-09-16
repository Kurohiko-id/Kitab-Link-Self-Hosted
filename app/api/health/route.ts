import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Dipakai HEALTHCHECK di Dockerfile -- query kecil ke DB, bukan cuma "server-nya nyala",
// biar restart otomatis kalau koneksi SQLite macet (disk penuh, volume ke-unmount, dll).
export async function GET() {
  try {
    db.run(sql`select 1`);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[health] db check failed:", err);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
