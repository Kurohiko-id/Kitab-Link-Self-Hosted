import { FONT_LIBRARY, FONT_UPLOAD_EXTENSIONS } from "@/lib/font-library";
import type {
  AvatarShape,
  BackgroundType,
  ButtonAlign,
  ButtonHover,
  ButtonShadow,
  ButtonSurface,
  GroupLabelAlign,
  GroupLabelStyle,
  LinkIconPosition,
  PageEntrance,
  ProfileBorderStyle,
  TextureType,
  ThemeTokens,
} from "@/lib/theme";
import { processImage } from "@/lib/images/process-image";
import { deleteImage, saveFont, saveImage } from "@/lib/images/storage";

const MAX_BACKGROUND_WIDTH = 1600;
const MAX_FONT_UPLOAD_BYTES = 5 * 1024 * 1024;

export const VALID_BG_TYPES: BackgroundType[] = [
  "solid",
  "gradient",
  "aurora",
  "glass",
  "neon",
  "paper",
  "pixel",
  "lines",
  "waves",
  "network",
];

const VALID_BUTTON_SURFACES: ButtonSurface[] = ["solid", "transparent", "glass", "blur", "neumorphism", "pixel"];
const VALID_BUTTON_SHADOWS: ButtonShadow[] = ["none", "sm", "md", "lg"];
const VALID_BUTTON_HOVERS: ButtonHover[] = ["none", "scale", "lift", "glow", "shine"];
const VALID_PAGE_ENTRANCES: PageEntrance[] = ["none", "fade", "slide-up", "pop"];
const VALID_BUTTON_ALIGNS: ButtonAlign[] = ["left", "center"];
const VALID_AVATAR_SHAPES: AvatarShape[] = ["circle", "rounded", "square"];
const VALID_PROFILE_BORDER_STYLES: ProfileBorderStyle[] = ["none", "solid", "fade"];
const VALID_LINK_ICON_POSITIONS: LinkIconPosition[] = ["left", "right", "edge-left", "edge-right"];
const VALID_TEXTURE_TYPES: TextureType[] = ["none", "grain", "noise", "watermark", "snow", "sakura", "particle"];
const VALID_GROUP_LABEL_ALIGNS: GroupLabelAlign[] = ["left", "center", "right"];
const VALID_GROUP_LABEL_STYLES: GroupLabelStyle[] = ["plain", "lines", "pill", "underline", "wave", "wrap"];
const VALID_SOCIAL_ICON_SURFACES: ThemeTokens["socialIconSurface"][] = ["filled", "transparent"];

function pickEnum<T extends string>(valid: T[], raw: FormDataEntryValue | null, fallback: T): T {
  const value = String(raw ?? fallback);
  return (valid as string[]).includes(value) ? (value as T) : fallback;
}

