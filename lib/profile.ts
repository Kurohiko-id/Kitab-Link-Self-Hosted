export type ProfileData = {
  displayName: string;
  bio: string;
  avatarPath: string | null;
  bannerPath: string | null;
  // Kosong = fallback ke displayName/bio pas dipakai buat <title>/<meta description>.
  seoTitle: string;
  seoDescription: string;
  // null = OG image di-generate otomatis lewat app/[slug]/og/route.tsx, bukan upload sendiri.
  ogImagePath: string | null;
  // null = pakai favicon default Next.js, gak ada favicon custom per-page.
  faviconPath: string | null;
  // Kosong secara default -- page owner bebas isi sendiri lewat Settings kalau mau.
  footerText: string;
  // Isi kebijakan privasi APA ADANYA (ditulis sendiri sama page owner, bukan link ke luar) --
  // kosong = link "Privacy Policy" gak dimunculin di footer & rute /[slug]/privacy 404.
  privacyPolicyContent: string;
  // CSS mentah, di-inject apa adanya ke halaman publik lewat <style> -- ini punya
  // page owner sendiri buat page-nya sendiri, bukan input dari orang lain.
  customCss: string;
  // Link dengan displayStyle "icon" (lihat components/link-card.tsx) ditarik keluar dari
  // list biasa dan dirender sebagai baris icon bulat di sini -- bisa salah satu, dua-duanya,
  // atau gak sama sekali (kalau dua-duanya false, link icon-style itu gak ditampilin).
  socialIconsShowTop: boolean;
  socialIconsShowBottom: boolean;
  // true = kasih tau search engine (Google dkk) buat gak nge-index halaman publik ini sama
  // sekali. Berlaku per-page, gak ngaruh ke page lain milik user yang sama.
  noIndex: boolean;
  // Badge centang biru di sebelah displayName -- murni visual/self-declared (bukan
  // verifikasi identitas asli kayak Twitter/Instagram), page owner yang nyalain sendiri.
  verifiedBadge: boolean;
  // Badge "Powered by Kitab Link" (link ke KITABLINK_SITE_URL) -- TERPISAH dari footerText
  // (itu teks bebas punya page owner sendiri). Default NYALA buat instalasi baru, page
  // owner boleh matiin sendiri lewat Settings kalau mau halaman full white-label.
  watermarkEnabled: boolean;
};

export const DEFAULT_PROFILE: ProfileData = {
  displayName: "",
  bio: "",
  avatarPath: null,
  bannerPath: null,
  seoTitle: "",
  seoDescription: "",
  ogImagePath: null,
  faviconPath: null,
  footerText: "",
  privacyPolicyContent: "",
  customCss: "",
  socialIconsShowTop: true,
  socialIconsShowBottom: false,
  noIndex: false,
  verifiedBadge: false,
  watermarkEnabled: true,
};

export function parseProfileData(profileJson: string | null | undefined): ProfileData {
  if (!profileJson) return DEFAULT_PROFILE;
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(profileJson) };
  } catch {
    return DEFAULT_PROFILE;
  }
}
