"use client";

import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyUrlButton({ path, className }: { path: string; className?: string }) {
  return (
    <button
      type="button"
      title="Copy"
      onClick={() => navigator.clipboard.writeText(`${window.location.origin}${path}`)}
      className={cn("rounded-md p-1.5 transition-colors", className ?? "text-muted-foreground hover:bg-muted hover:text-foreground")}
    >
      <Copy className="size-4" />
    </button>
  );
}
