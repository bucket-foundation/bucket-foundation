import type { BeadFact, NoteFact, PrFact } from "./types";

export function parseBeads(jsonl: string): BeadFact[] {
  const out: BeadFact[] = [];
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as Record<string, unknown>;
      if (typeof r.id !== "string" || typeof r.title !== "string" || typeof r.status !== "string") continue;
      out.push({
        id: r.id,
        title: r.title.slice(0, 200),
        status: r.status,
        priority: typeof r.priority === "number" ? r.priority : 2,
        createdAt: typeof r.created_at === "string" ? r.created_at.slice(0, 10) : "",
      });
    } catch {
      continue;
    }
  }
  return out;
}

export function parsePrLog(log: string): PrFact[] {
  const rows: Omit<PrFact, "order">[] = [];
  for (const line of log.split("\n")) {
    const [date, ...rest] = line.split("|");
    const subject = rest.join("|");
    const m = subject.match(/\(#(\d+)\)\s*$/);
    if (!m || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    rows.push({ number: Number(m[1]), title: subject.slice(0, 200), date });
  }
  return rows.reverse().map((r, order) => ({ ...r, order }));
}

export function parseNotes(file: string, text: string): NoteFact[] {
  const date = (file.split("/").pop() ?? "").match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
  const out: NoteFact[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m && m[1].length <= 120) out.push({ file, heading: m[1], date });
  }
  return out;
}

export function githubUrl(remote: string): string | null {
  const m = remote.trim().match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(\.git)?$/);
  return m ? `https://github.com/${m[1]}/${m[2]}` : null;
}
