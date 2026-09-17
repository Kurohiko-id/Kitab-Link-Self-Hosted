import type { PublicGroup, PublicLink } from "@/lib/db/board";

// Nomor telepon/WhatsApp user bisa masukin dengan format apa aja (spasi, tanda kurung,
// strip, "+") -> wa.me cuma butuh digit doang (kode negara di depan, tanpa "+").
function normalizePhoneDigits(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

// wa.me WAJIB format internasional (kode negara di depan, TANPA "0" trunk prefix) -- nomor
// lokal Indonesia yang diketik apa adanya ("0878...") jadi link yang gak valid ("wa.me/0878...",
// muncul "user not found"). App ini buat user Indonesia (lihat CLAUDE.md) -> "0" di depan
// otomatis diganti "62", biar user gak perlu inget ngetik ulang formatnya sendiri.
function normalizeWhatsappDigits(raw: string): string {
  const digits = normalizePhoneDigits(raw);
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

// User sering ngetik domain doang ("facebook.com") tanpa "https://" -- new URL() bakal
// nganggep itu bukan URL absolut sama sekali (throw), jadi kepake mentah-mentah sebagai
// href RELATIF. Itu yang bikin /r/[linkId] (lihat route-nya) nge-resolve-in ke path lokal
// server sendiri ("http://host/r/facebook.com") alih-alih beneran redirect keluar.
function ensureAbsoluteUrl(url: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    return `https://${url}`;
  }
}

function applyUtmParams(rawUrl: string, link: PublicLink): string {
  const url = ensureAbsoluteUrl(rawUrl);
  if (!link.utmSource && !link.utmMedium && !link.utmCampaign) return url;
  try {
    const parsed = new URL(url);
    if (link.utmSource) parsed.searchParams.set("utm_source", link.utmSource);
    if (link.utmMedium) parsed.searchParams.set("utm_medium", link.utmMedium);
    if (link.utmCampaign) parsed.searchParams.set("utm_campaign", link.utmCampaign);
    return parsed.toString();
  } catch {
    // Masih gak valid walau udah dipaksa https:// (jarang) -> biarin apa adanya daripada crash.
    return url;
  }
}

// File upload sendiri disimpan sebagai path relatif ("link-files/xxx.pdf"), url eksternal
// disimpan lengkap dengan http(s):// -> dibedain dari prefix-nya doang, gak butuh kolom baru.
function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export type LinkHref = { href: string; isDownload: boolean };

// Item accordion = sub-link beneran (bukan teks buat di-copy) -- klik item = buka url-nya
// di tab baru, mirip link card biasa cuma "disembunyiin" di balik satu header expand/collapse.
export type AccordionItem = { label: string; url: string };

// url (kolom parent link) disimpan sebagai JSON stringified array {label, url}[] -- parsing
// permisif (skip item yang gak valid/kosong dua-duanya) biar gak gampang rusak kalau JSON-nya
// berubah manual.
export function parseAccordionItems(raw: string): AccordionItem[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is AccordionItem => typeof item?.label === "string" && typeof item?.url === "string")
      .filter((item) => item.label.trim() || item.url.trim());
  } catch {
    return [];
  }
}

// UTM cuma masuk akal buat link "url" biasa (link marketing/campaign) -> sengaja gak
// diterapkan ke mailto/tel/wa.me/file/embed biar semantiknya jelas satu jenis pemakaian.
export function getLinkHref(link: PublicLink): LinkHref {
  switch (link.linkType) {
    case "email":
      return { href: `mailto:${link.url}`, isDownload: false };
    case "phone":
      return { href: `tel:${normalizePhoneDigits(link.url)}`, isDownload: false };
    case "whatsapp":
      return { href: `https://wa.me/${normalizeWhatsappDigits(link.url)}`, isDownload: false };
    case "file":
      return {
        href: isExternalUrl(link.url) ? link.url : `/uploads/${link.url}`,
        isDownload: true,
      };
    case "embed":
      return { href: normalizeEmbedUrl(link.url), isDownload: false };
    case "copy":
      // Gak pernah dipakai buat navigasi beneran (lihat components/copy-link-button.tsx),
      // tetep dikasih nilai valid biar getLinkHref exhaustive dan gak crash kalau kepanggil.
      return { href: link.url, isDownload: false };
    case "accordion":
      // Gak pernah dipakai buat navigasi (klik-nya expand/collapse, lihat AccordionLinkCard) --
      // tetep dikasih nilai valid biar getLinkHref exhaustive dan gak crash kalau kepanggil.
      return { href: "#", isDownload: false };
    case "url":
    default:
      return { href: applyUtmParams(link.url, link), isDownload: false };
  }
}

// Link bergaya "icon" (lihat components/link-card.tsx) ditarik keluar dari alur
// group/ungrouped biasa dan dirender terpisah sebagai baris icon sosmed (lihat
// components/social-icon-row.tsx) -- dipecah lagi jadi 2 daftar independen berdasarkan
// iconPosition (atas/bawah punya link-link sendiri-sendiri, bukan satu daftar yang
// diduplikasi ke dua tempat). Dipakai bareng di halaman publik dan preview dashboard.
export function splitIconLinks(
  ungrouped: PublicLink[],
  groups: PublicGroup[],
): { topIconLinks: PublicLink[]; bottomIconLinks: PublicLink[]; ungrouped: PublicLink[]; groups: PublicGroup[] } {
  const topIconLinks: PublicLink[] = [];
  const bottomIconLinks: PublicLink[] = [];

  function extractIconLinks(link: PublicLink): boolean {
    if (link.displayStyle !== "icon") return true;
    (link.iconPosition === "bottom" ? bottomIconLinks : topIconLinks).push(link);
    return false;
  }

  const normalUngrouped = ungrouped.filter(extractIconLinks);
  const normalGroups = groups.map((group) => ({ ...group, links: group.links.filter(extractIconLinks) }));
  return { topIconLinks, bottomIconLinks, ungrouped: normalUngrouped, groups: normalGroups };
}

// Dipake buat facade thumbnail+play-button (components/youtube-facade.tsx) -- HANYA buat
// YouTube (satu-satunya provider yang punya skema thumbnail publik konsisten,
// img.youtube.com/vi/{id}/...). Provider embed lain (Spotify, dll) tetep iframe langsung,
// gak ada facade. Dicek dari url ASLI (bukan hasil normalizeEmbedUrl) biar nangkep
// ketiga format sekaligus: watch?v=, youtu.be/ID, ATAU /embed/ID yang ditempel manual.
export function extractYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") {
      return parsed.pathname.slice(1) || null;
    }
    if (host === "youtube.com") {
      if (parsed.searchParams.has("v")) return parsed.searchParams.get("v");
      const embedMatch = parsed.pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

// Auto-convert cuma buat YouTube (kasus paling umum) -> platform lain (Spotify, dst)
// user tinggal tempel URL embed resminya sendiri, gak di-convert otomatis.
export function normalizeEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com" && parsed.searchParams.has("v")) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get("v")}`;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}
