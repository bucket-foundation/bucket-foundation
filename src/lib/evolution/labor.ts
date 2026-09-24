import type { BronzeRecord } from "../research-os/medallion/bronze";
import { sha256Hex } from "../research-os/evidence/text";
import { parseYear } from "../history/span";
import type { EdgeCandidateRecord, EvolutionRecord, EvolutionSource, SeriesRecord } from "./importer";

export const LABOR_PLAN_COUNTS = { occupations: 1016, tasks: 19281, tech_skills: 32435 } as const;

export const LABOR_TABLES = ["occupations", "tasks", "tech_skills", "eloundou"] as const;
export type LaborTable = (typeof LABOR_TABLES)[number];

export const LABOR_RULES: Record<LaborTable, string> = {
  occupations: "onet-cc-by",
  tasks: "onet-cc-by",
  tech_skills: "onet-cc-by",
  eloundou: "eloundou-mit",
};

export const LABOR_PRIORS: Record<LaborTable, number> = { occupations: 0.9, tasks: 0.9, tech_skills: 0.9, eloundou: 0.8 };

export const UPSTREAM_TABLES: Record<LaborTable, { source: string; table: string }> = {
  occupations: { source: "onet", table: "occupations" },
  tasks: { source: "onet", table: "tasks" },
  tech_skills: { source: "onet", table: "technology_skills" },
  eloundou: { source: "eloundou", table: "task_labels" },
};

export const ELOUNDOU_BETA = {
  basis: "Eloundou, Manning, Mishkin and Rock 2023, GPTs are GPTs, measure beta = E1 + 0.5 x E2",
  url: "https://arxiv.org/abs/2303.10130",
  weights: { E0: 0, E1: 1, E2: 0.5 },
} as const;

export const LLM_TECHNOLOGY_SLUG = "technology-large-language-models";

export interface LaborUpstream {
  source: string;
  revision: string;
  license_rule: string;
  url: string;
  manifest_sha256: string;
  table: string;
  table_sha256: string;
  rows: number;
}

export interface LaborManifestFile {
  path: string;
  rows: number;
  sha256: string;
  upstream: LaborUpstream;
}

export interface LaborManifest {
  contract: "evolution-labor/1";
  onet_release: string;
  eloundou_year: number;
  files: Partial<Record<LaborTable, LaborManifestFile>>;
}

export interface OccupationRow {
  onetsoc_code: string;
  title: string;
}
export interface TaskRow {
  task_id: number;
  onetsoc_code: string;
  task: string;
}
export interface TechSkillRow {
  onetsoc_code: string;
  example: string;
  commodity_code: number;
}
export interface EloundouRow {
  task_id: number;
  onetsoc_code: string;
  gpt4_exposure: "E0" | "E1" | "E2";
}

const ONETSOC = /^[0-9]{2}-[0-9]{4}\.[0-9]{2}$/;

export function occupationSlug(code: string): string {
  if (!ONETSOC.test(code)) throw new Error(`not an O*NET-SOC code: ${code}`);
  return `occupation-onet-${code.replace(/[.]/g, "-")}`;
}

export function taskSlug(taskId: number): string {
  if (!Number.isInteger(taskId) || taskId <= 0 || taskId > 999999) throw new Error(`not an O*NET task id: ${taskId}`);
  return `task-onet-${taskId}`;
}

export function toolSlug(example: string): string {
  const s = example
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  if (!s) throw new Error(`tool ${example} has no slug`);
  return `software-onet-${s}`;
}

export interface JsonlLine<T> {
  row: T;
  start: number;
  bytes: Buffer;
}

export function jsonlLines<T>(b: BronzeRecord): JsonlLine<T>[] {
  const all = Buffer.from(b.text, "utf8");
  const out: JsonlLine<T>[] = [];
  let at = 0;
  while (at < all.length) {
    const nl = all.indexOf(0x0a, at);
    const end = nl < 0 ? all.length : nl;
    const bytes = all.subarray(at, end);
    if (bytes.toString("utf8").trim()) out.push({ row: JSON.parse(bytes.toString("utf8")) as T, start: at, bytes });
    at = end + 1;
  }
  return out;
}

export function fieldSpan(line: JsonlLine<unknown>, key: string): { start: number; end: number } {
  const k = Buffer.from(`${JSON.stringify(key)}:`, "utf8");
  const at = line.bytes.indexOf(k);
  if (at < 0) throw new Error(`no ${key} in line at ${line.start}`);
  let start = at + k.length;
  while (line.bytes[start] === 0x20) start++;
  let end = start;
  if (line.bytes[start] === 0x22) {
    start += 1;
    end = start;
    while (end < line.bytes.length && line.bytes[end] !== 0x22) end += line.bytes[end] === 0x5c ? 2 : 1;
  } else {
    while (end < line.bytes.length && ![0x2c, 0x7d, 0x20].includes(line.bytes[end])) end++;
  }
  if (end <= start) throw new Error(`empty ${key} in line at ${line.start}`);
  return { start: line.start + start, end: line.start + end };
}

