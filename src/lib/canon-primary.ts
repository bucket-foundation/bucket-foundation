import fs from "fs";
import path from "path";

export type PrimaryPaper = {
 id: string;
 branch: string;
 concept: string;
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
 provenanceSignoff: string | null;
 text: string;
};

export function isPendingSignoff(signoff: string | null | undefined): boolean {
 return typeof signoff === "string" && /^\s*(pending|rejected)\b/i.test(signoff);
}

const REPO_ROOT = path.resolve(process.cwd());
const CANON_ROOT = path.join(REPO_ROOT, "bucket-canon");

let cache: PrimaryPaper[] | null = null;

export function findPrimaryFiles(
 root: string = CANON_ROOT,
): { branch: string; concept: string; file: string }[] {
 const out: { branch: string; concept: string; file: string }[] = [];
 if (!fs.existsSync(root)) return out;
 for (const branch of fs.readdirSync(root).sort()) {
 if (!/^\d{2}-/.test(branch)) continue;
 const branchDir = path.join(root, branch);
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

export function parseYamlRecords(
 raw: string,
 branch: string,
 concept: string,
): PrimaryPaper[] {
 const lines = raw.split("\n");
 const papers: PrimaryPaper[] = [];

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
 let provenanceSignoff: string | null = null;
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
          case "provenance_signoff":
            provenanceSignoff = unquote(val) || null;
            break;
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
    }
    if (curAuthor) authors.push(curAuthor);

    if (!id || !title) continue;

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
      provenanceSignoff,
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
  cache = out.filter((p) => !isPendingSignoff(p.provenanceSignoff));
  return cache;
}

export function authorsShort(p: PrimaryPaper): string {
  const fams = p.authors.map((a) => a.family).filter(Boolean);
  if (fams.length === 0) return "";
  if (fams.length === 1) return fams[0];
  if (fams.length === 2) return `${fams[0]} & ${fams[1]}`;
  return `${fams[0]} et al.`;
}

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
    const t = countWords(titleOf(p));
    const c = countWords(conceptsOf(p));
    const distinctTitle = t.distinct;
    const lexical = t.hits * 12 + c.hits * 2;
    if (lexical === 0) return { paper: p, score: 0, distinctTitle: 0 };
    const score =
      lexical +
      distinctTitle * 8 +
      p.canonScore * 0.4 +
      Math.log10(p.citationCount + 1) * 4;
    return { paper: p, score, distinctTitle };
  });

  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0 || ranked[0].distinctTitle < 1) return [];

  return ranked.slice(0, topK).map(({ paper, score }) => ({ paper, score }));
}
