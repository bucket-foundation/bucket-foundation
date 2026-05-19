// canon-primary.ts — server-only loader for the CURATED primary-research
// layer: bucket-canon/<branch>/<concept>/primary-papers.yaml.
//
// WHY THIS EXISTS
// ---------------
// /api/research previously answered ONLY from bucket-canon/*/sub-claims/**.md
// — auto-segmented YouTube transcript chunks (599 of them, ~219 of which are
// Jack Kruse podcasts) — and served them as `canon_tier` with CC-BY
// canonical_urls. That is the inverse of the Bucket thesis: canon = real
// axioms / laws / primary derivations; a podcast transcript is at best ONE
// PARTIAL SOURCE, never the headline.
//
// The real primary-research layer already exists on disk as machine-generated
// `primary-papers.yaml` records (title, authors, year, DOI, real doi.org
// canonical_url, citation_count, canon_score, canon_score_reasons). Nothing at
// runtime read it. This module loads it so the API can rank and serve a real
// paper — e.g. Mitchell 1961 "Coupling of Phosphorylation ... by a
// Chemi-Osmotic type of Mechanism", DOI 10.1038/191144a0, canon_score 85 — as
// the authoritative answer + citation.
//
// NO YAML DEPENDENCY. The files are uniform, machine-emitted, 2-space-indent
// YAML with a fixed shape (see bucket-canon/05-biophysics/mitochondria/
// primary-papers.yaml). We parse exactly that shape with a tiny tolerant
// scanner. If a file deviates we skip the offending record rather than throw.

import fs from "fs";
import path from "path";

export type PrimaryPaper = {
  id: string;
  branch: string; // "05-biophysics"
  concept: string; // "mitochondria"
  title: string;
  authors: { family: string; given: string }[];
  year: number | null;
  venueName: string;
  doi: string;
  canonicalUrl: string;
  citationCount: number;
  canonScore: number;
  canonScoreReasons: string[];
  concepts: string[];
  // "title + venue + concepts" — the text tokens we rank queries against.
  text: string;
};

const REPO_ROOT = path.resolve(process.cwd());
const CANON_ROOT = path.join(REPO_ROOT, "bucket-canon");

let cache: PrimaryPaper[] | null = null;

function findPrimaryFiles(): { branch: string; concept: string; file: string }[] {
  const out: { branch: string; concept: string; file: string }[] = [];
  if (!fs.existsSync(CANON_ROOT)) return out;
  for (const branch of fs.readdirSync(CANON_ROOT).sort()) {
    if (!/^\d{2}-/.test(branch)) continue;
    const branchDir = path.join(CANON_ROOT, branch);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(branchDir);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const concept of fs.readdirSync(branchDir).sort()) {
      const f = path.join(branchDir, concept, "primary-papers.yaml");
      if (fs.existsSync(f)) out.push({ branch, concept, file: f });
    }
  }
  return out;
}

// Tolerant scanner for the fixed machine-emitted shape. Each record starts at a
// top-level "- id:" line. Scalars we care about are at 2-space indent
// ("  key: value"); authors live under a "  authors:" block as "  - family:"
// / "    given:" pairs; canon_score_reasons / concepts are "  - " list items.
function parseYamlRecords(
  raw: string,
  branch: string,
  concept: string,
): PrimaryPaper[] {
  const lines = raw.split("\n");
  const papers: PrimaryPaper[] = [];

  // Indices where a new record begins.
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^- id:\s*\S/.test(lines[i])) starts.push(i);
  }

  const unquote = (v: string) =>
    v
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .trim();

  for (let s = 0; s < starts.length; s++) {
    const from = starts[s];
    const to = s + 1 < starts.length ? starts[s + 1] : lines.length;
    const block = lines.slice(from, to);

    let id = "";
    let title = "";
    let year: number | null = null;
    let venueName = "";
    let doi = "";
    let canonicalUrl = "";
    let citationCount = 0;
    let canonScore = 0;
    const authors: { family: string; given: string }[] = [];
    const canonScoreReasons: string[] = [];
    const concepts: string[] = [];

    let section: "" | "authors" | "venue" | "reasons" | "concepts" | "oa" =
      "";
    let curAuthor: { family: string; given: string } | null = null;

    for (let li = 0; li < block.length; li++) {
      const line = block[li];
      if (li === 0) {
        id = unquote(line.replace(/^- id:\s*/, ""));
        continue;
      }

      // Top-level (2-space) keys reset the active section.
      const top = line.match(/^ {2}([a-z_]+):\s*(.*)$/);
      if (top) {
        const key = top[1];
        const val = top[2];
        section = "";
        switch (key) {
          case "title":
            title = unquote(val);
            break;
          case "year": {
            const n = parseInt(unquote(val), 10);
            year = Number.isNaN(n) ? null : n;
            break;
          }
          case "doi":
            doi = unquote(val);
            break;
          case "canonical_url":
            canonicalUrl = unquote(val);
            break;
          case "citation_count": {
            const n = parseInt(unquote(val), 10);
            citationCount = Number.isNaN(n) ? 0 : n;
            break;
          }
          case "canon_score": {
            const n = parseInt(unquote(val), 10);
            canonScore = Number.isNaN(n) ? 0 : n;
            break;
          }
          case "authors":
            section = "authors";
            break;
          case "venue":
            section = "venue";
            break;
          case "oa_status":
            section = "oa";
            break;
          case "canon_score_reasons":
            section = "reasons";
            break;
          case "concepts":
            section = "concepts";
            break;
          default:
            section = "";
        }
        continue;
      }

      if (section === "authors") {
        const fam = line.match(/^ {2}- family:\s*(.*)$/);
        if (fam) {
          if (curAuthor) authors.push(curAuthor);
          curAuthor = { family: unquote(fam[1]), given: "" };
          continue;
        }
        const giv = line.match(/^ {4}given:\s*(.*)$/);
        if (giv && curAuthor) {
          curAuthor.given = unquote(giv[1]);
          continue;
        }
        // orcid / other 4-space keys ignored.
        continue;
      }

      if (section === "venue") {
        const nm = line.match(/^ {4}name:\s*(.*)$/);
        if (nm) venueName = unquote(nm[1]);
        continue;
      }

      if (section === "reasons") {
        const it = line.match(/^ {2}- (.*)$/);
        if (it) canonScoreReasons.push(unquote(it[1]));
        continue;
      }

      if (section === "concepts") {
        const it = line.match(/^ {2}- (.*)$/);
        if (it) concepts.push(unquote(it[1]));
        continue;
      }
      // section === "oa" or "" — skip nested lines.
    }
    if (curAuthor) authors.push(curAuthor);

    if (!id || !title) continue; // malformed record — skip, don't throw.

    const text = [title, venueName, concepts.join(" ")]
      .filter(Boolean)
      .join(". ");

    papers.push({
      id,
      branch,
      concept,
      title,
      authors,
      year,
      venueName,
      doi,
      canonicalUrl,
      citationCount,
      canonScore,
      canonScoreReasons,
      concepts,
      text,
    });
  }
  return papers;
}

