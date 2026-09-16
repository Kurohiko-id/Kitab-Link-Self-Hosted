"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

// Aksi instan (klik = langsung hapus), bukan checkbox yang nunggu tombol Save form utama --
// checkbox buat aksi destruktif sekali-jalan itu 2 langkah yang gak perlu & membingungkan.
export function RemoveImageButton({ action, label }: { action: () => Promise<void>; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      title={label}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await action();
          router.refresh();
        });
      }}
      className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
