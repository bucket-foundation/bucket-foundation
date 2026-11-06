export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };

export const OG_FAMILIES = ["Noto Sans", "Noto Sans JP", "Noto Sans KR", "Noto Sans Thai"];

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

export async function loadOgFonts(text: string, boldText: string): Promise<OgFont[]> {
  const jobs = [loadOne("Noto Sans", 700, boldText), ...OG_FAMILIES.map((f) => loadOne(f, 400, text))];
  return (await Promise.all(jobs)).filter((f): f is OgFont => f !== undefined);
}
