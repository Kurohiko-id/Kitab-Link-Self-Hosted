import type { MetadataRoute } from "next";

// Tanpa ini, /dashboard dan /login bisa ke-index Google apa adanya (sesi admin, login
// form) -- gak ada data sensitif yang kebocor karena tetep butuh auth, tapi tetep gak
// perlu nongol di hasil pencarian orang lain.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/login", "/setup", "/api"],
    },
  };
}
