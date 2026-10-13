export const VIEWS = ["globe", "circle"] as const;
export type ExplorerView = (typeof VIEWS)[number];

export const SORTS = ["rank", "year", "branch"] as const;
export type ExplorerSort = (typeof SORTS)[number];

export type ExplorerState = {
  marker: string | null;
  view: ExplorerView;
  sort: ExplorerSort;
  y: number;
  q: string;
  branch: string | null;
};

export type ExplorerBounds = {
  minYear: number;
  maxYear: number;
  defaultYear: number;
  branches: readonly string[];
};

export function defaultExplorerState(b: ExplorerBounds): ExplorerState {
  return { marker: null, view: "globe", sort: "rank", y: b.defaultYear, q: "", branch: null };
}

function pick<T extends string>(allowed: readonly T[], raw: string | null, fallback: T): T {
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

function resolveBranch(raw: string | null, branches: readonly string[]): string | null {
  if (!raw) return null;
  if (branches.includes(raw)) return raw;
  const bare = raw.replace(/^\d+-/, "");
  return branches.find((b) => b.replace(/^\d+-/, "") === bare) ?? null;
}

export function parseExplorerParams(search: string | URLSearchParams, b: ExplorerBounds): ExplorerState {
  const p = typeof search === "string" ? new URLSearchParams(search) : search;
  const d = defaultExplorerState(b);
  const rawY = p.get("y");
  const yNum = rawY !== null && /^-?\d+$/.test(rawY.trim()) ? Number(rawY) : NaN;
  const y = Number.isFinite(yNum) ? Math.min(b.maxYear, Math.max(b.minYear, yNum)) : d.y;
  const marker = p.get("marker");
  return {
    marker: marker && marker.trim() ? marker.trim() : null,
    view: pick(VIEWS, p.get("view"), d.view),
    sort: pick(SORTS, p.get("sort"), d.sort),
    y,
    q: (p.get("q") ?? "").trim(),
    branch: resolveBranch(p.get("branch"), b.branches),
  };
}

const KEYS = ["marker", "view", "sort", "y", "q", "branch"] as const;

export function writeExplorerParams(params: URLSearchParams, s: ExplorerState, b: ExplorerBounds): URLSearchParams {
  const out = new URLSearchParams(params);
  const d = defaultExplorerState(b);
  for (const k of KEYS) out.delete(k);
  if (s.marker) out.set("marker", s.marker);
  if (s.view !== d.view) out.set("view", s.view);
  if (s.sort !== d.sort) out.set("sort", s.sort);
  if (Math.round(s.y) !== d.y) out.set("y", String(Math.round(s.y)));
  if (s.q.trim()) out.set("q", s.q.trim());
  if (s.branch) out.set("branch", s.branch);
  return out;
}
