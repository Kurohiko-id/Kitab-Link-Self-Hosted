"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toggleStreamerModeAction } from "@/app/dashboard/settings-actions";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

export function StreamerModeToggle({ initialOn, t }: { initialOn: boolean; t: Dictionary }) {
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const next = await toggleStreamerModeAction();
    setOn(next);
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={t.dashboard.streamerModeLabel}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-sidebar-foreground hover:text-sidebar-primary-foreground",
        on && "bg-primary/15 text-primary hover:text-primary",
      )}
    >
      {on ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}