// Parsing form theme-editor murni (gak butuh session/DB) -> dipisah dari saveThemeAction
// biar bisa dites langsung tanpa perlu request context Next (cookies()).
export async function buildThemeTokensFromForm(current: ThemeTokens, formData: FormData): Promise<ThemeTokens> {
  const removeBackgroundImage = formData.get("removeBackgroundImage") === "1";
  let backgroundImage = removeBackgroundImage ? null : current.backgroundImage;

  const bgFile = formData.get("backgroundImage");
  if (bgFile instanceof File && bgFile.size > 0 && bgFile.type.startsWith("image/")) {
    const buffer = Buffer.from(await bgFile.arrayBuffer());
    const webp = await processImage(buffer, MAX_BACKGROUND_WIDTH);
    backgroundImage = await saveImage(webp, "theme-backgrounds");
    if (current.backgroundImage) await deleteImage(current.backgroundImage);
  } else if (removeBackgroundImage && current.backgroundImage) {
    await deleteImage(current.backgroundImage);
  }

  const backgroundColorsRaw = String(formData.get("backgroundColors") ?? "");
  const backgroundColors = backgroundColorsRaw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const backgroundTypeRaw = String(formData.get("backgroundType") ?? current.backgroundType);
  const backgroundType = VALID_BG_TYPES.includes(backgroundTypeRaw as BackgroundType)
    ? (backgroundTypeRaw as BackgroundType)
    : current.backgroundType;

  const removeCustomFont = formData.get("removeCustomFont") === "1";
  let customFontUrl = removeCustomFont ? null : current.customFontUrl;

  const fontFile = formData.get("customFont");
  if (fontFile instanceof File && fontFile.size > 0) {
    const ext = fontFile.name.split(".").pop()?.toLowerCase() ?? "";
    if (FONT_UPLOAD_EXTENSIONS.includes(ext) && fontFile.size <= MAX_FONT_UPLOAD_BYTES) {
      const buffer = Buffer.from(await fontFile.arrayBuffer());
      customFontUrl = await saveFont(buffer, ext);
      if (current.customFontUrl) await deleteImage(current.customFontUrl);
    }
  } else if (removeCustomFont && current.customFontUrl) {
    await deleteImage(current.customFontUrl);
  }

  const fontFamilyRaw = String(formData.get("fontFamily") ?? current.fontFamily);
  const isValidFontFamily = fontFamilyRaw === "custom" || FONT_LIBRARY.some((f) => f.key === fontFamilyRaw);
  const fontFamily = isValidFontFamily ? fontFamilyRaw : current.fontFamily;

  const fontSizeRaw = Number(formData.get("fontSize"));
  const fontSize = Number.isFinite(fontSizeRaw) ? Math.min(32, Math.max(10, fontSizeRaw)) : current.fontSize;

  const fontWeightRaw = Number(formData.get("fontWeight"));
  const fontWeight = Number.isFinite(fontWeightRaw) ? Math.min(900, Math.max(100, fontWeightRaw)) : current.fontWeight;

  const letterSpacingRaw = Number(formData.get("letterSpacing"));
  const letterSpacing = Number.isFinite(letterSpacingRaw)
    ? Math.min(0.5, Math.max(-0.1, letterSpacingRaw))
    : current.letterSpacing;

  const buttonSurface = pickEnum(VALID_BUTTON_SURFACES, formData.get("buttonSurface"), current.buttonSurface);
  const buttonShadow = pickEnum(VALID_BUTTON_SHADOWS, formData.get("buttonShadow"), current.buttonShadow);
  const buttonHover = pickEnum(VALID_BUTTON_HOVERS, formData.get("buttonHover"), current.buttonHover);
  const pageEntrance = pickEnum(VALID_PAGE_ENTRANCES, formData.get("pageEntrance"), current.pageEntrance);
  const buttonAlign = pickEnum(VALID_BUTTON_ALIGNS, formData.get("buttonAlign"), current.buttonAlign);

  const buttonBorderRadiusRaw = Number(formData.get("buttonBorderRadius"));
  const buttonBorderRadius = Number.isFinite(buttonBorderRadiusRaw)
    ? Math.min(9999, Math.max(0, buttonBorderRadiusRaw))
    : current.buttonBorderRadius;

  const buttonBorderWidthRaw = Number(formData.get("buttonBorderWidth"));
  const buttonBorderWidth = Number.isFinite(buttonBorderWidthRaw)
    ? Math.min(12, Math.max(0, buttonBorderWidthRaw))
    : current.buttonBorderWidth;

  const profileAvatarShape = pickEnum(VALID_AVATAR_SHAPES, formData.get("profileAvatarShape"), current.profileAvatarShape);
  const profileBorderStyle = pickEnum(
    VALID_PROFILE_BORDER_STYLES,
    formData.get("profileBorderStyle"),
    current.profileBorderStyle,
  );
  const profileShadow = pickEnum(VALID_BUTTON_SHADOWS, formData.get("profileShadow"), current.profileShadow);
  const linkIconPosition = pickEnum(
    VALID_LINK_ICON_POSITIONS,
    formData.get("linkIconPosition"),
    current.linkIconPosition,
  );
  const profileShowBanner = formData.get("profileShowBanner") === "1";
  const profileAvatarFloat = formData.get("profileAvatarFloat") === "1";
  const textShadow = formData.get("textShadow") === "1";
  const textBackdrop = formData.get("textBackdrop") === "1";

  const profileBorderWidthRaw = Number(formData.get("profileBorderWidth"));
  const profileBorderWidth = Number.isFinite(profileBorderWidthRaw)
    ? Math.min(12, Math.max(0, profileBorderWidthRaw))
    : current.profileBorderWidth;

  const textureType = pickEnum(VALID_TEXTURE_TYPES, formData.get("textureType"), current.textureType);
  const textureOpacityRaw = Number(formData.get("textureOpacity"));
  const textureOpacity = Number.isFinite(textureOpacityRaw)
    ? Math.min(1, Math.max(0, textureOpacityRaw))
    : current.textureOpacity;

  const groupLabelAlign = pickEnum(VALID_GROUP_LABEL_ALIGNS, formData.get("groupLabelAlign"), current.groupLabelAlign);
  const groupLabelStyle = pickEnum(VALID_GROUP_LABEL_STYLES, formData.get("groupLabelStyle"), current.groupLabelStyle);
  const groupWrapBackground = formData.get("groupWrapBackground") === "1";

  const socialIconShape = pickEnum(VALID_AVATAR_SHAPES, formData.get("socialIconShape"), current.socialIconShape);
  const socialIconSurface = pickEnum(
    VALID_SOCIAL_ICON_SURFACES,
    formData.get("socialIconSurface"),
    current.socialIconSurface,
  );
  const socialIconRadiusRaw = Number(formData.get("socialIconRadius"));
  const socialIconRadius = Number.isFinite(socialIconRadiusRaw)
    ? Math.min(9999, Math.max(0, socialIconRadiusRaw))
    : current.socialIconRadius;

  const containerWidthRaw = Number(formData.get("containerWidth"));
  const containerWidth = Number.isFinite(containerWidthRaw)
    ? Math.min(720, Math.max(320, containerWidthRaw))
    : current.containerWidth;

  return {
    backgroundType,
    backgroundColors: backgroundColors.length > 0 ? backgroundColors : current.backgroundColors,
    backgroundImage,
    text: String(formData.get("text") ?? current.text),
    textMuted: String(formData.get("textMuted") ?? current.textMuted),
    cardBackground: String(formData.get("cardBackground") ?? current.cardBackground),
    cardBorder: String(formData.get("cardBorder") ?? current.cardBorder),
    buttonText: String(formData.get("buttonText") ?? current.buttonText),
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    customFontUrl,
    buttonSurface,
    buttonBorderRadius,
    buttonBorderWidth,
    buttonShadow,
    buttonHover,
    pageEntrance,
    buttonAlign,
    profileAvatarShape,
    profileBorderStyle,
    profileBorderWidth,
    profileShadow,
    profileShowBanner,
    profileAvatarFloat,
    textShadow,
    textBackdrop,
    linkIconPosition,
    textureType,
    textureOpacity,
    groupLabelAlign,
    groupLabelStyle,
    groupWrapBackground,
    socialIconShape,
    socialIconRadius,
    socialIconSurface,
    containerWidth,
  };
}
