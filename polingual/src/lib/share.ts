import { LANGS } from "./words";
import { OG_DESCRIPTION_MAX, OG_TITLE_MAX, clip } from "./meta";

export type Params = Record<string, string | string[] | undefined>;
export type ShareKind = "w" | "l" | "d" | "a" | "x" | "c" | "g" | "";

export const SHARE_KINDS: ShareKind[] = ["w", "l", "d", "a", "x", "c", "g", ""];

export type ShareForm = { lang: string; form: string };

export type ShareView = {
  kind: ShareKind;
  eyebrow: string;
  title: string;
  description: string;
  forms: ShareForm[];
  langs: string[];
  streak: number;
  code: string;
};

export const PARAM_LIMITS: Record<string, number> = { id: 80, g: 60, f: 400, l: 80, r: 8, s: 6, d: 80, t: 80, b: 60, q: 160, c: 10, n: 60, k: 10, p: 6, m: 6, at: 7 };

const KEYS = Object.keys(PARAM_LIMITS);
const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/;
const RTL = new Set(["ar", "fa", "he", "ur", "yi"]);

const GRAPHEMES = new Intl.Segmenter("en", { granularity: "grapheme" });

function graphemeSlice(text: string, max: number): string {
  let out = "";
  let n = 0;
  for (const { segment } of GRAPHEMES.segment(text)) {
    if (n++ >= max) break;
    out += segment;
  }
  return out;
}

export function one(params: Params, key: string, max = 200): string {
  const v = params[key];
  const s = (Array.isArray(v) ? v[0] : v) ?? "";
  return graphemeSlice(s.trim(), max).trim();
}

export function shareKind(raw: string | undefined): ShareKind {
  return SHARE_KINDS.includes(raw as ShareKind) ? (raw as ShareKind) : "";
}

