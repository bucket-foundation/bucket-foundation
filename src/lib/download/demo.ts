export const DEMO_VERSION = "0.5.0";

export function binaryEntropy(p: number): number {
  if (!Number.isFinite(p) || p < 0 || p > 1) throw new RangeError("Probability must be between zero and one.");
  if (p === 0 || p === 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

export const DEMO_SOURCES = [
  { id: "shannon", title: "A Mathematical Theory of Communication", author: "Claude E. Shannon", year: "1948", kind: "Paper", terms: "entropy information probability communication uncertainty coin", detail: "A source for the entropy formula used in this example.", url: "https://doi.org/10.1002/j.1538-7305.1948.tb00917.x" },
  { id: "mit", title: "Information and Entropy", author: "MIT OpenCourseWare", year: "2008", kind: "Course", terms: "entropy information probability learning communication", detail: "Lecture materials and reading paths through information theory.", url: "https://ocw.mit.edu/courses/6-050j-information-and-entropy-spring-2008/" },
  { id: "coin", title: "A coin, a question, a bit", author: "Bucket sample workspace", year: "Example", kind: "Note", terms: "entropy information probability coin fair biased surprise bit", detail: "Our worked example: a fair coin has two equally likely outcomes. Its binary entropy is one bit.", url: null },
  { id: "data", title: "Coin probabilities", author: "Bucket sample workspace", year: "Example", kind: "Dataset", terms: "entropy information probability coin data csv analysis", detail: "A small generated table for comparing probability with binary entropy.", url: null },
] as const;

export const DEMO_TOOLS = [
  { id: "learn", label: "Learn", hint: "Move the probability. Watch uncertainty change." },
  { id: "path", label: "Path", hint: "Follow the ideas underneath a new concept." },
  { id: "quiz", label: "Quiz", hint: "Try a question about the idea you explored." },
  { id: "review", label: "Review", hint: "Return to a card and check your recall." },
  { id: "canon", label: "Canon", hint: "Connect an idea to its foundations and sources." },
  { id: "explore", label: "Explore", hint: "Find a source and keep it with your notes." },
  { id: "notes", label: "Notes", hint: "Make the idea your own. Edit or export your note." },
  { id: "history", label: "History", hint: "See the steps you took in this sample workspace." },
  { id: "analyze", label: "Analyze data", hint: "Inspect the numbers behind the example." },
  { id: "data", label: "Data", hint: "See the sample records and take a copy." },
  { id: "add", label: "Add your own", hint: "Try a small numeric CSV from your computer." },
  { id: "work", label: "Work quiz", hint: "Recall something you did in this demo." },
] as const;

export type DemoTool = (typeof DEMO_TOOLS)[number]["id"];

export const PATH_STEPS = [
  { name: "Probability", body: "A number from zero to one describes how likely an outcome is." },
  { name: "Logarithms", body: "A base-two logarithm counts powers of two. log₂(2) = 1." },
  { name: "Surprise", body: "An outcome with probability p carries −log₂(p) bits of information." },
  { name: "Entropy", body: "Average that information across the possible outcomes. For a fair coin, the result is one bit." },
];

export const SAMPLE_CSV = "probability\n0\n0.1\n0.25\n0.5\n0.75\n0.9\n1\n";

export function parseProbabilities(text: string): number[] {
  if (text.length > 20_000) throw new Error("Choose a CSV under 20 KB.");
  const lines = text.trim().split(/\r?\n/);
  if (lines[0]?.trim().toLowerCase() === "probability") lines.shift();
  if (!lines.length || lines.length > 1000) throw new Error("Use one to 1,000 rows with one probability per row.");
  return lines.map((line) => {
    const value = line.trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) throw new Error("Use one numeric probability per row, with an optional probability header.");
    const p = Number(value);
    if (!Number.isFinite(p) || p < 0 || p > 1) throw new Error("Every probability must be between zero and one.");
    return p;
  });
}

export function searchDemoSources(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return DEMO_SOURCES.filter((source) => words.every((word) => `${source.title} ${source.author} ${source.terms}`.toLowerCase().includes(word)));
}
