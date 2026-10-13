import { assembleRowSet, type AssembleContext, type PackedRows, type RowDraft, type RowGroup } from "./contract";
import type { TableReader } from "./index";
import { publicSource } from "./licences";

export const MAJOR_TO_CAREER_ID = "major-to-career";
const LABEL = "Major to career";
const TABLE = "cip_soc_crosswalk";

const SIDES: RowGroup[] = [
  { id: "cip", label: "Majors, CIP 2020 series", color: "#8a5a2b" },
  { id: "soc", label: "Careers, SOC 2018 major groups", color: "#2f6f8f" },
];

interface Side {
  title: string;
  source: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");

export async function majorToCareer(tables: TableReader, ctx: AssembleContext): Promise<PackedRows[]> {
  const series = new Map<string, Side>();
  const majors = new Map<string, Side>();
  for await (const row of tables.rows("backbone_codes")) {
    const source = publicSource("backbone_codes", row, ctx.registry);
    const code = text(row.code);
    const title = text(row.title);
    if (!source || !title) continue;
    if (row.scheme === "cip2020" && row.grain === 2 && /^\d{2}$/.test(code)) series.set(code, { title, source });
    if (row.scheme === "soc2018" && row.grain === "major" && /^\d{2}-0000$/.test(code)) majors.set(code.slice(0, 2), { title, source });
  }
  const pairs = new Map<string, Map<string, number>>();
  const touched = new Map<string, number>();
  for await (const row of tables.rows(TABLE)) {
    if (!publicSource(TABLE, row, ctx.registry)) continue;
    const cip = text(row.cip).slice(0, 2);
    const soc = text(row.soc).slice(0, 2);
    if (!series.has(cip) || !majors.has(soc)) continue;
    const to = pairs.get(cip) ?? new Map<string, number>();
    to.set(soc, (to.get(soc) ?? 0) + 1);
    pairs.set(cip, to);
    touched.set(`cip-${cip}`, (touched.get(`cip-${cip}`) ?? 0) + 1);
    touched.set(`soc-${soc}`, (touched.get(`soc-${soc}`) ?? 0) + 1);
  }
  const careers = new Set([...pairs.values()].flatMap((to) => [...to.keys()]));
  const rows: RowDraft[] = [
    ...[...pairs.keys()].sort().map((cip): RowDraft => {
      const side = series.get(cip) as Side;
      const links = [...(pairs.get(cip) as Map<string, number>).entries()].sort(([a], [b]) => a.localeCompare(b)).map(([soc, weight]) => ({ to: `soc-${soc}`, weight }));
      return { key: `cip-${cip}`, title: side.title, sub: `CIP ${cip}`, group: "cip", source: side.source, links, weight: touched.get(`cip-${cip}`) ?? 0 };
    }),
    ...[...careers].sort().map((soc): RowDraft => {
      const side = majors.get(soc) as Side;
      return { key: `soc-${soc}`, title: side.title, sub: `SOC ${soc}`, group: "soc", source: side.source, links: [], weight: touched.get(`soc-${soc}`) ?? 0 };
    }),
  ];
  return assembleRowSet([{ id: MAJOR_TO_CAREER_ID, label: LABEL, audience: "public", modes: ["graph"], groups: SIDES, rows, layout: "flow" }], ctx);
}
