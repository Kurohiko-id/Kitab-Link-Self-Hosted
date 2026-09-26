import { cookies } from "next/headers";
import { sign, verify } from "./hmac";
import { isSecureRequest } from "./secure-cookie";

const COOKIE_NAME = "kitab_2fa_pending";
const PENDING_TTL_MS = 1000 * 60 * 5; // 5 menit -- cukup buat buka app authenticator di HP

// Password udah cocok tapi TOTP belum diverifikasi -- state SEMENTARA ini dipisah dari
// session asli (lib/auth/session.ts) biar session penuh baru kebentuk SETELAH 2FA lolos,
// bukan lebih awal. Pola sama kayak lib/auth/page-session.ts (cookie signed terpisah).
export async function grantPending2fa(userId: number) {
  const expires = Date.now() + PENDING_TTL_MS;
  const payload = `${userId}.${expires}`;
  const value = `${payload}.${sign(payload)}`;

  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: await isSecureRequest(),
    path: "/",
    expires: new Date(expires),
  });
}

export async function getPending2faUserId(): Promise<number | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;

  const [userIdRaw, expiresRaw, signature] = value.split(".");
  if (!userIdRaw || !expiresRaw || !signature) return null;
  if (!verify(`${userIdRaw}.${expiresRaw}`, signature)) return null;
  if (Date.now() > Number(expiresRaw)) return null;

  return Number(userIdRaw);
}

export async function clearPending2fa() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
