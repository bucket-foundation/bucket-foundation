// canon-bridges.ts — server-only filesystem scanner for bucket-canon/_bridges/
import fs from "fs";
import path from "path";

export type BridgeEntry = {
  slug: string;
  title: string;
  tier: "primary axis" | "secondary";
  mass: number;
  spans: number;
  branches: { branch: string; description: string }[];
  sources: string[];
  notes: string[];
  body: string;
};

const REPO_ROOT = path.resolve(process.cwd());
const BRIDGES_ROOT = path.join(REPO_ROOT, "bucket-canon", "_bridges");

function parseBridge(file: string, slug: string): BridgeEntry | null {
  let raw: string;
  try { raw = fs.readFileSync(file, "utf-8"); } catch { return null; }
  const lines = raw.split("\n");

  const title = (lines.find((l) => l.startsWith("# "))?.replace(/^#\s+/, "") || slug).trim();
  const get = (key: string) => {
    const re = new RegExp(`^- \\*\\*${key}\\*\\*:\\s*(.+?)$`, "m");
    return raw.match(re)?.[1]?.trim() || "";
  };
  const tier = (get("Tier") as BridgeEntry["tier"]) || "secondary";
  const mass = parseInt((get("FTS mass") || "0").replace(/[^\d]/g, ""), 10) || 0;
  const spans = parseInt((get("Spans") || "0").match(/\d+/)?.[0] || "0", 10);

  // Branches it touches: bullet list under "## Branches it touches"
  const branchSect = raw.split("## Branches it touches")[1]?.split("\n## ")[0] || "";
  const branches: { branch: string; description: string }[] = [];
  for (const line of branchSect.split("\n")) {
    const m = line.match(/^- \*\*([^*]+)\*\* — (.+)$/);
    if (m) branches.push({ branch: m[1].trim(), description: m[2].trim() });
  }
  const sourcesSect = raw.split("## Primary sources")[1]?.split("\n## ")[0] || "";
  const sources = sourcesSect
    .split("\n")
    .filter((l) => l.startsWith("- "))
    .map((l) => l.replace(/^-\s*/, "").trim());
  const notesSect = raw.split("## Notes / open questions")[1]?.split("\n## ")[0] || "";
  const notes = notesSect.split("\n").filter((l) => l.trim()).map((l) => l.trim());
  return { slug, title, tier, mass, spans, branches, sources, notes, body: raw };
}

export function getAllBridges(): BridgeEntry[] {
  if (!fs.existsSync(BRIDGES_ROOT)) return [];
  const out: BridgeEntry[] = [];
  for (const file of fs.readdirSync(BRIDGES_ROOT)) {
    if (!file.endsWith(".md") || file === "INDEX.md") continue;
    const slug = file.replace(/\.md$/, "");
    const b = parseBridge(path.join(BRIDGES_ROOT, file), slug);
    if (b) out.push(b);
  }
  out.sort((a, b) => b.mass - a.mass);
  return out;
}

export function getBridge(slug: string): BridgeEntry | null {
  const file = path.join(BRIDGES_ROOT, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return parseBridge(file, slug);
}