export function langName(code: string): string {
  const known = LANGS[code]?.name;
  if (known) return known;
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function isRtl(code: string): boolean {
  return RTL.has(code) || Boolean(LANGS[code]?.rtl);
}

export function parseForms(raw: string): ShareForm[] {
  return raw
    .split("|")
    .map((pair) => {
      const i = pair.indexOf(":");
      return i > 0 ? { lang: pair.slice(0, i).slice(0, 8), form: graphemeSlice(pair.slice(i + 1).trim(), 40) } : null;
    })
    .filter((f): f is ShareForm => !!f && f.form.length > 0)
    .slice(0, 6);
}

export function parseLangs(raw: string): string[] {
  return raw
    .split(".")
    .map((l) => l.trim().slice(0, 8))
    .filter(Boolean)
    .slice(0, 8);
}

export function joinNames(langs: string[]): string {
  const names = langs.map(langName);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function count(params: Params, key: string, max: number): number {
  return Math.max(0, Math.min(max, parseInt(one(params, key, 7), 10) || 0));
}

export function clockLabel(seconds: number): string {
  const tail = String(seconds % 60).padStart(2, "0");
  if (seconds < 3600) return `${Math.floor(seconds / 60)}:${tail}`;
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${tail}`;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const BASE: Omit<ShareView, "kind"> = {
  eyebrow: "Polingual",
  title: "Learn several languages at once",
  description: "Polingual teaches one word across many languages and scripts, with every word spoken aloud. For iPhone and iPad.",
  forms: [],
  langs: [],
  streak: 0,
  code: "",
};

function wordView(params: Params): Omit<ShareView, "kind"> {
  const forms = parseForms(one(params, "f", 400));
  const gloss = one(params, "g", 60);
  if (!gloss || forms.length === 0) return BASE;
  return {
    ...BASE,
    eyebrow: forms.length === 1 ? `A word in ${langName(forms[0].lang)}` : `One word in ${forms.length} languages`,
    title: capitalize(gloss),
    description: `${forms.map((f) => `${langName(f.lang)} ${f.form}`).join(", ")}. Learn them together in Polingual.`,
    forms,
  };
}

function langsView(params: Params): Omit<ShareView, "kind"> {
  const langs = parseLangs(one(params, "l", 80));
  if (langs.length === 0) return BASE;
  const streak = count(params, "s", 100000);
  const root = one(params, "r", 8);
  const from = root && !langs.includes(root) ? ` from ${langName(root)}` : "";
  return {
    ...BASE,
    eyebrow: streak > 1 ? `${streak} day streak` : langs.length === 1 ? "A language on Polingual" : "Languages together",
    title: langs.length === 1 ? `Learning ${langName(langs[0])}` : `Learning ${joinNames(langs)} together`,
    description: `Learn ${joinNames(langs)}${from} in Polingual: one review queue, every word spoken aloud.`,
    langs,
    streak,
  };
}

function deckView(params: Params): Omit<ShareView, "kind"> {
  const t = one(params, "t", 80);
  if (!t) return BASE;
  return { ...BASE, eyebrow: "A Polingual course", title: t, description: `Study ${t} in Polingual with lessons, quizzes and daily review.` };
}

function lessonView(params: Params): Omit<ShareView, "kind"> {
  const t = one(params, "t", 80);
  if (!t) return BASE;
  return { ...BASE, eyebrow: one(params, "b", 60) || "Polingual lesson", title: t, description: one(params, "q", 160) || `Learn ${t} in Polingual.` };
}

function scoreView(params: Params): Omit<ShareView, "kind"> {
  const source = one(params, "t", 60);
  const right = count(params, "p", 100000);
  const total = count(params, "m", 100000);
  if (!source || total === 0) return BASE;
  const langs = parseLangs(one(params, "l", 80));
  const streak = count(params, "s", 100000);
  return {
    ...BASE,
    eyebrow: `${source} score`,
    title: `${Math.min(right, total)} of ${total} right`,
    description: langs.length > 0 ? `Practicing ${joinNames(langs)} in Polingual. Try to beat it.` : "Practicing languages in Polingual. Try to beat it.",
    langs,
    streak,
  };
}

function clipView(params: Params): Omit<ShareView, "kind"> {
  const t = one(params, "t", 80);
  if (!t) return BASE;
  const source = one(params, "b", 60) || "Polingual";
  const at = one(params, "at", 7);
  return {
    ...BASE,
    eyebrow: at ? `${source}, play from ${clockLabel(count(params, "at", 1000000))}` : source,
    title: t,
    description: one(params, "q", 160) || "Read, listen and watch in the languages you study in Polingual.",
  };
}

function groupView(params: Params): Omit<ShareView, "kind"> {
  const code = one(params, "c", 10).toUpperCase();
  const name = one(params, "n", 60);
  if (!CODE_RE.test(code) || !name) return BASE;
  return {
    ...BASE,
    eyebrow: one(params, "k", 10) === "family" ? "Family group" : "Friends group",
    title: `Join ${name} on Polingual`,
    description: `You are invited to learn languages together with ${name}. Join on Polingual to see each other's languages and streaks.`,
    code,
  };
}

const BUILDERS: Partial<Record<ShareKind, (params: Params) => Omit<ShareView, "kind">>> = {
  w: wordView,
  l: langsView,
  d: deckView,
  a: lessonView,
  x: scoreView,
  c: clipView,
  g: groupView,
};

function build(kind: ShareKind, params: Params): Omit<ShareView, "kind"> {
  return BUILDERS[kind]?.(params) ?? BASE;
}

export function shareView(kind: ShareKind, params: Params): ShareView {
  const v = build(kind, clampParams(params));
  return { ...v, kind, title: clip(v.title, OG_TITLE_MAX), description: clip(v.description, OG_DESCRIPTION_MAX) };
}

export function clampParams(params: Params): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of KEYS) {
    const v = one(params, k, PARAM_LIMITS[k]);
    if (v) out[k] = v;
  }
  return out;
}

export function passQuery(params: Params): string {
  return new URLSearchParams(clampParams(params)).toString();
}

export function sharePath(kind: ShareKind, params: Params): string {
  const q = passQuery(params);
  return `/s${kind ? `/${kind}` : ""}${q ? `?${q}` : ""}`;
}

export function ogPath(kind: ShareKind, params: Params): string {
  const q = passQuery(params);
  return `/api/share/og?kind=${kind}${q ? `&${q}` : ""}`;
}

export function ogParams(search: URLSearchParams): { kind: ShareKind; params: Params } {
  return { kind: shareKind(search.get("kind") ?? ""), params: clampParams(Object.fromEntries(search.entries())) };
}

export function installHref(kind: ShareKind): string {
  return `/?utm_source=share&utm_medium=link&utm_campaign=share_${kind || "home"}`;
}

export const TEAM_ID = "QQ6D6A2LLS";
export const APP_BUNDLE = "com.polingual.app";

export function appSiteAssociation() {
  return {
    applinks: {
      details: [{ appIDs: [`${TEAM_ID}.${APP_BUNDLE}`], components: [{ "/": "/s" }, { "/": "/s/*" }, { "/": "/word/*" }] }],
    },
  };
}
