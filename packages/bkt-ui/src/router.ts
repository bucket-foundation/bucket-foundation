import { useEffect, useState } from "react";

export type Route = { name: "learn" } | { name: "deck"; deck: string } | { name: "quiz" } | { name: "review" } | { name: "import" };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "learn" && parts[1]) return { name: "deck", deck: parts[1] };
  if (parts[0] === "quiz") return { name: "quiz" };
  if (parts[0] === "review") return { name: "review" };
  if (parts[0] === "import") return { name: "import" };
  return { name: "learn" };
}

export function href(r: Route): string {
  return r.name === "deck" ? `#/learn/${encodeURIComponent(r.deck)}` : `#/${r.name}`;
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
