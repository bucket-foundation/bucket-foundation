export type DatasetGroup = "bundled" | "local" | "genome" | "upload" | "drive";

export interface DatasetEntry {
  id: string;
  label: string;
  group: DatasetGroup;
}

export const SAMPLE_DATASET = "sample";

export const BUNDLED_DATASETS: DatasetEntry[] = [
  { id: "canon", label: "canon", group: "bundled" },
  { id: SAMPLE_DATASET, label: "sample advisors", group: "bundled" },
];

export const DEFAULT_DATASET = "canon";
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function validDatasetId(id: string | null | undefined): id is string {
  return typeof id === "string" && ID_PATTERN.test(id);
}

export function listDatasets(remote: { id: string; label?: string }[], extra: DatasetEntry[] = [], samples = true): DatasetEntry[] {
  const seen = new Set<string>();
  const out: DatasetEntry[] = [];
  const add = (e: DatasetEntry) => {
    if (seen.has(e.id) || !validDatasetId(e.id)) return;
    seen.add(e.id);
    out.push(e);
  };
  BUNDLED_DATASETS.filter((e) => samples || e.id !== SAMPLE_DATASET).forEach(add);
  remote.forEach((r) => add({ id: r.id, label: r.label ?? r.id, group: "local" }));
  extra.forEach(add);
  return out;
}

export function dataParam(raw: string | null, entries: DatasetEntry[]): string {
  const id = raw?.trim() ?? "";
  return validDatasetId(id) && entries.some((e) => e.id === id) ? id : DEFAULT_DATASET;
}

export function isRemote(id: string, entries: DatasetEntry[]): boolean {
  const e = entries.find((x) => x.id === id);
  return !!e && e.group === "local";
}
