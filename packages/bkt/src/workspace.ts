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

export interface RowSetInfo {
  id: string;
  label: string;
  licence: string;
  modes: string[];
}

export const GRAPH_MODES = ["graph"] as const;
export const MAP_MODES = ["timeline", "map", "earth", "globe"] as const;

export interface WorkspaceSources {
  research: Pick<Research, "list" | "detail">;
  changedPaths: (slug: string) => string[];
  datasets: () => DatasetInfo[];
  rowSets: () => RowSetInfo[];
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
  const rowSets = new Set(src.rowSets().map((s) => s.id));
  return src
    .datasets()
    .filter((info) => DATASET.test(info.id))
    .map((info) => {
      const kind = rowSets.has(info.id) ? ("rowset" as const) : ("dataset" as const);
      return { type: "records" as const, key: `${kind}:${info.id}:all`, title: info.name, from: { kind, id: info.id, title: info.name }, origin: info.id === "yours" ? ("local" as const) : ("shipped" as const), licence: terms(info), changed: false, opens: "#/data", explore: null };
    });
}

const stem = (path: string) => path.split("/").pop()!.replace(/\.[a-z0-9]+$/i, "");

function figuresAndPapers(src: WorkspaceSources, type: "figures" | "papers"): WorkspaceItem[] {
  const items: WorkspaceItem[] = [];
  for (const row of src.research.list()) {
    if (row.unreadable !== null) continue;
    const detail = src.research.detail(row.slug);
    const m = detail.manifest;
    const changed = row.changed > 0 ? src.changedPaths(row.slug) : [];
    const from = { kind: "output" as const, id: row.slug, title: row.title };
    if (type === "papers") {
      if (!detail.files.some((f) => f.role === "pdf" || f.role === "public-pdf") && !m.source_path.endsWith(".tex")) continue;
      const sources = [m.source_path, ...(m.paper?.includes ?? []), ...(m.paper?.bib ?? []), ...(m.paper?.style ?? [])];
      items.push({ type, key: `output:${row.slug}:paper`, title: row.title, from, origin: row.origin, licence: m.licence ?? "", changed: changed.some((p) => sources.includes(p)), opens: `#/research/${row.slug}/paper`, explore: null });
      continue;
    }
    const figure = (id: string, caption: string, licence: string, source: string | undefined) => {
      if (ITEM.test(id)) items.push({ type, key: `output:${row.slug}:${id}`, title: caption, from, origin: row.origin, licence, changed: source !== undefined && changed.includes(source), opens: `#/research/${row.slug}/figures/${id}`, explore: null });
    };
    if (m.assets) for (const a of m.assets) figure(a.id, a.caption, a.licence, a.source);
    else {
      const copies = new Set(detail.files.filter((f) => f.role === "figure").map((f) => stem(f.path)));
      (m.figures ?? []).forEach((f, i) => copies.has(stem(f.path)) && figure(`figure-${i + 1}`, f.caption, f.licence, undefined));
    }
  }
  return items;
}

function fromRowSets(src: WorkspaceSources, type: "graphs" | "maps"): WorkspaceItem[] {
  const wanted: readonly string[] = type === "graphs" ? GRAPH_MODES : MAP_MODES;
  const items: WorkspaceItem[] = [];
  for (const set of src.rowSets()) {
    const modes = wanted.filter((m) => set.modes.includes(m));
    if (!DATASET.test(set.id) || modes.length === 0) continue;
    items.push({ type, key: `rowset:${set.id}:all`, title: set.label, from: { kind: "rowset", id: set.id, title: set.label }, origin: "shipped", licence: set.licence, changed: false, opens: `#/workspace/${type}/${set.id}`, explore: { data: set.id, modes } });
  }
  return items;
}

export function workspaceItems(src: WorkspaceSources, type: WorkspaceType): WorkspaceItem[] {
  if (type === "graphs" || type === "maps") return fromRowSets(src, type);
  if (type === "figures" || type === "papers") return figuresAndPapers(src, type);
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
