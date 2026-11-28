import { POLINGUAL_URL } from "@/lib/brand";

export type NavLink = { href: string; label: string; external?: boolean; newTab?: boolean };

export const HOME_LINK: NavLink = { href: "/", label: "bucket.foundation" };

export const POLINGUAL_LINK: NavLink = { href: POLINGUAL_URL, label: "Polingual", external: true };

export const EXPLORE_LINKS: NavLink[] = [
  POLINGUAL_LINK,
  { href: "/research-os", label: "Research OS" },
  { href: "/canon", label: "Canon" },
  { href: "/whats-new", label: "What’s new" },
  { href: "/about", label: "About" },
  { href: "/canon/search", label: "Search canon" },
  { href: "/canon/bridges", label: "Bridges" },
  { href: "/canon/graph", label: "Knowledge graph" },
  { href: "/earth", label: "Earth data globe" },
  { href: "/excerpts", label: "Source excerpts" },
  { href: "/sacred-history", label: "Sacred history" },
  { href: "/access", label: "How to access" },
  { href: "/protocol", label: "Protocol, feed402/x402" },
  { href: "/build", label: "Build on the API" },
  { href: "/learn", label: "Learn with Claude" },
];

export const INVOLVED_LINKS: NavLink[] = [
  { href: "/mission", label: "Mission · reform education" },
  { href: "/contribute", label: "Contribute" },
  { href: "/support", label: "Support / fund" },
  { href: "/research", label: "Research" },
  { href: "/research/papers", label: "Atlas papers" },
  { href: "/research/education", label: "Education research" },
  { href: "/research/education/knowledge-access-gradient", label: "Knowledge-Access Gradient" },
  { href: "/research/tools", label: "Research tools" },
  { href: "/research/figures", label: "Figures" },
];

export const SIGN_IN_LINK: NavLink = { href: "/sign-in", label: "Sign in" };
export const LAUNCH_LIST_LABEL = "Launch list";

const GH = "https://github.com/bucket-foundation";

export const OPEN_SOURCE_LINKS: NavLink[] = [
  { href: GH, label: "GitHub", external: true, newTab: true },
  { href: `${GH}/bucket-foundation`, label: "bucket-foundation", external: true, newTab: true },
  { href: `${GH}/x402-research-gateway`, label: "x402-gateway", external: true, newTab: true },
  { href: `${GH}/research-atlas`, label: "research-atlas", external: true, newTab: true },
  { href: `${GH}/education-atlas`, label: "education-atlas", external: true, newTab: true },
  { href: `${GH}/education-atlas/blob/master/docs/THE-KNOWLEDGE-ACCESS-GRADIENT.md`, label: "knowledge-access gradient", external: true, newTab: true },
  { href: "/feed.xml", label: "RSS feed", external: true },
  { href: "/manifesto", label: "Manifesto" },
  { href: "/governance", label: "Governance" },
];

export const LEGAL_LINKS: NavLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export const SLIM_LINKS: NavLink[] = [
  POLINGUAL_LINK,
  { href: "/research-os", label: "Research OS" },
  { href: "/canon", label: "Canon" },
  { href: "/about", label: "About" },
];

export const SLIM_FOOTER_PATHS = ["/", "/download"];

export const SITE_LINKS: NavLink[] = [
  HOME_LINK,
  ...EXPLORE_LINKS,
  ...INVOLVED_LINKS,
  ...OPEN_SOURCE_LINKS,
  ...LEGAL_LINKS,
  ...SLIM_LINKS,
];

export function internalPaths(): string[] {
  const seen = new Set<string>();
  for (const l of SITE_LINKS) if (!l.external && l.href.startsWith("/")) seen.add(l.href === "/" ? "" : l.href);
  return Array.from(seen);
}
