import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { resolveUploadPath } from "@/lib/images/storage";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  webp: "image/webp",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
  pdf: "application/pdf",
  zip: "application/zip",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  // Setiap segment wajib nama file/folder polos — tolak apapun yang bisa dipakai path traversal.
  const isSafe = segments.every((segment) => segment.length > 0 && !/[\\/]|\.\./.test(segment));
  if (!isSafe) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = resolveUploadPath(segments.join("/"));

  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  // Stream, jangan buffer seluruh file ke memory (readFile lama bikin proses ini -- satu-
  // satunya proses Node yang juga pegang SQLite+cron, lihat CLAUDE.md -- spike RAM tiap
  // ada yang download file besar, bikin seluruh VPS lemot terutama kalau RAM-nya kecil.
  const ext = segments[segments.length - 1].split(".").pop() ?? "";
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream",
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
