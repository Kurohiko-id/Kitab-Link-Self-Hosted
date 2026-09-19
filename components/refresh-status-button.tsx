"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/i18n";

// Dipake di Live Badge dan rule aktif youtube_live -- dua-duanya butuh "cek sekarang juga"
// manual (gak nunggu tick cron ~2 menit), sama-sama panggil server action yang balikin
// {error?} lalu router.refresh() biar hasilnya langsung kebaca dari Server Component.
export function RefreshStatusButton({ onRefresh, t }: { onRefresh: () => Promise<{ error?: string }>; t: Dictionary }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await onRefresh();
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={handleClick} className="gap-1.5">
        <RefreshCw className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
        {t.automation.refreshStatus}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
