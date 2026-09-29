export const RESEARCH_HOST = "research.bucket.foundation";
export const RESEARCH_ORIGIN = `https://${RESEARCH_HOST}`;
export const RESEARCH_PREFIX = "/research-os";
export const SHARED_COOKIE_DOMAIN = ".bucket.foundation";

const PASSTHROUGH_PREFIXES = ["/api", "/_next", "/auth", "/sign-in", "/account", "/fonts", "/textures", "/academy-app", RESEARCH_PREFIX];
const PASSTHROUGH_FILES = /\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff|woff2|ttf|bin|json|txt|xml|webmanifest|mp4|css|js|map)$/;

export type ResearchRoute =
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect"; url: string }
  | { kind: "none" };

function hostname(host: string | null | undefined): string {
  return (host ?? "").toLowerCase().split(":")[0];
}

export function isResearchHost(host: string | null | undefined): boolean {
  return hostname(host) === RESEARCH_HOST;
}

function hasPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function researchRoute(host: string | null | undefined, pathname: string, search = "", redirectFlag?: string): ResearchRoute {
  if (isResearchHost(host)) {
    if (PASSTHROUGH_FILES.test(pathname)) return { kind: "none" };
    if (PASSTHROUGH_PREFIXES.some((p) => hasPrefix(pathname, p))) return { kind: "none" };
    return { kind: "rewrite", pathname: pathname === "/" ? RESEARCH_PREFIX : RESEARCH_PREFIX + pathname };
  }
  if (redirectFlag === "1" || redirectFlag === "true") {
    const h = hostname(host);
    if ((h === "bucket.foundation" || h === "www.bucket.foundation") && hasPrefix(pathname, RESEARCH_PREFIX)) {
      const rest = pathname.slice(RESEARCH_PREFIX.length) || "/";
      return { kind: "redirect", url: RESEARCH_ORIGIN + rest + search };
    }
  }
  return { kind: "none" };
}

export function researchHref(path: string, host: string | null | undefined): string {
  if (!isResearchHost(host) || !hasPrefix(path.split(/[?#]/)[0], RESEARCH_PREFIX)) return path;
  const rest = path.slice(RESEARCH_PREFIX.length);
  return rest === "" || rest[0] === "?" || rest[0] === "#" ? "/" + rest : rest;
}

export function cookieDomainFor(host: string | null | undefined, production: boolean): string | undefined {
  if (!production) return undefined;
  const h = hostname(host);
  return h === "bucket.foundation" || h.endsWith(SHARED_COOKIE_DOMAIN) ? SHARED_COOKIE_DOMAIN : undefined;
}
