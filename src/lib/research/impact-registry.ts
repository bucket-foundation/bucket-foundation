import { PAPERS } from "@/lib/papers";
import { FLAGSHIP, EDUCATION_DOCS } from "@/lib/education";
import { TOOLS } from "@/lib/tools";
import { listDatasets, datasetSlug, datasetTitle, datasetDescription } from "@/lib/research-atlas";
import { type ImpactItem, type ImpactLine } from "@/lib/research/impact-types";
import { loadReportRecords, type ReportRecord } from "@/lib/research/reports-loader";

export { IMPACT_LINES, KINDS } from "@/lib/research/impact-types";
export type { ImpactLine, ItemKind, ImpactItem } from "@/lib/research/impact-types";

const PAPER_IMPACT: Record<string, ImpactLine> = {
  "human-ai-multiplier": "capable",
};

const PAPER_FIGURES: Record<string, { src: string; title: string }[]> = {
  "solvability-frontier": [
    { src: "/papers/solvability-frontier/fig_frontier.webp", title: "The frontier circle over 5,080 problems" },
    { src: "/papers/solvability-frontier/fig_makeup.webp", title: "What sits inside and outside the frontier" },
    { src: "/papers/solvability-frontier/fig_backtest.webp", title: "Backtest of the reach rule at two cutoffs" },
    { src: "/papers/solvability-frontier/fig_classes.webp", title: "Open problems sorted by reach class" },
  ],
  "human-ai-multiplier": [
    { src: "/papers/human-ai-multiplier/fig_timeline.webp", title: "Learning timeline with and without the system" },
    { src: "/papers/human-ai-multiplier/fig_scores.webp", title: "Mastery scores by condition" },
    { src: "/papers/human-ai-multiplier/fig_knowledge_region.webp", title: "The knowledge region a learner holds" },
  ],
};

const EDUCATION_FIGURES: { file: string; title: string }[] = [
  { file: "fig_access_arc.png", title: "The five-thousand-year access arc" },
  { file: "fig_access_vs_age.png", title: "Access to knowledge by age" },
  { file: "fig_continuity_funnel.png", title: "The continuity funnel from school to research" },
  { file: "fig_geo_choropleth.png", title: "Researcher capacity by country" },
];

const DOCS: { path: string; title: string; summary: string; impact: ImpactLine }[] = [
  { path: "/mission", title: "Mission", summary: "Why Bucket exists and who it serves.", impact: "education" },
  { path: "/manifesto", title: "Manifesto", summary: "The thesis: foundations, axioms and a small number of brilliant humans with AI.", impact: "capable" },
  { path: "/protocol", title: "Protocol", summary: "The x402 data protocol that pays authors once per citation.", impact: "discovery" },
  { path: "/protocol/envelope", title: "Envelope specification", summary: "The citeable envelope: data, metadata and receipt.", impact: "discovery" },
  { path: "/governance", title: "Governance", summary: "Nonprofit governance and conflict-of-interest disclosure.", impact: "discovery" },
];

const SHORT = 160;
const short = (s: string) => (s.length <= SHORT ? s : `${s.slice(0, SHORT - 1).trimEnd()}...`);

export function buildImpactItems(reports: ReportRecord[]): ImpactItem[] {
  const items: ImpactItem[] = [];
  const paperSlugs = new Set(PAPERS.map((p) => p.slug));

  items.push({
    id: `paper:${FLAGSHIP.slug}`,
    title: FLAGSHIP.title,
    summary: short(FLAGSHIP.subtitle),
    date: FLAGSHIP.date,
    kind: "paper",
    impact: "education",
    href: `/research/education/${FLAGSHIP.slug}`,
  });
  for (const p of PAPERS) {
    const impact = PAPER_IMPACT[p.slug] ?? "discovery";
    items.push({
      id: `paper:${p.slug}`,
      title: p.title,
      summary: short(p.highlights[0] ?? p.abstract[0] ?? ""),
      date: p.date,
      kind: "paper",
      impact,
      href: `/research/papers/${p.slug}`,
    });
    for (const f of PAPER_FIGURES[p.slug] ?? []) {
      items.push({ id: `figure:${f.src}`, title: f.title, summary: `From ${p.title.split(":")[0]}.`, date: p.date, kind: "figure", impact, href: f.src });
    }
  }
  for (const r of reports) {
    if (r.status !== "public" || paperSlugs.has(r.slug)) continue;
    items.push({ id: `report:${r.slug}`, title: r.title, summary: short(r.abstract), date: r.date, kind: "report", impact: "discovery", href: `/research/papers/${r.slug}` });
  }
  for (const f of EDUCATION_FIGURES) {
    items.push({ id: `figure:education/${f.file}`, title: f.title, summary: "From The Knowledge-Access Gradient.", date: FLAGSHIP.date, kind: "figure", impact: "education", href: `/education/figures/${f.file}` });
  }
  for (const d of listDatasets()) {
    items.push({ id: `dataset:${d.table}`, title: datasetTitle(d), summary: short(datasetDescription(d)), date: d.as_of, kind: "dataset", impact: "discovery", href: `/research/datasets/${datasetSlug(d)}` });
  }
  items.push({ id: "dataset:atlas", title: "Research atlas graph", summary: "The reconciled research-economy graph behind every dataset and paper.", date: null, kind: "dataset", impact: "discovery", href: "/research/atlas" });
  for (const t of TOOLS) {
    items.push({ id: `tool:${t.slug}`, title: t.name, summary: short(t.blurb), date: null, kind: "tool", impact: "discovery", href: `/research/tools/${t.slug}` });
  }
  items.push({ id: "tool:agent", title: "Research agent", summary: "Ask a question and get a brief where every claim cites a source or abstains.", date: null, kind: "tool", impact: "discovery", href: "/research/agent" });
  items.push({ id: "tool:research-os", title: "Research OS", summary: "A workspace where the AI finds, quotes and checks, and the learner writes.", date: null, kind: "tool", impact: "capable", href: "/research-os" });
  items.push({ id: "tool:learn", title: "Bucket Academy", summary: "Spaced practice, diagnostic placement and a grounded tutor.", date: null, kind: "tool", impact: "capable", href: "/research-os/learn" });
  for (const d of EDUCATION_DOCS) {
    items.push({ id: `doc:education/${d.slug}`, title: d.title, summary: short(d.blurb), date: null, kind: "doc", impact: "education", href: `/research/education/${d.slug}` });
  }
  for (const d of DOCS) {
    items.push({ id: `doc:${d.path}`, title: d.title, summary: d.summary, date: null, kind: "doc", impact: d.impact, href: d.path });
  }
  return items;
}

export function getImpactItems(): ImpactItem[] {
  return buildImpactItems(loadReportRecords());
}
