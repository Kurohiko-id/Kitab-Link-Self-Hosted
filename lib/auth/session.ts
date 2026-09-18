import { cookies } from "next/headers";
import { sign, verify } from "./hmac";

const COOKIE_NAME = "kitab_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

export async function createSession(userId: number) {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expires}`;
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

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<{ userId: number } | null> {
  const store = await cookies();

  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return null;

  const [userIdRaw, expiresRaw, signature] = value.split(".");
  if (userIdRaw && expiresRaw && signature && verify(`${userIdRaw}.${expiresRaw}`, signature) && Date.now() <= Number(expiresRaw)) {
    return { userId: Number(userIdRaw) };
  }

  return null;
}
