import { cookies } from "next/headers";
import { sign, verify } from "./hmac";
import { isPreviewTokenStillValid } from "./preview-token";

const COOKIE_NAME = "kitab_session";
const PREVIEW_COOKIE_NAME = "kitab_preview_session";
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

// Session TERPISAH dari session admin biasa (cookie beda nama) -- orang yang buka link
// share gak pernah punya `kitab_session` asli, jadi gak akan ketuker kepilih sebagai admin
// asli walau dua-duanya browser sama kebetulan lagi login (mis. admin buka link share-nya
// sendiri buat ngetes) -- getSession() cek `kitab_session` DULUAN, preview cuma fallback.
export async function createPreviewSession(userId: number, tokenId: number) {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${tokenId}.${expires}`;
  const value = `${payload}.${sign(payload)}`;

  const store = await cookies();
  store.set(PREVIEW_COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroyPreviewSession() {
  const store = await cookies();
  store.delete(PREVIEW_COOKIE_NAME);
}

export async function getSession(): Promise<{ userId: number; readOnly: boolean } | null> {
  const store = await cookies();

  const value = store.get(COOKIE_NAME)?.value;
  if (value) {
    const [userIdRaw, expiresRaw, signature] = value.split(".");
    if (userIdRaw && expiresRaw && signature && verify(`${userIdRaw}.${expiresRaw}`, signature) && Date.now() <= Number(expiresRaw)) {
      return { userId: Number(userIdRaw), readOnly: false };
    }
  }

  const previewValue = store.get(PREVIEW_COOKIE_NAME)?.value;
  if (previewValue) {
    const [userIdRaw, tokenIdRaw, expiresRaw, signature] = previewValue.split(".");
    if (
      userIdRaw &&
      tokenIdRaw &&
      expiresRaw &&
      signature &&
      verify(`${userIdRaw}.${tokenIdRaw}.${expiresRaw}`, signature) &&
      Date.now() <= Number(expiresRaw) &&
      (await isPreviewTokenStillValid(Number(userIdRaw), Number(tokenIdRaw)))
    ) {
      return { userId: Number(userIdRaw), readOnly: true };
    }
  }

  return null;
}
