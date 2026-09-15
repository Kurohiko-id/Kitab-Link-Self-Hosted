import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FONT_VARIABLE_CLASS } from "@/lib/fonts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kitab Link",
  description: "Self-hosted link-in-bio platform.",
};

// Dijalanin sebelum hydration biar gak ada flash warna salah pas load (baca localStorage,
// fallback ke preferensi sistem). Gak pakai next-themes — cukup toggle class ".dark" di
// <html>, sudah didukung penuh sama CSS variable di app/globals.css.
const THEME_INIT_SCRIPT = `
(function () {
  var stored = localStorage.getItem("kl-theme");
  var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${FONT_VARIABLE_CLASS} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* Font Inter dipasang di <body>, BUKAN di wrapper per-halaman -- dialog/modal
          (Base UI Dialog) portal-nya nempel langsung ke <body>, jadi kalau font cuma
          ditempel di div dashboard, isi modal bakal "lolos" balik ke font default. */}
      <body className="flex min-h-full flex-col font-[family-name:var(--font-inter)]">{children}</body>
    </html>
  );
}
