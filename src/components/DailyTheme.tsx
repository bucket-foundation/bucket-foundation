"use client";

import { useEffect } from "react";

import { KEY, dayIndex, themeCss, type Brand } from "@/lib/daily-theme";

const swapLogos = (logo: string) =>
  document.querySelectorAll<HTMLImageElement>('img[src="/brand/logo.svg"]').forEach((img) => (img.src = logo));

export default function DailyTheme() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("brand")) return;
    const day = Math.floor(Date.now() / 86400000);
    let logo = "";
    const observer = new MutationObserver(() => logo && swapLogos(logo));
    fetch("/brand/daily/brands.json")
      .then((r) => r.json())
      .then((brands: Brand[]) => {
        const b = brands[dayIndex(new Date(), brands.length)];
        const css = themeCss(b);
        logo = b.logo;
        let style = document.getElementById("bk-daily");
        if (!style) {
          style = document.createElement("style");
          style.id = "bk-daily";
          document.head.appendChild(style);
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = b.fonts.href;
          document.head.appendChild(link);
        }
        style.textContent = css;
        swapLogos(logo);
        observer.observe(document.body, { childList: true, subtree: true });
        try {
          localStorage.setItem(KEY, JSON.stringify({ day, css, href: b.fonts.href, logo }));
        } catch {}
      })
      .catch(() => {});
    return () => observer.disconnect();
  }, []);
  return null;
}
