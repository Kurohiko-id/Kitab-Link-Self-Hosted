"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { pages, users } from "@/lib/db/schema";
import { requireOwnedPage } from "@/lib/db/pages";
import { requireSession } from "@/lib/auth/require-session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { parseProfileData } from "@/lib/profile";
import { getDictionary, type Locale } from "@/lib/i18n";
import { processImage, processFavicon } from "@/lib/images/process-image";
import { deleteImage, saveImage, saveFile } from "@/lib/images/storage";

const MAX_AVATAR_WIDTH = 512;
const MAX_BANNER_WIDTH = 1600;
const MAX_OG_IMAGE_WIDTH = 1200;
const MAX_OG_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB, lihat hint di SettingsSection
const MAX_FAVICON_BYTES = 2 * 1024 * 1024; // 2MB, lihat hint di SettingsSection

export async function saveProfileAction(pageId: number, formData: FormData) {
  const page = await requireOwnedPage(pageId);
  const current = parseProfileData(page.profileJson);

  // Hapus avatar/banner sekarang aksi instan sendiri (removeAvatarAction/removeBannerAction
  // di bawah), bukan checkbox di form ini -- di sini cuma urus upload file baru.
  let avatarPath = current.avatarPath;
  const avatarFile = formData.get("avatar");
  if (avatarFile instanceof File && avatarFile.size > 0 && avatarFile.type.startsWith("image/")) {
    const buffer = Buffer.from(await avatarFile.arrayBuffer());
    const webp = await processImage(buffer, MAX_AVATAR_WIDTH);
    avatarPath = await saveImage(webp, "profile-avatars");
    if (current.avatarPath) await deleteImage(current.avatarPath);
  }

  let bannerPath = current.bannerPath;
  const bannerFile = formData.get("banner");
  if (bannerFile instanceof File && bannerFile.size > 0 && bannerFile.type.startsWith("image/")) {
    const buffer = Buffer.from(await bannerFile.arrayBuffer());
    const webp = await processImage(buffer, MAX_BANNER_WIDTH);
    bannerPath = await saveImage(webp, "profile-banners");
    if (current.bannerPath) await deleteImage(current.bannerPath);
  }

  // OG image custom (opsional) -> kosong berarti tetep pakai yang auto-generate
  // (app/[slug]/og/route.tsx). File yang kelewat gede DIAM-DIAM di-skip (form ini gak
  // punya jalur buat balikin pesan error, sama kayak validasi thumbnail di link modal).
  const removeOgImage = formData.get("removeOgImage") === "1";
  let ogImagePath = removeOgImage ? null : current.ogImagePath;
  const ogImageFile = formData.get("ogImage");
  if (ogImageFile instanceof File && ogImageFile.size > 0 && ogImageFile.type.startsWith("image/")) {
    if (ogImageFile.size <= MAX_OG_IMAGE_BYTES) {
      const buffer = Buffer.from(await ogImageFile.arrayBuffer());
      const webp = await processImage(buffer, MAX_OG_IMAGE_WIDTH);
      ogImagePath = await saveImage(webp, "profile-og-images");
      if (current.ogImagePath) await deleteImage(current.ogImagePath);
    }
  } else if (removeOgImage && current.ogImagePath) {
    await deleteImage(current.ogImagePath);
  }

  const removeFavicon = formData.get("removeFavicon") === "1";
  let faviconPath = removeFavicon ? null : current.faviconPath;
  const faviconFile = formData.get("favicon");
  if (faviconFile instanceof File && faviconFile.size > 0 && faviconFile.type.startsWith("image/")) {
    if (faviconFile.size <= MAX_FAVICON_BYTES) {
      const buffer = Buffer.from(await faviconFile.arrayBuffer());
      const png = await processFavicon(buffer);
      faviconPath = await saveFile(png, "profile-favicons", "png");
      if (current.faviconPath) await deleteImage(current.faviconPath);
    }
  } else if (removeFavicon && current.faviconPath) {
    await deleteImage(current.faviconPath);
  }

  const next = {
    displayName: String(formData.get("displayName") ?? current.displayName).slice(0, 100),
    bio: String(formData.get("bio") ?? current.bio).slice(0, 300),
    avatarPath,
    bannerPath,
    seoTitle: String(formData.get("seoTitle") ?? current.seoTitle).slice(0, 100),
    seoDescription: String(formData.get("seoDescription") ?? current.seoDescription).slice(0, 200),
    ogImagePath,
    faviconPath,
    footerText: String(formData.get("footerText") ?? current.footerText).slice(0, 200),
    privacyPolicyContent: String(formData.get("privacyPolicyContent") ?? current.privacyPolicyContent).slice(0, 20000),
    customCss: String(formData.get("customCss") ?? current.customCss).slice(0, 20000),
    // Checkbox gak dikirim FormData sama sekali kalau unchecked -> pakai has() buat tau
    // apakah form INI yang punya field-nya (form lain di halaman Settings/SEO gak punya
    // field ini, jadi harus tetep pakai nilai `current` kalau field-nya emang gak ada).
    socialIconsShowTop: formData.has("socialIconsShowTop")
      ? formData.get("socialIconsShowTop") === "1"
      : current.socialIconsShowTop,
    socialIconsShowBottom: formData.has("socialIconsShowBottom")
      ? formData.get("socialIconsShowBottom") === "1"
      : current.socialIconsShowBottom,
    noIndex: formData.has("noIndex") ? formData.get("noIndex") === "1" : current.noIndex,
    verifiedBadge: formData.has("verifiedBadge") ? formData.get("verifiedBadge") === "1" : current.verifiedBadge,
  };

  await db.update(pages).set({ profileJson: JSON.stringify(next) }).where(eq(pages.id, pageId));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
}

// Instant-delete (bukan checkbox+nunggu tombol Save utama) -- klik langsung hapus, gak
// perlu 2 langkah yang membingungkan buat aksi yang sifatnya destruktif kayak gini.
export async function removeAvatarAction(pageId: number) {
  const page = await requireOwnedPage(pageId);
  const current = parseProfileData(page.profileJson);
  if (!current.avatarPath) return;
  await deleteImage(current.avatarPath);
  await db.update(pages).set({ profileJson: JSON.stringify({ ...current, avatarPath: null }) }).where(eq(pages.id, pageId));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
}

export async function removeBannerAction(pageId: number) {
  const page = await requireOwnedPage(pageId);
  const current = parseProfileData(page.profileJson);
  if (!current.bannerPath) return;
  await deleteImage(current.bannerPath);
  await db.update(pages).set({ profileJson: JSON.stringify({ ...current, bannerPath: null }) }).where(eq(pages.id, pageId));
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
}

export type ChangePasswordState = { error?: string; success?: boolean } | undefined;

export async function changePasswordAction(
  locale: Locale,
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const t = getDictionary(locale);
  const session = await requireSession();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: t.settings.passwordTooShort };
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    return { error: t.settings.currentPasswordWrong };
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, session.userId));
  return { success: true };
}
