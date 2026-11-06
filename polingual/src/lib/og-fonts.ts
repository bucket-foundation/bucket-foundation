export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };

const SCRIPT_FAMILIES: [string, RegExp][] = [
  ["Noto Sans JP", /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/],
  ["Noto Sans KR", /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/],
  ["Noto Sans Thai", /[\u0e00-\u0e7f]/],
  ["Vazirmatn", /[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufefc]/],
  ["Noto Sans Hebrew", /[\u0590-\u05ff]/],
  ["Noto Sans Devanagari", /[\u0900-\u097f]/],
  ["Noto Sans Tamil", /[\u0b80-\u0bff]/],
];

export const OG_FAMILIES = ["Noto Sans", ...SCRIPT_FAMILIES.map(([family]) => family)];

export const OG_FONT_STACK = OG_FAMILIES.map((f) => `"${f}"`).join(", ");

export function scriptFamilies(text: string): string[] {
  return SCRIPT_FAMILIES.filter(([, re]) => re.test(text)).map(([family]) => family);
}

export function fontCssUrl(family: string, weight: number, text: string): string {
  return `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
}

export function ttfUrl(css: string): string | undefined {
  return css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
}

async function loadOne(family: string, weight: 400 | 700, text: string): Promise<OgFont | undefined> {
  try {
    const css = await (await fetch(fontCssUrl(family, weight, text))).text();
    const url = ttfUrl(css);
    if (!url) return undefined;
    const r = await fetch(url);
    if (!r.ok) return undefined;
    return { name: family, data: await r.arrayBuffer(), weight, style: "normal" };
  } catch {
    return undefined;
  }
}

export type OgFontSet = { fonts: OgFont[]; complete: boolean };

function baseText(text: string): string {
  return [...text].filter((c) => !/\s/.test(c) && scriptFamilies(c).length === 0).join("");
}

export async function loadOgFonts(text: string, boldText: string): Promise<OgFontSet> {
  const all = `${text} ${boldText}`;
  const jobs = [
    ...(baseText(boldText) ? [loadOne("Noto Sans", 700, boldText)] : []),
    ...(baseText(text) ? [loadOne("Noto Sans", 400, text)] : []),
    ...scriptFamilies(all).map((f) => loadOne(f, 400, all)),
  ];
  const loaded = await Promise.all(jobs);
  const fonts = loaded.filter((f): f is OgFont => f !== undefined);
  return { fonts, complete: fonts.length === jobs.length };
}
