import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages } from "@/lib/db/schema";
import { parseProfileData } from "@/lib/profile";
import { getThemeForPage } from "@/lib/db/theme";

export const dynamic = "force-dynamic";

// Isi kebijakan privasi ditulis sendiri sama page owner di Settings (bukan link
// keluar) -> di-render sebagai halaman biasa di sini, bukan cuma link eksternal.
// Sengaja gak ikut password gate halaman utama: legal text kayak gini lazimnya
// tetap bisa diakses publik walau kontennya sendiri lagi di-gate.
export default async function PrivacyPolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!page) notFound();

  const profile = parseProfileData(page.profileJson);
  if (!profile.privacyPolicyContent) notFound();

  const theme = await getThemeForPage(page.id);

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: theme.backgroundColors[0] ?? "#fafafa", color: theme.text }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
        <Link href={`/${slug}`} className="text-sm underline opacity-70 hover:opacity-100">
          ← {profile.displayName || `@${slug}`}
        </Link>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <div className="whitespace-pre-wrap text-sm leading-relaxed opacity-90">
          {profile.privacyPolicyContent}
        </div>
      </div>
    </div>
  );
}
