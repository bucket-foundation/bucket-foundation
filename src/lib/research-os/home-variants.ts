export type Module = { label: string; verb: Verb; line: string; route: string };
export type Verb = "Learn" | "Check" | "Hold" | "Own";

export const MODULES: Module[] = [
  { label: "Learn", verb: "Learn", line: "487 science atoms in 8 decks, each lesson at three depths.", route: "/research-os/learn" },
  { label: "Path", verb: "Learn", line: "Every topic and what it rests on. See what to learn first.", route: "/research-os/learn/path" },
  { label: "Quiz", verb: "Check", line: "Deck questions with a score at the end.", route: "/research-os/quiz" },
  { label: "Review", verb: "Check", line: "Reviews come back as their intervals run out.", route: "/research-os/practice" },
  { label: "Work quiz", verb: "Check", line: "A daily quiz built from your beads, repos and chats.", route: "/research-os/home" },
  { label: "Graph", verb: "Hold", line: "1,903 nodes across 14 branches. Drag to move, scroll to zoom.", route: "/research-os/map" },
  { label: "Progress", verb: "Hold", line: "How far each idea has gone for you, first look to your own work.", route: "/research-os/productions" },
  { label: "Canon", verb: "Hold", line: "Axioms, laws and primary sources, each quote with its page.", route: "/canon/search" },
  { label: "Explore", verb: "Hold", line: "Papers, books and talks on this computer, searchable offline.", route: "/research-os/workspace" },
  { label: "Notes", verb: "Own", line: "Kept on this computer, encrypted with your device key.", route: "/research-os/workbench" },
  { label: "History", verb: "Own", line: "Your last 60 days on this computer.", route: "/research-os/status" },
  { label: "Analyze data", verb: "Own", line: "Find patterns in a table of your own. The copy is removed when done.", route: "/research-os/solvability" },
  { label: "Data", verb: "Own", line: "What Bucket has loaded on this computer, each dataset a tab.", route: "/research-os/import" },
  { label: "Profile", verb: "Own", line: "Level, XP, streak and badges. Kept on this computer only.", route: "/research-os/profile" },
];

export const VERBS: Verb[] = ["Learn", "Check", "Hold", "Own"];

export const HEADLINES: { title: string; sub: string }[] = [
  { title: "Research OS", sub: "Learn, quiz, review, graph, canon, notes and data, all on one computer." },
  { title: "One workspace from first grade to the frontier", sub: `${MODULES.length} modules, every quote traced to a real source, nothing sent off your computer.` },
  { title: "Your lessons, your quizzes, your graph, your data", sub: "Research OS runs on your computer and works with the network off." },
  { title: "Learn it. Check it. Hold it. Make it yours.", sub: "The AI finds and quotes sources and never writes the answer for you." },
  { title: "A research desk for students", sub: "487 atoms to learn, 1,903 nodes to hold, and a canon of foundations to quote." },
];

export const PROOF: string[] = [
  "487 atoms · 1,903 nodes · 14 branches",
  "Free · no login for the demo · offline on your computer",
  "Every quote traces to a real source",
];

export type Layout = "tiles" | "rail" | "ledger" | "bento";
export type Palette = "bone" | "white" | "ink";
export type Type = "display" | "sans" | "mono";
export type Grouping = "flat" | "verb";
export type Cta = "open" | "download";

export type Variant = {
  id: string;
  headline: number;
  layout: Layout;
  palette: Palette;
  type: Type;
  grouping: Grouping;
  cta: Cta;
  proof: number;
};

const LAYOUTS: Layout[] = ["tiles", "rail", "ledger", "bento"];
const PALETTES: Palette[] = ["bone", "white", "ink"];
const TYPES: Type[] = ["display", "sans", "mono"];
const GROUPINGS: Grouping[] = ["flat", "verb"];
const CTAS: Cta[] = ["open", "download"];

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick<T>(r: () => number, xs: T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

export function generateVariants(count = 16, seed = 2026): Variant[] {
  const r = lcg(seed);
  const seen = new Set<string>();
  const out: Variant[] = [];
  while (out.length < count) {
    const v = {
      headline: Math.floor(r() * HEADLINES.length),
      layout: LAYOUTS[out.length % LAYOUTS.length],
      palette: pick(r, PALETTES),
      type: pick(r, TYPES),
      grouping: pick(r, GROUPINGS),
      cta: pick(r, CTAS),
      proof: Math.floor(r() * PROOF.length),
    };
    const key = `${v.headline}${v.layout}${v.palette}${v.type}${v.grouping}${v.cta}${v.proof}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `v${String(out.length + 1).padStart(2, "0")}`, ...v });
  }
  return out;
}

export const VARIANTS = generateVariants();

export function findVariant(id: string): Variant | undefined {
  return VARIANTS.find((v) => v.id === id);
}

export function modulesByVerb(): { verb: Verb; modules: Module[] }[] {
  return VERBS.map((verb) => ({ verb, modules: MODULES.filter((m) => m.verb === verb) }));
}
