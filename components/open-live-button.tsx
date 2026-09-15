import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// Anchor biasa (bukan client component) -- buka page publik di tab baru, gak butuh JS.
export function OpenLiveButton({ path, title, className }: { path: string; title: string; className?: string }) {
  return (
    <a
      href={path}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={cn("rounded-md p-1.5 transition-colors", className ?? "text-muted-foreground hover:bg-muted hover:text-foreground")}
    >
      <ExternalLink className="size-4" />
    </a>
  );
}