export type ManifestCheck = { ok: true } | { ok: false; problems: string[] };

export function checkManifest(manifest: LaborManifest, files: Map<string, Uint8Array>, requirePlanCounts: boolean): ManifestCheck {
  const problems: string[] = [];
  if (manifest.contract !== "evolution-labor/1") problems.push(`contract ${String(manifest.contract)}`);
  for (const table of LABOR_TABLES) {
    const f = manifest.files[table];
    if (!f) continue;
    const bytes = files.get(f.path);
    if (!bytes) {
      problems.push(`${table}: ${f.path} is missing`);
      continue;
    }
    if (sha256Hex(bytes) !== f.sha256) problems.push(`${table}: sha256 differs from the manifest`);
    const up = f.upstream;
    const want = UPSTREAM_TABLES[table];
    if (!up) problems.push(`${table}: no upstream manifest record`);
    else {
      if (up.source !== want.source || up.table !== want.table) problems.push(`${table}: upstream ${up.source}.${up.table}, expected ${want.source}.${want.table}`);
      if (up.license_rule !== LABOR_RULES[table]) problems.push(`${table}: upstream license rule ${up.license_rule}, expected ${LABOR_RULES[table]}`);
      if (up.rows !== f.rows) problems.push(`${table}: upstream has ${up.rows} rows, the export ${f.rows}`);
      if (!/^[0-9a-f]{64}$/.test(up.table_sha256 ?? "") || !/^[0-9a-f]{64}$/.test(up.manifest_sha256 ?? "")) problems.push(`${table}: upstream checksums are missing`);
    }
    const rows = Buffer.from(bytes).toString("utf8").split("\n").filter((l) => l.trim()).length;
    if (rows !== f.rows) problems.push(`${table}: ${rows} rows, manifest says ${f.rows}`);
  }
  if (requirePlanCounts) {
    for (const [table, n] of Object.entries(LABOR_PLAN_COUNTS) as [keyof typeof LABOR_PLAN_COUNTS, number][]) {
      const got = manifest.files[table]?.rows;
      if (got !== n) problems.push(`${table}: ${got ?? "no file"}, the plan counts ${n}`);
    }
  }
  return problems.length ? { ok: false, problems } : { ok: true };
}

export function laborSources(manifest: LaborManifest): (EvolutionSource & { table: LaborTable })[] {
  return LABOR_TABLES.filter((t) => manifest.files[t]).map((t) => ({ table: t, repoPath: manifest.files[t]!.path, rule: LABOR_RULES[t], prior: LABOR_PRIORS[t] }));
}

function tableOf(manifest: LaborManifest, repoPath: string): LaborTable {
  const t = LABOR_TABLES.find((x) => manifest.files[x]?.path === repoPath);
  if (!t) throw new Error(`${repoPath} is not in the labor manifest`);
  return t;
}

