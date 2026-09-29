export const RESEARCH_HOST = "research.bucket.foundation";
export const RESEARCH_ORIGIN = `https://${RESEARCH_HOST}`;
export const RESEARCH_PREFIX = "/research-os";
export const SHARED_COOKIE_DOMAIN = ".bucket.foundation";

const PASSTHROUGH_PREFIXES = ["/api", "/_next", "/auth", "/sign-in", "/account", "/fonts", "/textures", "/academy-app"];
export const COOKIE_MIGRATION_MARKER = "bf-cookie-domain";
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
    if (hasPrefix(pathname, RESEARCH_PREFIX)) return { kind: "redirect", url: RESEARCH_ORIGIN + (pathname.slice(RESEARCH_PREFIX.length) || "/") + search };
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

function isBucketHost(h: string): boolean {
  return h === "bucket.foundation" || h.endsWith(SHARED_COOKIE_DOMAIN);
}

export function cookieDomainFor(host: string | null | undefined): string | undefined {
  return isBucketHost(hostname(host)) ? SHARED_COOKIE_DOMAIN : undefined;
}

export function cookieMigrationHeaders(host: string | null | undefined, cookies: { name: string; value: string }[], secure = true, alreadySet: string[] = []): string[] {
  if (!isBucketHost(hostname(host))) return [];
  if (cookies.some((c) => c.name === COOKIE_MIGRATION_MARKER)) return [];
  const flags = `Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
  const out: string[] = [];
  for (const c of cookies) {
    if (!c.name.startsWith("sb-")) continue;
    out.push(`${c.name}=; ${flags}; Max-Age=0`);
    if (!alreadySet.includes(c.name)) out.push(`${c.name}=${c.value}; ${flags}; Domain=${SHARED_COOKIE_DOMAIN}; Max-Age=34560000`);
  }
  out.push(`${COOKIE_MIGRATION_MARKER}=1; ${flags}; Domain=${SHARED_COOKIE_DOMAIN}; Max-Age=34560000`);
  return out;
}
