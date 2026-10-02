"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { readImageButtonWebp } from "@/lib/images/image-button-input";
import {
  createImageButton,
  deleteImageButton,
  listImageButtonsForExport,
  renameImageButton,
  replaceImageButtonImage,
} from "@/lib/db/image-buttons";
import { requireOwnedTheme } from "@/lib/db/theme";

type Result = { error?: string };

export async function createImageButtonAction(formData: FormData): Promise<Result> {
  const session = await requireSession();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Label wajib diisi." };
  const input = await readImageButtonWebp(formData);
  if ("error" in input) return { error: input.error };
  await createImageButton(session.userId, label, input.webp);
  revalidatePath("/dashboard");
  return {};
}

export async function replaceImageButtonImageAction(id: number, formData: FormData): Promise<Result> {
  const session = await requireSession();
  const input = await readImageButtonWebp(formData);
  if ("error" in input) return { error: input.error };
  await replaceImageButtonImage(session.userId, id, input.webp);
  // Gambar link berubah di halaman publik juga.
  revalidatePath("/dashboard");
  revalidatePath("/[slug]", "page");
  return {};
}

export async function renameImageButtonAction(id: number, label: string): Promise<Result> {
  const session = await requireSession();
  const trimmed = label.trim();
  if (!trimmed) return { error: "Label wajib diisi." };
  await renameImageButton(session.userId, id, trimmed);
  revalidatePath("/dashboard");
  return {};
}

export async function deleteImageButtonAction(id: number): Promise<Result> {
  const session = await requireSession();
  const result = await deleteImageButton(session.userId, id);
  if ("error" in result) return { error: `Tidak bisa dihapus: dipakai di ${result.count} link.` };
  revalidatePath("/dashboard");
  return {};
}

export async function listImageButtonsForExportAction(themeId: number) {
  const session = await requireSession();
  await requireOwnedTheme(session.userId, themeId);
  return listImageButtonsForExport(session.userId, themeId);
}
