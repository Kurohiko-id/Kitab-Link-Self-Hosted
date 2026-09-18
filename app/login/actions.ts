"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, destroySession } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { grantPending2fa, getPending2faUserId, clearPending2fa } from "@/lib/auth/pending-2fa";
import { decryptTotpSecret } from "@/lib/auth/totp-crypto";
import { verifyTotpCode, consumeBackupCode } from "@/lib/auth/totp";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/lib/auth/unlock-rate-limit";
import { generateResetToken, verifyResetToken, consumeResetToken } from "@/lib/auth/reset-password-token";
import { getDictionary, type Locale } from "@/lib/i18n";

export type LoginState = { error?: string; needsTotp?: boolean } | undefined;

export async function login(locale: Locale, _prevState: LoginState, formData: FormData): Promise<LoginState> {
  const t = getDictionary(locale);
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: t.login.usernameRequiredError };
  }

  // Key di-namespace "login:" + username -- username jumlahnya kebatas sama akun yang beneran
  // ada (single-user app ini paling cuma segelintir), bukan input attacker bebas kayak IP.
  const rlKey = `login:${username}`;
  if (isLockedOut(rlKey)) {
    return { error: t.login.tooManyAttemptsError };
  }

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) {
    recordFailedAttempt(rlKey);
    return { error: t.login.invalidCredentialsError };
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    recordFailedAttempt(rlKey);
    return { error: t.login.invalidCredentialsError };
  }
  clearAttempts(rlKey);

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

export type RequestResetState = { sent?: boolean } | undefined;

// Selalu balikin { sent: true } apapun hasilnya (username ada apa nggak di DB) -- kalau
// pesannya beda-beda, orang luar bisa dipakai buat nebak username admin yang valid.
export async function requestPasswordReset(
  locale: Locale,
  _prevState: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!username) return { sent: true };

  const rlKey = `reset-request:${username}`;
  if (isLockedOut(rlKey)) return { sent: true };
  recordFailedAttempt(rlKey); // rate-limit generic -- cegah spam generate token/log, bukan soal salah/benar

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (user) generateResetToken(username);

  return { sent: true };
}

export type ResetPasswordState = { error?: string } | undefined;

export async function resetPasswordAction(
  locale: Locale,
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const t = getDictionary(locale);
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !token || !password) {
    return { error: t.resetPassword.requiredError };
  }
  if (password.length < 8) {
    return { error: t.resetPassword.passwordTooShort };
  }
  if (password.length > 200) {
    return { error: t.resetPassword.passwordTooLong };
  }
  if (!verifyResetToken(username, token)) {
    return { error: t.resetPassword.invalidTokenError };
  }

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) {
    return { error: t.resetPassword.invalidTokenError };
  }

  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
  consumeResetToken(username);

  redirect("/login");
}
