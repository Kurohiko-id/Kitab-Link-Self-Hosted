import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  sage: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function Badge({
  children,
  variant = "sage",
  className,
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
