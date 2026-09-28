export type ShortlistRow = {
  decision: string;
  rank: number;
  name: string;
  institution: string;
  country: string;
  field: string;
  score: number;
  percentile: number;
  links: Record<string, string>;
  shared: string[];
};

const FORMULA = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let s = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  if (FORMULA.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

export const SHORTLIST_COLUMNS = ["decision", "rank", "name", "institution", "country", "field", "score", "percentile", "profile", "orcid", "shared_topics"] as const;

export function shortlistCsv(rows: ShortlistRow[]): string {
  const lines = [SHORTLIST_COLUMNS.join(",")];
  for (const r of rows) {
    lines.push(
      [r.decision, r.rank, r.name, r.institution, r.country, r.field, r.score, r.percentile, r.links.openalex ?? "", r.links.orcid ?? "", r.shared]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n") + "\n";
}
