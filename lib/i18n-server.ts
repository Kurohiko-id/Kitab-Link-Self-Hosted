import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  // Default English kalau belum pernah di-set (bukan "id" seperti sebelumnya).
  return store.get(LOCALE_COOKIE)?.value === "id" ? "id" : "en";
}
