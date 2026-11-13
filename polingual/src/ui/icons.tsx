import type { CSSProperties } from "react";

const P = "#F6EEDC";
const T = "#5B1A4A";
const V = "#D9381E";
const O = "#E9A23B";
const L = "#26428B";
const M = "#1E7A5A";
const Y = "#6FB7C2";
const K = "#231F20";

export const ICONS = {
  flame: `<path d="M12 2c2 4 7 6.5 7 12.5a7 7 0 0 1-14 0c0-3.5 2-5.5 3-7 .5 2 1.5 3 2.5 3.5C10 7.5 10.5 4.5 12 2z" fill="${V}"/><path d="M12 13c1 2 3 3 3 5.5a3 3 0 0 1-6 0c0-1.5 1-2.5 1.5-3 .5 1 1 1.5 1.5 1.5-.5-1.5-.5-3 0-4z" fill="${P}"/>`,
  burst: `<path d="M12 2l2.6 4.2 4.8-.8-1.7 4.6L21.5 13l-4.4 1.4-.9 4.8L12 16.6l-4.2 2.6-.9-4.8L2.5 13l3.8-3-1.7-4.6 4.8.8z" fill="${M}"/><circle cx="12" cy="11" r="2.6" fill="${O}"/>`,
  brush: `<path d="M3 15c4-6 8 3 12-2s5-5 6-3" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round"/><path d="M5 19c4-2 8 1 12-2" fill="none" stroke="${O}" stroke-width="1.6" stroke-linecap="round" stroke-opacity=".7"/>`,
  bunting: `<path d="M2 5q10 3 20 0" fill="none"/><path d="M4 5.6h6v8l-3-2-3 2z" fill="${O}"/><path d="M14 5.6h6v8l-3-2-3 2z" fill="${V}"/>`,
  target: `<circle cx="12" cy="12" r="9.5" fill="${L}"/><circle cx="12" cy="12" r="6" fill="${P}"/><circle cx="12" cy="12" r="2.5" fill="${Y}"/>`,
  mosaic: `<rect x="3" y="3" width="8" height="8" fill="${V}"/><rect x="11" y="3" width="10" height="6" fill="${O}"/><rect x="11" y="9" width="5" height="12" fill="${Y}"/><rect x="16" y="9" width="5" height="12" fill="${M}"/><rect x="3" y="11" width="8" height="10" fill="${P}"/>`,
  play: `<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" fill="${V}"/>`,
  pause: `<rect x="5" y="4" width="5" height="16" rx="1.5" fill="${T}"/><rect x="14" y="4" width="5" height="16" rx="1.5" fill="${T}"/>`,
  close: `<path d="M6 6l12 12M18 6L6 18" fill="none" stroke-width="3.2" stroke-linecap="round"/>`,
  check: `<circle cx="12" cy="12" r="9.5" fill="${M}"/><path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="${P}" stroke-width="2.6" stroke-linecap="round"/>`,
  "arrow-left": `<path d="M19 12H5m6-6l-6 6 6 6" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  "arrow-right": `<path d="M5 12h14m-6-6l6 6-6 6" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  "arrow-up": `<path d="M12 19V5m-6 6l6-6 6 6" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  "arrow-down": `<path d="M12 5v14m-6-6l6 6 6-6" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  "chevron-left": `<path d="M15 5l-7 7 7 7" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  "chevron-right": `<path d="M9 5l7 7-7 7" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  "chevron-up": `<path d="M5 15l7-7 7 7" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  "chevron-down": `<path d="M5 9l7 7 7-7" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  menu: `<path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke-width="3" stroke-linecap="round"/>`,
  search: `<circle cx="10.5" cy="10.5" r="6.5" fill="${Y}"/><path d="M15.5 15.5l5 5" fill="none" stroke-width="3.2" stroke-linecap="round"/>`,
  settings: `<path d="M12 2.5l2 2.6 3.2-.6.6 3.2 2.7 1.8-1.5 2.9 1.5 2.9-2.7 1.8-.6 3.2-3.2-.6-2 2.6-2-2.6-3.2.6-.6-3.2-2.7-1.8L4 12l-1.5-2.9 2.7-1.8.6-3.2 3.2.6z" fill="${L}"/><circle cx="12" cy="12" r="3.2" fill="${P}"/>`,
  user: `<circle cx="12" cy="8" r="4.5" fill="${O}"/><path d="M3.5 21a8.5 7 0 0 1 17 0z" fill="${T}"/>`,
  users: `<circle cx="16" cy="8" r="3.5" fill="${Y}"/><path d="M10 20a6 5.5 0 0 1 12 0z" fill="${L}"/><circle cx="9" cy="9" r="4" fill="${O}"/><path d="M2 21a7 6.5 0 0 1 14 0z" fill="${T}"/>`,
  trophy: `<path d="M6 5H3v2a4 4 0 0 0 4 4M18 5h3v2a4 4 0 0 1-4 4" fill="none"/><path d="M6 3h12v6a6 6 0 0 1-12 0z" fill="${O}"/><path d="M10 15h4v3h-4z" fill="${O}"/><rect x="7" y="18" width="10" height="3.5" rx="1" fill="${T}"/>`,
  crown: `<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="${O}"/><circle cx="12" cy="15" r="1.6" fill="${V}"/>`,
  coin: `<circle cx="12" cy="12" r="9.5" fill="${O}"/><circle cx="12" cy="12" r="5.5" fill="none" stroke-width="1.6"/><path d="M12 9v6" fill="none" stroke-width="2" stroke-linecap="round"/>`,
  heart: `<path d="M12 20.5S3 15 3 8.8A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 9 2.4C21 15 12 20.5 12 20.5z" fill="${V}"/>`,
  lives: `<path d="M9 18S2 14 2 9a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 5-7 9-7 9z" fill="${V}"/><path d="M16 21s-5-3-5-6.5a2.8 2.8 0 0 1 5-1.5 2.8 2.8 0 0 1 5 1.5c0 3.5-5 6.5-5 6.5z" fill="${O}"/>`,
  timer: `<path d="M10 2h4M12 2v2.5" fill="none" stroke-linecap="round"/><circle cx="12" cy="13.5" r="8" fill="${Y}"/><path d="M12 13.5V9" fill="none" stroke-width="2.6" stroke-linecap="round"/>`,
  globe: `<circle cx="12" cy="12" r="9.5" fill="${L}"/><path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" fill="none" stroke="${P}" stroke-width="1.6"/>`,
  speaker: `<path d="M3 9h4l6-5v16l-6-5H3z" fill="${Y}"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke-linecap="round"/>`,
  mute: `<path d="M3 9h4l6-5v16l-6-5H3z" fill="${Y}"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke-linecap="round"/>`,
  mic: `<rect x="8" y="2.5" width="8" height="12" rx="4" fill="${V}"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7" fill="none" stroke-linecap="round"/>`,
  share: `<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M5 11h3v8h8v-8h3v10H5z" fill="${L}"/>`,
  link: `<path d="M10 14a4 4 0 0 0 5.7 0l3.5-3.5a4 4 0 0 0-5.7-5.7l-1.5 1.5M14 10a4 4 0 0 0-5.7 0l-3.5 3.5a4 4 0 0 0 5.7 5.7l1.5-1.5" fill="none" stroke-width="2.6" stroke-linecap="round"/>`,
  download: `<path d="M12 3v12m-4.5-4.5L12 15l4.5-4.5" fill="none" stroke-width="2.6" stroke-linecap="round"/><rect x="4" y="17.5" width="16" height="4" rx="1.5" fill="${M}"/>`,
  copy: `<rect x="3" y="3" width="12" height="13" rx="2" fill="${P}"/><rect x="9" y="8" width="12" height="13" rx="2" fill="${Y}"/>`,
  lock: `<path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" fill="none" stroke-width="2.6"/><rect x="4" y="10" width="16" height="11.5" rx="2.5" fill="${O}"/><circle cx="12" cy="15.5" r="1.8" fill="${K}"/>`,
  gift: `<rect x="3" y="8" width="18" height="5" rx="1" fill="${V}"/><rect x="4.5" y="13" width="15" height="8.5" rx="1" fill="${V}"/><path d="M12 8v13.5" fill="none" stroke="${O}" stroke-width="3"/><path d="M12 8C10 3 6 4 7 7l5 1 5-1c1-3-3-4-5 1z" fill="${O}"/>`,
  shop: `<path d="M3 9l2-5.5h14L21 9z" fill="${V}"/><path d="M4.5 9h15v12h-15z" fill="${P}"/><rect x="9.5" y="14" width="5" height="7" fill="${L}"/>`,
  star: `<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z" fill="${O}"/>`,
  flag: `<path d="M5 21.5V3" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M5 4h14l-3 4.5 3 4.5H5z" fill="${V}"/>`,
  book: `<path d="M12 6C9 4 6 4 2.5 5v14c3.5-1 6.5-1 9.5 1z" fill="${Y}"/><path d="M12 6c3-2 6-2 9.5-1v14c-3.5-1-6.5-1-9.5 1z" fill="${P}"/>`,
  chat: `<path d="M4 4h16a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 17h-9l-5 4v-4H4a1.5 1.5 0 0 1-1.5-1.5v-10A1.5 1.5 0 0 1 4 4z" fill="${M}"/><circle cx="8" cy="10.5" r="1.2" fill="${P}" stroke="none"/><circle cx="12" cy="10.5" r="1.2" fill="${P}" stroke="none"/><circle cx="16" cy="10.5" r="1.2" fill="${P}" stroke="none"/>`,
  lightbulb: `<path d="M12 2.5a7 7 0 0 0-4 12.7V18h8v-2.8a7 7 0 0 0-4-12.7z" fill="${O}"/><path d="M9 21.5h6" fill="none" stroke-width="2.6" stroke-linecap="round"/>`,
  refresh: `<path d="M20 12a8 8 0 1 1-2.3-5.7M20 3.5v4.5h-4.5" fill="none" stroke-width="2.8" stroke-linecap="round"/>`,
  plus: `<circle cx="12" cy="12" r="9.5" fill="${M}"/><path d="M12 7.5v9M7.5 12h9" fill="none" stroke="${P}" stroke-width="2.8" stroke-linecap="round"/>`,
  minus: `<circle cx="12" cy="12" r="9.5" fill="${V}"/><path d="M7.5 12h9" fill="none" stroke="${P}" stroke-width="2.8" stroke-linecap="round"/>`,
  info: `<circle cx="12" cy="12" r="9.5" fill="${L}"/><path d="M12 11v6" fill="none" stroke="${P}" stroke-width="2.8" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.6" fill="${P}" stroke="none"/>`,
  alert: `<path d="M12 2.5L22 20.5H2z" fill="${O}"/><path d="M12 9v5" fill="none" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.4" fill="${K}" stroke="none"/>`,
  home: `<path d="M3 11L12 3l9 8v10.5H3z" fill="${P}"/><path d="M2 11.5L12 3l10 8.5" fill="none" stroke-linecap="round"/><rect x="9.5" y="14" width="5" height="7.5" fill="${V}"/>`,
  qr: `<rect x="3" y="3" width="7" height="7" rx="1" fill="${P}"/><rect x="14" y="3" width="7" height="7" rx="1" fill="${P}"/><rect x="3" y="14" width="7" height="7" rx="1" fill="${P}"/><rect x="5.5" y="5.5" width="2" height="2" fill="${K}" stroke="none"/><rect x="16.5" y="5.5" width="2" height="2" fill="${K}" stroke="none"/><rect x="5.5" y="16.5" width="2" height="2" fill="${K}" stroke="none"/><rect x="14" y="14" width="3" height="3" fill="${T}"/><rect x="18" y="18" width="3" height="3" fill="${T}"/>`,
  camera: `<path d="M3 7.5h4l2-3h6l2 3h4v12.5H3z" fill="${L}"/><circle cx="12" cy="13.5" r="4" fill="${Y}"/>`,
  sparkle: `<path d="M10 2.5l1.8 5.7 5.7 1.8-5.7 1.8L10 17.5l-1.8-5.7L2.5 10l5.7-1.8z" fill="${O}"/><path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="${Y}"/>`,
  bell: `<path d="M12 3a6 6 0 0 0-6 6v4.5L4 17h16l-2-3.5V9a6 6 0 0 0-6-6z" fill="${O}"/><path d="M9.5 19.5a2.5 2.5 0 0 0 5 0z" fill="${T}"/>`,
  calendar: `<rect x="3" y="5" width="18" height="16" rx="2" fill="${P}"/><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H3z" fill="${V}"/><path d="M8 3v4M16 3v4" fill="none" stroke-linecap="round"/><rect x="7" y="13" width="3" height="3" fill="${L}" stroke="none"/>`,
  edit: `<path d="M4 20l1-5L16 4l4 4L9 19z" fill="${O}"/><path d="M14 6l4 4" fill="none"/>`,
  trash: `<path d="M4 6.5h16M9.5 6.5V3.5h5v3" fill="none" stroke-linecap="round"/><path d="M6 6.5h12l-1 15H7z" fill="${V}"/>`,
  eye: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="${P}"/><circle cx="12" cy="12" r="3.5" fill="${L}"/>`,
  logout: `<path d="M14 3.5H5v17h9" fill="${P}"/><path d="M10 12h11m-4-4l4 4-4 4" fill="none" stroke-width="2.6" stroke-linecap="round"/>`,
  medal: `<path d="M7 2.5h4l2 6H9zM13 2.5h4l-2 6h-4z" fill="${L}"/><circle cx="12" cy="15" r="6.5" fill="${O}"/><path d="M12 12v6" fill="none" stroke-width="2" stroke-linecap="round"/>`,
  bolt: `<path d="M13.5 2L4.5 13.5h6L9.5 22l9-11.5h-6z" fill="${O}"/>`,
  tv: `<rect x="2.5" y="4" width="19" height="13" rx="2" fill="${T}"/><rect x="5" y="6.5" width="14" height="8" rx="1" fill="${Y}" stroke="none"/><path d="M8 21h8M12 17v4" fill="none" stroke-linecap="round"/>`,
  phone: `<rect x="6" y="2" width="12" height="20" rx="3" fill="${L}"/><rect x="8" y="5" width="8" height="12" rx="1" fill="${P}" stroke="none"/>`,
  translate: `<rect x="2.5" y="3" width="11" height="11" rx="2" fill="${O}"/><rect x="10.5" y="10" width="11" height="11" rx="2" fill="${Y}"/><path d="M5.5 7h5M8 6v1c0 2-1 3.5-2.5 4.5" fill="none" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 18.5l2.5-6 2.5 6M14.5 16.5h3" fill="none" stroke-width="1.6" stroke-linecap="round"/>`,
} as const;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

const GROUP = `fill="none" stroke="${K}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

export function iconSvg(name: IconName, size = 24) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><g ${GROUP}>${ICONS[name]}</g></svg>`;
}

export function iconDataUrl(name: IconName) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(name))}`;
}

export function Icon({ name, size = 24, title, className, style }: { name: IconName; size?: number; title?: string; className?: string; style?: CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: `<g ${GROUP}>${ICONS[name]}</g>` }}
    />
  );
}
