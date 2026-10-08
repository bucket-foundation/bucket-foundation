import fs from "fs";
import path from "path";

export type ReportRecord = {
  slug: string;
  title: string;
  abstract: string;
  date: string;
  kind: string;
  status: string;
};

const ROOT = path.join(process.cwd(), "reports");

export function loadReportRecords(root: string = ROOT): ReportRecord[] {
  if (!fs.existsSync(root)) return [];
  const records: ReportRecord[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(root, entry.name, "report.json");
    if (!fs.existsSync(file)) continue;
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    records.push({
      slug: String(raw.slug),
      title: String(raw.title),
      abstract: String(raw.abstract ?? ""),
      date: String(raw.date ?? ""),
      kind: String(raw.kind ?? "report"),
      status: String(raw.status ?? "draft"),
    });
  }
  return records.sort((a, b) => a.slug.localeCompare(b.slug));
}
