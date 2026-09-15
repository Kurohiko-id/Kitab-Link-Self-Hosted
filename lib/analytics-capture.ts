// Deteksi device dari User-Agent pakai regex sederhana -- sengaja gak pakai library
// (ua-parser-js dkk) buat sesuatu sesimpel mobile/tablet/desktop, sesuai prinsip
// "jangan nambah dependency berat" di CLAUDE.md.
export function getDeviceType(userAgent: string | null): "mobile" | "tablet" | "desktop" {
  if (!userAgent) return "desktop";
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(userAgent)) return "mobile";
  return "desktop";
}

// Simpen hostname-nya aja (mis. "instagram.com"), bukan URL penuh -> lebih gampang
// di-group. Null kalau kosong (direct) atau bukan URL valid.
export function getReferrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// "Dynamic campaign link" -- user bisa bagi link beda-beda per platform (mis.
// kitablink.com/main?utm_source=instagram di bio IG, ?ref=grup-wa di grup WhatsApp) buat
// nutupin celah in-app browser (Instagram/TikTok) yang sering gak ngirim Referer header
// sama sekali. utm_source diutamain (konvensi umum), ref jadi alias singkat.
export function getCampaignSource(searchParams: Record<string, string | string[] | undefined>): string | null {
  const raw = searchParams.utm_source ?? searchParams.ref;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || null;
}

// Self-hosted -> gak ada GeoIP database bawaan (nambah itu berat, lihat CLAUDE.md).
// Cuma percaya header dari reverse proxy KALAU proxy-nya emang ngirim (Cloudflare,
// Vercel dsb). Kalau gak ada satupun -> null, jangan nebak-nebak/fabricate lokasi.
export function getCountryFromHeaders(headers: Headers): string | null {
  return (
    headers.get("cf-ipcountry") ||
    headers.get("x-vercel-ip-country") ||
    headers.get("x-country-code") ||
    null
  );
}
