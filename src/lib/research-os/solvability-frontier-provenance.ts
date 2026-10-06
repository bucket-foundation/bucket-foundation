import type { ReportData } from "./solvability-frontier-report-copy";
import { f3, n } from "./solvability-frontier-report-copy";

export interface MakeupLabel {
  title: string;
  counts: Record<string, number>;
  present: number;
  absent: number;
}

export interface MakeupSource {
  rows: number;
  licences: Record<string, number>;
  status: Record<string, number>;
  posed: number;
  resolved: number;
  statement: number;
}

export interface MakeupData {
  schema: string;
  built: string;
  rows: number;
  atlas_rows: number;
  sourced_rows: number;
  threshold: number;
  labels: Record<string, MakeupLabel>;
  status_by_branch: Record<string, Record<string, number>>;
  openalex: { queried: number; with_works: number; median_works_by_branch: Record<string, number>; works_by_branch: Record<string, Record<string, number>>; retrieved: string | null } | null;
  sources: Record<string, MakeupSource>;
}

export const MAKEUP_COMMAND = "python3 tools/solvability-atlas/makeup.py --publish";

export function makeupTag(m: MakeupData): string {
  return `[empirical: output/solvability-frontier/report/makeup/makeup.json, ${m.built}, ${MAKEUP_COMMAND}]`;
}

export const MAKEUP_CHARTS = [
  ["branch", "Branch"],
  ["status", "Status"],
  ["form", "Form"],
  ["source", "Source"],
  ["licence", "Licence"],
  ["resolved_kind", "Resolved kind"],
  ["posed_present", "Posed year"],
  ["posed_decade", "Posed year by decade"],
  ["resolved_decade", "Resolved year by decade"],
  ["zone", "Zone"],
  ["prediction_class", "Prediction class"],
  ["level", "Variant or top-level"],
  ["text_kind", "Embedding text kind"],
  ["length_band", "Statement length band"],
  ["status_by_branch", "Status by branch"],
  ["openalex_works_by_branch", "OpenAlex works by branch"],
] as const;

interface SourceNote {
  taken: string;
  done: string;
}

const FC_TAKEN = "statement (the text field, or the Lean declaration when empty), status (open, solved), family and declaration suffix as the name";
const FC_DONE = "deduped by normalised title, suffixed declarations marked variant_of their file's top-level row, keywords mined from the statement, years read from the text only";
const WP_TAKEN = "the full list item as statement, the name before a colon or the first sentence, the section heading as status";
const WP_DONE = "branch set per page, market set per list, deduped against the atlas and within the file, years read from the text only";
const DL_TAKEN = "headline under 15 words as the name, the list year as posed year, a 2026 status check per row with its source";
const DL_DONE = "statement paraphrased here in 15 to 40 words, never the body text; deduped by title and at 0.85 statement similarity; solved rows carry the discovery year";

const SOURCE_NOTES: Record<string, SourceNote> = {
  "atlas, problems.tsv": { taken: "name, branch, level, Lean status, posed and resolved years, markets, keywords, all curated", done: "resolved year marks solved; the embedding text is the problem record when one exists, else name plus keywords" },
  "Wikipedia, Hilbert's problems": { taken: "explanation cell as statement, table status column, year column, 1900 as posed year", done: "partial for a partial cell or any cell reading no consensus, disputed, weaker form or partially; curator overrides on 14 and 18" },
  "Wikipedia, Smale's problems": { taken: "explanation cell as statement, table status column, year column, 1998 as posed year", done: "same table rule; curator overrides on 8, 14 and 17" },
  "solved timelines, Wikipedia and Kavli": { taken: "a question that the page shows existed before the answer, the discovery or proof year, a posed evidence quote under 12 words", done: "statement rewritten as the question stood before resolution in 15 to 40 words; discovery rows with no prior question held back; 159 source pages verified for year and anchor term" },
  "Wikipedia, other pages": { taken: WP_TAKEN, done: WP_DONE },
};