export function loadPrimaryPapers(): PrimaryPaper[] {
  if (cache) return cache;
  const out: PrimaryPaper[] = [];
  for (const { branch, concept, file } of findPrimaryFiles()) {
    let raw = "";
    try {
      raw = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    out.push(...parseYamlRecords(raw, branch, concept));
  }
  cache = out;
  return cache;
}

export function authorsShort(p: PrimaryPaper): string {
  const fams = p.authors.map((a) => a.family).filter(Boolean);
  if (fams.length === 0) return "";
  if (fams.length === 1) return fams[0];
  if (fams.length === 2) return `${fams[0]} & ${fams[1]}`;
  return `${fams[0]} et al.`;
}

/**
 * Rank curated primary papers against a free-text query.
 *
 * Token-overlap on title + venue + concepts (same family of cheap ranking the
 * existing canon-search tokenRank uses), then tie-broken by canon_score and
 * citation_count so that — all else equal — the higher-authority paper wins.
 * Mitchell 1961 (the chemiosmosis axiom) outranks a peripheral review for
 * "mitochondrial ATP synthesis".
 */
export function rankPrimary(
  query: string,
  topK = 6,
): { paper: PrimaryPaper; score: number }[] {
  const papers = loadPrimaryPapers();
  if (papers.length === 0) return [];
  const qWords = Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 3),
    ),
  );
  if (qWords.length === 0) return [];

  const titleOf = (p: PrimaryPaper) => p.title.toLowerCase();
  const conceptsOf = (p: PrimaryPaper) =>
    `${p.concept} ${p.concepts.join(" ")}`.toLowerCase();

  const countWords = (hay: string) => {
    let hits = 0;
    let distinct = 0;
    for (const w of qWords) {
      const re = new RegExp(
        "\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b",
        "g",
      );
      const m = hay.match(re);
      if (m) {
        hits += m.length;
        distinct += 1;
      }
    }
    return { hits, distinct };
  };

  const scored = papers.map((p) => {
    // Title matches are worth far more than concept-tag matches; concept tags
    // are noisy (OpenAlex auto-tags like "Chemistry", "Biology") and were
    // letting an off-topic paper that merely shares a generic tag outrank the
    // foundational paper whose TITLE is on-point.
    const t = countWords(titleOf(p));
    const c = countWords(conceptsOf(p));
    // distinctTitle = how many *distinct* query terms appear in the title —
    // the strongest relevance signal we have without embeddings.
    const distinctTitle = t.distinct;
    const lexical = t.hits * 12 + c.hits * 2;
    if (lexical === 0) return { paper: p, score: 0, distinctTitle: 0 };
    // canon_score / citations are gentle authority priors so that, given
    // comparable lexical relevance, the foundational high-citation axiom
    // (Mitchell 1961, 4599 cites, score 85) beats a peripheral hit.
    const score =
      lexical +
      distinctTitle * 8 +
      p.canonScore * 0.4 +
      Math.log10(p.citationCount + 1) * 4;
    return { paper: p, score, distinctTitle };
  });

  // Abstention gate: the primary layer only covers 4 biophysics concepts
  // (no math/physics/chemistry/cosmology primary-papers.yaml yet). Without a
  // floor, ANY query (incl. "Bell inequality") gets force-mapped onto a
  // biophysics paper that merely shares a stray token. Require at least one
  // distinct query term in the TITLE of the top hit; otherwise return [] so
  // the route falls through to the explicit "no curated canon match" path
  // instead of fabricating a citation.
  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0 || ranked[0].distinctTitle < 1) return [];

  return ranked.slice(0, topK).map(({ paper, score }) => ({ paper, score }));
}
