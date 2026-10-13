import numbers from "@/data/research-statement-numbers.json";

export const N = numbers;

const pct = (x: number) => `${Math.round(x * 100)}%`;
const c2005 = N.cutoffs[0];
const c2021 = N.cutoffs[1];

export type Direction = { num: string; title: string; claim: string; facts: string[]; link: { href: string; label: string } };

export const QUESTION = "How can machine capability grow without weakening the human capacity to drive AI?";

export const DIRECTIONS: Direction[] = [
  {
    num: "1",
    title: "Machine learning for scientific discovery",
    claim: "Embed every problem statement. Reach is a problem's highest similarity to a solved one. One threshold draws the frontier.",
    facts: [
      `${N.problems.toLocaleString("en-US")} problems, ${N.counts.solved.toLocaleString("en-US")} solved, frontier at reach ${N.threshold}: ${N.classes["close to known results"]} open problems close to known results, ${N.classes.borderline} borderline, ${N.classes["needs a new idea"]} need a new idea`,
      `Backtest on problems posed by 2005: ${pct(c2005.settled.rateInside)} of inside rows settled against ${pct(c2005.settled.rateOutside)} outside (p ${c2005.settled.pValue}, AUC ${c2005.settled.auc}); by 2021, ${pct(c2021.settled.rateInside)} against ${pct(c2021.settled.rateOutside)} (AUC ${c2021.settled.auc})`,
      `Caveats: the embeddings come from the 2026 corpus; the 2005 gap rests on ${N.cutoffs[0].undecided} undecided rows and vanishes when partial progress counts (p ${c2005.advanced.pValue})`,
    ],
    link: { href: "/research/papers/solvability-frontier", label: "the paper and data" },
  },
  {
    num: "2",
    title: "Human-AI-computer interaction",
    claim: "Score unaided human, AI, and joint performance on the same tasks, and repeat the unaided test a week later.",
    facts: [
      "Multiplier m = J / max(H, A); retention R = H(t + 7 days) − H(t). A tool that raises J while R ≤ 0 may indicate dependence",
      "A probe with a frozen task bank is built into the Bucket desktop app, packages/bkt/src/hai; its results would guide which tasks Research OS replaces and which it augments",
      "Whether reliance on the same models narrows the range of research ideas links one person's capability to a field's",
    ],
    link: { href: "/research/papers/human-ai-multiplier", label: "the protocol" },
  },
  {
    num: "3",
    title: "Interdisciplinary research",
    claim: "Apply the two methods with researchers in other sciences and measure what each field needs from people and from models.",
    facts: [
      "Planned: Quantum Algorithm Discovery, matching computational problems in papers to known quantum algorithms; QuantumBioRAG scores quantum-biology claims against OpenAlex today",
      `The atlas is thin outside mathematics: mind holds ${N.branchRows.mind.solved} solved problems, chemistry ${N.branchRows.chemistry.solved}, cosmology ${N.branchRows.cosmology.solved}; each collaboration adds solved rows and records the capability it took`,
    ],
    link: { href: "/research/tools/quantumbiorag", label: "QuantumBioRAG" },
  },
];

export const FIGURE = {
  src: "/papers/solvability-frontier/fig_frontier.webp",
  alt: "The solvability frontier: solved problems fill the centre, open problems inside the circle have a close solved neighbour, open problems outside do not.",
  caption: `Angle is position in meaning, radius is reach. Inside the circle at ${N.threshold} a close solved neighbour exists; outside, a new idea is needed. ${N.problems.toLocaleString("en-US")} problems, built ${N.builtFrom.split("built ")[1]}.`,
};

export const GOAL = "A modern scientific renaissance that expands human and machine capability, reduces existential risk, and opens discovery to more people.";

export type Layout = "split" | "stack" | "ledger" | "cards";
export type Palette = "bone" | "white" | "ink";
export type Type = "display" | "sans";

export type StatementVariant = { id: string; layout: Layout; palette: Palette; type: Type; figureFirst: boolean };

const LAYOUTS: Layout[] = ["split", "stack", "ledger", "cards"];
const PALETTES: Palette[] = ["bone", "white", "ink"];
const TYPES: Type[] = ["display", "sans"];

export function generateStatementVariants(count = 8): StatementVariant[] {
  const out: StatementVariant[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `s${String(i + 1).padStart(2, "0")}`,
      layout: LAYOUTS[i % LAYOUTS.length],
      palette: PALETTES[Math.floor(i / LAYOUTS.length) % PALETTES.length === 0 ? i % PALETTES.length : (i + 1) % PALETTES.length],
      type: TYPES[Math.floor(i / 2) % TYPES.length],
      figureFirst: i % 2 === 0,
    });
  }
  return out;
}

export const STATEMENT_VARIANTS = generateStatementVariants();

export function findStatementVariant(id: string): StatementVariant | undefined {
  return STATEMENT_VARIANTS.find((v) => v.id === id);
}
