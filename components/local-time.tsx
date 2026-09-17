"use client";

import { useEffect, useState } from "react";

// Format tanggal/jam di BROWSER, bukan di server -- biar timezone-nya otomatis
// ngikut jam si viewer sendiri (siapapun, di manapun dia deploy/akses dashboard-nya),
// bukan timezone server/VPS. Placeholder "…" dulu di server biar gak hydration mismatch.
export function LocalTime({
  date,
  locale,
  variant = "datetime",
}: {
  date: Date;
  locale: string;
  variant?: "date" | "time" | "datetime";
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date(date);
    setText(
      variant === "date" ? d.toLocaleDateString(locale) : variant === "time" ? d.toLocaleTimeString(locale) : d.toLocaleString(locale),
    );
  }, [date, locale, variant]);

  return <span>{text ?? "…"}</span>;
}
