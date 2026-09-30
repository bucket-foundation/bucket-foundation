import { useEffect, useState } from "react";

export type Route =
  | { name: "learn" }
  | { name: "deck"; deck: string; atom?: string }
  | { name: "path"; to?: string }
  | { name: "quiz" }
  | { name: "review" }
  | { name: "import" }
  | { name: "advisors" }
  | { name: "primes" }
  | { name: "jobs" }
  | { name: "work" };

const SIMPLE = new Set(["quiz", "review", "import", "advisors", "primes", "jobs", "work"]);

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "learn" && parts[1]) return parts[2] ? { name: "deck", deck: parts[1], atom: parts[2] } : { name: "deck", deck: parts[1] };
  if (parts[0] === "path") return parts[1] ? { name: "path", to: parts[1] } : { name: "path" };
  if (SIMPLE.has(parts[0])) return { name: parts[0] } as Route;
  return { name: "learn" };
}

export function href(r: Route): string {
  if (r.name === "deck") return `#/learn/${encodeURIComponent(r.deck)}${r.atom ? `/${encodeURIComponent(r.atom)}` : ""}`;
  if (r.name === "path") return r.to ? `#/path/${encodeURIComponent(r.to)}` : "#/path";
  return `#/${r.name}`;
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