export function sourceNote(label: string): SourceNote {
  if (SOURCE_NOTES[label]) return SOURCE_NOTES[label];
  if (label.startsWith("formal-conjectures")) return { taken: FC_TAKEN, done: FC_DONE };
  if (label.startsWith("dated list")) return { taken: DL_TAKEN, done: DL_DONE };
  if (label.startsWith("Wikipedia, unsolved problems")) return { taken: WP_TAKEN, done: WP_DONE };
  return { taken: "statement and status", done: "deduped by title" };
}

export interface SourceRow {
  source: string;
  rows: number;
  licence: string;
  status: string;
  years: string;
  taken: string;
  done: string;
}

export function sourceRows(m: MakeupData): SourceRow[] {
  return Object.entries(m.sources)
    .sort((a, b) => b[1].rows - a[1].rows || a[0].localeCompare(b[0]))
    .map(([source, s]) => {
      const note = sourceNote(source);
      return {
        source,
        rows: s.rows,
        licence: Object.entries(s.licences).sort((a, b) => b[1] - a[1]).map(([l, c]) => (Object.keys(s.licences).length > 1 ? `${l} (${n(c)})` : l)).join("; "),
        status: ["solved", "partial", "open"].filter((k) => s.status[k]).map((k) => `${n(s.status[k])} ${k}`).join(", "),
        years: `${n(s.posed)} posed, ${n(s.resolved)} resolved`,
        taken: note.taken,
        done: note.done,
      };
    });
}

export interface PipelineStep {
  title: string;
  formula: string;
  text: string;
}

