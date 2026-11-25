import kit from "../../brand/bucket/kit.json";

export const LOGO = {
  svg: kit.logo,
  png512: "/brand/logo-512.png",
  png180: "/brand/logo-180.png",
  ico: "/favicon.ico",
} as const;

export const FONTS_HREF = kit.fonts.href;

export const THEME_COLOR = { light: kit.light.bg, dark: kit.dark.bg } as const;

export const POLINGUAL_URL = "https://www.polingual.com";
