export const PATHS = ["browser", "runner", "import", "link"] as const;
export type AtlasPath = (typeof PATHS)[number];

export const PATH_HINT: Record<AtlasPath, string> = {
  browser: "runs in the page",
  runner: "runs on a registered machine",
  import: "Research OS reads its files",
  link: "a citation and a link out",
};

export type Segment = { t: "text"; v: string } | { t: "code"; v: string } | { t: "link"; v: string; href: string };

export interface AtlasSource {
  n: number;
  title: string;
  url: string | null;
}

export interface AtlasTool {
  name: string;
  field: string;
  open: boolean;
  license: Segment[];
  renders: Segment[];
  formats: Segment[];
  first: AtlasPath;
  fallback: AtlasPath | null;
  connects: Segment[];
  shows: Segment[];
  sources: AtlasSource[];
}

export interface AtlasViewer {
  name: string;
  license: Segment[];
  reads: Segment[];
  latest: Segment[];
  maintained: Segment[];
  serves: Segment[];
}

export interface SuiteTool {
  name: string;
  group: string;
  does: Segment[];
  runs: Segment[];
  pyodide: string;
  inBrowser: boolean;
  atlasRows: string;
}

export interface SoftwareAtlasData {
  memo: string;
  fields: { name: string; intro: string }[];
  tools: AtlasTool[];
  viewers: AtlasViewer[];
  suite: SuiteTool[];
  directions: { n: number; title: string; body: Segment[] }[];
  unverified: Segment[][];
}

export interface ToolFilter {
  q: string;
  field: string | null;
  license: "any" | "open" | "closed";
  path: AtlasPath | null;
}

export const NO_FILTER: ToolFilter = { q: "", field: null, license: "any", path: null };

function segText(segs: Segment[]): string {
  return segs.map((s) => s.v).join("");
}

export function filterTools(tools: AtlasTool[], f: ToolFilter): AtlasTool[] {
  const q = f.q.trim().toLowerCase();
  return tools.filter((t) => {
    if (f.field && t.field !== f.field) return false;
    if (f.license === "open" && !t.open) return false;
    if (f.license === "closed" && t.open) return false;
    if (f.path && t.first !== f.path && t.fallback !== f.path) return false;
    if (!q) return true;
    const hay = [t.name, t.field, segText(t.formats), segText(t.renders), segText(t.license)].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function firstPathCounts(tools: AtlasTool[]): Record<AtlasPath, number> {
  const out: Record<AtlasPath, number> = { browser: 0, runner: 0, import: 0, link: 0 };
  for (const t of tools) out[t.first] += 1;
  return out;
}

export const MEMO_URL = "https://github.com/bucket-foundation/bucket-foundation/blob/dev/learning/research-os/SOFTWARE-ATLAS.md";
