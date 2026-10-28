export const SHARE_HOST = "https://www.bucket.foundation";
export const BUCKET_APP_ID = "6825123451";
export const TEAM_ID = "QQ6D6A2LLS";
export const APP_BUNDLE = "foundation.bucket.app";
export const CLIP_BUNDLE = "foundation.bucket.app.Clip";
export const APP_STORE_URL = `https://apps.apple.com/app/id${BUCKET_APP_ID}`;

export type Params = Record<string, string | string[] | undefined>;
export type ShareKind = "w" | "l" | "d" | "a" | "g" | "";

export interface ShareForm {
  lang: string;
  form: string;
}

export interface ShareView {
  kind: ShareKind;
  eyebrow: string;
  title: string;
  description: string;
  forms: ShareForm[];
  langs: string[];
  streak: number;
  code: string;
}

const KEYS = ["id", "g", "f", "l", "r", "s", "d", "t", "b", "q", "c", "n", "k"] as const;
const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/;

export function one(params: Params, key: string, max = 200): string {
  const v = params[key];
  const s = (Array.isArray(v) ? v[0] : v) ?? "";
  return s.trim().slice(0, max);
}

export function shareKind(raw: string | undefined): ShareKind {
  return raw === "w" || raw === "l" || raw === "d" || raw === "a" || raw === "g" ? raw : "";
}

export function langName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function parseForms(raw: string): ShareForm[] {
  return raw
    .split("|")
    .map((pair) => {
      const i = pair.indexOf(":");
      return i > 0 ? { lang: pair.slice(0, i).slice(0, 8), form: pair.slice(i + 1).slice(0, 40) } : null;
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

function joinNames(langs: string[]): string {
  return langs.map(langName).join(", ");
}

export function shareView(kind: ShareKind, params: Params): ShareView {
  const base: ShareView = {
    kind,
    eyebrow: "Bucket",
    title: "Learn every subject and language together",
    description: "Bucket teaches science and languages with daily review. Free on the App Store.",
    forms: [],
    langs: [],
    streak: 0,
    code: "",
  };
  if (kind === "w") {
    const forms = parseForms(one(params, "f", 400));
    const gloss = one(params, "g", 60);
    if (!gloss || forms.length === 0) return base;
    return {
      ...base,
      eyebrow: `One word in ${forms.length} languages`,
      title: gloss,
      description: forms.map((f) => `${langName(f.lang)}: ${f.form}`).join(" · "),
      forms,
    };
  }
  if (kind === "l") {
    const langs = parseLangs(one(params, "l", 80));
    if (langs.length === 0) return base;
    const streak = Math.max(0, Math.min(10000, parseInt(one(params, "s", 6), 10) || 0));
    return {
      ...base,
      eyebrow: streak > 1 ? `${streak} day streak` : "Languages together",
      title: `Learning ${joinNames(langs)} together`,
      description: `Learn ${joinNames(langs)} from one root language with flag tiles, cognates and daily review on Bucket.`,
      langs,
      streak,
    };
  }
  if (kind === "d") {
    const t = one(params, "t", 80);
    if (!t) return base;
    return { ...base, eyebrow: "A Bucket course", title: t, description: `Study ${t} on Bucket: lessons, quizzes and daily review.` };
  }
  if (kind === "a") {
    const t = one(params, "t", 80);
    if (!t) return base;
    const q = one(params, "q", 160);
    return { ...base, eyebrow: one(params, "b", 60) || "Bucket lesson", title: t, description: q || `Learn ${t} on Bucket.` };
  }
  if (kind === "g") {
    const code = one(params, "c", 10).toUpperCase();
    const name = one(params, "n", 60);
    if (!CODE_RE.test(code) || !name) return base;
    const family = one(params, "k", 10) === "family";
    return {
      ...base,
      eyebrow: family ? "Family group" : "Friends group",
      title: `Join ${name} on Bucket`,
      description: `You are invited to learn together with ${name}. Join on Bucket to see each other's languages, subjects and streaks.`,
      code,
    };
  }
  return base;
}

export function passQuery(params: Params): string {
  const q = new URLSearchParams();
  for (const k of KEYS) {
    const v = one(params, k, 400);
    if (v) q.set(k, v);
  }
  return q.toString();
}

export function sharePath(kind: ShareKind, params: Params): string {
  const q = passQuery(params);
  return `/s${kind ? `/${kind}` : ""}${q ? `?${q}` : ""}`;
}

export function ogPath(kind: ShareKind, params: Params): string {
  const q = passQuery(params);
  return `/api/share/og?k=${kind}${q ? `&${q}` : ""}`;
}

export function ogParams(search: URLSearchParams): { kind: ShareKind; params: Params } {
  const [kind, groupKind] = search.getAll("k");
  const params: Params = Object.fromEntries(search.entries());
  params.k = groupKind ?? "";
  return { kind: shareKind(kind ?? ""), params };
}

export function appleBanner(url: string): string {
  return `app-id=${BUCKET_APP_ID}, app-clip-bundle-id=${CLIP_BUNDLE}, app-clip-display=card, app-argument=${url}`;
}

export function appSiteAssociation() {
  return {
    applinks: {
      details: [{ appIDs: [`${TEAM_ID}.${APP_BUNDLE}`], components: [{ "/": "/s" }, { "/": "/s/*" }] }],
    },
    appclips: { apps: [`${TEAM_ID}.${CLIP_BUNDLE}`] },
  };
}
