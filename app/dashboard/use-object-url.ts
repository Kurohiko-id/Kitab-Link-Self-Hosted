"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// URL pratinjau (blob:) dari File yang baru dipilih tapi belum disimpan -- dibuat di handler
// (bukan di effect) dan disimpan di ref biar bisa di-revoke tiap diganti dan pas unmount,
// tanpa itu object URL bocor. Dipakai panggung preview di modal link.
export function useObjectUrl() {
  const ref = useRef<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const setFile = useCallback((file: File | null) => {
    if (ref.current) URL.revokeObjectURL(ref.current);
    ref.current = file ? URL.createObjectURL(file) : null;
    setUrl(ref.current);
  }, []);
  useEffect(
    () => () => {
      if (ref.current) URL.revokeObjectURL(ref.current);
    },
    [],
  );
  return [url, setFile] as const;
}
