"use client";

import { useEffect, useState } from "react";

type Palette = { id: string; colors: Record<string, string>; fonts: Record<string, string> };

export default function BrandPreview() {
  const [css, setCss] = useState<{ style: string; href: string } | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("brand");
    const logo = params.get("logo");
    if (!id) return;
    import("../../brand/bucket/candidates.json").then(({ default: data }) => {
      const p = (data.palettes as Palette[]).find((x) => x.id === id);
      if (!p) return;
      const lines = [
        ...Object.entries(p.colors).map(([k, v]) => `--bk-${k}: ${v};`),
        ...Object.entries(p.fonts).filter(([k]) => k !== "href").map(([k, v]) => `--bk-font-${k}: ${v};`),
      ];
      setCss({ style: `:root, :root[data-scheme] { ${lines.join(" ")} }`, href: p.fonts.href });
      if (logo) document.querySelectorAll<HTMLImageElement>('img[src="/brand/logo.svg"]').forEach((img) => (img.src = logo));
      document.querySelectorAll("a[href^='/']").forEach((a) => {
        const u = new URL((a as HTMLAnchorElement).href);
        u.searchParams.set("brand", id);
        if (logo) u.searchParams.set("logo", logo);
        (a as HTMLAnchorElement).href = u.toString();
      });
    });
  }, []);

  if (!css) return null;
  return (
    <>
      <link rel="stylesheet" href={css.href} />
      <style>{css.style}</style>
    </>
  );
}
