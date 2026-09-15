"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { verifySetupToken } from "@/lib/auth/setup-token";
import { getOrCreateDefaultPage } from "@/lib/db/pages";
import { getDictionary, type Locale } from "@/lib/i18n";

export type SetupState = { error?: string } | undefined;

export async function setupFirstAdmin(locale: Locale, _prevState: SetupState, formData: FormData): Promise<SetupState> {
  const t = getDictionary(locale);

  // Dicek ulang di sini (bukan cuma di app/setup/page.tsx) -- render halaman & submit form
  // itu dua request terpisah, race-nya cuma beneran ketutup kalau dicek pas mau nulis juga.
  const [existing] = await db.select({ id: users.id }).from(users).limit(1);
  if (existing) {
    return { error: t.setup.alreadySetupError };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // .toLowerCase() -- token-nya hex huruf kecil; normalisasi di server biar autocapitalize
  // keyboard HP (atau user yang ngetik kapital) gak bikin token yang bener jadi ditolak.
  const submittedToken = String(formData.get("token") ?? "").trim().toLowerCase();

  if (!email || !password || !submittedToken) {
    return { error: t.setup.requiredError };
  }
  // minLength={8} di HTML gampang di-bypass (curl/devtools) -- wajib dicek ulang di server,
  // sama kayak changePasswordAction. Cap atas juga (bcrypt/argon2 makin lambat buat input
  // super panjang, gak ada gunanya password lebih dari ini).
  if (password.length < 8) {
    return { error: t.setup.passwordTooShort };
  }
  if (password.length > 200) {
    return { error: t.setup.passwordTooLong };
  }
  if (!verifySetupToken(submittedToken)) {
    return { error: t.setup.invalidTokenError };
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();

  await getOrCreateDefaultPage(user.id);
  await createSession(user.id);
  redirect("/dashboard");
}
