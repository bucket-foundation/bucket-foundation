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
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");

export async function mathematicsChain(tables: TableReader, ctx: AssembleContext): Promise<PackedRows[]> {
  const standards: Standard[] = [];
  for await (const row of tables.rows(TABLE)) {
    if (row.framework_id !== MATHEMATICS_FRAMEWORK) continue;
    const source = publicSource(TABLE, row, ctx.registry);
    const level = text(row.level);
    if (!source || !text(row.id) || !text(row.topic) || !LEVELS.some((l) => l.id === level)) continue;
    standards.push({
      id: text(row.id), title: text(row.topic), grade: text(row.typical_age_or_year), level, url: text(row.standard_url) || null, source,
      stated: row.edges_stated === true, verified: row.verified === true,
      needs: Array.isArray(row.prerequisites) ? row.prerequisites.filter((p): p is string => typeof p === "string") : [],
    });
  }
  const held = new Set(standards.map((s) => s.id));
  const rows = standards.map((s): RowDraft => ({
    key: s.id, title: s.title, sub: s.grade, group: s.level, source: s.source, url: s.url, verified: s.verified,
    links: [...new Set(s.needs)].filter((to) => held.has(to) && to !== s.id).map((to) => ({ to, stated: s.stated })),
  }));
  return assembleRowSet([{ id: MATHEMATICS_CHAIN_ID, label: LABEL, audience: "public", modes: ["graph"], groups: LEVELS, rows }], ctx);
}
