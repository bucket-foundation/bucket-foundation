/**
 * Everything researched, into one graph (learning/research-os/IDEAL-STATE.md).
 *
 * Reads, from the repo:
 *   claim cards      bucket-canon/<branch>/sub-claims/<concept>/*.md   (src/lib/canon-claims.ts)
 *   primary papers   bucket-canon/**\/primary-papers.yaml               (src/lib/canon-primary.ts)
 *   figures          canon-figures/figures.json
 *   sites, events    src/data/canon-sites.json, src/data/canon-timeline.json
 *   bridges          _intake/embeddings-v2/clusters.json (cross-branch clusters)
 *
 * Writes nodes: one `concept` per claim folder, one `fact` or `law` per
 * claim, one `primary_source` per paper, one `figure`, one `site` per
 * entry, one `concept` per bridge cluster. Edges: claim example_of concept;
 * claim derives_from the Academy atom it rests on (the linker); paper
 * cites the atom it rests on; figure contributes to the concepts of its
 * branches it names; figure authored a paper by author name; bridge
 * bridges each member claim. Idempotent on slug and (from, to, kind).
 *
 * Run from the repo root, after academy-import.ts:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/canon-all.ts
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/research-os/ingest/canon-all.ts --apply
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getAllClaims, type ClaimCard } from "../../../src/lib/canon-claims";
import { loadPrimaryPapers, authorsShort, type PrimaryPaper } from "../../../src/lib/canon-primary";
import { academyNodeSlug } from "../../../src/lib/research-os/ingest/academy";
import { slugifyPart, type IngestEdgeDraft, type IngestNodeDraft } from "../../../src/lib/research-os/ingest/types";
import { Linker } from "../../../src/lib/research-os/ingest/link";
import { loadAcademyCorpusFiles } from "./lib/load-academy-corpus";

const ROOT = resolve(process.cwd());
const APPLY = process.argv.includes("--apply");
const CLAIM_TIER_UNLINKED = 15;
const humanize = (s: string) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const clean = (s: string) => s.replace(/^Claim\s*[—-]\s*/i, "").trim();

function readJson<T>(rel: string): T | null {
  const p = join(ROOT, rel);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null;
}

interface Atom {
  slug: string;
  branch: string;
  tier: number;
  text: string;
}

