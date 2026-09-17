/**
 * The research under _intake/, into the graph (IDEAL-STATE.md, "bring
 * together everything researched").
 *
 *   literature cards   _intake/research-os-k12-literature/<area>/*.md   180 papers with DOIs
 *   concept digests    _intake/concept-digests/*.md                     27 concepts with their PubMed hits
 *   concept targets    _intake/concept-*\/README.md                      queued canon targets
 *
 * Writes: one `primary_source` per literature card in branch
 * 10-literature (cites the atoms it names); one `concept` per digest in
 * 05-biophysics (derives_from the atoms it names) with up to fifteen of
 * its cited papers as `primary_source` nodes (example_of the concept); one
 * `concept` per target, flagged open_question, in its canon branch. Run
 * from the repo root; --apply writes.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { parse as parseYaml } from "yaml";
import { academyNodeSlug } from "../../../src/lib/research-os/ingest/academy";
import { slugifyPart, type IngestEdgeDraft, type IngestNodeDraft } from "../../../src/lib/research-os/ingest/types";
import { Linker } from "../../../src/lib/research-os/ingest/link";
import { loadAcademyCorpusFiles } from "./lib/load-academy-corpus";
import { applyDrafts } from "./lib/apply-drafts";

const ROOT = resolve(process.cwd());
const APPLY = process.argv.includes("--apply");
const LIT = join(ROOT, "_intake", "research-os-k12-literature");
const DIGESTS = join(ROOT, "_intake", "concept-digests");
const INTAKE = join(ROOT, "_intake");

function atoms() {
  const out: { id: string; text: string; branch: string }[] = [];
  for (const file of loadAcademyCorpusFiles(ROOT)) {
    const stem = file.sourceFile.replace(/^.*\//, "").replace(/\.json$/, "");
    const branch = (file as { branch?: string }).branch ?? stem;
    for (const a of file.atoms) {
      const x = a as { title?: string; gloss?: string; summary?: string };
      out.push({ id: academyNodeSlug(file.sourceFile, a.id), branch, text: [x.title, x.gloss, x.summary].filter(Boolean).join(". ") });
    }
  }
  return out;
}

function frontMatter(md: string): Record<string, unknown> | null {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  try {
    return parseYaml(m[1].replace(/\s+#.*$/gm, "")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function main() {
  const nodes: IngestNodeDraft[] = [];
  const edges: IngestEdgeDraft[] = [];
  const flags: { slug: string; frontierFlag: string }[] = [];
  const seen = new Set<string>();
  const push = (n: IngestNodeDraft) => {
    if (seen.has(n.slug)) return;
    seen.add(n.slug);
    nodes.push(n);
  };
  const linker = new Linker(atoms());
  const counts = { literature: 0, litLinks: 0, digests: 0, digestPapers: 0, digestLinks: 0, targets: 0, targetLinks: 0 };

  // 1. Literature cards.
  if (existsSync(LIT)) {
    for (const area of readdirSync(LIT)) {
      const dir = join(LIT, area);
      if (!statSync(dir).isDirectory()) continue;
      for (const f of readdirSync(dir).filter((x) => x.endsWith(".md"))) {
        const md = readFileSync(join(dir, f), "utf8");
        const fm = frontMatter(md);
        if (!fm || typeof fm.title !== "string") continue;
        const stem = f.replace(/\.md$/, "");
        const slug = `lit-${slugifyPart(stem).slice(0, 80)}`;
        const title = String(fm.title).slice(0, 180);
        const why = typeof fm.why_it_matters === "string" ? fm.why_it_matters.replace(/\s+/g, " ").trim() : "";
        push({
          slug,
          title,
          kind: "primary_source",
          tier: 14,
          branch: "10-literature",
          summary: why.slice(0, 600) || null,
          labels: { en: { title } },
          provenance: { type: "literature_paper", area, doi: fm.doi ?? null, url: fm.url ?? null, year: fm.year ?? null, author: Array.isArray(fm.authors) ? (fm.authors as string[]).slice(0, 6).join("; ") : null, publisher: fm.venue ?? null, openalex: fm.openalex_id ?? null, tier: fm.tier ?? null, file: `_intake/research-os-k12-literature/${area}/${f}` },
        });
        counts.literature++;
        for (const h of linker.link(`${title}. ${why.slice(0, 500)}`, { topK: 2, minScore: 0.14, minShared: 3 })) {
          edges.push({ fromSlug: slug, toSlug: h.id, kind: "cites", confidence: Math.min(0.8, 0.4 + h.score), confidenceSource: "canon_map", provenance: { type: "intake_all", rule: "lexical", score: h.score, shared: h.shared } });
          counts.litLinks++;
        }
      }
    }
  }

  // 2. Concept digests with their papers.
  if (existsSync(DIGESTS)) {
    for (const f of readdirSync(DIGESTS).filter((x) => x.endsWith(".md"))) {
      const md = readFileSync(join(DIGESTS, f), "utf8");
      const stem = f.replace(/\.md$/, "");
      const query = md.match(/\*\*Query\*\*:\s*`([^`]+)`/)?.[1] ?? stem;
      const hits = Number(md.match(/\*\*Hits\*\*:\s*(\d+)/)?.[1] ?? 0);
      const slug = `digest-${slugifyPart(stem)}`;
      const title = stem.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      push({ slug, title, kind: "concept", tier: 12, branch: "05-biophysics", summary: `Concept digest: ${hits} sources found for "${query}".`, labels: { en: { title } }, provenance: { type: "intake_digest", query, hits, file: `_intake/concept-digests/${f}` } });
      counts.digests++;
      for (const h of linker.link(`${title}. ${query}`, { branch: "05-biophysics", topK: 3, minScore: 0.1, minShared: 1 })) {
        edges.push({ fromSlug: slug, toSlug: h.id, kind: "derives_from", confidence: Math.min(0.8, 0.4 + h.score), confidenceSource: "canon_map", provenance: { type: "intake_all", rule: "lexical", score: h.score, shared: h.shared } });
        counts.digestLinks++;
      }
      // papers: "- **Title.**" then, within a few lines, PMID / DOI.
      const lines = md.split("\n");
      let taken = 0;
      for (let i = 0; i < lines.length && taken < 15; i++) {
        const t = lines[i].match(/^- \*\*(.+?)\*\*\s*$/);
        if (!t) continue;
        const ptitle = t[1].replace(/\s+/g, " ").trim();
        if (/^(MeSH|PMID|DOI|PMCID|Journal)/.test(ptitle)) continue;
        let pmid: string | null = null;
        let doi: string | null = null;
        for (let j = i + 1; j < Math.min(lines.length, i + 14); j++) {
          if (/^- \*\*(?!PMID|DOI|PMCID|Journal|MeSH).+\*\*\s*$/.test(lines[j])) break;
          pmid = pmid ?? lines[j].match(/\*\*PMID\*\*:\s*(\d+)/)?.[1] ?? lines[j].match(/PMID-(\d+)/)?.[1] ?? null;
          doi = doi ?? lines[j].match(/\*\*DOI\*\*:\s*(\S+)/)?.[1] ?? null;
        }
        if (!pmid && !doi) continue;
        const pslug = pmid ? `pubmed-${pmid}` : `doi-${slugifyPart(doi!).slice(0, 80)}`;
        push({ slug: pslug, title: ptitle.slice(0, 180), kind: "primary_source", tier: 14, branch: "05-biophysics", summary: null, labels: { en: { title: ptitle.slice(0, 180) } }, provenance: { type: "intake_paper", source: "pubmed", pmid, doi, url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : doi ? `https://doi.org/${doi}` : null, digest: stem } });
        edges.push({ fromSlug: pslug, toSlug: slug, kind: "example_of", confidence: 0.9, confidenceSource: "canon_map", provenance: { type: "intake_all", rule: "digest_hit" } });
        counts.digestPapers++;
        taken++;
      }
    }
  }

  // 3. Concept targets: queued canon entries, flagged as open questions.
  for (const d of readdirSync(INTAKE).filter((x) => x.startsWith("concept-") && x !== "concept-digests")) {
    const readme = join(INTAKE, d, "README.md");
    if (!existsSync(readme)) continue;
    const md = readFileSync(readme, "utf8");
    const branch = md.match(/\*\*Canon branch\*\*:\s*(\S+)/)?.[1];
    if (!branch) continue;
    const title = (md.match(/^#\s+(.+)$/m)?.[1] ?? d).replace(/\s*[—-]\s*concept canon-target intake\s*$/i, "").trim();
    const status = md.match(/\*\*Status\*\*:\s*(.+)$/m)?.[1]?.trim() ?? null;
    const what = md.split(/^## What this is\s*$/m)[1]?.split(/^## /m)[0]?.replace(/\s+/g, " ").trim() ?? "";
    const slug = `target-${slugifyPart(d.replace(/^concept-/, ""))}`;
    push({ slug, title, kind: "concept", tier: 15, branch, summary: what.slice(0, 600) || null, labels: { en: { title } }, provenance: { type: "intake_target", status, folder: `_intake/${d}` } });
    flags.push({ slug, frontierFlag: "open_question" });
    counts.targets++;
    for (const h of linker.link(`${title}. ${what.slice(0, 300)}`, { branch, topK: 3, minScore: 0.1, minShared: 1 })) {
      edges.push({ fromSlug: slug, toSlug: h.id, kind: "derives_from", confidence: Math.min(0.8, 0.4 + h.score), confidenceSource: "canon_map", provenance: { type: "intake_all", rule: "lexical", score: h.score, shared: h.shared } });
      counts.targetLinks++;
    }
  }

  console.log(`[intake-all] ${nodes.length} nodes, ${edges.length} edges:`, JSON.stringify(counts));
  if (APPLY) void applyDrafts("intake-all", nodes, edges, flags);
}

main();
