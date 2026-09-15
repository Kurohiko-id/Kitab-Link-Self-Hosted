"use client";

import { useState } from "react";
import { LinkIconRenderer } from "@/components/link-icon";
import { getPublicDictionary, type PublicLocale } from "@/lib/public-i18n";

// navigator.clipboard butuh secure context (https ATAU localhost) -- HP yang akses lewat
// IP lokal http:// (umum pas testing) gak punya navigator.clipboard sama sekali, langsung
// throw kalau dipanggil polos. Fallback ke execCommand("copy") lewat textarea sementara --
// TAPI textarea.select() polos gak reliable di iOS Safari (dia gak select isi textarea
// yang invisible/opacity:0 dengan benar). iOS butuh kombinasi Range+Selection API DAN
// setSelectionRange bareng-bareng biar copy-nya beneran kejalan.
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // lanjut ke fallback di bawah
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);

    const range = document.createRange();
    range.selectNodeContents(textarea);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    textarea.setSelectionRange(0, textarea.value.length);

    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// Tombol "copy" (linkType === "copy") gak nembak /r/[linkId] buat navigasi (gak ada
// tujuan buat di-redirect) -- tapi tetep fetch endpoint itu di background biar klik-nya
// kecatet di analytics sama kayak link lain, lihat app/r/[linkId]/route.ts.
export function CopyLinkButton({
  linkId,
  value,
  className,
  style,
  children,
  copiedIcon,
  // Default "en" -- dashboard preview (board.tsx/theme-editor.tsx) gak perlu deteksi
  // pengunjung, cuma halaman publik beneran (PublicPageBody) yang ngirim locale asli.
  locale = "en",
}: {
  linkId: number;
  value: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  copiedIcon: React.ReactNode;
  locale?: PublicLocale;
}) {
  const t = getPublicDictionary(locale);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  // Kalau clipboard API DAN execCommand fallback dua-duanya gagal (browser/OS tertentu
  // beneran ngeblok akses clipboard programatik, gak ada cara JS buat maksain) -- terakhir
  // munculin teksnya sendiri di kotak yang udah ke-select, biar user tinggal copy manual
  // (long-press/native selection selalu jalan, gak tergantung API apapun).
  const [manualCopyValue, setManualCopyValue] = useState<string | null>(null);

  async function handleClick() {
    fetch(`/r/${linkId}`, { redirect: "manual" }).catch(() => {});
    // Dibungkus try/catch ekstra di sini juga (bukan cuma di dalam copyText) -- jaga-jaga
    // ada error gak terduga di lingkungan tertentu yang lolos dari guard internal copyText,
    // biar tetep jatuh ke popup manual daripada tombolnya kerasa "gak ngapa-ngapain" sama sekali.
    let ok = false;
    try {
      ok = await copyText(value);
    } catch {
      ok = false;
    }
    if (!ok) {
      setManualCopyValue(value);
      return;
    }
    setCopied(true);
    setShowToast(true);
    setTimeout(() => setCopied(false), 1500);
    setTimeout(() => setShowToast(false), 2200);
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className} style={style}>
        {copied ? copiedIcon : children}
      </button>
      {showToast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
            <CopiedCheckIcon className="size-4 shrink-0" />
            {t.copiedToClipboard}
          </div>
        </div>
      ) : null}
      {manualCopyValue !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setManualCopyValue(null)}
        >
          <div className="w-full max-w-xs rounded-xl bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-sm text-foreground">{t.manualCopyHint}</p>
            <input
              readOnly
              value={manualCopyValue}
              ref={(el) => {
                el?.focus();
                el?.select();
              }}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border px-3 py-2 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => setManualCopyValue(null)}
              className="mt-3 w-full rounded-lg bg-foreground py-2 text-sm font-medium text-background"
            >
              {t.close}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function CopiedCheckIcon({ className }: { className?: string }) {
  return <LinkIconRenderer value="generic:CopyCheck" className={className} />;
}
