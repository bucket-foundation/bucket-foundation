export type Brand = { id: string; logo: string; colors: Record<string, string>; fonts: Record<string, string> };

export const KEY = "bk-daily-theme";
export const FLAT = "html, body { background-image: none !important; background-color: var(--bk-bg) !important; } [data-hero], .stone-bone { background-image: none !important; } .chisel, .chisel-bone, .chisel-gold, .engraved, .inlay-gold { text-shadow: none !important; }";

export const START_DAY = 20783;

export const dayIndex = (now: Date, count: number) => (((Math.floor(now.getTime() / 86400000) - START_DAY) % count) + count) % count;

export const themeCss = (b: Brand) => {
  const vars = [
    ...Object.entries(b.colors).map(([k, v]) => `--bk-${k}: ${v};`),
    ...Object.entries(b.fonts).filter(([k]) => k !== "href").map(([k, v]) => `--bk-font-${k}: ${v};`),
  ];
  return `:root, :root[data-scheme] { ${vars.join(" ")} } ${FLAT}`;
};

export const applyScript = `(function(){try{if(location.search.indexOf("brand=")>-1)return;var t=JSON.parse(localStorage.getItem("${KEY}")||"null");if(!t||t.day!==Math.floor(Date.now()/86400000))return;var s=document.createElement("style");s.id="bk-daily";s.textContent=t.css;document.head.appendChild(s);var l=document.createElement("link");l.rel="stylesheet";l.href=t.href;document.head.appendChild(l);}catch(e){}})();`;

