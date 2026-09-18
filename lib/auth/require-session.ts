import { redirect } from "next/navigation";
import { getSession } from "./session";

export async function requireSession(): Promise<{ userId: number }> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