export function pipelineSteps(data: ReportData, m: MakeupData): PipelineStep[] {
  const mk = makeupTag(m);
  const fr = `[empirical: output/solvability-frontier/report/frontier.json, ${data.built}, npx ts-node scripts/build-solvability-frontier-report.ts]`;
  const bt = `[empirical: output/solvability-frontier/report/backtest.json, ${data.built}, npx ts-node scripts/build-solvability-frontier-report.ts]`;
  const text = m.labels.text_kind.counts;
  const c = data.frontier.counts;
  return [
    { title: "Text", formula: "t_i = statement_i, else record_i, else name_i + keywords_i", text: `Each row i gets one text. ${n(text.statement ?? 0)} rows use the ingested statement, ${n(text.record ?? 0)} atlas rows use the problem record (name, aliases, statement, keywords, key work titles) and ${n(text.name_keywords ?? 0)} use name plus keywords ${mk}. The branch word never enters the text.` },
    { title: "Embedding", formula: "e_i = f(t_i) / ‖f(t_i)‖, f = BAAI/bge-small-en-v1.5 at revision 5c38ec7", text: `${data.model} maps each text to 384 dimensions and the vector is scaled to unit length, so dot products are cosines. The model revision is pinned and every embedding is cached by model revision and text hash ${fr}.` },
    { title: "Similarity", formula: "s_ij = e_i · e_j", text: `Cosine similarity between every pair. For each row the ${data.k} highest s_ij are stored by index with three decimals, plus the nearest solved row over the whole set ${fr}.` },
    { title: "Solved set", formula: "S = { i : status_i = solved and (parent_i = none or status_parent = solved) }", text: `A top-level row is solved when its status is solved; a variant only when it and its parent both are, so a proved special case of an open problem stays partial. ${n(c.solved)} rows are in S ${fr}.` },
    { title: "Reach", formula: "r_i = max_{j ∈ S, j ≠ i} s_ij", text: `A row's highest similarity to a solved row other than itself, taken over its stored neighbours and its stored nearest solved row ${fr}.` },
    { title: "Threshold", formula: "τ = Q_0.1 ( { r_j : j ∈ S } ), the value at index ⌊0.1 · |S|⌋ of the sorted reaches", text: `The 10th percentile of solved rows' reach: nine in ten solved rows sit at least this close to another solved row. τ = ${f3(data.frontier.threshold)} on this set ${fr}.` },
    { title: "Zones", formula: "zone_i = solved if i ∈ S; unsampled if |S ∩ branch_i| < 10; reachable if r_i ≥ τ; beyond if r_i < τ", text: `${n(c.solved)} solved, ${n(c.reachable)} reachable, ${n(c.beyond)} beyond, ${n(c.unsampled)} unsampled ${fr}.` },
    { title: "Radius", formula: "ρ_i = 0.6 · (1 − span(r_i, min_S r, 1)) in the core; 0.6 + 0.4 · (1 − span(r_i, τ, 1)) inside; 1 + 0.5 · (1 − span(r_i, r_min, τ)) beyond; span(x, a, b) = clamp((x − a) / (b − a), 0, 1)", text: `Distance from the centre of the drawing. Solved rows fill the core disc up to 0.6, reachable rows the ring up to the circle at 1, beyond and unsampled rows the band out to 1.5, each placed by how far its reach falls short ${fr}.` },
    { title: "Growth", formula: "g_i = 1 + | { j ∈ N_i : zone_j = beyond, j top-level, s_ij ≥ τ } |", text: `For a top-level row beyond the frontier, the number of rows that would move inside if it were solved, counted over its ${data.k} stored neighbours N_i. Variants neither pull nor count as pulled ${fr}.` },
    { title: "Angle", formula: "θ_i = rank of atan2(p_i2, p_i1) over the rows, scaled to [0, 2π); p_i = (e_i − ē) V_2 with V_2 the first two right singular vectors of the centred embeddings", text: `The angle is the row's rank along the first two principal components, so neighbours on the circle are neighbours in embedding space. Lean theorems are projected on the same axes and left off the frontier ${fr}.` },
    { title: "Reach class", formula: "u = Q_0.75 ( { r_i : i open, inside } ); close if r_i ≥ u; borderline if τ ≤ r_i < u; needs a new idea if r_i < τ; unsampled by branch", text: `u = ${f3(data.predictions.upperReach)}. Within a class, rows rank by growth, then reach, then id [bm:BucketMath.Ranking.rank_ordered].` },
    { title: "Backtest statistic", formula: "d_c = p_in − p_out with p = resolved rows / scored rows on each side of τ_c; ratio = p_in / p_out; AUC = P(r_resolved > r_unresolved) with ties at one half", text: `At cutoff c the solved set S_c holds the rows resolved by c, τ_c is Q_0.1 of their reach over the rows with a solved neighbour in the stored ${data.k}, and the tested rows are those posed by c and open at c, scored by their 2026 status under two codings ${bt}. The ratio is undefined when p_out is zero [bm:BucketMath.Marketing.ratio].` },
    { title: "Permutation test", formula: "p = (1 + | { b : |d*_b| ≥ |d_c| } |) / (B + 1), B = " + n(data.backtest.permutations) + ", seed " + data.backtest.seed, text: `The outcomes are shuffled across the inside and outside rows B times under a fixed seed and the rate difference recomputed each time; p is the share of shuffles at least as large in absolute value as the observed one, with one added to numerator and denominator, so 0 < p ≤ 1 ${bt}. A stratum with fewer than ${data.backtest.floor} rows on a side reports counts only.` },
  ];
}

export function makeupSummary(m: MakeupData): string {
  const mk = makeupTag(m);
  const l = m.labels;
  const top = (key: string) => Object.entries(l[key].counts).sort((a, b) => b[1] - a[1])[0];
  const [branch, branchN] = top("branch");
  const [source, sourceN] = top("source");
  const [licence, licenceN] = top("licence");
  const oa = m.openalex ? ` OpenAlex returned at least one work for ${n(m.openalex.with_works)} of the ${n(m.openalex.queried)} sourced rows queried ${mk}.` : "";
  return `${n(m.rows)} rows: ${n(m.atlas_rows)} curated atlas problems and ${n(m.sourced_rows)} ingested rows ${mk}. ${branch} holds ${n(branchN)}, the largest source is ${source} with ${n(sourceN)}, and ${licence} covers ${n(licenceN)} rows ${mk}. ${n(l.posed_present.counts["posed year present"] ?? 0)} rows carry a posed year and ${n(l.resolved_decade.present)} a resolved year ${mk}. ${n(l.level.counts.variant ?? 0)} rows are variants of another row ${mk}.${oa}`;
}
