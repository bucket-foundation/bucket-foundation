import type { IngestNodeDraft } from "../research-os/ingest/types";
import type { AtlasTool } from "../research-os/software-atlas";

export interface SoftwareNodeRef {
  slug: string;
  title: string;
  kind: string;
}

export interface AtlasMerge {
  matched: { tool: string; slug: string }[];
  ambiguous: { tool: string; slugs: string[] }[];
  proposals: IngestNodeDraft[];
}

export function atlasKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function atlasSlug(name: string): string {
  const s = atlasKey(name).replace(/ /g, "-").slice(0, 180);
  if (!s) throw new Error(`atlas tool ${name} has no slug`);
  return `software-atlas-${s}`;
}

export function mergeSoftwareAtlas(tools: AtlasTool[], nodes: SoftwareNodeRef[]): AtlasMerge {
  const byKey = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.kind !== "software") continue;
    const k = atlasKey(n.title);
    byKey.set(k, [...(byKey.get(k) ?? []), n.slug]);
  }
  const out: AtlasMerge = { matched: [], ambiguous: [], proposals: [] };
  const seen = new Set<string>();
  for (const t of tools) {
    const k = atlasKey(t.name);
    if (seen.has(k)) continue;
    seen.add(k);
    const hits = byKey.get(k) ?? [];
    if (hits.length === 1) {
      out.matched.push({ tool: t.name, slug: hits[0] });
      continue;
    }
    if (hits.length > 1) {
      out.ambiguous.push({ tool: t.name, slugs: [...hits].sort() });
      continue;
    }
    const slug = atlasSlug(t.name);
    out.proposals.push({
      slug,
      title: t.name,
      kind: "software",
      tier: 13,
      branch: "04-information",
      summary: null,
      labels: { en: { title: t.name } },
      provenance: { type: "software_atlas", level: "application", field: t.field, open: t.open },
    });
  }
  return out;
}
