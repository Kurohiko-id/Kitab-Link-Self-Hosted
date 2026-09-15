import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SetupForm } from "./setup-form";

// Wajib -- status "udah ada user atau belum" bisa berubah kapan aja (persis begitu setup
// pertama selesai), gak boleh di-bake ke hasil statis pas build time (lihat app/page.tsx).
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Route ini permanen mati begitu ada 1 user -- siapa pun yang minta /setup abis itu
  // dilempar ke /login, gak peduli mereka tau URL-nya atau enggak (proteksi race-condition
  // akun admin pertama, lihat lib/auth/setup-token.ts).
  const [existing] = await db.select({ id: users.id }).from(users).limit(1);
  if (existing) redirect("/login");

  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary">
          <Link2 className="size-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold tracking-tight">Kitab Link</span>
      </div>
      <SetupForm locale={locale} t={t} />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LanguageSwitcher locale={locale} />
      </div>
    </div>
  );
}
