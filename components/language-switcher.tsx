"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { setLocaleAction } from "@/lib/i18n-actions";

export function LanguageSwitcher({
  locale,
  variant = "default",
}: {
  locale: Locale;
  variant?: "default" | "sidebar";
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      {(["en", "id"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => {
            void setLocaleAction(l).then(() => router.refresh());
          }}
          className={cn(
            "rounded px-2 py-1 text-xs transition-colors",
            locale === l
              ? "bg-primary font-bold text-primary-foreground"
              : variant === "sidebar"
                ? "font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground"
                : "font-medium text-muted-foreground hover:bg-muted",
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
