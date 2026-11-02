export const SHARE_HOST = "https://www.bucket.foundation";
export const BUCKET_APP_ID = "6825123451";
export const TEAM_ID = "QQ6D6A2LLS";
export const APP_BUNDLE = "foundation.bucket.app";
export const CLIP_BUNDLE = "foundation.bucket.app.Clip";
export const TESTFLIGHT_APP_URL = "https://apps.apple.com/app/testflight/id899247664";
export const BETA_JOIN_URL = "https://testflight.apple.com/join/HfeRBKr8";

export type Params = Record<string, string | string[] | undefined>;
export type ShareKind = "w" | "l" | "d" | "a" | "g" | "x" | "c" | "";

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

const KEYS = ["id", "g", "f", "l", "r", "s", "d", "t", "b", "q", "c", "n", "k", "p", "m", "at"] as const;
const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{10}$/;

export function one(params: Params, key: string, max = 200): string {
  const v = params[key];
  const s = (Array.isArray(v) ? v[0] : v) ?? "";
  return s.trim().slice(0, max);
}

export function shareKind(raw: string | undefined): ShareKind {
  return raw === "w" || raw === "l" || raw === "d" || raw === "a" || raw === "g" || raw === "x" || raw === "c" ? raw : "";
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

function count(params: Params, key: string, max: number): number {
  return Math.max(0, Math.min(max, parseInt(one(params, key, 6), 10) || 0));
}

export function clockLabel(seconds: number): string {
  const tail = String(seconds % 60).padStart(2, "0");
  if (seconds < 3600) return `${Math.floor(seconds / 60)}:${tail}`;
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${tail}`;
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
      eyebrow: forms.length === 1 ? `A word in ${langName(forms[0].lang)}` : `One word in ${forms.length} languages`,
      title: gloss,
      description: forms.map((f) => `${langName(f.lang)}: ${f.form}`).join(" · "),
      forms,
    };
  }
  if (kind === "l") {
    const langs = parseLangs(one(params, "l", 80));
    if (langs.length === 0) return base;
    const streak = count(params, "s", 10000);
    return {
      ...base,
      eyebrow: streak > 1 ? `${streak} day streak` : langs.length === 1 ? "A language on Bucket" : "Languages together",
      title: langs.length === 1 ? `Learning ${langName(langs[0])}` : `Learning ${joinNames(langs)} together`,
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
  if (kind === "x") {
    const source = one(params, "t", 60);
    const right = count(params, "p", 100000);
    const total = count(params, "m", 100000);
    if (!source || total === 0) return base;
    const langs = parseLangs(one(params, "l", 80));
    const streak = count(params, "s", 10000);
    return {
      ...base,
      eyebrow: `${source} score`,
      title: `${right} of ${total} right`,
      description: langs.length > 0 ? `Practicing ${joinNames(langs)} on Bucket. Try to beat it.` : "Studying on Bucket. Try to beat it.",
      langs,
      streak,
    };
  }
  if (kind === "c") {
    const t = one(params, "t", 80);
    if (!t) return base;
    const at = one(params, "at", 7);
    const source = one(params, "b", 60) || "Bucket";
    return {
      ...base,
      eyebrow: at ? `${source}, play from ${clockLabel(count(params, "at", 1000000))}` : source,
      title: t,
      description: one(params, "q", 160) || `Read, listen and watch in the languages you study on Bucket.`,
    };
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

export interface BetaStep {
  title: string;
  detail: string;
  href?: string;
  cta?: string;
}

export function betaSteps(hasInvite: boolean): BetaStep[] {
  const steps: BetaStep[] = [
    {
      title: "Install TestFlight",
      detail: "Apple's free app for beta apps. Skip this step if you have it. It may ask for a code: you do not need one, so close it and return to this page.",
      href: TESTFLIGHT_APP_URL,
      cta: "Get TestFlight",
    },
    {
      title: "Come back here and join the beta",
      detail: "Tap this after TestFlight is on your phone, then tap Install.",
      href: BETA_JOIN_URL,
      cta: "Join the Bucket beta",
    },
  ];
  if (hasInvite) steps.push({ title: "Tap your invite link again", detail: "Open this same link once Bucket is installed. It opens Bucket and joins the group." });
  return steps;
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
