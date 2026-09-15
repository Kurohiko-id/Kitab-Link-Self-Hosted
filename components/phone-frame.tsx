import type { ReactNode } from "react";

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto h-[630px] w-[340px] overflow-hidden rounded-[2.5rem] border-[6px] border-gray-900 bg-gray-900 p-3 shadow-xl ring-1 ring-gray-900/10">
      <div className="absolute inset-x-0 top-0 z-20 flex h-6 justify-center">
        <div className="h-6 w-32 rounded-b-2xl bg-gray-900" />
      </div>
      <div className="relative h-full w-full overflow-hidden rounded-[2rem] bg-background shadow-inner">
        {/* Tetep bisa di-scroll (kalau link-nya kepanjangan), cuma scrollbar-nya
            disembunyiin biar keliatan kayak app HP asli, bukan halaman web biasa. */}
        <div className="h-full overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
