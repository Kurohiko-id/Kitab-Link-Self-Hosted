import { cn } from "@/lib/utils";
import type { ThemeTokens } from "@/lib/theme";

const TEXT_CLASS = "text-xs font-medium tracking-wide uppercase opacity-70";
const ALIGN_TEXT_CLASS: Record<ThemeTokens["groupLabelAlign"], string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};
const ALIGN_JUSTIFY_CLASS: Record<ThemeTokens["groupLabelAlign"], string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};
const ALIGN_ITEMS_CLASS: Record<ThemeTokens["groupLabelAlign"], string> = {
  left: "items-start",
  center: "items-center",
  right: "items-end",
};

// Dipakai bareng sama halaman publik (components/public-page-body.tsx) dan preview
// dashboard (components/public-page-preview.tsx) -- satu implementasi biar dua tempat itu
// gak bisa drift kayak LinkCard/ThemeProfileHeader. "wrap" style (border ngelingkupin
// seluruh grup) ditangani di components/group-container.tsx, bukan di sini.
export function GroupLabel({ name, theme }: { name: string; theme: ThemeTokens }) {
  const align = theme.groupLabelAlign;
  const lineStyle = { backgroundColor: theme.textMuted, opacity: 0.4 };

  if (theme.groupLabelStyle === "lines" || theme.groupLabelStyle === "wave") {
    const isWave = theme.groupLabelStyle === "wave";
    const line = isWave ? (
      <svg className="h-2.5 flex-1" viewBox="0 0 40 10" preserveAspectRatio="none">
        <path
          d="M0 5 Q5 0 10 5 T20 5 T30 5 T40 5"
          fill="none"
          stroke={theme.textMuted}
          strokeWidth="1.5"
          opacity={0.5}
        />
      </svg>
    ) : (
      <span className="h-px flex-1" style={lineStyle} />
    );
    const star = (
      <span className="shrink-0 text-[10px]" style={{ opacity: 0.5 }}>
        ✦
      </span>
    );
    return (
      <div className="flex items-center gap-2.5">
        {align !== "left" ? (
          <>
            {line}
            {!isWave ? star : null}
          </>
        ) : null}
        <span className={cn(TEXT_CLASS, "shrink-0")}>{name}</span>
        {align !== "right" ? (
          <>
            {!isWave ? star : null}
            {line}
          </>
        ) : null}
      </div>
    );
  }

  if (theme.groupLabelStyle === "pill") {
    return (
      <div className={cn("flex", ALIGN_JUSTIFY_CLASS[align])}>
        <span
          className={cn(TEXT_CLASS, "rounded-full px-3 py-1")}
          style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.cardBorder}` }}
        >
          {name}
        </span>
      </div>
    );
  }

  if (theme.groupLabelStyle === "underline") {
    return (
      <div className={cn("flex flex-col gap-1.5", ALIGN_ITEMS_CLASS[align])}>
        <span className={TEXT_CLASS}>{name}</span>
        <span className="h-0.5 w-8 rounded-full" style={lineStyle} />
      </div>
    );
  }

  return <div className={cn(TEXT_CLASS, ALIGN_TEXT_CLASS[align])}>{name}</div>;
}
