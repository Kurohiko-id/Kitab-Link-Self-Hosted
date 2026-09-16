"use server";

import { and, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { pageAccessCodes, pages } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import { grantPageAccess } from "@/lib/auth/page-session";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/lib/auth/unlock-rate-limit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getPublicDictionary, type PublicLocale } from "@/lib/public-i18n";
import { getDictionary, type Locale } from "@/lib/i18n";

export type UnlockState = { error?: string } | undefined;

// redirectTo dilempar dari pemanggil (bukan selalu "/${slug}") -- kalau page ini lagi
// ditampilin di domain root (lihat lib/public-page-meta.ts), redirect balik harus ke "/"
// biar slug-nya tetep gak muncul di URL, bukan ke-lempar ke "/${slug}". `locale` dari browser
// PENGUNJUNG (lihat PasswordForm) -- pesan error ini sengaja bukan hardcoded Indonesia,
// halaman password-gate ini dilihat pengunjung, bukan cuma page owner.
export async function unlockPage(
  pageId: number,
  redirectTo: string,
  locale: PublicLocale,
  _prevState: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const pt = getPublicDictionary(locale);
  const rlKey = `page:${pageId}`;
  if (isLockedOut(rlKey)) {
    return { error: pt.tooManyAttemptsError };
  }

  const password = String(formData.get("password") ?? "");

  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  let matched = false;
  if (page?.passwordHash) {
    matched = await verifyPassword(page.passwordHash, password);
  }

  if (!matched && password) {
    // Password utama gak cocok -> coba cocokin ke kode akses sementara yang masih aktif
    // (belum lewat expiresAt). Linear compare, wajar buat jumlah kode yang kecil.
    const activeCodes = await db
      .select()
      .from(pageAccessCodes)
      .where(and(eq(pageAccessCodes.pageId, pageId), gt(pageAccessCodes.expiresAt, new Date())));
    for (const code of activeCodes) {
      if (await verifyPassword(code.codeHash, password)) {
        matched = true;
        break;
      }
    }
  }

  if (!matched) {
    recordFailedAttempt(rlKey);
    return { error: pt.wrongPasswordError };
  }

  clearAttempts(rlKey);
  await grantPageAccess(pageId);
  redirect(redirectTo);
}

const MAX_DURATION_HOURS = 24 * 30; // 30 hari, batas atas biar gak kepake sebagai password permanen kedua

// Dipanggil dari dashboard (admin), bukan visitor -- pakai lib/i18n.ts (dashboard, bilingual
// lewat toggle) BUKAN lib/public-i18n.ts (browser pengunjung), beda sumber locale-nya.
export async function createTempAccessAction(locale: Locale, pageId: number, code: string, durationHours: number, label: string) {
  const t = getDictionary(locale);
  await requireOwnedPage(pageId);
  const trimmed = code.trim();
  if (trimmed.length < 4) return { error: t.settings.tempAccessCodeTooShort };

  const hours = Math.min(MAX_DURATION_HOURS, Math.max(1, Math.round(durationHours)));
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const codeHash = await hashPassword(trimmed);

  await db.insert(pageAccessCodes).values({
    pageId,
    codeHash,
    label: label.trim() || null,
    expiresAt,
  });

  revalidatePath("/dashboard");
  return {};
}

export async function revokeTempAccessAction(pageId: number, codeId: number) {
  await requireOwnedPage(pageId);
  await db.delete(pageAccessCodes).where(and(eq(pageAccessCodes.id, codeId), eq(pageAccessCodes.pageId, pageId)));
  revalidatePath("/dashboard");
}
