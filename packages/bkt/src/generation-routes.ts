import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GenerateError, loadRegistry, pastRuns, type Registry } from "./generate";
import type { Route } from "./serve";
import type { WorkspaceItem } from "./workspace";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const NAME = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RUN = /^\d{8}T\d{6}-[0-9a-f]{8}$/;
const FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const IMAGE: Record<string, string> = { png: "image/png", svg: "image/svg+xml" };
const MAX_BYTES = 8 * 1024 * 1024;

export interface GenerationRow {
  name: string;
  about: string;
  inputs: string[];
  command: string;
  last: { run: string; created: string; folder: string; outputs: string[] } | null;
}

export interface GenerationSource {
  home: string;
  repo: string | null;
}

function registry(src: GenerationSource): Registry | null {
  if (src.repo === null) return null;
  try {
    return loadRegistry(src.repo);
  } catch (e) {
    if (e instanceof GenerateError) return null;
    throw e;
  }
}

const imageType = (file: string) => IMAGE[file.split(".").pop()!.toLowerCase()];

function latest(src: GenerationSource) {
  const out = new Map<string, ReturnType<typeof pastRuns>[number]>();
  for (const r of pastRuns(src.home)) if (NAME.test(r.name)) out.set(r.name, r);
  return out;
}

const runOf = (folder: string) => folder.split(/[\\/]/).pop()!;

export function generationRows(src: GenerationSource): GenerationRow[] {
  const reg = registry(src);
  const last = latest(src);
  const names = new Set([...(reg?.generations.map((g) => g.name) ?? []), ...last.keys()]);
  return [...names].sort().map((name) => {
    const g = reg?.generations.find((x) => x.name === name);
    const r = last.get(name);
    const inputs = Object.keys(g?.inputs ?? {});
    return {
      name,
      about: g?.about ?? "",
      inputs,
      command: `bkt generate ${name}${inputs.map((k) => ` --${k} ...`).join("")}`,
      last: r ? { run: runOf(r.folder), created: r.record.created, folder: r.folder, outputs: r.record.outputs } : null,
    };
  });
}

export function generatedFigures(src: GenerationSource): WorkspaceItem[] {
  const items: WorkspaceItem[] = [];
  for (const row of generationRows(src)) {
    if (!row.last || !RUN.test(row.last.run)) continue;
    const label = Object.values(pastParams(src, row.name, row.last.run)).join(", ");
    for (const file of row.last.outputs) {
      if (!FILE.test(file) || !imageType(file)) continue;
      items.push({ type: "figures", key: `generated:${row.name}:${row.last.run}:${file}`, title: label ? `${file}, ${label}` : file, from: { kind: "generation", id: row.name, title: row.about || row.name }, origin: "local", licence: "", changed: false, opens: "#/workspace/figures", explore: null });
    }
  }
  return items;
}

function pastParams(src: GenerationSource, name: string, run: string): Record<string, string> {
  return pastRuns(src.home, name).find((r) => runOf(r.folder) === run)?.record.params ?? {};
}

export function generationRoutes(src: GenerationSource, onError: (e: Error) => void = () => {}): Record<string, Route> {
  return {
    "GET /local/generations": () => {
      try {
        return json({ generations: generationRows(src), repo: src.repo !== null });
      } catch (e) {
        onError(e as Error);
        return json({ error: "the list of renders could not be read" }, 500);
      }
    },
    "GET /local/generations/file": (_req, url) => {
      const name = url.searchParams.get("name") ?? "";
      const run = url.searchParams.get("run") ?? "";
      const file = url.searchParams.get("file") ?? "";
      const type = imageType(file);
      if (!NAME.test(name) || !RUN.test(run) || !FILE.test(file) || !type) return json({ error: "that render file is refused" }, 400);
      const record = pastRuns(src.home, name).find((r) => runOf(r.folder) === run);
      if (!record || !record.record.outputs.includes(file)) return json({ error: "no such render" }, 404);
      const path = join(record.folder, file);
      if (!existsSync(path)) return json({ error: "no such render" }, 404);
      const st = lstatSync(path);
      if (!st.isFile()) return json({ error: "that render file is refused" }, 400);
      if (st.size > MAX_BYTES) return json({ error: "that render is over 8 MB" }, 413);
      return new Response(new Blob([readFileSync(path)]), { headers: { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" } });
    },
  };
}
