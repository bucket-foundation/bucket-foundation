import type { BronzeRecord } from "../../../../src/lib/research-os/medallion/bronze";
import type { EvolutionRecord, EvolutionSource, EvolutionSubject } from "../../../../src/lib/evolution/importer";
import { parseYear } from "../../../../src/lib/history/span";

export interface FixtureRow {
  id: string;
  subject: EvolutionSubject;
  role: string;
  year: number;
  measure?: { metric: string; value: number; unit: string; threshold?: number };
}

export function fixtureText(rows: FixtureRow[], salt: string): string {
  return rows.map((r) => JSON.stringify({ id: r.id, salt, year: r.year })).join("\n") + "\n";
}

export function fixtureRecords(rows: FixtureRow[]) {
  return (b: BronzeRecord, source: EvolutionSource): EvolutionRecord[] => {
    const bytes = Buffer.from(b.text, "utf8");
    return rows.map((r) => {
      const line = bytes.indexOf(`{"id":${JSON.stringify(r.id)},`);
      const key = Buffer.from('"year":');
      const at = bytes.indexOf(key, line) + key.length;
      const end = at + String(r.year).length;
      const parsed = parseYear(r.year, "historical");
      if (!parsed.ok) throw new Error(`fixture year ${r.year}`);
      return {
        repoPath: source.repoPath,
        record: r.id,
        field: "year",
        span: { start: at, end },
        subject: r.subject,
        roles: { [r.role]: { ...parsed.span, ...(r.measure ? { measure: r.measure } : {}) } },
      };
    });
  };
}
