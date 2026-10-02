import { useEffect, useState } from "react";

export type Route =
  | { name: "learn" }
  | { name: "deck"; deck: string; atom?: string }
  | { name: "path"; to?: string }
  | { name: "quiz" }
  | { name: "review" }
  | { name: "import" }
  | { name: "add" }
  | { name: "setup" }
  | { name: "advisors" }
  | { name: "primes" }
  | { name: "jobs" }
  | { name: "work" }
  | { name: "daily"; day: string }
  | { name: "canon"; find?: string }
  | { name: "search"; id?: number }
  | { name: "atlases" }
  | { name: "notes" }
  | { name: "history" };

const SIMPLE = new Set(["quiz", "review", "add", "setup", "import", "advisors", "primes", "jobs", "work", "canon", "atlases", "notes", "history"]);

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
  if (parts[0] === "path") return parts[1] ? { name: "path", to: parts[1] } : { name: "path" };
  if (parts[0] === "work" && parts[1] === "daily" && parts.length === 3 && isDay(parts[2])) return { name: "daily", day: parts[2] };
  if (parts[0] === "canon" && parts[1] === "find" && parts.length === 3 && parts[2].length <= 200) return { name: "canon", find: parts[2] };
  if (parts[0] === "search") return parts.length === 2 && /^\d{1,9}$/.test(parts[1]) ? { name: "search", id: Number(parts[1]) } : { name: "search" };
  if (SIMPLE.has(parts[0])) return { name: parts[0] } as Route;
  return { name: "learn" };
}

export function href(r: Route): string {
  if (r.name === "deck") return `#/learn/${encodeURIComponent(r.deck)}${r.atom ? `/${encodeURIComponent(r.atom)}` : ""}`;
  if (r.name === "path") return r.to ? `#/path/${encodeURIComponent(r.to)}` : "#/path";
  if (r.name === "daily") return `#/work/daily/${r.day}`;
  if (r.name === "canon") return r.find ? `#/canon/find/${encodeURIComponent(r.find)}` : "#/canon";
  if (r.name === "search") return r.id === undefined ? "#/search" : `#/search/${r.id}`;
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
