import { cookies } from "next/headers";

// Preferensi tampilan doang (bukan data sensitif/keamanan) -- cukup cookie biasa, gak
// perlu signed/httpOnly. Dibaca SERVER-SIDE (bukan localStorage) biar bisa masking angka
// analytics SEBELUM di-render, gak ada kedipan nunjukin angka asli sebelum ke-mask.
const COOKIE_NAME = "kl_streamer_mode";
const MAX_AGE = 60 * 60 * 24 * 365;

export async function isStreamerModeOn(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "1";
}

export async function toggleStreamerMode(): Promise<boolean> {
  const store = await cookies();
  const next = store.get(COOKIE_NAME)?.value !== "1";
  store.set(COOKIE_NAME, next ? "1" : "0", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return next;
}
