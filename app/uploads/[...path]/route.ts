import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { resolveUploadPath } from "@/lib/images/storage";

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  webp: "image/webp",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  // Setiap segment wajib nama file/folder polos — tolak apapun yang bisa dipakai path traversal.
  const isSafe = segments.every((segment) => segment.length > 0 && !/[\\/]|\.\./.test(segment));
  if (!isSafe) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await readFile(resolveUploadPath(segments.join("/")));
    const ext = segments[segments.length - 1].split(".").pop() ?? "";
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
