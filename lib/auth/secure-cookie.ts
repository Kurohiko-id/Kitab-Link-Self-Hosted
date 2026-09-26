import { headers } from "next/headers";

// "docker run" langsung ke IP:port tanpa reverse proxy itu mode deploy resmi yang
// didukung (lihat README/install.sh) -- NODE_ENV==="production" TIDAK berarti koneksinya
// HTTPS. Cookie "Secure" diem-diem DIBUANG browser di koneksi HTTP biasa, jadi login
// keliatan sukses sesaat lalu langsung "logged out" lagi (issue #2). Percaya sinyal dari
// proxy beneran (X-Forwarded-Proto, di-set Caddy/nginx) ketimbang nebak dari NODE_ENV.
export async function isSecureRequest(): Promise<boolean> {
  const h = await headers();
  return h.get("x-forwarded-proto") === "https";
}
