"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useTransition, type ReactNode } from "react";

// Pengganti <form action={someServerAction.bind(...)}> buat form EDIT data persisten yang
// field-nya defaultValue (uncontrolled) -- kalau langsung pake `action` prop, React 19
// auto-reset field uncontrolled abis action-nya sukses, keliatan "balik ke nilai lama"
// sesaat abis Simpan (baru bener lagi pas di-refresh manual, karena data DB-nya sendiri
// udah bener). onSubmit manual + preventDefault ngelewatin lifecycle form-action itu sama
// sekali. Cocok buat form yang FIELD-nya harus tetep nampilin nilai yang baru disimpan
// (bukan form "tambah baru" yang emang sengaja mau dikosongin lagi abis submit).
//
// `key={version}` di <form> -- router.refresh() doang cuma bikin parent Server Component
// nge-fetch data baru terus nurunin `defaultValue` baru ke <Input> yang UDAH ke-mount
// (cuma prop berubah, bukan mount ulang). React emang gak baca ulang defaultValue di
// instance yang sama, dan Base UI (primitive di balik shadcn Input/Textarea kita) sampe
// ngeluarin warning soal itu. Nge-bump `version` abis submit sukses maksa <form> (+ semua
// field di dalemnya) di-mount ULANG sebagai instance baru -> defaultValue baru ke-baca
// fresh dari awal, bukan "berubah di tengah jalan".
export function ActionForm({
  action,
  className,
  children,
  // Pesan gagal dilempar dari caller (yang punya akses dictionary `t`) -- komponen ini
  // dipakai lintas halaman dan gak nerima locale, jadi jangan hardcode teks Indonesia di
  // sini (app-nya bilingual, user mode English bakal dapet pesan Indonesia).
  errorMessage = "Failed to save, please try again.",
}: {
  action: (formData: FormData) => Promise<unknown> | void;
  className?: string;
  children: ReactNode;
  errorMessage?: string;
}) {
  const router = useRouter();
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  // router.refresh() itu ASYNC (fetch ulang RSC payload) -- kalau version di-bump
  // LANGSUNG abis dipanggil, form ke-remount duluan pakai props LAMA (refresh-nya
  // belum kelar), dan gak remount lagi pas data baru beneran nyampe (version udah gak
  // berubah lagi) -> field nyangkut nilai lama sampe di-refresh manual. useTransition
  // di sini buat nunggu refresh-nya BENERAN kelar (isRefreshing balik false) sebelum
  // baru bump version, biar remount-nya kena props yang udah fresh.
  const [isRefreshing, startRefresh] = useTransition();
  const remountPendingRef = useRef(false);

  useEffect(() => {
    if (remountPendingRef.current && !isRefreshing) {
      remountPendingRef.current = false;
      setVersion((v) => v + 1);
    }
  }, [isRefreshing]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Nahan klik ganda -- tanpa ini, 2x klik Simpan cepat = 2 request paralel (buat action
    // "tambah baru" bisa jadi 2 baris kembar).
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      await action(new FormData(e.currentTarget));
      remountPendingRef.current = true;
      startRefresh(() => router.refresh());
    } catch {
      // Server error/koneksi putus -- tanpa try/catch ini, exception ilang gitu aja (form
      // diem, user ngira kesimpen padahal enggak). Gak perlu detail error-nya di sini,
      // caller yang butuh pesan spesifik pakai useActionState + <form action> langsung.
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form key={version} onSubmit={handleSubmit} className={className} aria-busy={pending}>
      {children}
      {error ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </form>
  );
}
