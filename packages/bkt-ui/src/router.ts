import { useEffect, useState } from "react";

export type Route =
  | { name: "learn" }
  | { name: "deck"; deck: string; atom?: string }
  | { name: "path"; to?: string }
  | { name: "words"; deck: string; lesson?: number }
  | { name: "concepts"; page?: number }
  | { name: "licence" }
  | { name: "quiz" }
  | { name: "review" }
  | { name: "import" }
  | { name: "add" }
  | { name: "settings" }
  | { name: "library" }
  | { name: "advisors" }
  | { name: "primes" }
  | { name: "jobs" }
  | { name: "work" }
  | { name: "daily"; day: string }
  | { name: "canon"; find?: string }
  | { name: "search"; id?: number }
  | { name: "explore" }
  | { name: "atlases" }
  | { name: "notes" }
  | { name: "history" }
  | { name: "data" }
  | { name: "research"; slug?: string; tab?: ResearchTab }
  | { name: "graph"; branch?: string }
  | { name: "node"; slug: string }
  | { name: "progress" }
  | { name: "profile" };

export const RESEARCH_TABS = ["report", "data", "figures", "records"] as const;
export type ResearchTab = (typeof RESEARCH_TABS)[number];
const RESEARCH_SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

const SIMPLE = new Set(["quiz", "review", "add", "settings", "library", "import", "advisors", "primes", "jobs", "work", "canon", "explore", "atlases", "notes", "history", "data", "progress", "profile"]);
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const LANGUAGE = /^[a-z]{2,3}$/;
const PAGE = /^[1-9]\d{0,3}$/;
const NODE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,200}$/;

export function isDay(day: string | undefined): day is string {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === day;
}

export function parseHash(hash: string): Route {
  let parts: string[];
  try {
    parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return { name: "learn" };
  }
  if (parts[0] === "learn" && parts[1]) return parts[2] ? { name: "deck", deck: parts[1], atom: parts[2] } : { name: "deck", deck: parts[1] };
  if (parts[0] === "words" && parts[1] === "licence" && parts.length === 2) return { name: "licence" };
  if (parts[0] === "words" && parts[1] === "concepts") return parts.length === 3 && PAGE.test(parts[2]) ? { name: "concepts", page: Number(parts[2]) } : { name: "concepts" };
  if (parts[0] === "words" && parts[1] && LANGUAGE.test(parts[1])) return parts.length === 3 && PAGE.test(parts[2]) ? { name: "words", deck: parts[1], lesson: Number(parts[2]) } : { name: "words", deck: parts[1] };
  if (parts[0] === "path") return parts[1] ? { name: "path", to: parts[1] } : { name: "path" };
  if (parts[0] === "work" && parts[1] === "daily" && parts.length === 3 && isDay(parts[2])) return { name: "daily", day: parts[2] };
  if (parts[0] === "canon" && parts[1] === "find" && parts.length === 3 && parts[2].length <= 200) return { name: "canon", find: parts[2] };
  if (parts[0] === "search") return parts.length === 2 && /^\d{1,9}$/.test(parts[1]) ? { name: "search", id: Number(parts[1]) } : { name: "search" };
  if (parts[0] === "graph") return parts.length === 2 && BRANCH.test(parts[1]) ? { name: "graph", branch: parts[1] } : { name: "graph" };
  if (parts[0] === "node" && parts.length === 2 && NODE.test(parts[1])) return { name: "node", slug: parts[1] };
  if (parts[0] === "research") {
    if (parts.length < 2 || parts.length > 3 || !RESEARCH_SLUG.test(parts[1])) return { name: "research" };
    const tab = RESEARCH_TABS.find((t) => t === parts[2]);
    return parts.length === 3 && !tab ? { name: "research" } : { name: "research", slug: parts[1], tab: tab ?? "report" };
  }
  if (parts[0] === "setup") return { name: "settings" };
  if (SIMPLE.has(parts[0])) return { name: parts[0] } as Route;
  return { name: "learn" };
}

export function href(r: Route): string {
  if (r.name === "deck") return `#/learn/${encodeURIComponent(r.deck)}${r.atom ? `/${encodeURIComponent(r.atom)}` : ""}`;
  if (r.name === "words") return `#/words/${r.deck}${r.lesson ? `/${r.lesson}` : ""}`;
  if (r.name === "licence") return "#/words/licence";
  if (r.name === "concepts") return r.page && r.page > 1 ? `#/words/concepts/${r.page}` : "#/words/concepts";
  if (r.name === "path") return r.to ? `#/path/${encodeURIComponent(r.to)}` : "#/path";
  if (r.name === "daily") return `#/work/daily/${r.day}`;
  if (r.name === "canon") return r.find ? `#/canon/find/${encodeURIComponent(r.find)}` : "#/canon";
  if (r.name === "search") return r.id === undefined ? "#/search" : `#/search/${r.id}`;
  if (r.name === "graph") return r.branch ? `#/graph/${encodeURIComponent(r.branch)}` : "#/graph";
  if (r.name === "research") return r.slug ? `#/research/${r.slug}/${r.tab ?? "report"}` : "#/research";
  if (r.name === "node") return `#/node/${encodeURIComponent(r.slug)}`;
  return `#/${r.name}`;
}

export function firstRunHash(hash: string, decks: { introduced: number; xp: number }[]): string | null {
  if (hash.replace(/^#\/?/, "") !== "") return null;
  return decks.every((d) => d.introduced === 0 && d.xp === 0) ? href({ name: "quiz" }) : null;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export async function followRoutes(
  next: () => Promise<{ route: string | null; superseded: boolean }>,
  go: (route: string) => void,
  live: () => boolean,
  wait: (ms: number) => Promise<unknown> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<void> {
  while (live()) {
    let answer: { route: string | null; superseded: boolean };
    try {
      answer = await next();
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401 || status === 404) return;
      await wait(5000);
      continue;
    }
    if (answer.superseded) return;
    if (answer.route !== null && live()) go(answer.route);
  }
}
