"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "kl-theme";

function toggleTheme() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
}

// Icon dipilih murni lewat CSS (dark:hidden/dark:block), bukan React state — gak ada
// state React yang bisa mismatch antara SSR dan client, jadi gak butuh useEffect sama sekali.
// variant "sidebar" -> sidebar-nya SELALU gelap (gak ngikut toggle), jadi warnanya di-hardcode
// gray-400/white, bukan pakai token --foreground yang ikut berubah pas toggle nyala.
export function ThemeToggle({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn(
        "flex size-7 items-center justify-center rounded-lg transition-colors",
        variant === "sidebar"
          ? "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </button>
  );
}