function loadAtoms(): Atom[] {
  const out: Atom[] = [];
  for (const file of loadAcademyCorpusFiles(ROOT)) {
    const stem = file.sourceFile.replace(/^.*\//, "").replace(/\.json$/, "");
    const branch = (file as { branch?: string }).branch ?? stem;
    const byId = new Map(file.atoms.map((a) => [a.id, a]));
    const depth = new Map<string, number>();
    const depthOf = (id: string, seen = new Set<string>()): number => {
      if (depth.has(id)) return depth.get(id)!;
      if (seen.has(id)) return 0;
      seen.add(id);
      const a = byId.get(id);
      const d = a && a.requires?.length ? 1 + Math.max(...a.requires.map((r) => (byId.has(r) ? depthOf(r, seen) : 0))) : 0;
      depth.set(id, d);
      return d;
    };
    for (const a of file.atoms) {
      const x = a as { title?: string; gloss?: string; summary?: string; note?: string };
      out.push({ slug: academyNodeSlug(file.sourceFile, a.id), branch, tier: depthOf(a.id), text: [x.title, x.gloss, x.summary, x.note].filter(Boolean).join(". ") });
    }
  }
  return out;
}

function main() {
  const nodes: IngestNodeDraft[] = [];
  const edges: IngestEdgeDraft[] = [];
  const seen = new Set<string>();
  const push = (n: IngestNodeDraft) => {
    if (seen.has(n.slug)) return;
    seen.add(n.slug);
    nodes.push(n);
  };

  const atoms = loadAtoms();
  const linker = new Linker(atoms.map((a) => ({ id: a.slug, text: a.text, branch: a.branch })));
  const atomTier = new Map(atoms.map((a) => [a.slug, a.tier]));
  const counts = { concepts: 0, claims: 0, claimLinks: 0, papers: 0, paperLinks: 0, figures: 0, figureLinks: 0, sites: 0, bridges: 0, bridgeLinks: 0 };

  // 1. Claims and their concepts.
  const claims = getAllClaims();
  const conceptSlug = (c: ClaimCard) => `canon-${c.branch}-${slugifyPart(c.concept)}`;
  for (const c of claims) {
    const cs = conceptSlug(c);
    if (!seen.has(cs)) {
      push({ slug: cs, title: humanize(c.concept), kind: "concept", tier: 12, branch: c.branch, summary: null, labels: { en: { title: humanize(c.concept) } }, provenance: { type: "canon_concept", branch: c.branch, concept: c.concept } });
      counts.concepts++;
    }
    const slug = `claim-${c.branch}-${slugifyPart(c.concept)}-${slugifyPart(c.slug).slice(0, 60)}`;
    const title = clean(c.title).slice(0, 180);
    const hits = linker.link(`${title}. ${c.excerpt}`, { branch: c.branch, topK: 2, minScore: 0.11, minShared: 2 });
    const tier = hits.length ? Math.max(...hits.map((h) => (atomTier.get(h.id) ?? 0) + 1)) : CLAIM_TIER_UNLINKED;
    push({
      slug,
      title,
      // Every card is a transcript passage with a video and a timestamp: an
      // excerpt, whatever its folder is called (founder decision 2026-09-21).
      kind: "excerpt",
      tier,
      branch: c.branch,
      summary: c.excerpt.slice(0, 600) || null,
      labels: { en: { title } },
      provenance: { type: "source_excerpt", branch: c.branch, concept: c.concept, claim_slug: c.slug, url: c.url, video: c.videoTitle, timestamp: c.timestamp, score: c.score, cross_concepts: c.crossConcepts, captured_at: c.capturedAt },
    });
    counts.claims++;
    edges.push({ fromSlug: slug, toSlug: cs, kind: "example_of", confidence: 1, confidenceSource: "canon_map", provenance: { type: "canon_all", rule: "claim_in_concept" } });
    for (const h of hits) {
      // An excerpt mentions the atoms its text matched and rests on none, so
      // these are cites edges, which the prime decomposition does not follow.
      edges.push({ fromSlug: slug, toSlug: h.id, kind: "cites", confidence: Math.min(0.9, 0.5 + h.score), confidenceSource: "canon_map", provenance: { type: "canon_all", rule: "lexical", score: h.score, shared: h.shared } });
      counts.claimLinks++;
    }
  }

  // 1b. Concepts to mastery: each claim folder, as one text, to the atoms it rests on.
  const conceptText = new Map<string, string[]>();
  for (const c of claims) {
    const cs = conceptSlug(c);
    conceptText.set(cs, [...(conceptText.get(cs) ?? []), clean(c.title)]);
  }
  conceptText.forEach((titles, cs) => {
    const branch = cs.split("-").slice(1, 3).join("-");
    const concept = humanize(cs.replace(/^canon-\d{2}-[a-z-]+?-/, ""));
    for (const h of linker.link(`${concept}. ${concept}. ${titles.slice(0, 40).join(". ")}`, { branch, topK: 3, minScore: 0.1, minShared: 2 })) {
      edges.push({ fromSlug: cs, toSlug: h.id, kind: "derives_from", confidence: Math.min(0.9, 0.5 + h.score), confidenceSource: "canon_map", provenance: { type: "canon_all", rule: "concept_lexical", score: h.score, shared: h.shared } });
      counts.claimLinks++;
    }
  });

  // 2. Primary papers from every branch.
  const papers = loadPrimaryPapers();
  const paperSlug = (p: PrimaryPaper) => `paper-${slugifyPart(p.id || p.doi || p.title).slice(0, 80)}`;
  for (const p of papers) {
    const slug = paperSlug(p);
    const title = p.title.slice(0, 180);
    push({
      slug,
      title,
      kind: "primary_source",
      tier: 14,
      branch: p.branch,
      summary: p.text ? p.text.slice(0, 600) : null,
      labels: { en: { title } },
      provenance: { type: "canon_paper", paper_id: p.id, author: authorsShort(p), year: p.year, title: p.title, publisher: p.venueName, doi: p.doi, url: p.canonicalUrl, concept: p.concept, concepts: p.concepts, canon_score: p.canonScore, signoff: p.provenanceSignoff },
    });
    counts.papers++;
    const cs = `canon-${p.branch}-${slugifyPart(p.concept)}`;
    if (seen.has(cs)) edges.push({ fromSlug: slug, toSlug: cs, kind: "example_of", confidence: 1, confidenceSource: "canon_map", provenance: { type: "canon_all", rule: "paper_in_concept" } });
    for (const h of linker.link(`${p.title}. ${p.concepts.join(" ")}. ${p.text.slice(0, 400)}`, { branch: p.branch, topK: 2, minScore: 0.1, minShared: 2 })) {
      edges.push({ fromSlug: slug, toSlug: h.id, kind: "cites", confidence: Math.min(0.9, 0.5 + h.score), confidenceSource: "canon_map", provenance: { type: "canon_all", rule: "lexical", score: h.score, shared: h.shared } });
      counts.paperLinks++;
    }
  }

  // 3. Figures.
  const figures = readJson<{ figures: { id: string; name: string; lifespan?: string; era?: string; region?: string; tradition?: string; branches?: string[]; cross_branches?: string[]; primary_works?: { title: string; year?: string }[]; summary?: string; why_canon?: string }[] }>("canon-figures/figures.json");
  const paperByAuthor = papers.map((p) => ({ slug: paperSlug(p), families: p.authors.map((a) => a.family.toLowerCase()) }));
  for (const f of figures?.figures ?? []) {
    const slug = `figure-${slugifyPart(f.id)}`;
    const branch = f.branches?.[0] ?? "00-figures";
    const summary = [f.lifespan, f.era, f.region, f.tradition].filter(Boolean).join(" · ") + (f.summary || f.why_canon ? `. ${(f.summary ?? f.why_canon ?? "").slice(0, 400)}` : "");
    push({ slug, title: f.name, kind: "figure", tier: 13, branch, summary: summary || null, labels: { en: { title: f.name } }, provenance: { type: "canon_figure", figure_id: f.id, branches: f.branches ?? [], cross_branches: f.cross_branches ?? [], works: (f.primary_works ?? []).slice(0, 12), lifespan: f.lifespan ?? null } });
    counts.figures++;
    const family = f.name.split(/\s+/).pop()?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
    if (family.length > 3) {
      for (const p of paperByAuthor) {
        if (p.families.some((fam) => fam.replace(/[^a-z]/g, "") === family)) {
          edges.push({ fromSlug: slug, toSlug: p.slug, kind: "authored", confidence: 0.8, confidenceSource: "canon_map", provenance: { type: "canon_all", rule: "author_family" } });
          counts.figureLinks++;
        }
      }
    }
    for (const b of [...(f.branches ?? []), ...(f.cross_branches ?? [])]) {
      for (const h of linker.link(`${f.name}. ${(f.primary_works ?? []).map((w) => w.title).join(". ")}. ${f.tradition ?? ""}`, { branch: b, topK: 1, minScore: 0.16, minShared: 2 })) {
        edges.push({ fromSlug: slug, toSlug: h.id, kind: "contributes", confidence: Math.min(0.8, 0.4 + h.score), confidenceSource: "canon_map", provenance: { type: "canon_all", rule: "lexical", score: h.score, shared: h.shared } });
        counts.figureLinks++;
      }
    }
  }

  // 4. Sites and events on the globe.
  const sites = readJson<{ sites: { id: string; title: string; lat: number; lng: number; year: number; civilization?: string; wikipedia?: string; unesco?: string; lidar?: string; branch?: string; kind?: string }[] }>("src/data/canon-sites.json");
  for (const s of sites?.sites ?? []) {
    push({ slug: `site-${slugifyPart(s.id)}`, title: s.title, kind: "site", tier: 13, branch: s.branch ? (/^\d{2}-/.test(s.branch) ? s.branch : `08-${s.branch}`) : "08-deep-history", summary: [s.civilization, s.year < 0 ? `${-s.year} BCE` : `${s.year} CE`].filter(Boolean).join(" · "), labels: { en: { title: s.title } }, provenance: { type: "canon_site", site_id: s.id, lat: s.lat, lng: s.lng, year: s.year, wikipedia: s.wikipedia ?? null, unesco: s.unesco ?? null, lidar: s.lidar ?? null } });
    counts.sites++;
  }

  // 5. Bridges: cross-branch clusters over the claims.
  const clusters = readJson<{ clusters: { cluster_id: number; size: number; branches: string[]; bridge_score: number; exemplar: { branch: string; concept: string; title: string }; members: { branch: string; concept: string; title: string }[] }[] }>("_intake/embeddings-v2/clusters.json");
  const claimByKey = new Map(claims.map((c) => [`${c.branch}|${c.concept}|${clean(c.title).slice(0, 180)}`, `claim-${c.branch}-${slugifyPart(c.concept)}-${slugifyPart(c.slug).slice(0, 60)}`]));
  for (const cl of clusters?.clusters ?? []) {
    if ((cl.branches?.length ?? 0) < 2) continue;
    const slug = `bridge-${cl.cluster_id}`;
    const title = `Bridge: ${humanize(cl.exemplar.concept)} across ${cl.branches.length} branches`;
    push({ slug, title, kind: "concept", tier: 16, branch: cl.exemplar.branch, summary: `${cl.size} claims across ${cl.branches.map((b) => b.replace(/^\d+-/, "")).join(", ")}. Exemplar: ${clean(cl.exemplar.title).slice(0, 200)}`, labels: { en: { title } }, provenance: { type: "canon_bridge", cluster_id: cl.cluster_id, branches: cl.branches, bridge_score: cl.bridge_score, size: cl.size } });
    counts.bridges++;
    for (const m of cl.members ?? []) {
      const target = claimByKey.get(`${m.branch}|${m.concept}|${clean(m.title).slice(0, 180)}`);
      if (!target) continue;
      edges.push({ fromSlug: slug, toSlug: target, kind: "bridges", confidence: 0.9, confidenceSource: "canon_map", provenance: { type: "canon_all", rule: "cluster_member", cluster_id: cl.cluster_id } });
      counts.bridgeLinks++;
    }
  }

  console.log(`[canon-all] ${nodes.length} nodes, ${edges.length} edges:`, JSON.stringify(counts));
  if (!APPLY) return;
  void apply(nodes, edges);
}

async function apply(nodes: IngestNodeDraft[], edges: IngestEdgeDraft[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[canon-all] --apply needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const svc = createClient(url, key, { db: { schema: "graph" }, auth: { persistSession: false } });
  const idBySlug = new Map<string, string>();
  for (let i = 0; i < nodes.length; i += 200) {
    const rows = nodes.slice(i, i + 200).map((n) => ({ slug: n.slug, title: n.title, kind: n.kind, tier: n.tier, branch: n.branch, summary: n.summary, labels: n.labels, provenance: n.provenance }));
    const { data, error } = await svc.from("nodes").upsert(rows, { onConflict: "slug" }).select("id,slug");
    if (error) throw new Error(`node upsert failed: ${error.message}`);
    (data as { id: string; slug: string }[]).forEach((r) => idBySlug.set(r.slug, r.id));
  }
  const missing = Array.from(new Set(edges.flatMap((e) => [e.fromSlug, e.toSlug]).filter((s) => !idBySlug.has(s))));
  for (let i = 0; i < missing.length; i += 200) {
    const { data } = await svc.from("nodes").select("id,slug").in("slug", missing.slice(i, i + 200));
    ((data as { id: string; slug: string }[]) || []).forEach((r) => idBySlug.set(r.slug, r.id));
  }
  const rows = edges
    .map((e) => ({ from_id: idBySlug.get(e.fromSlug), to_id: idBySlug.get(e.toSlug), kind: e.kind, weight: e.weight ?? null, provenance: e.provenance ?? {}, confidence: e.confidence ?? null, confidence_source: e.confidenceSource ?? null }))
    .filter((r) => r.from_id && r.to_id && r.from_id !== r.to_id);
  let written = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await svc.from("edges").upsert(rows.slice(i, i + 500), { onConflict: "from_id,to_id,kind", ignoreDuplicates: true });
    if (error) throw new Error(`edge upsert failed: ${error.message}`);
    written += Math.min(500, rows.length - i);
  }
  // Re-importing resets tiers to this importer's own values; learning order
  // across courses raises them again (ros-tier-fix).
  const { data: raised, error: tierErr } = await svc.rpc("enforce_prerequisite_tiers");
  if (tierErr) throw new Error(`enforce_prerequisite_tiers failed: ${tierErr.message}`);
  if (typeof raised === "number" && raised > 0) console.log(`raised ${raised} grade tiers to keep learning order monotone`);
  console.log(`[canon-all] wrote ${idBySlug.size >= nodes.length ? nodes.length : idBySlug.size} nodes, ${written} edges (${edges.length - rows.length} skipped).`);
}

main();
