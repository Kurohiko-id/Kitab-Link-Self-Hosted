import { desc, eq } from "drizzle-orm";
import { db } from "./index";
import { pageAccessCodes } from "./schema";

export async function getAccessCodesForPage(pageId: number) {
  const rows = await db
    .select({
      id: pageAccessCodes.id,
      label: pageAccessCodes.label,
      expiresAt: pageAccessCodes.expiresAt,
      createdAt: pageAccessCodes.createdAt,
    })
    .from(pageAccessCodes)
    .where(eq(pageAccessCodes.pageId, pageId))
    .orderBy(desc(pageAccessCodes.createdAt));

  // "Expired" dihitung di sini (server, sekali per request) bukan di komponen client pake
  // Date.now() -- react-compiler nolak impure call pas render.
  const now = Date.now();
  return rows.map((row) => ({ ...row, expired: row.expiresAt.getTime() < now }));
}
