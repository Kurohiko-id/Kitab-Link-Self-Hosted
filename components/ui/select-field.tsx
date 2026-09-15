import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Native <select> polos nampilin panah dropdown bawaan browser yang beda sendiri dari
// field lain -> selalu dibungkus appearance-none + chevron custom biar satu keluarga
// visual sama Input/Button di seluruh dashboard.
export function SelectField({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 pr-8 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
          className,
        )}
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
