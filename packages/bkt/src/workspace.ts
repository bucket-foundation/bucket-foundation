import type { DatasetInfo } from "./data";
import type { Research } from "./research";
import { ResearchError } from "./research";
import type { Route } from "./serve";

export const WORKSPACE_TYPES = ["tables", "figures", "papers", "records", "graphs", "people", "decks", "maps"] as const;
export type WorkspaceType = (typeof WORKSPACE_TYPES)[number];
export const WORKSPACE_PAGE = 50;
export const WORKSPACE_QUERY_MAX = 200;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const ITEM = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DATASET = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface WorkspaceItem {
  type: WorkspaceType;
  key: string;
  title: string;
  from: { kind: "output" | "dataset" | "rowset" | "deck" | "advisor"; id: string; title: string };
  origin: "shipped" | "staff" | "local";
  licence: string;
  changed: boolean;
  opens: string;
  explore: { data: string; modes: string[] } | null;
}

export interface WorkspaceSources {
  research: Pick<Research, "list" | "detail">;
  changedPaths: (slug: string) => string[];
  datasets: () => DatasetInfo[];
  rowSets: () => string[];
}

function terms(info: DatasetInfo): string {
  const all = [...new Set(info.parts.map((p) => p.terms).filter((t): t is string => typeof t === "string" && t !== ""))];
  return all.length === 0 ? "" : all.length === 1 ? all[0] : "mixed";
}

function fromOutputs(src: WorkspaceSources, type: "tables" | "records"): WorkspaceItem[] {
  const items: WorkspaceItem[] = [];
  for (const row of src.research.list()) {
    if (row.unreadable !== null) continue;
    const detail = src.research.detail(row.slug);
    const changed = row.changed > 0 ? src.changedPaths(row.slug) : [];
    const from = { kind: "output" as const, id: row.slug, title: row.title };
    if (type === "tables") {
      for (const t of detail.manifest.tables ?? []) {
        if (!ITEM.test(t.id)) continue;
        items.push({ type, key: `output:${row.slug}:${t.id}`, title: t.label, from, origin: row.origin, licence: t.licence, changed: changed.includes(t.path), opens: `#/research/${row.slug}/data/${t.id}`, explore: null });
      }
    } else {
      for (const s of detail.manifest.record_sets ?? []) {
        if (!ITEM.test(s.id)) continue;
        items.push({ type, key: `output:${row.slug}:${s.id}`, title: s.label, from, origin: row.origin, licence: s.licence, changed: changed.some((p) => p === s.index || p.startsWith(`${s.dir}/`)), opens: `#/research/${row.slug}/records/${s.id}`, explore: null });
      }
    }
  }
  return items;
}

function fromDatasets(src: WorkspaceSources): WorkspaceItem[] {
  const rowSets = new Set(src.rowSets());
  return src
    .datasets()
    .filter((info) => DATASET.test(info.id))
    .map((info) => {
      const kind = rowSets.has(info.id) ? ("rowset" as const) : ("dataset" as const);
      return { type: "records" as const, key: `${kind}:${info.id}:all`, title: info.name, from: { kind, id: info.id, title: info.name }, origin: info.id === "yours" ? ("local" as const) : ("shipped" as const), licence: terms(info), changed: false, opens: "#/data", explore: null };
    });
}

export function workspaceItems(src: WorkspaceSources, type: WorkspaceType): WorkspaceItem[] {
  if (type === "tables") return fromOutputs(src, "tables");
  if (type === "records") return [...fromOutputs(src, "records"), ...fromDatasets(src)];
  return [];
}

export function workspacePage(src: WorkspaceSources, typeIn: string | null, qIn: string | null, pageIn: string | null): { items: WorkspaceItem[]; total: number; page: number; size: number } {
  const type = WORKSPACE_TYPES.find((t) => t === typeIn);
  if (!type) throw new ResearchError("the workspace names no kind of item Bucket holds", 400);
  if (qIn !== null && qIn.length > WORKSPACE_QUERY_MAX) throw new ResearchError("the filter is over 200 characters", 400);
  if (pageIn !== null && !/^[1-9]\d{0,5}$/.test(pageIn)) throw new ResearchError("the page number is refused", 400);
  const q = (qIn ?? "").trim().toLowerCase();
  const all = workspaceItems(src, type).filter((i) => q === "" || i.title.toLowerCase().includes(q) || i.from.title.toLowerCase().includes(q));
  const page = Number(pageIn ?? "1");
  return { items: all.slice((page - 1) * WORKSPACE_PAGE, page * WORKSPACE_PAGE), total: all.length, page, size: WORKSPACE_PAGE };
}

export function workspaceRoutes(src: WorkspaceSources, onError: (e: Error) => void = () => {}): Record<string, Route> {
  return {
    "GET /local/workspace/items": (_req, url) => {
      try {
        return json(workspacePage(src, url.searchParams.get("type"), url.searchParams.get("q"), url.searchParams.get("page")));
      } catch (e) {
        if (e instanceof ResearchError) return json({ error: e.message }, e.status);
        onError(e as Error);
        return json({ error: "the workspace list could not be read" }, 500);
      }
    },
  };
}
