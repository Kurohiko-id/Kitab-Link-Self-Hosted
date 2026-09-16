"use server";

import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/require-session";
import { generateTotpSecret, buildTotpUri, verifyTotpCode, generateBackupCodes, hashBackupCodes } from "@/lib/auth/totp";
import { encryptTotpSecret } from "@/lib/auth/totp-crypto";
import { verifyPassword } from "@/lib/auth/password";
import { savePendingTotpSecret, getPendingTotpSecret, clearPendingTotpSecret } from "@/lib/auth/pending-totp-enrollment";
import { getDictionary, type Locale } from "@/lib/i18n";

// Dipanggil langsung dari client component (bukan lewat <form action>) -- server action
// biasa juga bisa dipanggil kayak fungsi async biasa dari onClick, gak wajib dibungkus form.
// Secret disimpen di cookie signed (bukan cuma dibalikin ke client) -- confirmTotpEnrollment
// baca secret-nya dari cookie itu, BUKAN dari form field, biar client gak bisa nyuplai
// secret sembarangan buat di-approve server (lihat lib/auth/pending-totp-enrollment.ts).
export async function startTotpEnrollment(): Promise<{ secret: string; qrDataUrl: string }> {
  const session = await requireSession();
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) throw new Error("User tidak ditemukan.");

  const secret = generateTotpSecret();
  await savePendingTotpSecret(session.userId, secret);
  const uri = buildTotpUri(secret, user.email);
  const qrDataUrl = await QRCode.toDataURL(uri);
  return { secret, qrDataUrl };
}

export type ConfirmTotpState = { error?: string; backupCodes?: string[] } | undefined;

export async function confirmTotpEnrollment(
  locale: Locale,
  _prevState: ConfirmTotpState,
  formData: FormData,
): Promise<ConfirmTotpState> {
  const t = getDictionary(locale);
  const session = await requireSession();
  const secret = await getPendingTotpSecret(session.userId);
  const code = String(formData.get("code") ?? "");

  if (!secret || !(await verifyTotpCode(secret, code))) {
    return { error: t.settings.totpInvalidCodeError };
  }

  const backupCodes = generateBackupCodes();
  const hashedCodes = await hashBackupCodes(backupCodes);

  await db
    .update(users)
    .set({
      totpSecret: encryptTotpSecret(secret),
      totpEnabled: true,
      totpBackupCodesJson: JSON.stringify(hashedCodes),
    })
    .where(eq(users.id, session.userId));

  await clearPendingTotpSecret();
  revalidatePath("/dashboard");
  return { backupCodes };
}

export type DisableTotpState = { error?: string } | undefined;

// Minta password (bukan cuma session) -- sama kayak changePasswordAction, biar session yang
// kecolong sesaat (browser gak di-lock, XSS ringan) gak bisa langsung matiin 2FA orang lain.
export async function disableTotpAction(
  locale: Locale,
  _prevState: DisableTotpState,
  formData: FormData,
): Promise<DisableTotpState> {
  const t = getDictionary(locale);
  const session = await requireSession();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const password = String(formData.get("password") ?? "");
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    return { error: t.settings.currentPasswordWrong };
  }

  await db
    .update(users)
    .set({ totpSecret: null, totpEnabled: false, totpBackupCodesJson: null })
    .where(eq(users.id, session.userId));
  revalidatePath("/dashboard");
  return {};
}

export type RegenerateBackupCodesState = { error?: string; backupCodes?: string[] } | undefined;

// Sebelumnya satu-satunya cara dapet backup code baru = matiin 2FA (scan QR ulang) terus
// nyalain lagi -- padahal 10 kode sekali pakai bisa habis kepake normal (login dari device
// baru, dst) TANPA HP authenticator-nya ilang. Minta password (bukan cuma session), sama
// alasan kayak disableTotpAction.
export async function regenerateBackupCodesAction(
  locale: Locale,
  _prevState: RegenerateBackupCodesState,
  formData: FormData,
): Promise<RegenerateBackupCodesState> {
  const t = getDictionary(locale);
  const session = await requireSession();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const password = String(formData.get("password") ?? "");
  if (!user || !user.totpEnabled || !(await verifyPassword(user.passwordHash, password))) {
    return { error: t.settings.currentPasswordWrong };
  }

  const backupCodes = generateBackupCodes();
  const hashedCodes = await hashBackupCodes(backupCodes);
  await db.update(users).set({ totpBackupCodesJson: JSON.stringify(hashedCodes) }).where(eq(users.id, session.userId));

  revalidatePath("/dashboard");
  return { backupCodes };
}
