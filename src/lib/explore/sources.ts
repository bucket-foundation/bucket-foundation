import fs from "fs";
import path from "path";
import { prepare, type Prepared, type SourceIndex } from "./source-index";

export * from "./source-index";

const FILES = ["explore-sources.json", "explore-sources.local.json"];

let prepared: Prepared[] | null = null;
let loading: Promise<Prepared[]> | null = null;

async function readIndex(dir: string): Promise<SourceIndex | null> {
  for (const f of FILES) {
    try {
      const raw = await fs.promises.readFile(path.join(dir, f), "utf8");
      const parsed = JSON.parse(raw) as SourceIndex;
      if (parsed?.v === 1 && Array.isArray(parsed.items)) return parsed;
    } catch {}
  }
  return null;
}

export function loadSourceIndex(dir = path.join(process.cwd(), "src", "data")): Promise<Prepared[]> {
  if (prepared) return Promise.resolve(prepared);
  loading ??= readIndex(dir).then((idx) => {
    prepared = idx ? prepare(idx) : [];
    return prepared;
  });
  return loading;
}

export function resetSourceIndex(): void {
  prepared = null;
  loading = null;
}
