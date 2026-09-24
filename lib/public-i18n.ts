// i18n KHUSUS halaman publik -- beda dari lib/i18n.ts (dashboard admin, based on user's
// language TOGGLE pilihan sendiri). Di sini gak ada toggle -- yang nentuin bahasa adalah
// browser PENGUNJUNG (Accept-Language header), karena page-nya dilihat orang lain, bukan
// pemilik akun. Cuma nyakup string UI kecil yang genuinely hardcoded (bukan konten yang
// diisi user sendiri kayak judul link/bio, itu apa adanya gak diterjemahin).
export type PublicLocale = "id" | "en";

export function detectVisitorLocale(acceptLanguage: string | null): PublicLocale {
  if (!acceptLanguage) return "en";
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase();
  return first?.startsWith("id") ? "id" : "en";
}

const publicDict = {
  id: {
    isLiveNow: (name: string) => `${name} sedang live`,
    watchNow: "Tonton",
    copiedToClipboard: "Disalin ke clipboard",
    noLinksYet: "Belum ada link.",
    privacyPolicy: "Kebijakan Privasi",
    poweredBy: "Powered by Kitab Link",
    manualCopyHint: "Browser kamu gak ngizinin copy otomatis -- tap teksnya, lalu copy manual:",
    close: "Tutup",
    pageProtectedTitle: "Halaman dilindungi",
    passwordLabel: "Password",
    passwordFieldPlaceholder: "Masukin password halaman",
    unlockSubmitLabel: "Masuk",
    checkingLabel: "Memeriksa...",
    wrongPasswordError: "Password salah.",
    tooManyAttemptsError: "Terlalu banyak percobaan salah. Coba lagi beberapa menit lagi.",
    countdownLockedToast: (time: string) => `Link ini baru bisa diakses ${time} lagi`,
  },
  en: {
    isLiveNow: (name: string) => `${name} is live`,
    watchNow: "Watch",
    copiedToClipboard: "Copied to clipboard",
    noLinksYet: "No links yet.",
    privacyPolicy: "Privacy Policy",
    poweredBy: "Powered by Kitab Link",
    manualCopyHint: "Your browser blocked automatic copy -- tap the text, then copy it manually:",
    close: "Close",
    pageProtectedTitle: "Page is protected",
    passwordLabel: "Password",
    passwordFieldPlaceholder: "Enter page password",
    unlockSubmitLabel: "Unlock",
    checkingLabel: "Checking...",
    wrongPasswordError: "Wrong password.",
    tooManyAttemptsError: "Too many failed attempts. Try again in a few minutes.",
    countdownLockedToast: (time: string) => `This link unlocks in ${time}`,
  },
};

export function getPublicDictionary(locale: PublicLocale) {
  return publicDict[locale];
}
