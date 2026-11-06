const H3 = (a: string, b: string, c: string) => `linear-gradient(${a} 0 33.3%,${b} 0 66.6%,${c} 0)`;
const V3 = (a: string, b: string, c: string) => `linear-gradient(90deg,${a} 0 33.3%,${b} 0 66.6%,${c} 0)`;
const CROSS = (field: string, cross: string) => `linear-gradient(90deg,transparent 0 30%,${cross} 0 42%,transparent 0) ,linear-gradient(transparent 0 42%,${cross} 0 58%,transparent 0),${field}`;

export const FLAGS: Record<string, string> = {
  en: "linear-gradient(90deg,transparent 0 42%,#C8102E 0 58%,transparent 0),linear-gradient(transparent 0 40%,#C8102E 0 60%,transparent 0),linear-gradient(90deg,transparent 0 38%,#fff 0 62%,transparent 0),linear-gradient(transparent 0 34%,#fff 0 66%,transparent 0),#012169",
  es: "linear-gradient(#AA151B 0 25%,#F1BF00 0 75%,#AA151B 0)",
  fr: V3("#002654", "#fff", "#CE1126"),
  it: V3("#008C45", "#F4F5F0", "#CD212A"),
  pt: "linear-gradient(90deg,#046A38 0 40%,#DA291C 0)",
  de: H3("#000", "#DD0000", "#FFCE00"),
  nl: H3("#AE1C28", "#fff", "#21468B"),
  sv: CROSS("#006AA7", "#FECC02"),
  ru: H3("#fff", "#0039A6", "#D52B1E"),
  ja: "radial-gradient(circle at 50% 50%,#BC002D 0 22%,#fff 23%)",
  ar: H3("#CE1126", "#fff", "#000"),
  el: "linear-gradient(90deg,#0D5EAF 0 0) 0 0/40% 55.5% no-repeat,repeating-linear-gradient(#0D5EAF 0 11.1%,#fff 0 22.2%)",
  fi: CROSS("#fff", "#002F6C"),
  hi: H3("#FF9933", "#fff", "#138808"),
  ko: "radial-gradient(circle at 50% 50%,#CD2E3A 0 20%,#fff 21%)",
  pl: "linear-gradient(#fff 0 50%,#DC143C 0)",
  zh: "#EE1C25",
  ang: "linear-gradient(135deg,#5B1A4A 0 50%,#3A0F2F 0)",
  cs: "linear-gradient(to bottom right,#11457E 0 35%,transparent 0) 0 0/50% 100% no-repeat,linear-gradient(#fff 0 50%,#D7141A 0)",
  fa: H3("#239F40", "#fff", "#DA0000"),
  grc: "linear-gradient(135deg,#26428B 0 50%,#6FB7C2 0)",
  he: "linear-gradient(#fff 0 14%,#0038B8 0 26%,#fff 0 74%,#0038B8 0 86%,#fff 0)",
  id: "linear-gradient(#CE1126 0 50%,#fff 0)",
  la: "linear-gradient(135deg,#8E2312 0 50%,#E9A23B 0)",
  sa: "linear-gradient(135deg,#E9A23B 0 50%,#D9381E 0)",
  ta: "linear-gradient(135deg,#1E7A5A 0 50%,#6FB7C2 0)",
  th: "linear-gradient(#A51931 0 16%,#F4F5F8 0 33%,#2D2A4A 0 66%,#F4F5F8 0 83%,#A51931 0)",
  tr: "radial-gradient(circle at 42% 50%,#fff 0 20%,transparent 21%),#E30A17",
  vi: "#DA251D",
  ur: "linear-gradient(90deg,#fff 0 25%,#01411C 0)",
};

export const FLAG_STRIPE = "linear-gradient(90deg,#002654 0 5.5%,#fff 0 11%,#CE1126 0 16.6%,#0038B8 0 22%,#fff 0 27.7%,#0D5EAF 0 33.3%,#fff 0 38.8%,#CE1126 0 44.4%,#fff 0 50%,#000 0 55.5%,#FF9933 0 61%,#fff 0 66.6%,#138808 0 72.2%,#EE1C25 0 83.3%,#FFDE00 0 88.8%,#EE1C25 0)";

export function flagFor(lang: string): string {
  return FLAGS[lang] ?? "linear-gradient(135deg,#5B1A4A 0 50%,#26428B 0)";
}
