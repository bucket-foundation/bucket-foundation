import type { CSSProperties } from "react";

const INK = "#231F20";
const CREAM = "#F6EEDC";
const PAPER = "#EBDDBE";
const RED = "#D9381E";
const OCHRE = "#E9A23B";
const PLUM = "#5B1A4A";
const LAPIS = "#26428B";
const GREEN = "#1E7A5A";
const MAYA = "#6FB7C2";
const BROWN = "#8E5A2B";
const O = `stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;
const L = `fill="none" ${O}`;

const num = (n: string, fill: string) => `<rect x="18" y="14" width="64" height="72" rx="12" fill="${fill}" ${O}/><text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="Fredoka, Nunito, sans-serif" font-weight="700" font-size="${n.length > 1 ? 34 : 50}" fill="${CREAM}" stroke="${INK}" stroke-width="2">${n}</text>`;

export const OBJECT_ART: Record<string, string> = {
  apple: `<path d="M50 30c-10-8-34-6-34 20 0 22 16 36 26 34 4-1 6-2 8-2s4 1 8 2c10 2 26-12 26-34 0-26-24-28-34-20z" fill="${RED}" ${O}/><path d="M50 30c0-8 2-14 6-18" ${L}/><path d="M54 22c6-8 16-8 20-4-6 6-14 8-20 4z" fill="${GREEN}" ${O}/><path d="M30 44c2-6 6-8 10-8" stroke="${CREAM}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  bag: `<path d="M36 34c0-14 28-14 28 0" ${L}/><path d="M18 34h64l-6 50H24z" fill="${PLUM}" ${O}/><path d="M18 34h64v10H18z" fill="${OCHRE}" ${O}/><circle cx="50" cy="58" r="6" fill="${OCHRE}" ${O}/>`,
  ball: `<circle cx="50" cy="50" r="34" fill="${CREAM}" ${O}/><path d="M50 36l13 9-5 15H42l-5-15z" fill="${INK}"/><path d="M50 16v20M63 45l18-6M58 60l11 15M42 60l-11 15M37 45l-18-6" ${L}/>`,
  bird: `<path d="M20 56c0-18 14-30 30-30 12 0 20 8 22 16l12 4-12 6c-2 18-18 28-34 26-12-2-18-10-18-22z" fill="${MAYA}" ${O}/><path d="M34 54c8 10 24 8 28-2-10 4-20 4-28 2z" fill="${LAPIS}" ${O}/><circle cx="62" cy="40" r="3.5" fill="${INK}"/><path d="M40 82l-4 8M50 82l0 8" ${L}/>`,
  boat: `<path d="M50 14v54" ${L}/><path d="M53 18l26 44H53z" fill="${CREAM}" ${O}/><path d="M47 26L26 62h21z" fill="${RED}" ${O}/><path d="M14 68h72l-10 16H24z" fill="${BROWN}" ${O}/><path d="M8 90c8-4 14 4 22 0s14 4 22 0 14 4 22 0 14 4 18 0" stroke="${LAPIS}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  book: `<path d="M14 24c12-4 24-4 36 4v56c-12-8-24-8-36-4z" fill="${RED}" ${O}/><path d="M86 24c-12-4-24-4-36 4v56c12-8 24-8 36-4z" fill="${RED}" ${O}/><path d="M20 30c10-2 20 0 26 4v42c-6-4-16-6-26-4z" fill="${CREAM}" ${O}/><path d="M80 30c-10-2-20 0-26 4v42c6-4 16-6 26-4z" fill="${CREAM}" ${O}/><path d="M26 42h14M26 52h14M60 42h14M60 52h14" ${L}/>`,
  bread: `<path d="M16 50c-4-16 10-28 34-28s38 12 34 28c-2 6-6 8-8 8v20H24V58c-2 0-6-2-8-8z" fill="${OCHRE}" ${O}/><path d="M24 58v20h52V58" fill="${PAPER}" ${O}/><path d="M36 34l-4 12M50 32v14M64 34l4 12" stroke="${BROWN}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  car: `<path d="M10 62v-12l10-4 10-14h36l12 14 12 4v12z" fill="${RED}" ${O}/><path d="M34 36h14v12H26zM54 36h10l8 12H54z" fill="${MAYA}" ${O}/><circle cx="28" cy="66" r="10" fill="${INK}"/><circle cx="72" cy="66" r="10" fill="${INK}"/><circle cx="28" cy="66" r="4" fill="${CREAM}"/><circle cx="72" cy="66" r="4" fill="${CREAM}"/><rect x="82" y="50" width="6" height="5" fill="${OCHRE}"/>`,
  cat: `<path d="M26 40l-4-24 18 12h20l18-12-4 24c6 6 8 14 8 22 0 16-14 24-32 24S18 78 18 62c0-8 2-16 8-22z" fill="${OCHRE}" ${O}/><circle cx="38" cy="52" r="4" fill="${INK}"/><circle cx="62" cy="52" r="4" fill="${INK}"/><path d="M46 62l4 4 4-4z" fill="${RED}" ${O}/><path d="M22 60l14 2M22 70l14-2M78 60l-14 2M78 70l-14-2" ${L}/>`,
  chair: `<path d="M28 12h44v40H28z" fill="${BROWN}" ${O}/><path d="M34 20h32v24H34z" fill="${OCHRE}" ${O}/><path d="M20 52h60v10H20z" fill="${BROWN}" ${O}/><path d="M26 62v26M74 62v26M34 62v16M66 62v16" ${L}/>`,
  cheese: `<path d="M12 64l50-38 26 14v30L12 82z" fill="${OCHRE}" ${O}/><path d="M12 64l76-24" ${L}/><circle cx="40" cy="70" r="5" fill="${BROWN}"/><circle cx="66" cy="64" r="4" fill="${BROWN}"/><circle cx="76" cy="74" r="3" fill="${BROWN}"/><circle cx="56" cy="44" r="3" fill="${BROWN}"/>`,
  chicken: `<path d="M24 60c0-18 12-30 26-30 4-10 14-14 20-10l-4 6 10 6-10 4c4 6 6 14 6 24 0 16-12 26-26 26S24 76 24 60z" fill="${CREAM}" ${O}/><path d="M60 22c2-6 8-8 12-4" fill="${RED}" ${O}/><path d="M76 32l10 4-10 4z" fill="${OCHRE}" ${O}/><circle cx="66" cy="34" r="3" fill="${INK}"/><path d="M32 56c8 8 20 8 26 0-8 2-18 2-26 0z" fill="${PAPER}" ${O}/><path d="M42 86v6M54 86v6" ${L}/>`,
  child: `<circle cx="50" cy="32" r="18" fill="${BROWN}" ${O}/><path d="M32 28c4-14 30-16 36 0-10-4-26-4-36 0z" fill="${INK}"/><circle cx="44" cy="34" r="2.5" fill="${INK}"/><circle cx="56" cy="34" r="2.5" fill="${INK}"/><path d="M44 42c4 3 8 3 12 0" ${L}/><path d="M28 90c0-20 8-36 22-36s22 16 22 36z" fill="${OCHRE}" ${O}/><path d="M28 70l-10-10M72 70l10-10" ${L}/>`,
  city: `<path d="M8 88V44h20v44zM30 88V20h22v68zM54 88V34h18v54zM74 88V54h18v34z" fill="${PLUM}" ${O}/><path d="M14 52h8M14 62h8M14 72h8M36 30h10M36 42h10M36 54h10M36 66h10M60 44h6M60 56h6M60 68h6M80 64h6M80 74h6" stroke="${OCHRE}" stroke-width="4" stroke-linecap="round"/>`,
  clock: `<circle cx="50" cy="52" r="34" fill="${CREAM}" ${O}/><circle cx="50" cy="52" r="26" fill="none" stroke="${LAPIS}" stroke-width="3"/><path d="M50 52V34M50 52l12 8" ${L}/><circle cx="50" cy="52" r="3.5" fill="${RED}"/><path d="M26 18l-10 10M74 18l10 10" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
  coffee: `<path d="M20 40h50v24c0 14-10 22-25 22S20 78 20 64z" fill="${CREAM}" ${O}/><path d="M70 46h6c8 0 8 16 0 16h-6" ${L}/><path d="M20 40h50v6H20z" fill="${BROWN}" ${O}/><path d="M36 12c-4 6 4 10 0 18M50 12c-4 6 4 10 0 18" ${L}/><path d="M14 88h62" ${L}/>`,
  cow: `<path d="M22 40h56l4 30c0 12-14 18-32 18S18 82 18 70z" fill="${CREAM}" ${O}/><path d="M22 40l-12-8 6-6 10 8M78 40l12-8-6-6-10 8" fill="${CREAM}" ${O}/><path d="M30 30l-4-12M70 30l4-12" ${L}/><path d="M28 48c6-2 10 2 8 8s-10 4-8-8zM66 46c6 0 6 8 0 10" fill="${INK}"/><path d="M30 68h40v14c0 4-8 6-20 6s-20-2-20-6z" fill="${RED}" ${O} opacity=".85"/><circle cx="42" cy="76" r="2.5" fill="${INK}"/><circle cx="58" cy="76" r="2.5" fill="${INK}"/>`,
  dog: `<path d="M28 34c0-12 10-20 22-20s22 8 22 20v20c0 16-10 28-22 28S28 70 28 54z" fill="${OCHRE}" ${O}/><path d="M28 30c-10 0-16 10-14 26 8 0 14-6 14-12zM72 30c10 0 16 10 14 26-8 0-14-6-14-12z" fill="${BROWN}" ${O}/><circle cx="40" cy="44" r="3.5" fill="${INK}"/><circle cx="60" cy="44" r="3.5" fill="${INK}"/><path d="M44 58h12l-6 6z" fill="${INK}"/><path d="M50 64c0 6 6 8 8 4" ${L}/>`,
  door: `<path d="M24 10h52v80H24z" fill="${LAPIS}" ${O}/><path d="M32 18h36v28H32zM32 54h36v28H32z" fill="${MAYA}" ${O}/><circle cx="64" cy="50" r="4" fill="${OCHRE}" ${O}/>`,
  egg: `<path d="M50 12c18 0 30 30 30 46 0 18-14 30-30 30S20 76 20 58c0-16 12-46 30-46z" fill="${CREAM}" ${O}/><path d="M34 44c2-8 6-14 10-16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  fire: `<path d="M50 90c-20 0-30-14-28-30 2-14 12-20 14-34 8 6 12 14 12 22 4-4 6-10 6-18 14 10 24 24 24 36 0 14-10 24-28 24z" fill="${RED}" ${O}/><path d="M50 90c-10 0-14-8-12-16 2-6 8-10 10-18 8 6 14 12 14 20s-4 14-12 14z" fill="${OCHRE}" ${O}/>`,
  fish: `<path d="M14 50c12-18 34-24 52-14l18-12v52l-18-12c-18 10-40 4-52-14z" fill="${MAYA}" ${O}/><circle cx="30" cy="46" r="4" fill="${INK}"/><path d="M44 36c6 8 6 20 0 28M54 38c4 6 4 18 0 24" stroke="${LAPIS}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  flower: `<path d="M50 56v34" stroke="${GREEN}" stroke-width="5" stroke-linecap="round"/><path d="M50 76c8-10 18-10 22-6-6 8-16 10-22 6z" fill="${GREEN}" ${O}/><g fill="${RED}" ${O}><circle cx="50" cy="22" r="12"/><circle cx="70" cy="36" r="12"/><circle cx="62" cy="58" r="12"/><circle cx="38" cy="58" r="12"/><circle cx="30" cy="36" r="12"/></g><circle cx="50" cy="42" r="10" fill="${OCHRE}" ${O}/>`,
  hat: `<path d="M30 64V28c0-6 40-6 40 0v36" fill="${INK}" ${O}/><path d="M30 52h40v10H30z" fill="${RED}"/><path d="M10 66c0-6 80-6 80 0s-80 8-80 0z" fill="${INK}" ${O}/>`,
  horse: `<path d="M30 90V66c-8-4-14-12-12-22l20-30 10 8 18 4c8 2 10 8 6 14l-8 2-8-4-6 10 10 16v26z" fill="${BROWN}" ${O}/><path d="M38 14l-6 26 8 4 8-22z" fill="${INK}"/><circle cx="56" cy="30" r="3" fill="${CREAM}"/>`,
  house: `<path d="M18 48L50 18l32 30v40H18z" fill="${CREAM}" ${O}/><path d="M10 50L50 12l40 38" fill="none" stroke="${RED}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 88V64h16v24z" fill="${BROWN}" ${O}/><path d="M26 54h12v12H26zM62 54h12v12H62z" fill="${MAYA}" ${O}/>`,
  hundred: `<rect x="8" y="24" width="84" height="52" rx="10" fill="${PLUM}" ${O}/><text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-family="Fredoka, Nunito, sans-serif" font-weight="700" font-size="38" fill="${OCHRE}">100</text>`,
  key: `<circle cx="30" cy="50" r="16" fill="${OCHRE}" ${O}/><circle cx="30" cy="50" r="6" fill="${PLUM}" ${O}/><path d="M46 46h40v8H46zM70 54v10M80 54v8" fill="${OCHRE}" ${O}/>`,
  knife: `<path d="M12 70L68 18c8 2 10 10 6 16L30 76z" fill="#C9CED6" ${O}/><path d="M30 76l-10 10c-4 4-10-2-6-6l10-10z" fill="${BROWN}" ${O}/>`,
  letter: `<rect x="12" y="26" width="76" height="50" rx="4" fill="${CREAM}" ${O}/><path d="M12 28l38 28 38-28" ${L}/><rect x="66" y="32" width="14" height="16" fill="${RED}" ${O}/>`,
  meat: `<path d="M20 44c0-16 20-28 40-24s28 22 20 36-28 20-44 14c-10-4-16-14-16-26z" fill="${RED}" ${O}/><path d="M30 46c4-10 18-16 30-12" stroke="${CREAM}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="62" cy="54" r="7" fill="${CREAM}" ${O}/>`,
  milk: `<path d="M34 10h32v14l8 12v52H26V36l8-12z" fill="${CREAM}" ${O}/><path d="M26 50h48v22H26z" fill="${MAYA}" ${O}/><path d="M34 10h32v8H34z" fill="${LAPIS}" ${O}/><text x="50" y="62" text-anchor="middle" dominant-baseline="central" font-family="Nunito, sans-serif" font-weight="900" font-size="12" fill="${CREAM}">MILK</text>`,
  money: `<path d="M30 30c-4-8 0-14 6-14h28c6 0 10 6 6 14z" fill="${GREEN}" ${O}/><path d="M30 30c-16 10-20 30-14 44 4 10 14 14 34 14s30-4 34-14c6-14 2-34-14-44z" fill="${GREEN}" ${O}/><circle cx="50" cy="62" r="14" fill="${OCHRE}" ${O}/><path d="M50 52v20M45 57h8a3 3 0 0 1 0 6h-6a3 3 0 0 0 0 6h8" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  moon: `<path d="M60 12c-22 4-36 24-32 44s26 34 48 28c-26-2-42-22-38-44 2-12 10-22 22-28z" fill="${OCHRE}" ${O}/><circle cx="74" cy="30" r="3" fill="${CREAM}"/><circle cx="82" cy="48" r="2" fill="${CREAM}"/>`,
  mountain: `<path d="M6 86l30-50 14 20 14-26 30 56z" fill="${PLUM}" ${O}/><path d="M64 30l-8 14 8-4 8 4z" fill="${CREAM}" ${O}/><path d="M36 36l-8 14 8-4 6 4z" fill="${CREAM}" ${O}/>`,
  one: num("1", RED),
  orange: `<circle cx="50" cy="54" r="32" fill="${OCHRE}" ${O}/><path d="M50 22c0-6 4-10 8-10" ${L}/><path d="M52 18c8-6 18-4 20 0-6 6-14 6-20 0z" fill="${GREEN}" ${O}/><circle cx="38" cy="48" r="2" fill="${BROWN}"/><circle cx="56" cy="62" r="2" fill="${BROWN}"/><circle cx="62" cy="44" r="2" fill="${BROWN}"/>`,
  paper: `<path d="M24 10h38l16 16v64H24z" fill="${CREAM}" ${O}/><path d="M62 10v16h16" fill="${PAPER}" ${O}/><path d="M32 40h36M32 52h36M32 64h36M32 76h22" stroke="${LAPIS}" stroke-width="3" stroke-linecap="round"/>`,
  rice: `<path d="M14 48h72c0 22-14 36-36 36S14 70 14 48z" fill="${LAPIS}" ${O}/><path d="M18 48c0-14 14-22 32-22s32 8 32 22z" fill="${CREAM}" ${O}/><path d="M30 64h40" stroke="${MAYA}" stroke-width="4" stroke-linecap="round"/><path d="M64 26l18-16M70 30l18-14" ${L}/>`,
  river: `<path d="M8 20h84v66H8z" fill="${GREEN}" ${O}/><path d="M40 20c-10 14 20 22 6 36s14 20 4 30h20c10-12-12-18 2-32S60 32 62 20z" fill="${MAYA}" ${O}/><circle cx="22" cy="40" r="6" fill="#2E9A6E"/><circle cx="82" cy="66" r="6" fill="#2E9A6E"/>`,
  road: `<path d="M36 10h28l24 80H12z" fill="#4A4245" ${O}/><path d="M50 18v10M50 40v14M50 66v18" stroke="${OCHRE}" stroke-width="5" stroke-linecap="round"/>`,
  salt: `<path d="M34 32h32l6 54H28z" fill="${CREAM}" ${O}/><path d="M34 32c0-14 32-14 32 0z" fill="#C9CED6" ${O}/><circle cx="44" cy="24" r="1.8" fill="${INK}"/><circle cx="50" cy="22" r="1.8" fill="${INK}"/><circle cx="56" cy="24" r="1.8" fill="${INK}"/><path d="M30 58h40" stroke="${LAPIS}" stroke-width="5"/>`,
  school: `<path d="M14 46h72v42H14z" fill="${RED}" ${O}/><path d="M8 48L50 22l42 26" fill="${PLUM}" ${O}/><path d="M42 88V68h16v20z" fill="${CREAM}" ${O}/><circle cx="50" cy="44" r="7" fill="${CREAM}" ${O}/><path d="M50 22V8h12v6H50" fill="${OCHRE}" ${O}/><path d="M22 58h10v10H22zM68 58h10v10H68z" fill="${MAYA}" ${O}/>`,
  sea: `<path d="M6 56c10-10 20-10 30 0s20 10 30 0 20-10 28 0v32H6z" fill="${LAPIS}" ${O}/><path d="M6 40c10-10 20-10 30 0s20 10 30 0 20-10 28 0" stroke="${MAYA}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M14 72c6-4 12-4 18 0M52 70c6-4 12-4 18 0" stroke="${CREAM}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  shirt: `<path d="M34 14l-22 12 8 18 10-4v48h40V40l10 4 8-18-22-12c-2 8-8 12-16 12s-14-4-16-12z" fill="${MAYA}" ${O}/><path d="M42 14c2 6 4 8 8 8s6-2 8-8" ${L}/><path d="M30 60h40" stroke="${LAPIS}" stroke-width="5"/>`,
  shoe: `<path d="M10 70V42c0-4 4-6 8-4 10 6 20 8 28 2l8 10c10 6 30 6 36 16v6H10z" fill="${RED}" ${O}/><path d="M10 70h80v10H10z" fill="${CREAM}" ${O}/><path d="M38 46l6 8M46 42l6 8" stroke="${CREAM}" stroke-width="3.5" stroke-linecap="round"/>`,
  star: `<path d="M50 8l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z" fill="${OCHRE}" ${O}/><path d="M50 30l5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2z" fill="${CREAM}"/>`,
  stone: `<path d="M14 70c-4-16 8-34 26-40 16-6 36 0 44 14 6 12 2 28-10 34-18 8-52 8-60-8z" fill="#9A8F86" ${O}/><path d="M34 44c6-4 14-6 20-4" stroke="${CREAM}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  sun: `<circle cx="50" cy="50" r="20" fill="${OCHRE}" ${O}/><g ${O}><path d="M50 8v12M50 80v12M8 50h12M80 50h12M20 20l9 9M71 71l9 9M20 80l9-9M71 29l9-9" fill="none"/></g>`,
  tea: `<path d="M14 46h56c0 22-10 34-28 34S14 68 14 46z" fill="${GREEN}" ${O}/><path d="M70 50c12-2 14 14 0 16" ${L}/><path d="M24 54c4 10 12 16 22 16" stroke="${CREAM}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M8 84h76" ${L}/><path d="M34 18c-4 6 4 10 0 18M48 18c-4 6 4 10 0 18" ${L}/>`,
  three: num("3", GREEN),
  tree: `<path d="M44 90V60h12v30z" fill="${BROWN}" ${O}/><circle cx="50" cy="38" r="26" fill="${GREEN}" ${O}/><circle cx="30" cy="54" r="14" fill="${GREEN}" ${O}/><circle cx="70" cy="54" r="14" fill="${GREEN}" ${O}/><circle cx="40" cy="30" r="4" fill="${RED}"/><circle cx="62" cy="40" r="4" fill="${RED}"/>`,
  two: num("2", LAPIS),
  water: `<path d="M50 10c10 18 26 32 26 50 0 16-12 28-26 28S24 76 24 60c0-18 16-32 26-50z" fill="${MAYA}" ${O}/><path d="M36 60c0 8 6 14 12 14" stroke="${CREAM}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  window: `<rect x="16" y="14" width="68" height="72" rx="4" fill="${MAYA}" ${O}/><path d="M50 14v72M16 50h68" stroke="${CREAM}" stroke-width="7"/><rect x="16" y="14" width="68" height="72" rx="4" ${L}/><path d="M10 88h80" stroke="${BROWN}" stroke-width="7" stroke-linecap="round"/>`,
  wine: `<path d="M30 12h40c0 24-6 40-20 40S30 36 30 12z" fill="${CREAM}" ${O}/><path d="M32 26h36c-2 16-8 24-18 24s-16-8-18-24z" fill="${PLUM}"/><path d="M30 12h40c0 24-6 40-20 40S30 36 30 12z" ${L}/><path d="M50 52v30M34 86h32" ${L}/>`,
};

export function ObjectArt({ id, size = 64, className, style }: { id: string; size?: number; className?: string; style?: CSSProperties }) {
  const body = OBJECT_ART[id];
  if (!body) return null;
  return <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ overflow: "visible", ...style }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: body }} />;
}
