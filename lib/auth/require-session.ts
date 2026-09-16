import { redirect } from "next/navigation";
import { getSession } from "./session";

// Dipakai HAMPIR SEMUA server action -- default-nya AMAN (throw kalau session lagi mode
// preview/read-only), biar setiap action yang lupa di-update otomatis nolak nulis dari
// preview session, bukan malah kebuka. Satu-satunya tempat yang boleh IZININ read-only
// masuk adalah render/baca data (app/dashboard/page.tsx) -- pakai requireSessionAllowReadOnly
// di situ secara eksplisit, bukan di sini.
export async function requireSession(): Promise<{ userId: number }> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.readOnly) {
    throw new Error("Mode preview ini cuma buat lihat-lihat, gak bisa ubah data.");
  }
  return { userId: session.userId };
}

export async function requireSessionAllowReadOnly(): Promise<{ userId: number; readOnly: boolean }> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
