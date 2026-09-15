"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, destroySession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { grantPending2fa, getPending2faUserId, clearPending2fa } from "@/lib/auth/pending-2fa";
import { decryptTotpSecret } from "@/lib/auth/totp-crypto";
import { verifyTotpCode, consumeBackupCode } from "@/lib/auth/totp";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/lib/auth/unlock-rate-limit";
import { getDictionary, type Locale } from "@/lib/i18n";

export type LoginState = { error?: string; needsTotp?: boolean } | undefined;

export async function login(locale: Locale, _prevState: LoginState, formData: FormData): Promise<LoginState> {
  const t = getDictionary(locale);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: t.login.emailRequiredError };
  }

  // Key di-namespace "login:" + email -- email jumlahnya kebatas sama akun yang beneran
  // ada (single-user app ini paling cuma segelintir), bukan input attacker bebas kayak IP.
  const rlKey = `login:${email}`;
  if (isLockedOut(rlKey)) {
    return { error: t.login.tooManyAttemptsError };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    recordFailedAttempt(rlKey);
    return { error: t.login.invalidCredentialsError };
  }
  const { valid, needsRehash } = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    recordFailedAttempt(rlKey);
    return { error: t.login.invalidCredentialsError };
  }
  clearAttempts(rlKey);
  // Migrasi transparan bcrypt -> Argon2id: begitu login sukses pakai hash lama, langsung
  // re-hash & update row-nya di sini, gak perlu batch migration terpisah.
  if (needsRehash) {
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
  }

  if (user.totpEnabled) {
    // Password cocok tapi belum lolos 2FA -- session PENUH belum kebentuk, cuma state
    // sementara (5 menit) buat lanjut ke step kode TOTP (lihat verifyTotpLoginAction).
    await grantPending2fa(user.id);
    return { needsTotp: true };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export type TotpLoginState = { error?: string } | undefined;

export async function verifyTotpLoginAction(
  locale: Locale,
  _prevState: TotpLoginState,
  formData: FormData,
): Promise<TotpLoginState> {
  const t = getDictionary(locale);
  const userId = await getPending2faUserId();
  if (!userId) {
    return { error: t.login.totpExpiredError };
  }

  // Key di-namespace "totp:" + userId -- userId numerik terbatas (cuma akun yang beneran
  // ada di DB), aman dari pertumbuhan Map tak terbatas.
  const rlKey = `totp:${userId}`;
  if (isLockedOut(rlKey)) {
    return { error: t.login.tooManyAttemptsError };
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return { error: t.login.totpExpiredError };
  }

  const code = String(formData.get("code") ?? "").trim();
  let ok = false;

  if (/^\d{6}$/.test(code)) {
    try {
      ok = await verifyTotpCode(decryptTotpSecret(user.totpSecret), code);
    } catch {
      // Master secret ilang/beda (volume gak ke-mount, dll) -> secret TOTP gak bisa
      // di-decrypt sama sekali. Kasih tau apa adanya, bukan 500 mentah -- backup code
      // (cabang di bawah, gak butuh decrypt) masih bisa dipakai buat masuk.
      return { error: t.login.totpSecretUnreadableError };
    }
  } else if (code) {
    // Bukan format 6-digit -- coba cocokin ke salah satu backup code (sekali pakai).
    const backupCodes = user.totpBackupCodesJson ? (JSON.parse(user.totpBackupCodesJson) as string[]) : [];
    const remaining = await consumeBackupCode(backupCodes, code);
    if (remaining) {
      ok = true;
      await db.update(users).set({ totpBackupCodesJson: JSON.stringify(remaining) }).where(eq(users.id, userId));
    }
  }

  if (!ok) {
    recordFailedAttempt(rlKey);
    return { error: t.login.totpInvalidError };
  }

  clearAttempts(rlKey);
  await clearPending2fa();
  await createSession(userId);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
