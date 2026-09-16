import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker runner stage cuma butuh copy .next/standalone -- gak perlu bawa node_modules
  // penuh atau source TS-nya.
  output: "standalone",

  // Migration files (.sql + meta/_journal.json) dibaca via fs.readFileSync di runtime
  // (instrumentation.ts), BUKAN di-import kayak modul JS -- file tracing standalone
  // Next.js gak otomatis nangkep ini, jadi harus dipaksa ikut biar gak ketinggalan
  // pas di-deploy (drizzle-kit sendiri devDependency, gak kebawa ke production install).
  outputFileTracingIncludes: {
    "/": ["./drizzle/**/*"],
  },
};

export default nextConfig;
