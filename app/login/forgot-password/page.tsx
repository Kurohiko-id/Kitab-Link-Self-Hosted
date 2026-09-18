import { Link2 } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary">
          <Link2 className="size-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold tracking-tight">Kitab Link</span>
      </div>
      <ForgotPasswordForm locale={locale} t={t} />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LanguageSwitcher locale={locale} />
      </div>
    </div>
  );
}
