"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/require-session";

export async function dismissUpdateAction(version: string) {
  const session = await requireSession();
  await db.update(users).set({ lastSeenAppVersion: version }).where(eq(users.id, session.userId));
}