export function laborRecords(manifest: LaborManifest) {
  return (b: BronzeRecord, source: EvolutionSource): EvolutionRecord[] => {
    const table = tableOf(manifest, source.repoPath);
    const out: EvolutionRecord[] = [];
    if (table === "occupations") {
      for (const line of jsonlLines<OccupationRow>(b)) {
        const slug = occupationSlug(line.row.onetsoc_code);
        out.push({
          repoPath: source.repoPath,
          record: line.row.onetsoc_code,
          field: "onetsoc_code",
          span: fieldSpan(line, "onetsoc_code"),
          subject: {
            kind: "node",
            slug,
            nodeKind: "occupation",
            draft: { slug, title: line.row.title, kind: "occupation", tier: 13, branch: "11-work", summary: null, labels: { en: { title: line.row.title } }, provenance: { type: "onet_occupation", level: "onet", onetsoc_code: line.row.onetsoc_code, release: manifest.onet_release } },
          },
          roles: {},
        });
      }
    }
    if (table === "tasks") {
      for (const line of jsonlLines<TaskRow>(b)) {
        const slug = taskSlug(line.row.task_id);
        const title = line.row.task.length > 200 ? `${line.row.task.slice(0, 197)}...` : line.row.task;
        out.push({
          repoPath: source.repoPath,
          record: String(line.row.task_id),
          field: "task_id",
          span: fieldSpan(line, "task_id"),
          subject: {
            kind: "node",
            slug,
            nodeKind: "task",
            draft: { slug, title, kind: "task", tier: 13, branch: "11-work", summary: line.row.task, labels: { en: { title } }, provenance: { type: "onet_task", level: "onet_task", task_id: line.row.task_id, release: manifest.onet_release } },
          },
          roles: {},
        });
      }
    }
    if (table === "tech_skills") {
      const seen = new Set<string>();
      for (const line of jsonlLines<TechSkillRow>(b)) {
        const slug = toolSlug(line.row.example);
        if (seen.has(slug)) continue;
        seen.add(slug);
        out.push({
          repoPath: source.repoPath,
          record: slug,
          field: "example",
          span: fieldSpan(line, "example"),
          subject: {
            kind: "node",
            slug,
            nodeKind: "software",
            draft: { slug, title: line.row.example, kind: "software", tier: 13, branch: "04-information", summary: null, labels: { en: { title: line.row.example } }, provenance: { type: "onet_tech_skill", level: "application", commodity_code: line.row.commodity_code, release: manifest.onet_release } },
          },
          roles: {},
        });
      }
    }
    if (table === "eloundou") {
      const year = parseYear(manifest.eloundou_year, "historical");
      if (!year.ok) throw new Error(`bad Eloundou year ${manifest.eloundou_year}`);
      const lines = jsonlLines<EloundouRow>(b);
      if (lines.length) {
        out.push({
          repoPath: source.repoPath,
          record: LLM_TECHNOLOGY_SLUG,
          field: "gpt4_exposure",
          span: fieldSpan(lines[0], "gpt4_exposure"),
          subject: {
            kind: "node",
            slug: LLM_TECHNOLOGY_SLUG,
            nodeKind: "technology",
            draft: { slug: LLM_TECHNOLOGY_SLUG, title: "Large language models", kind: "technology", tier: 13, branch: "04-information", summary: "The GPT-4 class of models whose task exposure Eloundou et al. rate.", labels: { en: { title: "Large language models" } }, provenance: { type: "eloundou", level: "class" } },
          },
          roles: {},
        });
      }
      for (const line of lines) {
        const value = ELOUNDOU_BETA.weights[line.row.gpt4_exposure];
        if (value === undefined) throw new Error(`Eloundou task ${line.row.task_id} has exposure ${line.row.gpt4_exposure}`);
        out.push({
          repoPath: source.repoPath,
          record: `${line.row.task_id}`,
          field: "gpt4_exposure",
          span: fieldSpan(line, "gpt4_exposure"),
          subject: { kind: "edge", fromSlug: LLM_TECHNOLOGY_SLUG, toSlug: taskSlug(line.row.task_id), edgeKind: "automates" },
          roles: { measured: { ...year.span, measure: { metric: "gpt4_exposure_beta", value, unit: "beta" } } },
        });
      }
    }
    return out;
  };
}

export function laborEdges(manifest: LaborManifest) {
  return (b: BronzeRecord, source: EvolutionSource): EdgeCandidateRecord[] => {
    const table = tableOf(manifest, source.repoPath);
    const out: EdgeCandidateRecord[] = [];
    if (table === "tasks") {
      for (const line of jsonlLines<TaskRow>(b)) {
        out.push({ repoPath: source.repoPath, record: `${line.row.onetsoc_code}>${line.row.task_id}`, field: "onetsoc_code", span: fieldSpan(line, "onetsoc_code"), fromSlug: occupationSlug(line.row.onetsoc_code), toSlug: taskSlug(line.row.task_id), edgeKind: "performs" });
      }
    }
    if (table === "tech_skills") {
      const seen = new Set<string>();
      for (const line of jsonlLines<TechSkillRow>(b)) {
        const key = `${line.row.onetsoc_code}>${toolSlug(line.row.example)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ repoPath: source.repoPath, record: key, field: "onetsoc_code", span: fieldSpan(line, "onetsoc_code"), fromSlug: occupationSlug(line.row.onetsoc_code), toSlug: toolSlug(line.row.example), edgeKind: "uses" });
      }
    }
    if (table === "eloundou") {
      const seen = new Set<number>();
      for (const line of jsonlLines<EloundouRow>(b)) {
        if (seen.has(line.row.task_id)) continue;
        seen.add(line.row.task_id);
        out.push({ repoPath: source.repoPath, record: `llm>${line.row.task_id}`, field: "task_id", span: fieldSpan(line, "task_id"), fromSlug: LLM_TECHNOLOGY_SLUG, toSlug: taskSlug(line.row.task_id), edgeKind: "automates" });
      }
    }
    return out;
  };
}
