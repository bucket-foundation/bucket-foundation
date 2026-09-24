export const LAUNCH_PAGES = [
  "/research-os/home",
  "/research-os/learn",
  "/research-os/learn/[branch]",
  "/research-os/learn/[branch]/place",
  "/research-os/learn/[branch]/study",
  "/research-os/learn/[branch]/[atom]",
  "/research-os/learn/[branch]/assess",
  "/research-os/profile",
  "/research-os/n/[slug]",
] as const;

const API_ROOT = "/api/research-os";

export const LAUNCH_API_NAMES = [
  "access",
  "assignments",
  "classes",
  "connections",
  "consent",
  "loop",
  "makeup",
  "node",
  "payee",
  "privacy",
  "production",
  "profile",
  "review",
  "route",
  "search",
  "state",
  "words",
  "workspace",
] as const;

export const LAUNCH_APIS: readonly string[] = LAUNCH_API_NAMES.map((name) => [API_ROOT, name].join("/"));

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isParam(segment: string): boolean {
  return segment.length > 2 && segment.startsWith("[") && segment.endsWith("]");
}

function matches(pattern: string, path: string): boolean {
  const want = pattern.split("/");
  const got = (path.length > 1 ? path.replace(/\/+$/, "") : path).split("/");
  if (want.length !== got.length) return false;
  return want.every((seg, i) => (isParam(seg) ? got[i].length > 0 : seg === got[i]));
}

export function inLaunchScope(path: string): boolean {
  return [...LAUNCH_PAGES, ...LAUNCH_APIS].some((p) => matches(p, path));
}

export function isWriteMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}
