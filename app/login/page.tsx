import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Belum ada akun admin sama sekali (fresh install) -> gak ada gunanya nampilin form
  // login yang gak akan pernah bisa diisi, lempar ke wizard setup duluan.
  const [existing] = await db.select({ id: users.id }).from(users).limit(1);
  if (!existing) redirect("/setup");

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
      <LoginForm locale={locale} t={t} />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LanguageSwitcher locale={locale} />
      </div>
    </div>
  );
}
