import { cookies } from "next/headers";
import { sign, verify } from "./hmac";

const COOKIE_NAME = "kitab_totp_enroll";
const ENROLL_TTL_MS = 1000 * 60 * 10; // 10 menit -- cukup buat scan QR + baca kode pertama

// Secret pending enrollment disimpen di cookie SIGNED (bukan dipercaya dari hidden form
// field kayak sebelumnya) -- kalau server percaya secret yang dikirim balik dari client,
// siapa pun yang punya session bisa nge-submit secret PILIHAN DIA SENDIRI (dia yang pegang
// authenticator-nya, bukan pemilik akun beneran -- efeknya backdoor persistence). Payload-
// nya diikat ke userId biar cookie punya user lain gak bisa dipake buat akun ini.
export async function savePendingTotpSecret(userId: number, secret: string) {
  const expires = Date.now() + ENROLL_TTL_MS;
  const payload = `${userId}.${secret}.${expires}`;
  const value = `${payload}.${sign(payload)}`;

  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function getPendingTotpSecret(userId: number): Promise<string | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;

  const [userIdRaw, secret, expiresRaw, signature] = value.split(".");
  if (!userIdRaw || !secret || !expiresRaw || !signature) return null;
  if (!verify(`${userIdRaw}.${secret}.${expiresRaw}`, signature)) return null;
  if (Number(userIdRaw) !== userId) return null;
  if (Date.now() > Number(expiresRaw)) return null;

  return secret;
}

export async function clearPendingTotpSecret() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
