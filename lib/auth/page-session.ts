import { cookies } from "next/headers";
import { sign, verify } from "./hmac";

const ACCESS_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 hari

function cookieName(pageId: number) {
  return `kitab_page_${pageId}`;
}

// Session terpisah dari akun (bukan HMAC pemilik page) — dipakai visitor
// yang berhasil masukin password page yang di-protect.
export async function grantPageAccess(pageId: number) {
  const expires = Date.now() + ACCESS_TTL_MS;
  const payload = `${pageId}.${expires}`;
  const value = `${payload}.${sign(payload)}`;

  const store = await cookies();
  store.set(cookieName(pageId), value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function hasPageAccess(pageId: number): Promise<boolean> {
  const store = await cookies();
  const value = store.get(cookieName(pageId))?.value;
  if (!value) return false;

  const [pageIdRaw, expiresRaw, signature] = value.split(".");
  if (!pageIdRaw || !expiresRaw || !signature) return false;
  if (Number(pageIdRaw) !== pageId) return false;
  if (!verify(`${pageIdRaw}.${expiresRaw}`, signature)) return false;
  if (Date.now() > Number(expiresRaw)) return false;

  return true;
}
