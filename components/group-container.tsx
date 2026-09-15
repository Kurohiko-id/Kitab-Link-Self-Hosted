import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GroupLabel } from "@/components/group-label";
import type { ThemeTokens } from "@/lib/theme";

const LABEL_POSITION_CLASS: Record<ThemeTokens["groupLabelAlign"], string> = {
  left: "left-3",
  center: "left-1/2 -translate-x-1/2",
  right: "right-3",
};

// Dipakai bareng halaman publik dan preview dashboard (sama alasannya kayak GroupLabel).
// "wrap" dulu pake <fieldset>/<legend> asli, tapi alignment <legend> (margin-inline: auto
// buat center/right) ternyata gak konsisten di semua mobile browser -- ada yang selalu
// jatuh ke kiri meski di-set center. Diganti div biasa + label absolute-positioned di atas
// garis border, teknik yang perilakunya identik di semua browser/device.
export function GroupContainer({ name, theme, children }: { name: string; theme: ThemeTokens; children: ReactNode }) {
  if (theme.groupLabelStyle === "wrap") {
    const fill = theme.groupWrapBackground ? theme.cardBackground : "transparent";
    return (
      <div
        className="relative mt-2.5 rounded-xl p-3 pt-4"
        style={{ border: `1px solid ${theme.cardBorder}`, backgroundColor: fill }}
      >
        <span
          className={cn(
            "absolute -top-2.5 rounded px-2 text-xs font-medium tracking-wide uppercase opacity-70",
            LABEL_POSITION_CLASS[theme.groupLabelAlign],
          )}
          style={{ backgroundColor: theme.groupWrapBackground ? fill : theme.cardBackground }}
        >
          {name}
        </span>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <GroupLabel name={name} theme={theme} />
      {children}
    </div>
  );
}
