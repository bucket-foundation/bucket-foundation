import { assembleRowSet, type AssembleContext, type PackedRows, type RowDraft, type RowGroup } from "./contract";
import type { TableReader } from "./index";
import { publicSource } from "./licences";

export const MATHEMATICS_CHAIN_ID = "mathematics-chain";
export const MATHEMATICS_FRAMEWORK = "school-fw-ccss-math";
const LABEL = "School mathematics chain";
const TABLE = "progression";

const LEVELS: RowGroup[] = [
  { id: "early", label: "Kindergarten", color: "#3f8f6b" },
  { id: "primary", label: "Grades 1 to 5", color: "#2f6f8f" },
  { id: "lower-secondary", label: "Grades 6 to 8", color: "#8a5a2b" },
  { id: "upper-secondary", label: "High school", color: "#8f3f3f" },
];

interface Standard {
  id: string;
  title: string;
  grade: string;
  level: string;
  url: string | null;
  source: string;
  stated: boolean;
  verified: boolean;
  needs: string[];
  domain: string | null;
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const ID = /^school-ccss-math-[a-z0-9-]+$/;
const HOSTS = ["https://raw.githubusercontent.com/achievethecore/atc-coherence-map/", "https://www.thecorestandards.org/"];
const PARENT = /^(?:Part|Cluster) of (school-ccss-math-[a-z0-9-]+)\./;

function draft(s: Standard, held: Set<string>): RowDraft {
  return {
    key: s.id, title: s.title, sub: s.grade, group: s.level, source: s.source, url: s.url, verified: s.verified,
    links: [...new Set(s.needs)].filter((to) => held.has(to) && to !== s.id).map((to) => ({ to, stated: s.stated })),
  };
}

export async function mathematicsChain(tables: TableReader, ctx: AssembleContext): Promise<PackedRows[]> {
  const standards: Standard[] = [];
  for await (const row of tables.rows(TABLE)) {
    if (row.framework_id !== MATHEMATICS_FRAMEWORK) continue;
    const source = publicSource(TABLE, row, ctx.registry);
    const level = text(row.level);
    const notes = text(row.notes);
    const domain = notes.startsWith("Domain node.") ? null : PARENT.exec(notes)?.[1];
    if (!source || !ID.test(text(row.id)) || !text(row.topic) || domain === undefined || !LEVELS.some((l) => l.id === level)) continue;
    if (!HOSTS.some((h) => text(row.source_url).startsWith(h)) || !text(row.standard_url).startsWith(HOSTS[1])) continue;
    standards.push({
      id: text(row.id), title: text(row.topic), grade: text(row.typical_age_or_year), level, url: text(row.standard_url), source,
      stated: row.edges_stated === true, verified: row.verified === true,
      needs: Array.isArray(row.prerequisites) ? row.prerequisites.filter((p): p is string => typeof p === "string") : [],
      domain,
    });
  }
  const byId = new Map(standards.map((s) => [s.id, s]));
  const domainOf = (s: Standard): string | null => {
    let at: Standard | undefined = s;
    for (let hop = 0; at && at.domain && hop < 4; hop++) at = byId.get(at.domain);
    return at && at.domain === null && at.id !== s.id ? at.id : null;
  };
  const domains = standards.filter((s) => s.domain === null);
  const inside = new Map<string, Standard[]>(domains.map((d) => [d.id, []]));
  for (const s of standards) {
    const top = s.domain === null ? null : domainOf(s);
    if (top) inside.get(top)?.push(s);
  }
  const opened = domains.filter((d) => (inside.get(d.id) ?? []).length > 0);
  const drill = { param: "group" as const, values: opened.map((d) => d.id) };
  const shared = { id: MATHEMATICS_CHAIN_ID, label: LABEL, audience: "public" as const, modes: ["graph"], groups: LEVELS, drill };
  const chain = new Set(opened.map((d) => d.id));
  const pages = opened.map((d) => {
    const members = inside.get(d.id) as Standard[];
    const held = new Set(members.map((m) => m.id));
    return { ...shared, rows: members.map((m) => draft(m, held)) };
  });
  return assembleRowSet([{ ...shared, rows: opened.map((d) => draft(d, chain)) }, ...pages], ctx);
}
