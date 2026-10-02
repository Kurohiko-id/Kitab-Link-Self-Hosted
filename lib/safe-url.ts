import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Blokir cuma link-local (169.254.0.0/16, fe80::/10 -- tempat metadata endpoint cloud
// kayak 169.254.169.254) + alamat unspecified. localhost/LAN SENGAJA dibolehin: webhook
// ke n8n/Home Assistant di mesin yang sama itu pemakaian sah self-hosted.
// ponytail: cek cuma di URL awal, redirect & DNS rebinding belum dijaga; tambah kalau perlu.
function isBlockedIp(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^::ffff:/, "");
  return /^169\.254\./.test(v) || /^::ffff:a9fe:/.test(ip.toLowerCase()) || /^fe[89ab][0-9a-f]:/.test(v) || v === "0.0.0.0" || v === "::";
}

export async function assertSafeUrl(raw: string): Promise<void> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Skema URL harus http/https.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (ips.some(isBlockedIp)) throw new Error("Alamat URL tidak diizinkan.");
}
