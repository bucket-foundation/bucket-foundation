import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { grade, masteryFor, normalizeState, type Atom, type EngineState } from "@academy/engine";
import { MASTERED_THRESHOLD } from "@academy/mastery";
import { generateQuestion } from "@ros/work-quiz/generate";
import { QUIZ_TYPES, type WorkSources } from "@ros/work-quiz/types";
import { analysisCard } from "../../bkt/src/job-specs";
import { ApiError, plainError, PROGRESS_TROUBLE, type Api, type Dataset, type DataRow, type DeckRow, type JobKind, type JobView, type WorkQuestion } from "./api";
import REPORT from "./fixtures/analysis-report.json";
import STOPPED from "./fixtures/analysis-stopped.json";
import { href, type Route } from "./router";
import { DECKS_BODY, NO_DECKS_BODY } from "./fixtures/decks";
import { EMPTY_LIBRARY, LIBRARY } from "./fixtures/library";
import { CONCEPT_PAGE, LESSON_PAGE, NO_CONCEPTS, NO_WORD_DECKS, WORD_CREDIT, WORD_DECKS, WORD_LESSON_LIST, WORD_LICENCE, WORD_QUESTION } from "./fixtures/word-lessons";

mock.module("@/components/research-os/views/PatentsView", () => ({ PatentsView: () => <div>patents</div> }));
mock.module("@/components/research-os/views/SoftwareAtlas", () => ({ default: () => <div>software</div> }));
mock.module("@/components/research-os/views/SolvabilityAtlas", () => ({ default: () => <div>solvability</div> }));

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.confirm = () => false;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

const DENY: { name: string; re: RegExp }[] = [
  { name: "json", re: /json/i },
  { name: "csv", re: /\bcsv\b/i },
  { name: "tsv", re: /\btsv\b/i },
  { name: ".md", re: /\.md\b/i },
  { name: ".txt", re: /\.txt\b/i },
  { name: "api", re: /\bapi\b/i },
  { name: "python", re: /python/i },
  { name: "numpy", re: /numpy/i },
  { name: "bead", re: /bead/i },
  { name: "hash", re: /\bhash(es|ed)?\b/i },
  { name: "pdf", re: /\bpdf\b/i },
  { name: "xml", re: /\bxml\b/i },
  { name: "zip", re: /\bzip\b/i },
  { name: "git", re: /\bgit\b/i },
  { name: "repo", re: /\brepo(s|sitory|sitories)?\b/i },
  { name: "PR", re: /\bPRs?\b/ },
  { name: "token", re: /\btokens?\b/i },
  { name: "stdout", re: /\bstd(out|err)\b/i },
  { name: "placeholder value", re: /<[a-z][a-z-]*>|\{[a-z_]+\}|\bYYYY\b|\byour-[a-z]+\b|\bundefined\b|\bnull\b|\bNaN\b|\[object / },
  { name: "home path", re: /~\// },
  { name: "id: prefix and code", re: /\b[a-z]{2,5}-(?=[a-z0-9]*\d)[a-z0-9]{2,8}\b/ },
  { name: "id: numbered deck", re: /\b\d{2}-[a-z]/ },
  { name: "id: snake case", re: /\b[a-z0-9]+_[a-z0-9_]+\b/ },
  { name: "id: hex", re: /\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,}\b/ },
];

const VOICE = /\b(genuinely|genuine|honest|honestly|truly|really|actually|basically|essentially|literally|obviously|clearly|certainly|absolutely|definitely|simply|merely|very|quite|extremely|quickly|easily|seamless|robust|navigate|leverage)\b/i;

const ALLOW = new Set<string>(["Token circle.", "Open Token circle."]);

const ATTRS = ["title", "placeholder", "aria-label", "alt"];

function strings(host: Element): string[] {
  const out: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === 1 && (n as Element).matches("details.fine:not([open])")) return;
    if (n.nodeType === 3) {
      const t = (n.textContent ?? "").trim();
      if (t) out.push(t);
    }
    if (n.nodeType === 1) for (const a of ATTRS) {
      const v = (n as Element).getAttribute(a);
      if (v) out.push(v);
    }
    n.childNodes.forEach(walk);
  };
  walk(host);
  return out;
}

function violations(host: Element): string[] {
  return violationsIn(strings(host));
}

function violationsIn(all: string[]): string[] {
  return all
    .filter((s) => !ALLOW.has(s))
    .flatMap((s) => DENY.filter((d) => d.re.test(s)).map((d) => `${d.name}: ${s}`));
}

const SAVED_ITEM = { id: "paper:d/10.1002/j.1538-7305.1948.tb01338.x", kind: "paper", title: "A Mathematical Theory of Communication", authors: "C. E. Shannon", year: 1948, citation: "C. E. Shannon. A Mathematical Theory of Communication. 1948.", url: "https://doi.org/10.1002/j.1538-7305.1948.tb01338.x", savedAt: "2026-10-01T00:00:00.000Z" };

const DECKS: DeckRow[] = [
  { id: "02-physics", title: "Physics", atoms: 3, introduced: 1, due: 1, xp: 10 },
  { id: "01-mathematics", title: "Mathematics", atoms: 1, introduced: 0, due: 0, xp: 0 },
];
const ATOMS: Record<string, Atom[]> = {
  "02-physics": [
    { id: "ph-entropy", title: "Entropy", shell: "nucleus", requires: ["ph-heat"], summary: "Disorder counted." },
    { id: "ph-heat", title: "Heat", shell: "prereq", requires: [], summary: "Energy in transit." },
    { id: "ph-second-law", title: "Second law", shell: "frontier", requires: ["ph-entropy"], summary: "Entropy rises." },
  ],
  "01-mathematics": [{ id: "ma-limit", title: "Limit", shell: "prereq", requires: [], summary: "What a sequence approaches." }],
};

function masteredState(atoms: Atom[], id: string): EngineState {
  let s = normalizeState(null);
  for (let i = 0; i < 60 && masteryFor(s, id) < MASTERED_THRESHOLD; i++) s = grade(s, atoms, {}, id, 4, "teach", Date.now() - (60 - i) * 86_400_000);
  expect(masteryFor(s, id)).toBeGreaterThanOrEqual(MASTERED_THRESHOLD);
  return s;
}

const WORK: WorkSources = {
  repoUrl: "https://github.com/example/project",
  beads: [
    { id: "bkt-aaaa", title: "Grip sphere on Learn", status: "closed", priority: 0, createdAt: "2026-09-20" },
    { id: "bkt-bbbb", title: "Prerequisite path view", status: "closed", priority: 1, createdAt: "2026-09-21" },
    { id: "bkt-cccc", title: "Advisor viewer filters", status: "closed", priority: 1, createdAt: "2026-09-22" },
    { id: "bkt-dddd", title: "Canon circle markers", status: "in_progress", priority: 2, createdAt: "2026-09-23" },
    { id: "bkt-eeee", title: "Notes editor preview", status: "in_progress", priority: 2, createdAt: "2026-09-24" },
    { id: "bkt-ffff", title: "History activity chart", status: "in_progress", priority: 2, createdAt: "2026-09-25" },
    { id: "bkt-gggg", title: "Daily quiz notifier", status: "open", priority: 3, createdAt: "2026-09-26" },
    { id: "bkt-hhhh", title: "Window launch shortcut", status: "open", priority: 4, createdAt: "2026-09-27" },
    { id: "bkt-iiii", title: "Review rating buttons", status: "open", priority: 4, createdAt: "2026-09-28" },
    { id: "bkt-jjjj", title: "Deck lesson reader", status: "open", priority: 4, createdAt: "2026-09-29" },
  ],
  prs: [
    { number: 501, title: "feat(bkt-ui): grip sphere on Learn (#501)", date: "2026-09-22", order: 0 },
    { number: 502, title: "feat(bkt-ui): prerequisite path view (#502)", date: "2026-09-23", order: 1 },
    { number: 503, title: "fix(bkt): review ratings saved twice (#503)", date: "2026-09-24", order: 2 },
    { number: 504, title: "feat(bkt): daily quiz notifier (#504)", date: "2026-09-25", order: 3 },
    { number: 505, title: "docs(bkt): window launch shortcut (#505)", date: "2026-09-26", order: 4 },
  ],
  notes: [],
};

const SERVER_ERRORS: [string, number][] = [
  ["unauthorized", 401],
  ["unknown deck", 404],
  ["unknown language; run bkt learn path for the list", 404],
  ["no such lesson", 404],
  ["no open question", 404],
  ["bad elapsedMs", 400],
  ["rating must be 1..4", 400],
  ["expected { branches: { <deck>: EngineState } }", 400],
  ["unknown decks: 09-alchemy", 400],
  ["no beads found; pick a .beads/issues.jsonl file", 400],
  ["git could not read that folder", 400],
  ["send claude and codex as true or false", 400],
  ["the beads file is larger than 32 MB", 413],
  ["already answered", 409],
  ["data key does not match", 500],
  ["", 502],
];

function served(seed: string, only: (typeof QUIZ_TYPES)[number]) {
  const q = generateQuestion(WORK, seed, only);
  if (!q) return null;
  const question: WorkQuestion = { id: q.id, type: q.type, prompt: q.prompt, lines: q.lines, choices: q.choices, limitSec: q.limitSec };
  return { question, answer: { correct: true, timedOut: false, answer: q.answer, explain: q.explain } };
}

const STARTED = Date.UTC(2026, 9, 1, 18, 2, 34);
const job = (over: Partial<JobView>): JobView => ({ id: "20261001T180234-fccc2bf2", kind: "analyze", state: "done", startedAt: STARTED, endedAt: STARTED + 4000, code: 0, log: "", logTruncated: false, result: null, error: null, install: null, ...over });
const OUT = "jobs/20261001T180234-fccc2bf2/out";
const JOBS = {
  working: job({ state: "running", endedAt: null, code: null }),
  finished: job({ result: { out: OUT, card: analysisCard(REPORT) }, log: JSON.stringify(REPORT) }),
  stoppedOnForm: job({ state: "failed", code: 2, error: "exited with code 2", result: { out: OUT, card: analysisCard(STOPPED) }, log: JSON.stringify(STOPPED) }),
  crashed: job({ state: "failed", code: 1, error: "exited with code 1", result: { out: OUT, card: null }, log: 'Traceback (most recent call last):\n  File "bkt_analyze.py", line 880, in <module>\nValueError: bad row' }),
  noModule: job({ state: "failed", code: null, endedAt: STARTED, error: "this job needs numpy: python3 -m pip install --user numpy", install: "python3 -m pip install --user numpy" }),
  noPython: job({ state: "failed", code: null, endedAt: STARTED, error: "python3 not found; install Python 3, then python3 -m pip install --user numpy", install: "python3 -m pip install --user numpy" }),
  stopped: job({ state: "cancelled", code: null }),
  tooLong: job({ state: "timeout", code: null, error: "the job ran past its time limit" }),
};
const jobsStub = (...jobs: JobView[]) => ({ jobs: async () => ({ kinds: ALL_KINDS, jobs }) });

type Stub = { [K in keyof Api]?: unknown };

const days = (fill: (i: number) => number) => Array.from({ length: 60 }, (_, i) => ({ day: new Date(Date.UTC(2026, 7, 1 + i)).toISOString().slice(0, 10), learn: fill(i), work: 0, notes: 0 }));
const progress = (branches: Record<string, { data: unknown }> | null) => ({ pull: async () => branches, load: async () => normalizeState(null), save: () => {}, flush: async () => {} });

const ALL_KINDS: JobKind[] = [
  { kind: "analyze", label: "Analyze a data file", inputs: [{ name: "data", label: "Data file", exts: [".csv", ".tsv", ".json", ".jsonl", ".txt"] }] },
  { kind: "fit-me", label: "Fit me to a people file", inputs: [{ name: "statement", label: "Research statement", exts: [".md", ".txt"] }, { name: "people", label: "People file", exts: [".jsonl"] }] },
];

const DATASETS: Dataset[] = [
  {
    id: "canon",
    name: "Canon excerpts",
    about: "Short quotations from talks, papers and books, each with the passages that support it.",
    browsable: true,
    version: "246f1a6cea3e",
    builtAt: null,
    checksum: "246f1a6cea3e".repeat(5),
    counts: [{ kind: "excerpt", label: "excerpts", n: 364 }, { kind: "passage", label: "supporting passages", n: 2104 }],
    kinds: [{ id: "excerpt", label: "Excerpt" }, { id: "passage", label: "Supporting passage" }],
    parts: [
      { name: "PubMed abstracts", count: 83, unit: "sources", terms: "Publisher copyright.", link: "https://pubmed.ncbi.nlm.nih.gov", openable: true },
      { name: "Internet Archive", count: 7, unit: "sources", terms: null, link: null, openable: false },
    ],
    leftOut: { count: 4121, reason: "Left out because the author has not agreed to sharing." },
  },
  {
    id: "yours",
    name: "Your work",
    about: "What you have written and answered in Bucket. It stays on this computer.",
    browsable: false,
    version: null,
    builtAt: null,
    checksum: null,
    counts: [{ kind: "note", label: "notes", n: 2, stored: "encrypted", screen: "notes" }, { kind: "answer", label: "quiz and review answers", n: 40, stored: "partly", screen: "history" }, { kind: "started", label: "lessons started", n: 9, stored: "plain", screen: "learn" }],
    kinds: [],
    parts: [],
    leftOut: null,
  },
];
const DATA_ROWS: DataRow[] = [
  { id: "excerpt/7", title: "Entropy rises and never falls", creators: null, year: null, kind: "excerpt", kindLabel: "Excerpt", source: "https://www.youtube.com/watch?v=BBBBBBBBBBB", openable: true },
  { id: "passage/7/0", title: "Old book", creators: "A. Writer", year: 1905, kind: "passage", kindLabel: "Supporting passage", source: "https://archive.org/details/item", openable: false },
];
const DATA_TABS = JSON.stringify({
  tabs: [
    { id: "set:canon", title: "Canon excerpts", dataset: "canon" },
    { id: "rec:canon:excerpt/7", title: "Entropy rises and never falls", dataset: "canon", record: "excerpt/7" },
  ],
  active: "set:canon",
});

const RESEARCH_ROWS = [
  { slug: "solvability-frontier", title: "The Solvability Frontier: Which Open Problems Sit Next to Solved Ones", kind: "paper", status: "public", date: "2026-10-08", origin: "shipped", changed: 0, unreadable: null },
  { slug: "funding-landscape", title: "The structure of public research funding", kind: "paper", status: "public", date: "2026-06-20", origin: "shipped", changed: 0, unreadable: "public/papers/x/paper.pdf does not match its hash in this build" },
];
const RESEARCH_FILE = { path: "public/papers/solvability-frontier/fig_frontier.webp", sha256: "c85d792ca773".repeat(5) + "abcd", size: 1200, audience: "public", role: "asset" };
const RESEARCH_DETAIL = {
  slug: "solvability-frontier",
  origin: "shipped",
  staff: false,
  withheld: 7,
  unreadable: null,
  files: [RESEARCH_FILE, { ...RESEARCH_FILE, path: "public/atlas/big.webp", size: 9 * 1024 * 1024 }],
  manifest: {
    schema: "bucket.report/2",
    slug: "solvability-frontier",
    title: "The Solvability Frontier: Which Open Problems Sit Next to Solved Ones",
    authors: ["Gianangelo Dichio"],
    date: "2026-10-08",
    status: "public",
    kind: "paper",
    abstract: "Embeds 5,206 problem statements across seven canon branches and draws a frontier at the 10th percentile of solved problems' reach.",
    licence: "CC-BY-4.0",
    source_path: "papers/solvability-frontier/main.tex",
    source_hash: "c85d792ca773".repeat(5) + "abcd",
    pdf_hash: "c85d792ca773".repeat(5) + "abce",
    assets: [
      { id: "fig-frontier", path: RESEARCH_FILE.path, caption: "The frontier on 5,209 rows: solved rows in the inner disc.", licence: "CC-BY-4.0", audience: "public" },
      { id: "atlas-big", path: "public/atlas/big.webp", caption: "Token circle.", licence: "MIT code output over CC BY-SA 4.0 and Apache-2.0 data, attributed", audience: "public" },
      { id: "atlas-gone", path: "public/atlas/gone.webp", caption: "Star chart.", licence: "MIT code output over CC BY-SA 4.0 and Apache-2.0 data, attributed", audience: "public" },
    ],
    tables: [{ id: "predictions", path: "public/papers/solvability-frontier/data/predictions.csv", format: "csv", label: "Predictions, 2,085 ranked open problems", licence: "CC BY-SA 4.0", audience: "public" }],
    record_sets: [],
    attributions: [
      { source: "formal-conjectures, Google DeepMind", url: "https://github.com/google-deepmind/formal-conjectures", licence: "Apache-2.0", rows: 3557, notice: "Statements from formal-conjectures by Google DeepMind, Apache License 2.0. Each row links its Lean source." },
      { source: "Wikipedia, lists of unsolved problems", url: "https://en.wikipedia.org/wiki/Lists_of_unsolved_problems", licence: "CC BY-SA 4.0", rows: 1283, notice: "Text from Wikipedia under CC BY-SA 4.0. Each row links its page. Copies and edits keep this licence and this credit." },
      { source: "Science, AAAS question lists", url: "https://web.archive.org/web/2023id_/https://www.science.org/do/10.1126/resource.2499249/full/sjtu-booklet.pdf", licence: "AAAS copyright; headline under 15 words cited, statement paraphrased", rows: 239, notice: "Headlines cited from two AAAS question lists. Each row links its list. Statements are paraphrased by Bucket Foundation." },
    ],
  },
};

const WORKSPACE_ITEMS = [
  { type: "tables", key: "output:solvability-frontier:atlas-problems", title: "Atlas problems", from: { kind: "output", id: "solvability-frontier", title: "The Solvability Frontier" }, origin: "shipped", licence: "mixed", changed: true, opens: "#/research/solvability-frontier/data/atlas-problems", explore: null },
  { type: "records", key: "output:solvability-frontier:problems", title: "Problem records", from: { kind: "output", id: "solvability-frontier", title: "The Solvability Frontier" }, origin: "local", licence: "CC BY-SA 4.0", changed: false, opens: "#/research/solvability-frontier/records/problems", explore: null },
  { type: "figures", key: "output:solvability-frontier:fig-frontier", title: "The frontier on 5,209 rows", from: { kind: "output", id: "solvability-frontier", title: "The Solvability Frontier" }, origin: "staff", licence: "CC-BY-4.0", changed: true, opens: "#/research/solvability-frontier/figures/fig-frontier", explore: null },
  { type: "papers", key: "output:solvability-frontier:paper", title: "The Solvability Frontier", from: { kind: "output", id: "solvability-frontier", title: "The Solvability Frontier" }, origin: "shipped", licence: "", changed: false, opens: "#/research/solvability-frontier/paper", explore: null },
  { type: "records", key: "dataset:canon:all", title: "The canon", from: { kind: "dataset", id: "canon", title: "The canon" }, origin: "shipped", licence: "", changed: false, opens: "#/data", explore: null },
];

function empty(): Stub {
  return {
    researchList: async () => ({ outputs: [] }),
    workspaceItems: async () => ({ items: [], total: 0, page: 1, size: 50 }),
    researchManifest: () => Promise.reject(new ApiError("no such output", 404)),
    researchTable: () => Promise.reject(new ApiError("the output has no such table", 404)),
    researchNew: () => Promise.reject(new ApiError("an output already has that short name", 409)),
    researchBuild: async () => ({ state: "refused", reason: "builds are off for this output", install: null, status: 403 }),
    researchBuildState: async () => ({ pending: null, job: null }),
    researchUpload: () => Promise.reject(new ApiError("the file does not read as png", 415)),
    researchChanges: async () => ({ notice: "Edits are kept on this computer as plain files, so the tools that build a paper can read them.", changes: [] }),
    researchSource: () => Promise.reject(new ApiError("the output does not list that file", 404)),
    researchPage: async () => ({ state: "preview", reason: "pdftoppm is missing, so the paper shows as a preview", install: "sudo dnf install poppler-utils" }),
    researchText: () => Promise.reject(new ApiError("the output does not list that file", 404)),
    image: () => Promise.reject(new ApiError("the output does not list that file", 404)),
    data: async () => [],
    dataRecords: async () => ({ total: 0, offset: 0, limit: 50, records: [] }),
    dataRecord: () => Promise.reject(new ApiError("no such record", 404)),
    progress: progress({}),
    decks: async () => [],
    atoms: async () => [],
    quiz: async () => [],
    due: async () => [],
    notes: async () => [],
    history: async () => ({ snapshot: null, activity: days(() => 0) }),
    workStatus: async () => ({ beads: 0, prs: 0, repo: null, repoError: null, chat: { claude: false, codex: false }, languages: [], ready: false, answered: 0, correct: 0 }),
    settings: async () => ({ version: "0.5.0", build: null, dataDir: "/data/bucket", notify: { supported: true, on: false, at: null }, notifyDefault: "08:53" }),
    workLanguages: async () => ({ languages: [], available: [] }),
    workSetLanguages: async (languages: string[]) => ({ languages }),
    wordLicence: async () => WORD_LICENCE,
    wordDecks: async () => NO_WORD_DECKS,
    installedDecks: async () => NO_DECKS_BODY,
    library: async () => EMPTY_LIBRARY,
    polingualLink: async () => ({ freeText: false, linked: false, place: null, reachable: false, words: null }),
    wordLessons: async () => ({ ...WORD_LESSON_LIST, lessons: [] }),
    wordLesson: () => Promise.reject(new ApiError("no such lesson", 404)),
    wordConcepts: async () => NO_CONCEPTS,
    wordQuiz: async () => ({ questions: [], credit: WORD_CREDIT }),
    workNext: () => Promise.reject(new ApiError("no sources: pick a beads file, a repository or a language", 404)),
    dailyQuiz: () => Promise.reject(new ApiError("no quiz for that day", 404)),
    jobs: async () => ({ kinds: ALL_KINDS, jobs: [] }),
    advisor: async () => ({ review: null, forgotten: 0 }),
    primeDirections: async () => [],
    ros: async () => null,
    canonAbout: async () => ({ version: null, excerpts: 0, branches: [], licences: [] }),
    exploreSaved: async () => ({ v: 1, items: [], noticeSeen: false }),
    putExploreSaved: async (s: unknown) => s,
    canonSearch: async () => [],
    canonExcerpt: () => Promise.reject(new ApiError("no such excerpt", 404)),
  };
}

function populated(over: Stub = {}): Stub {
  return {
    ...empty(),
    researchList: async () => ({ outputs: RESEARCH_ROWS }),
    workspaceItems: async (type: string) => ({ items: WORKSPACE_ITEMS.filter((i) => i.type === type), total: WORKSPACE_ITEMS.filter((i) => i.type === type).length, page: 1, size: 50 }),
    researchManifest: async () => RESEARCH_DETAIL,
    researchChanges: async () => ({
      notice: "Edits are kept on this computer as plain files, so the tools that build a paper can read them.",
      changes: [{ path: "papers/solvability-frontier/main.tex", state: "edited", base: null, shipped: "", current: "", size: 40, shippedSize: 38, added: 1, removed: 1, hunks: [] }],
    }),
    researchSource: async () => ({ text: "\\section{Method} We embed each statement and rank the open problems.", rev: "" }),
    researchPage: async () => ({ state: "ready", pages: 2, pdf: "c85d792ca773".repeat(5) + "abcd", src: "data:image/png;base64,AAAA" }),
    researchText: async () => "\\section{Method} We embed each statement and rank the open problems.",
    researchTable: async () => ({ columns: ["title", "branch", "status", "class"], rows: [["Goldbach conjecture", "mathematics", "open", "close to known results"], ["Twin primes", "mathematics", "open", "borderline"]], index: [0, 1], total: 2, page: 1, size: 50, pinned: [], truncated: false }),
    image: async () => "data:image/webp;base64,AAAA",
    data: async () => DATASETS,
    dataRecords: async () => ({ total: DATA_ROWS.length, offset: 0, limit: 50, records: DATA_ROWS }),
    dataRecord: async (_set: string, id: string) => ({ record: DATA_ROWS.find((r) => r.id === id)!, fields: [{ label: "Branch", value: "physics" }, { label: "Text", value: "Entropy rises and entropy never falls." }] }),
    decks: async () => DECKS,
    atoms: async (deck: string) => ATOMS[deck] ?? [],
    quiz: async () => [{ itemId: "ph-heat", prompt: "What moves when heat flows?", choices: ["Energy", "Mass"], limitSec: 30 }],
    due: async () => [{ id: "ph-heat", title: "Heat", prompt: "Define heat.", answer: "Energy in transit." }],
    notes: async () => [{ id: "n1", title: "Reading list", body: "Start with Carnot.", pinned: true, createdAt: 1, updatedAt: 2 }],
    history: async () => ({ snapshot: null, activity: days((i) => i % 4) }),
    workStatus: async () => ({ beads: 8, prs: 3, repo: "work/project", repoError: "git log did not run in that folder", chat: { claude: true, codex: false }, languages: ["he"], ready: true, answered: 2, correct: 1 }),
    workLanguages: async () => ({ languages: ["he"], available: [{ code: "he", name: "Hebrew" }] }),
    wordDecks: async () => WORD_DECKS,
    installedDecks: async () => DECKS_BODY,
    library: async () => LIBRARY,
    polingualLink: async () => ({ freeText: true, linked: true, place: "127.0.0.1:5433/polingual", reachable: true, words: 6564942 }),
    wordLessons: async () => WORD_LESSON_LIST,
    wordLesson: async () => LESSON_PAGE,
    wordConcepts: async () => CONCEPT_PAGE,
    wordQuiz: async () => ({ questions: [WORD_QUESTION], credit: WORD_CREDIT }),
    settings: async () => ({ version: "0.5.0", build: { commit: "e61d7174b", date: "2026-10-08" }, dataDir: "/data/bucket", notify: { supported: true, on: true, at: "08:53" }, notifyDefault: "08:53" }),
    exploreSaved: async () => ({ v: 1, items: [SAVED_ITEM], noticeSeen: true }),
    putExploreSaved: async (s: unknown) => s,
    canonAbout: async () => ({ version: "c85d792ca773", excerpts: 364, branches: ["02-physics", "07-mind"], licences: [{ kind: "pubmed", name: "PubMed abstracts", terms: "Publisher copyright.", url: "https://pubmed.ncbi.nlm.nih.gov", works: 1 }] }),
    canonSearch: async () => [{ claim_id: 7, branch: "02-physics", concept: "free-will", slug: "001-a", title: "Claim", score: 2, excerpt: "Claim. Entropy rises and entropy never falls.", evidence_count: 1 }],
    canonExcerpt: async () => ({
      id: 7,
      branch: "02-physics",
      concept: "entropy",
      slug: "001-a",
      title: "Claim",
      text: "Claim. Entropy rises and entropy never falls.",
      source: { title: "A lecture on heat", url: "https://www.youtube.com/watch?v=BBBBBBBBBBB&t=10", timestamp: "00:00:10.000" },
      evidence: [
        { score: 0.71, kind: "pubmed", source_path: "pubmed/PMID-1-x/abstract.txt", text: "Heat flows from hot to cold.", url: "https://pubmed.ncbi.nlm.nih.gov/1/", title: "On heat", author: "A. Writer", openable: true },
        { score: 0.6, kind: "archive", source_path: "archive/item/a.txt", text: "An old book on heat.", url: "https://archive.org/details/item", title: "Old book", author: null, openable: false },
      ],
    }),
    ...jobsStub(JOBS.finished, { ...JOBS.stoppedOnForm, id: "20261001T170000-0a1b2c3d" }),
    workNext: async () => served("populated", "spot_error")!.question,
    dailyQuiz: async () => ({
      day: DAY,
      answered: [],
      questions: [
        { id: "chat-sessions", type: "estimate", prompt: "How many chat sessions did you run in the last two days?", lines: [], choices: null, limitSec: 60, origin: "chat" },
        { id: "chat-day-1", type: "recall", prompt: 'On which day did the session that began "Fix the review buttons" start?', lines: [], choices: ["2026-09-28", "2026-09-29", "2026-09-30"], limitSec: 30 },
      ],
    }),
    ...over,
  };
}

function failing(): Stub {
  const fail = (code: string, status: number) => () => Promise.reject(new ApiError(code, status));
  return {
    progress: progress(null),
    researchList: fail("the research files could not be read", 500),
    workspaceItems: fail("the workspace list could not be read", 500),
    advisor: fail("the people file could not be read", 500),
    researchManifest: fail("public/papers/x/paper.pdf does not match its hash in this build", 409),
    researchTable: fail("the table does not parse", 422),
    researchChanges: fail("the working copy crosses a symlink or a file, so nothing is written", 403),
    researchSource: fail("the path crosses a symlink", 403),
    researchPage: fail("the pages could not be read", 500),
    researchText: fail("the path crosses a symlink", 403),
    image: fail("the path crosses a symlink", 403),
    data: fail("data key does not match", 500),
    dataRecords: fail("no such dataset", 404),
    dataRecord: fail("no such record", 404),
    decks: fail("data key does not match", 500),
    atoms: fail("unknown deck", 404),
    quiz: fail("data key does not match", 500),
    due: fail("data key does not match", 500),
    notes: fail("unauthorized", 401),
    history: fail("data key does not match", 500),
    workStatus: fail("git could not read that folder", 400),
    settings: fail("data key does not match", 500),
    workLanguages: fail("data key does not match", 500),
    wordLicence: fail("data key does not match", 500),
    wordDecks: fail("data key does not match", 500),
    installedDecks: fail("data key does not match", 500),
    library: fail("data key does not match", 500),
    polingualLink: fail("data key does not match", 500),
    wordLessons: fail("unknown language; run bkt learn path for the list", 404),
    wordLesson: fail("no such lesson", 404),
    wordConcepts: fail("data key does not match", 500),
    wordQuiz: fail("unknown language; run bkt learn path for the list", 404),
    workSetLanguages: fail("data key does not match", 500),
    workNext: fail("data key does not match", 500),
    dailyQuiz: fail("give a day written as YYYY-MM-DD", 400),
    jobs: fail("data key does not match", 500),
    startJob: fail("Data file must be one of .csv, .tsv, .json, .jsonl, .txt", 400),
    canonAbout: fail("data key does not match", 500),
    exploreSaved: fail("data key does not match", 500),
    putExploreSaved: fail("bad_saved_list", 400),
    canonSearch: fail("data key does not match", 500),
    canonExcerpt: fail("no such excerpt", 404),
    importWeb: fail("expected { branches: { <deck>: EngineState } }", 400),
    workBeads: fail("no beads found; pick a .beads/issues.jsonl file", 400),
    workRepo: fail("git could not read that folder", 400),
    workChat: fail("send claude and codex as true or false", 400),
  };
}

async function mount(route: Route, stub: Stub) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { Screen } = await import("./nav");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<Screen api={stub as unknown as Api} route={route} />));
  const settle = async () => {
    let last = "";
    for (let i = 0; i < 50; i++) {
      await act(async () => new Promise((r) => setTimeout(r, 0)));
      const now = host.innerHTML;
      if (now === last) return;
      last = now;
    }
    throw new Error("the screen never settled");
  };
  await settle();
  const text = () => strings(host).join("\n");
  const pickFile = async (index: number, file: File) => {
    const input = host.querySelectorAll('input[type="file"]')[index] as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    await settle();
  };
  return { host, text, pickFile, act, unmount: () => act(async () => root.unmount()) };
}

const DAY = "2026-09-30";
const COVERED: Route[] = [{ name: "learn" }, { name: "words", deck: "de" }, { name: "words", deck: "de", lesson: 1 }, { name: "concepts" }, { name: "licence" }, { name: "path" }, { name: "quiz" }, { name: "practice" }, { name: "review" }, { name: "work" }, { name: "daily", day: DAY }, { name: "canon" }, { name: "search" }, { name: "search", id: 7 }, { name: "explore" }, { name: "notes" }, { name: "history" }, { name: "jobs" }, { name: "data" }, { name: "research" }, { name: "research", slug: "solvability-frontier", tab: "report" }, { name: "research", slug: "solvability-frontier", tab: "figures" }, { name: "research", slug: "solvability-frontier", tab: "data" }, { name: "research", slug: "solvability-frontier", tab: "records" }, { name: "research", slug: "solvability-frontier", tab: "paper" }, { name: "research", slug: "solvability-frontier", tab: "changes" }, { name: "workspace" }, { name: "workspace", type: "tables" }, { name: "workspace", type: "records" }, { name: "workspace", type: "figures" }, { name: "workspace", type: "papers" }, { name: "workspace", type: "graphs" }, { name: "workspace", type: "people" }, { name: "workspace", type: "decks" }, { name: "workspace", type: "maps" }, { name: "advisors" }, { name: "import" }, { name: "add" }, { name: "settings" }, { name: "library" }];
const ROS_COVERED: Route[] = [{ name: "graph" }, { name: "graph", branch: "07-mind" }, { name: "node", slug: "02-physics:ph-entropy" }, { name: "progress" }, { name: "profile" }];
const COVERED_NAMES = [...COVERED, ...ROS_COVERED].map((r) => r.name);

const PENDING: { name: Route["name"]; fixedBy: string }[] = [
  { name: "primes", fixedBy: "slice 6, Themes" },
  { name: "atlases", fixedBy: "bkt-cfcs, staff atlases" },
];

describe("navigation", () => {
  test("reads in plain words and leaves out the screens whose actions are not built", async () => {
    const { NAV } = await import("./nav");
    expect(NAV.map((n) => n.label)).toEqual(["Learn", "Path", "Quiz", "Review", "Work quiz", "Graph", "Progress", "Canon", "Explore", "Notes", "History", "Analyze data", "Data", "Research", "Workspaces", "Profile"]);
    expect(NAV.flatMap((n) => DENY.filter((d) => d.re.test(n.label)))).toEqual([]);
  });

  test("every screen is covered here or listed as pending with the slice that fixes it", async () => {
    const { NAV } = await import("./nav");
    const pending = PENDING.map((p) => p.name);
    expect(NAV.map((n) => n.route.name).filter((n) => !COVERED_NAMES.includes(n) && !pending.includes(n))).toEqual([]);
    expect(COVERED_NAMES.filter((n) => pending.includes(n))).toEqual([]);
    expect(PENDING.length).toBeLessThanOrEqual(3);
    expect(PENDING.every((p) => p.fixedBy.length > 0)).toBe(true);
  });

  test("Quiz opens the daily quiz, lights up for every quiz address and offers the practice quiz in one click", async () => {
    const { activeNav, NAV } = await import("./nav");
    const { parseHash } = await import("./router");
    expect(NAV.filter((n) => /quiz/i.test(n.label)).map((n) => [n.label, n.route.name])).toEqual([["Quiz", "quiz"], ["Work quiz", "work"]]);
    expect(["#/quiz", "#/quiz/practice", `#/work/daily/${DAY}`, "#/work"].map((h) => activeNav(parseHash(h)))).toEqual(["quiz", "quiz", "quiz", "work"]);
    const quiz = await mount({ name: "quiz" }, populated());
    expect(quiz.host.querySelector("h1")!.textContent).toBe("Daily quiz");
    expect(Array.from(quiz.host.querySelectorAll(".quiz-kinds a")).map((a) => [a.textContent, a.getAttribute("href")])).toEqual([["Daily quiz", "#/quiz"], ["Practice quiz", "#/quiz/practice"]]);
    await quiz.unmount();
    const practice = await mount(parseHash("#/quiz/practice"), populated());
    expect(practice.host.querySelector("h1")!.textContent).toBe("Practice quiz");
    expect(practice.text()).toContain("What moves when heat flows?");
    expect(violations(practice.host)).toEqual([]);
    await practice.unmount();
    const old = await mount(parseHash(`#/work/daily/${DAY}`), populated());
    expect(old.host.querySelector("h1")!.textContent).toBe("Daily quiz");
    expect(old.host.querySelector(".head .muted")!.textContent).toContain(DAY);
    await old.unmount();
  });

  test("the review workspace reads in plain words", async () => {
    const { UNREVIEWED, QUALITY_MISSING, qualityLine, REASONS } = await import("./alignment");
    const { NO_QUEUE, NEED_NAME, NO_LABEL, KEYS_HINT, QUEUE_LABELS } = await import("./views/Alignment");
    const words = [UNREVIEWED, QUALITY_MISSING, qualityLine([{ links: 40, right: 16, partly: 13, wrong: 11 }, { links: 40, right: 16, partly: 18, wrong: 6 }]), qualityLine([{ links: 5, right: 3, partly: 1, wrong: 1 }]), NO_QUEUE, NEED_NAME, NO_LABEL, KEYS_HINT, ...Object.values(QUEUE_LABELS), ...REASONS, "Proposed link, unreviewed", "Proposed relation", "Match score", "Level of the row", "Course or framework", "Bring in another review", "Export the review", "No match exists", "Search the corpus to add a link", "Brought in 2 opinions from another review. Each shows beside its link and decides nothing: a link counts only when you mark it yourself. 1 differs from a decision of yours.", "Another reviewer said right: Brook Sample on 2026-10-13", "Another reviewer said no match exists"];
    expect(violationsIn(words)).toEqual([]);
    expect(words.filter((w) => /[\u2013\u2014]/.test(w) || VOICE.test(w))).toEqual([]);
  });

  test("the Back button and the quiz kinds read in plain words", async () => {
    const { BackButton, BackTrail, BACK_HINT, BACK_LABEL, BACK_NAME } = await import("./back");
    const { PRACTICE_NOTE, QUIZ_KINDS, QUIZ_KINDS_NAME } = await import("./views/Quiz");
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const history = { state: null as unknown, replaceState(state: unknown) { this.state = state; }, pushState(state: unknown) { this.state = state; }, back() {} };
    await act(async () => root.render(<BackButton trail={new BackTrail(history)} />));
    expect(strings(host).sort()).toEqual([BACK_HINT, BACK_LABEL, BACK_NAME].sort());
    expect(violations(host)).toEqual([]);
    const words = [BACK_HINT, BACK_LABEL, BACK_NAME, PRACTICE_NOTE, QUIZ_KINDS_NAME, "Open the lesson on", ...QUIZ_KINDS.map((k) => k.label)];
    expect(violationsIn(words)).toEqual([]);
    expect(words.filter((w) => /[\u2013\u2014]/.test(w) || VOICE.test(w))).toEqual([]);
    await act(async () => root.unmount());
  });

  test("the work quiz joins the menu only for someone who has set it up", async () => {
    const { navFor } = await import("./nav");
    expect(navFor(false).map((n) => n.label)).toEqual(["Learn", "Path", "Quiz", "Review", "Graph", "Progress", "Canon", "Explore", "Notes", "History", "Analyze data", "Data", "Research", "Workspaces", "Profile"]);
    expect(navFor(true).map((n) => n.label)).toContain("Work quiz");
  });

  test("no screen in the navigation needs a file or shows a format word", async () => {
    const { navFor, FOOT_LINK, FOOT_LINKS } = await import("./nav");
    expect(FOOT_LINK.label).toBe("Add your own");
    expect(FOOT_LINKS.map((l) => [l.label, l.route.name])).toEqual([["Add your own", "add"], ["Settings", "settings"]]);
    for (const n of navFor(true)) {
      for (const stub of [empty, populated, failing]) {
        const v = await mount(n.route, stub());
        expect({ screen: n.label, fileInputs: v.host.querySelectorAll('input[type="file"]').length, bad: violations(v.host) }).toEqual({ screen: n.label, fileInputs: n.label === "Analyze data" ? 1 : 0, bad: [] });
        await v.unmount();
      }
    }
  });

  test("Add your own opens one page with two plain choices, and Import holds one button", async () => {
    const add = await mount({ name: "add" }, empty());
    expect(Array.from(add.host.querySelectorAll("a")).map((a) => [a.textContent!.split("\n")[0], a.getAttribute("href")])).toEqual([
      [expect.stringContaining("Bring progress from the website"), "#/import"],
      [expect.stringContaining("Analyze my data"), "#/jobs"],
    ]);
    expect(add.host.querySelector('input[type="file"]')).toBeNull();
    await add.unmount();
    const imp = await mount({ name: "import" }, populated());
    expect(imp.host.querySelectorAll('input[type="file"]').length).toBe(1);
    expect(imp.text()).not.toContain("Choose tasks file");
    expect(imp.host.querySelector('input[type="checkbox"]')).toBeNull();
    await imp.unmount();
  });

  test("the work quiz links to Settings, and the old setup address opens Settings", async () => {
    const { parseHash } = await import("./router");
    const work = await mount({ name: "work" }, populated());
    expect(work.host.querySelector('a[href="#/settings"]')!.textContent).toBe("Settings");
    await work.unmount();
    expect(parseHash("#/setup")).toEqual({ name: "settings" });
    const setup = await mount(parseHash("#/setup"), populated());
    expect(setup.host.querySelector("h1")!.textContent).toBe("Settings");
    expect(setup.text()).toContain("Choose tasks file");
    await setup.unmount();
  });

  test("Settings holds the chat switches, the languages, the notification switch, the data folder and the version", async () => {
    const sent: [boolean, string | undefined][] = [];
    const setNotify = async (on: boolean, at?: string) => (sent.push([on, at]), { notify: { supported: true, on, at: on ? (at ?? "08:53") : null } });
    const on = await mount({ name: "settings" }, populated({ setNotify }));
    const text = on.text();
    for (const want of ["Claude chats", "Codex chats", "Hebrew", "Daily notification", "Data folder", "/data/bucket", "Version", "0.5.0, built from the work up to 2026-10-08"]) expect(text).toContain(want);
    for (const want of ["Installed decks", "Spanish words", "755,090 words · 96.0 MB", "Arabic words", "24,278 words · 5.0 MB", "Wiktionary via Kaikki (kaikki.org)", "CC-BY-SA 3.0", "curated by Bucket Foundation"]) expect(text).toContain(want);
    expect(text).not.toContain("terminal");
    expect(text).not.toContain("bkt quiz");
    const box = on.host.querySelector(".notify input[type=checkbox]") as HTMLInputElement;
    const time = on.host.querySelector(".notify input[type=time]") as HTMLInputElement;
    expect([box.checked, time.value, time.getAttribute("aria-label")]).toEqual([true, "08:53", "Time of day"]);
    expect(on.host.querySelectorAll('input[type="checkbox"]').length).toBe(3);
    await on.act(async () => box.click());
    await on.act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(sent).toEqual([[false, undefined]]);
    expect(on.host.querySelector(".notify .status")!.textContent).toBe("Off.");
    expect(violations(on.host)).toEqual([]);
    await on.unmount();

    const off = await mount({ name: "settings" }, empty());
    const offBox = off.host.querySelector(".notify input[type=checkbox]") as HTMLInputElement;
    expect([offBox.checked, (off.host.querySelector(".notify input[type=time]") as HTMLInputElement).value]).toEqual([false, "08:53"]);
    expect(off.text()).toContain("0.5.0");
    expect(off.text()).toContain("No extra deck is installed. Bucket teaches from the words it ships with.");
    expect(violations(off.host)).toEqual([]);
    await off.unmount();

    const refused = await mount({ name: "settings" }, { ...empty(), setNotify: () => Promise.reject(new ApiError("Bucket could not change the daily notification", 500)) });
    await refused.act(async () => (refused.host.querySelector(".notify input[type=checkbox]") as HTMLInputElement).click());
    await refused.act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(refused.host.querySelector(".notify .status")!.textContent).toBe("Bucket could not change the daily notification.");
    expect((refused.host.querySelector(".notify input[type=checkbox]") as HTMLInputElement).checked).toBe(false);
    await refused.unmount();

    const other = await mount({ name: "settings" }, { ...empty(), settings: async () => ({ version: "0.5.0", build: null, dataDir: "/Users/ada/Library/bkt", notify: { supported: false, on: false, at: null }, notifyDefault: "08:53" }) });
    expect(other.text()).toContain("The daily notification is not available on this system yet.");
    expect(other.host.querySelector(".notify")).toBeNull();
    expect(violations(other.host)).toEqual([]);
    await other.unmount();
  });

  test("the removed screens still open from their address", async () => {
    const { parseHash } = await import("./router");
    for (const [name, heading] of [["advisors", "Advisors"], ["primes", "Prime directions"], ["atlases", "Atlases"], ["jobs", "Analyze data"], ["import", "Import"]] as const) {
      expect(parseHash(`#/${name}`)).toEqual({ name });
      const v = await mount({ name }, empty());
      expect(v.host.querySelector("h1")!.textContent).toBe(heading);
      await v.unmount();
    }
  });

  test("a pending screen leaves the list once it reads in plain words", async () => {
    for (const p of PENDING) {
      const v = await mount({ name: p.name } as Route, empty());
      expect({ screen: p.name, stillFails: violations(v.host).length > 0 }).toEqual({ screen: p.name, stillFails: true });
      await v.unmount();
    }
  });
});

describe("plain words", () => {
  for (const route of COVERED) {
    for (const [state, stub] of [["empty", empty], ["populated", populated], ["failing", failing]] as const) {
      test(`${href(route)}, ${state}`, async () => {
        const v = await mount(route, stub());
        expect(v.text().length).toBeGreaterThan(0);
        expect(violations(v.host)).toEqual([]);
        await v.unmount();
      });
    }
  }

  test("the denylist catches each format word, path and id", () => {
    const host = document.createElement("div");
    for (const s of ["Open review.json", "Pick .beads/issues.jsonl", "a .csv table", "TSV rows", "notes.md", "log.txt", "open /api/research-os/production", "its Python", "numpy missing", "keyed hashes", "~/code/your-repo", "bkt-398t", "02-physics", "target_node_id", "c85d792ca773", "a PDF", "feed.xml", "a zip", "git log did not run", "Use repository", "3 merged PRs", "launch token", "stdout", "~/code/your-repo", "<deck>", "{tab}", "YYYY-MM-DD", "undefined due", "[object Object]"]) {
      host.textContent = s;
      expect({ s, caught: violations(host).length > 0 }).toEqual({ s, caught: true });
    }
    for (const s of ["2026-09-30", "Daily activity for 60 days", "Your last 60 days on this computer.", "Bring your progress over from the website."]) {
      host.textContent = s;
      expect({ s, caught: violations(host) }).toEqual({ s, caught: [] });
    }
  });
});

describe("what the helper sends", () => {
  test("every kind of work question reads in plain words, with its answer and reason", async () => {
    for (const type of QUIZ_TYPES.filter((t) => t !== "which_first" || WORK.prs.length > 1)) {
      let made = 0;
      for (let i = 0; i < 40; i++) {
        const s = served(`${type}-${i}`, type);
        if (!s) continue;
        made++;
        const { question: q, answer: a } = s;
        expect({ seed: i, type, bad: violationsIn([q.prompt, ...q.lines, ...(q.choices ?? []), a.answer, a.explain]) }).toEqual({ seed: i, type, bad: [] });
      }
      expect({ type, made: made > 0 }).toEqual({ type, made: true });
      const s = served(`${type}-shown`, type) ?? served(`${type}-0`, type)!;
      const v = await mount({ name: "work" }, populated({ workNext: async () => s.question, workAnswer: async () => s.answer }));
      expect(v.text()).toContain(s.question.prompt);
      const choice = v.host.querySelector("button.choice") as HTMLButtonElement | null;
      if (choice) {
        await v.act(async () => choice.click());
        expect(v.text()).toContain(s.answer.explain);
      }
      expect(violations(v.host)).toEqual([]);
      await v.unmount();
    }
  });

  test("the text of a refusal never reaches a screen", async () => {
    for (const [code, status] of SERVER_ERRORS) {
      const e = new ApiError(code, status);
      expect(e.message).toBe(plainError(status));
      expect(violationsIn([e.message])).toEqual([]);
      const fail = () => Promise.reject(new ApiError(code, status));
      for (const route of COVERED.filter((r) => r.name !== "canon")) {
        const v = await mount(route, { ...failing(), decks: fail, quiz: fail, due: fail, researchList: fail, researchManifest: fail, image: fail, notes: fail, history: fail, workNext: fail, workStatus: fail, dailyQuiz: fail, canonAbout: fail, canonExcerpt: fail });
        if (code) expect({ route: route.name, code, leaked: v.text().includes(code) }).toEqual({ route: route.name, code, leaked: false });
        expect(violations(v.host)).toEqual([]);
        await v.unmount();
      }
    }
    expect(violationsIn([PROGRESS_TROUBLE])).toEqual([]);
  });
});

describe("analyze data", () => {
  const open = async (v: Awaited<ReturnType<typeof mount>>, label: string) => {
    const b = Array.from(v.host.querySelectorAll("button")).find((x) => x.textContent === label) as HTMLButtonElement;
    await v.act(async () => b.click());
  };

  test("offers one action and never the fit job", async () => {
    const v = await mount({ name: "jobs" }, empty());
    expect(v.host.querySelector("h1")!.textContent).toBe("Analyze data");
    expect(v.host.querySelector(".head p")!.textContent).toBe("Find patterns in your own data.");
    expect(Array.from(v.host.querySelectorAll("label.file span")).map((e) => e.textContent)).toEqual(["Choose data"]);
    expect(v.host.querySelectorAll("select, button").length).toBe(0);
    expect(v.text()).not.toContain("people");
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("a job of another kind never shows", async () => {
    const v = await mount({ name: "jobs" }, { ...empty(), ...jobsStub(job({ kind: "fit-me", result: { imported: 160, forgotten: 0 } })) });
    expect(v.host.querySelectorAll(".jobs li").length).toBe(0);
    await v.unmount();
  });

  test("a finished analysis shows rows, columns and warnings as sentences", async () => {
    const v = await mount({ name: "jobs" }, { ...empty(), ...jobsStub(JOBS.finished) });
    expect(v.host.querySelector(".tag")!.textContent).toBe("Finished");
    expect(v.host.querySelector(".big-line")!.textContent).toBe("40 rows, 5 columns");
    expect(Array.from(v.host.querySelectorAll("table.columns tbody tr")).map((r) => Array.from(r.children).map((c) => c.textContent))).toEqual([
      ["day", "date", "", "", ""],
      ["sleep", "number", "h", "", "6 to 8"],
      ["focus", "whole number", "", "", "50 to 89"],
      ["mood", "text", "", "5", ""],
      ["note", "text", "", "", ""],
    ]);
    expect(Array.from(v.host.querySelectorAll(".notes li")).map((e) => e.textContent)).toEqual(['"mood" has 5 empty cells.', 'The dates in "day" are out of order. Bucket sorted them.', '"day" repeats 12 dates.']);
    expect(v.text()).toContain('Time runs along "day".');
    expect(v.host.querySelector("pre")).toBeNull();
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("the raw output and the log sit behind Show details, as exact strings", async () => {
    const v = await mount({ name: "jobs" }, { ...empty(), ...jobsStub(JOBS.finished) });
    await open(v, "Show details");
    const shown = Array.from(v.host.querySelectorAll("pre")).map((e) => e.textContent ?? "");
    expect(shown).toEqual([JSON.stringify(JOBS.finished.result, null, 2), JOBS.finished.log]);
    expect(violations(v.host).length).toBeGreaterThan(0);
    for (const s of shown) ALLOW.add(s.trim());
    expect(violations(v.host)).toEqual([]);
    for (const s of shown) ALLOW.delete(s.trim());
    await open(v, "Hide details");
    expect(v.host.querySelector("pre")).toBeNull();
    await v.unmount();
  });

  test("each state reads Working, Finished, Did not finish or Stopped", async () => {
    const { STATE_WORDS } = await import("./views/Jobs");
    expect(STATE_WORDS).toEqual({ running: "Working", done: "Finished", failed: "Did not finish", cancelled: "Stopped", timeout: "Did not finish" });
    for (const [j, word, line] of [
      [JOBS.working, "Working", "Bucket is reading your data."],
      [JOBS.stopped, "Stopped", "You stopped this one."],
      [JOBS.tooLong, "Did not finish", "This took longer than Bucket allows."],
      [JOBS.crashed, "Did not finish", "Bucket could not finish this."],
    ] as const) {
      const v = await mount({ name: "jobs" }, { ...empty(), ...jobsStub(j) });
      expect(v.host.querySelector(".tag")!.textContent).toBe(word);
      expect(v.text()).toContain(line);
      expect(violations(v.host)).toEqual([]);
      await v.unmount();
    }
    const working = await mount({ name: "jobs" }, { ...empty(), ...jobsStub(JOBS.working) });
    expect(working.host.querySelector("label.file span")!.textContent).toBe("Working…");
    expect((working.host.querySelector('input[type="file"]') as HTMLInputElement).disabled).toBe(true);
    expect(Array.from(working.host.querySelectorAll("button.ghost")).map((b) => b.textContent)).toEqual(["Stop"]);
    await working.unmount();
  });

  test("a table Bucket cannot analyze says why in sentences", async () => {
    const v = await mount({ name: "jobs" }, { ...empty(), ...jobsStub(JOBS.stoppedOnForm) });
    expect(v.host.querySelector(".tag")!.textContent).toBe("Did not finish");
    expect(Array.from(v.host.querySelectorAll(".notes li")).map((e) => e.textContent)).toEqual(["Two columns share a name.", "The table has no column of numbers to analyze."]);
    expect(v.host.querySelector("table")).toBeNull();
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("a missing piece shows one button that copies the install line", async () => {
    const { NEEDS_PIECE, COPIED } = await import("./views/Jobs");
    expect(NEEDS_PIECE).toBe("Bucket needs one more piece to do this");
    for (const j of [JOBS.noModule, JOBS.noPython]) {
      const copies: string[] = [];
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t: string) => void copies.push(t) }, configurable: true });
      const v = await mount({ name: "jobs" }, { ...empty(), ...jobsStub(j) });
      expect(v.host.querySelector("h3")!.textContent).toBe(NEEDS_PIECE);
      expect(Array.from(v.host.querySelectorAll("button.primary")).map((b) => b.textContent)).toEqual(["Copy the install line"]);
      expect(violations(v.host)).toEqual([]);
      await open(v, "Copy the install line");
      expect(copies).toEqual(["python3 -m pip install --user numpy"]);
      expect(v.text()).toContain(COPIED);
      expect(violations(v.host)).toEqual([]);
      await open(v, "Show details");
      expect(v.host.querySelector("pre")!.textContent).toBe(j.error!);
      await v.unmount();
    }
  });

  test("a file of the wrong kind, a large file and a refusal read in plain words", async () => {
    const { WRONG_KIND, TOO_LARGE } = await import("./views/Jobs");
    const sent: unknown[] = [];
    const v = await mount({ name: "jobs" }, { ...empty(), startJob: (...a: unknown[]) => (sent.push(a), Promise.reject(new ApiError("another job is running; cancel it or wait", 409))) });
    const status = () => v.host.querySelector(".status")!.textContent;
    await v.pickFile(0, new File(["x"], "photo.png"));
    expect(status()).toBe(WRONG_KIND);
    const big = new File(["x"], "table.csv");
    Object.defineProperty(big, "size", { value: 17 * 1024 * 1024 });
    await v.pickFile(0, big);
    expect(status()).toBe(TOO_LARGE);
    expect(sent).toEqual([]);
    await v.pickFile(0, new File(["a,b\n1,2\n"], "Table.CSV"));
    expect(sent).toEqual([["analyze", { data: { text: "a,b\n1,2\n", ext: ".csv" } }]]);
    expect(status()).toBe(plainError(409));
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("every warning and problem the analyzer writes has a plain sentence", async () => {
    const { noteSentence } = await import("./views/Jobs");
    const real: [string, string, string][] = [
      ["W_TRUNCATED", "body", "read the first 200000 rows; raise --max-rows to read more"],
      ["W_PREAMBLE", "header", "skipped 3 rows above the header"],
      ["W_MIXED", "sleep_h", "only 80% of values parse as one type"],
      ["W_EMPTY_COLUMN", "mood", "every value is missing"],
      ["W_MISSING", "mood", "5 missing (12.5%)"],
      ["W_CONSTANT", "note", "constant column"],
      ["W_TIME_ORDER", "day", "time index is not sorted; analysis sorts it"],
      ["W_TIME_DUP", "day", "12 repeated time values"],
      ["W_NO_TIME", "header", "no time index found; trend, seasonality and helix skipped"],
      ["W_DUP_ROWS", "body", "4 duplicate rows"],
      ["E_READ", "data/table.csv", "E_MAGIC: contents do not match xlsx"],
      ["E_HEADER", "header", "blank column names at [2]"],
      ["E_DUP_COLUMN", "header", "duplicate columns ['name']"],
      ["E_EMPTY", "body", "header but no rows"],
      ["E_NO_NUMERIC", "columns", "no numeric columns to analyze"],
      ["E_RAGGED", "record 4", "3 fields, header has 5"],
      ["E_KEYS", "record 2", "missing keys ['a']"],
      ["W_FUTURE", "body", "a code this window has never seen"],
    ];
    const lines = real.map(([code, where, message]) => noteSentence({ code, where, message }));
    expect(violationsIn(lines)).toEqual([]);
    expect(lines[0]).toBe("Bucket read the first 200,000 rows.");
    expect(lines[2]).toBe('"sleep h" mixes kinds of values.');
    expect(lines.filter((l) => l.includes("noticed something else")).length).toBe(1);
  });
});

describe("path", () => {
  const withAtoms = (physics: Atom[], branches: Record<string, { data: unknown }> = {}) => populated({ atoms: async (deck: string) => (deck === "02-physics" ? physics : ATOMS[deck]), progress: progress(branches) });

  test("lists topics by title and never by id", async () => {
    const v = await mount({ name: "path", to: "ph-second-law" }, populated());
    expect(v.text()).toContain("Second law");
    expect(Array.from(v.host.querySelectorAll(".steps-list .who")).map((e) => e.firstChild!.textContent)).toEqual(["Heat", "Entropy", "Second law"]);
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("a topic Bucket lacks, as the goal or as a requirement", async () => {
    const { MISSING_TOPIC, UNKNOWN_TOPIC } = await import("./views/Path");
    const goal = await mount({ name: "path", to: "ph-gone" }, populated());
    expect(goal.host.querySelector(".error")!.textContent).toBe(UNKNOWN_TOPIC);
    expect(violations(goal.host)).toEqual([]);
    await goal.unmount();
    const need = await mount({ name: "path", to: "ph-entropy" }, withAtoms([{ id: "ph-entropy", title: "Entropy", requires: ["ph-gone"] }]));
    expect(need.host.querySelector(".error")!.textContent).toBe(MISSING_TOPIC);
    expect(MISSING_TOPIC).toBe("This needs a topic Bucket does not have yet.");
    expect(violations(need.host)).toEqual([]);
    await need.unmount();
  });

  test("topics that wait on each other, in a loop of three", async () => {
    const { TOPIC_CYCLE } = await import("./views/Path");
    const v = await mount({ name: "path", to: "ph-entropy" }, withAtoms([{ id: "ph-entropy", title: "Entropy", requires: ["ph-heat"] }, { id: "ph-heat", title: "Heat", requires: ["ph-work"] }, { id: "ph-work", title: "Work", requires: ["ph-entropy"] }]));
    expect(v.host.querySelector(".error")!.textContent).toBe(TOPIC_CYCLE);
    expect(TOPIC_CYCLE).toBe("Some topics wait on each other.");
    expect(Array.from(v.host.querySelectorAll(".error")).map((e) => e.textContent)).toEqual([TOPIC_CYCLE]);
    expect(v.host.querySelectorAll(".topic-map .topic").length).toBe(4);
    expect(v.host.querySelectorAll(".topic-map .edge").length).toBe(3);
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("no topics: one sentence and no map", async () => {
    const { NO_TOPICS } = await import("./views/Path");
    const v = await mount({ name: "path" }, empty());
    expect(v.text()).toContain(NO_TOPICS);
    expect(v.host.querySelector(".topic-map")).toBeNull();
    expect(v.host.querySelector(".grip")).toBeNull();
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("the map names each topic with its state in words and a shape", async () => {
    const { GRIP_CAPTION, PICK_A_TOPIC } = await import("./views/Path");
    const physics = ATOMS["02-physics"];
    const now = Date.now();
    let s = grade(normalizeState(null), physics, {}, "ph-heat", 3, "recall", now - 40 * 86_400_000);
    s = grade(s, physics, {}, "ph-entropy", 3, "recall", now);
    const v = await mount({ name: "path" }, withAtoms(physics, { "02-physics": { data: s } }));
    const labels = Array.from(v.host.querySelectorAll(".topic-map .topic")).map((g) => g.getAttribute("aria-label")).sort();
    expect(labels).toEqual(["Entropy. Known.", "Heat. Due.", "Limit. New.", "Second law. New."]);
    expect(v.host.querySelector(".topic.due path.glyph")).not.toBeNull();
    expect(v.host.querySelector(".topic.known circle.glyph.solid")).not.toBeNull();
    expect(v.host.querySelector(".topic.new circle.glyph.hollow")).not.toBeNull();
    expect(v.host.querySelectorAll(".topic-map .edge").length).toBe(2);
    expect(v.text()).toContain("4 topics joined by 2 links.");
    expect(v.text()).toContain(GRIP_CAPTION);
    expect(v.text()).toContain(PICK_A_TOPIC);
    expect(v.host.querySelector(".topic-map svg")!.getAttribute("tabindex")).toBe("0");
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("a locked topic is drawn as locked", async () => {
    const v = await mount({ name: "path" }, populated());
    const labels = Array.from(v.host.querySelectorAll(".topic-map .topic")).map((g) => g.getAttribute("aria-label")).sort();
    expect(labels).toEqual(["Entropy. Locked.", "Heat. New.", "Limit. New.", "Second law. Locked."]);
    expect(v.host.querySelector(".topic.locked rect.glyph.hollow")).not.toBeNull();
    await v.unmount();
  });

  test("picking a topic shows what it needs and opens, and the sphere follows", async () => {
    const v = await mount({ name: "path" }, populated());
    const node = (name: string) => Array.from(v.host.querySelectorAll(".topic-map .topic")).find((g) => g.getAttribute("aria-label")!.startsWith(name))!;
    const pressed = () => Array.from(v.host.querySelectorAll(".grip-rows .branch")).filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent);
    expect(pressed()).toEqual([]);
    await v.act(async () => node("Entropy").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(window.location.hash).toBe("#/path/ph-entropy");
    expect(node("Entropy").getAttribute("aria-pressed")).toBe("true");
    const panel = v.host.querySelector(".topic-panel")!;
    expect(panel.querySelector("h2")!.textContent).toBe("Entropy");
    expect(Array.from(panel.querySelectorAll("h3")).map((h) => h.textContent)).toEqual(["Needs first", "Opens next", "Learn in this order"]);
    expect(Array.from(panel.querySelectorAll(".linked")).map((u) => Array.from(u.querySelectorAll(".link")).map((b) => b.textContent))).toEqual([["Heat"], ["Second law"]]);
    const start = panel.querySelector("a.start") as HTMLAnchorElement;
    expect(start.textContent).toBe("Start with Heat");
    expect(start.getAttribute("href")).toBe("#/learn/02-physics/ph-heat");
    expect(Array.from(panel.querySelectorAll(".steps-list a.go")).map((a) => a.getAttribute("href"))).toEqual(["#/learn/02-physics/ph-heat"]);
    expect(pressed()).toEqual(["physics"]);
    expect(violations(v.host)).toEqual([]);

    const maths = Array.from(v.host.querySelectorAll(".grip-rows .branch")).find((b) => b.textContent === "mathematics") as HTMLButtonElement;
    await v.act(async () => maths.click());
    expect(pressed()).toEqual(["mathematics"]);
    expect(window.location.hash).toBe("#/path");
    expect(v.host.querySelector(".topic-panel h2")).toBeNull();
    expect(Array.from(v.host.querySelectorAll(".topic-map .topic.dim")).map((g) => g.getAttribute("aria-label")).sort()).toEqual(["Entropy. Locked.", "Heat. New.", "Second law. Locked."]);

    await v.act(async () => node("Heat").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(pressed()).toEqual(["physics"]);
    expect(v.host.querySelectorAll(".topic-map .topic.dim").length).toBe(0);
    expect(violations(v.host)).toEqual([]);
    window.location.hash = "";
    await v.unmount();
  });

  test("start never targets a locked topic", async () => {
    const { startFor } = await import("./views/Path");
    const needs = new Map([["a", []], ["b", ["a"]], ["c", ["b"]], ["x", ["y"]], ["y", ["x"]]]);
    const states = new Map<string, "known" | "due" | "new" | "locked">([["a", "new"], ["b", "locked"], ["c", "locked"], ["x", "locked"], ["y", "locked"]]);
    expect(startFor("c", needs, states)).toBe("a");
    expect(startFor("a", needs, states)).toBe("a");
    expect(startFor("x", needs, states)).toBeNull();
    states.set("a", "known");
    states.set("b", "new");
    expect(startFor("c", needs, states)).toBe("b");
    const v = await mount({ name: "path", to: "ph-second-law" }, populated());
    expect(v.host.querySelector("a.start")!.getAttribute("href")).toBe("#/learn/02-physics/ph-heat");
    expect(v.text()).toContain("Start with Heat");
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("arrow keys walk the links and the list repeats them in words", async () => {
    const v = await mount({ name: "path", to: "ph-entropy" }, populated());
    const svg = v.host.querySelector(".topic-map svg")!;
    const press = (key: string) => v.act(async () => svg.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
    await press("ArrowLeft");
    expect(v.host.querySelector(".topic-panel h2")!.textContent).toBe("Heat");
    await press("ArrowRight");
    await press("ArrowRight");
    expect(v.host.querySelector(".topic-panel h2")!.textContent).toBe("Second law");
    expect(svg.getAttribute("aria-activedescendant")).toBe(v.host.querySelector('.topic[aria-pressed="true"]')!.id);
    const rows = Array.from(v.host.querySelectorAll(".links-list li")).map((li) => li.textContent);
    expect(rows).toContain("Entropy. Locked. Needs Heat. Opens Second law.");
    expect(rows).toContain("Limit. New. Needs nothing first. Opens nothing yet.");
    expect(v.host.querySelector(".links-list summary")!.textContent).toBe("Read the same links as a list");
    expect(violations(v.host)).toEqual([]);
    window.location.hash = "";
    await v.unmount();
  });

  test("a mastery conflict offers the plan that studies the doubtful topic again", async () => {
    const { MASTERY_UNSURE } = await import("./views/Path");
    const physics = ATOMS["02-physics"];
    const v = await mount({ name: "path", to: "ph-second-law" }, withAtoms(physics, { "02-physics": { data: masteredState(physics, "ph-entropy") } }));
    expect(v.host.querySelector(".error")!.textContent).toBe(MASTERY_UNSURE);
    const fix = v.host.querySelector("button.ghost") as HTMLButtonElement;
    expect(fix.textContent).toBe("Plan with 1 topic to study again");
    expect(violations(v.host)).toEqual([]);
    await v.act(async () => fix.click());
    expect(Array.from(v.host.querySelectorAll(".steps-list .who")).map((e) => e.firstChild!.textContent)).toEqual(["Heat", "Entropy", "Second law"]);
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });
});

describe("history", () => {
  test("no study yet shows one line and no chart", async () => {
    const { NO_ACTIVITY } = await import("./views/History");
    const v = await mount({ name: "history" }, empty());
    expect(NO_ACTIVITY).toBe("Nothing yet. Your study days will show here.");
    expect(v.text()).toContain(NO_ACTIVITY);
    expect(v.host.querySelector(".activity")).toBeNull();
    await v.unmount();
  });

  test("the chart appears from the first day with activity, and the web work card is gone", async () => {
    const v = await mount({ name: "history" }, populated({ history: async () => ({ snapshot: null, activity: days((i) => (i === 59 ? 1 : 0)) }) }));
    expect(v.host.querySelectorAll(".activity .day").length).toBe(60);
    expect(v.text()).not.toContain("Nothing yet");
    expect(v.text()).not.toContain("Productions");
    expect(v.host.querySelector('input[type="file"]')).toBeNull();
    await v.unmount();
  });
});

describe("data", () => {
  const open = async (tabs: string | null, stub: Stub) => {
    window.localStorage.clear();
    if (tabs) window.localStorage.setItem("bucket.data.tabs", tabs);
    return mount({ name: "data" }, stub);
  };

  test("the list, a dataset's table and one record read in plain words in every state", async () => {
    for (const active of [null, "set:canon", "rec:canon:excerpt/7"]) {
      for (const stub of [empty, populated, failing]) {
        const v = await open(JSON.stringify({ ...JSON.parse(DATA_TABS), active }), stub());
        expect(v.text().length).toBeGreaterThan(0);
        expect({ active, problems: violations(v.host) }).toEqual({ active, problems: [] });
        await v.unmount();
      }
    }
    window.localStorage.clear();
  });

  test("the version and checksum sit behind Details, closed until a person opens it", async () => {
    const v = await open(null, populated());
    const fine = v.host.querySelector("details.fine") as HTMLDetailsElement;
    expect(fine.open).toBe(false);
    expect(fine.querySelector("summary")!.textContent).toBe("Details");
    expect(fine.textContent).toContain("246f1a6cea3e");
    expect(v.text()).not.toContain("246f1a6cea3e");
    expect(violationsIn([fine.querySelector("dd")!.textContent!]).length).toBeGreaterThan(0);
    await v.unmount();
  });

  test("your own work shows counts and how each is stored, with no table to browse", async () => {
    const v = await open(null, populated());
    const card = Array.from(v.host.querySelectorAll("article.dataset")).find((a) => a.querySelector("h2")!.textContent === "Your work")!;
    expect(Array.from(card.querySelectorAll(".counts li")).map((li) => li.textContent)).toEqual(["2 notes, stored encryptedOpen", "40 quiz and review answers, answer text stored encryptedOpen", "9 lessons started, stored without encryptionOpen"]);
    expect(Array.from(card.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual(["#/notes", "#/history", "#/learn"]);
    expect(card.querySelector("button")).toBeNull();
    await v.unmount();
    window.localStorage.clear();
  });
});

describe("import", () => {
  const file = (text: string) => new File([text], "progress");

  test("says what it is for and offers one button", async () => {
    const v = await mount({ name: "import" }, empty());
    const card = v.host.querySelector("article")!;
    expect(v.host.querySelector(".head p")!.textContent).toBe("Bring your progress over from the website.");
    expect(card.querySelectorAll("button").length).toBe(0);
    expect(Array.from(card.querySelectorAll("label.file span")).map((e) => e.textContent)).toEqual(["Choose file"]);
    await v.unmount();
  });

  test("an unreadable file, a file the helper refuses, a finished import and a repeat each read in plain words", async () => {
    const { ALREADY_IMPORTED } = await import("./views/Import");
    const answers: (() => Promise<{ imported: string[] }>)[] = [
      () => Promise.reject(new ApiError("expected { branches: { <deck>: EngineState } }", 400)),
      async () => ({ imported: ["01-mathematics", "02-physics"] }),
      () => Promise.reject(new ApiError("already imported", 409)),
    ];
    let sent = 0;
    const v = await mount({ name: "import" }, populated({ importWeb: () => answers[sent++]() }));
    const status = () => v.host.querySelector("article .status")!.textContent;
    await v.pickFile(0, file("not a progress file"));
    expect(status()).toBe("Bucket could not read that file.");
    expect(sent).toBe(0);
    await v.pickFile(0, file("{}"));
    expect(status()).toBe("Bucket could not read that file.");
    await v.pickFile(0, file("{}"));
    expect(status()).toBe("Brought over 2 decks.");
    await v.pickFile(0, file("{}"));
    expect(status()).toBe(ALREADY_IMPORTED);
    expect(sent).toBe(3);
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });
});

describe("work quiz setup", () => {
  test("speaks of tasks, merged changes and chats", async () => {
    const v = await mount({ name: "settings" }, populated());
    const text = v.text();
    expect(text).toContain("8 tasks, 3 merged changes.");
    expect(text).toContain("Bucket could not read that folder.");
    expect(text).toContain("Claude chats");
    expect(text).toContain("Codex chats");
    expect(text).toContain("Choose tasks file");
    expect(text).not.toContain("git log");
    await v.unmount();
  });

  test("a tasks file or folder the helper refuses reads in plain words", async () => {
    const v = await mount({ name: "settings" }, populated({ workBeads: () => Promise.reject(new ApiError("no beads found; pick a .beads/issues.jsonl file", 400)), workRepo: () => Promise.reject(new ApiError("git could not read that folder", 400)) }));
    await v.pickFile(0, new File(["x"], "tasks"));
    expect(v.host.querySelectorAll(".status")[0].textContent).toBe("Bucket could not read that file.");
    await v.act(async () => v.host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(v.host.querySelectorAll(".status")[0].textContent).toBe("Bucket could not read that folder.");
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("the work quiz with nothing to ask says so and leads to no file", async () => {
    const { NO_WORK_QUESTIONS } = await import("./views/WorkQuiz");
    const v = await mount({ name: "work" }, empty());
    expect(v.text()).toContain(NO_WORK_QUESTIONS);
    expect(v.host.querySelector(".error")).toBeNull();
    expect(v.host.querySelector("a")).toBeNull();
    expect(v.host.querySelector('input[type="file"]')).toBeNull();
    await v.unmount();
  });
});

describe("canon knowledge graph", () => {
  const GRAPH = {
    nodes: [
      { id: "openalex:A1", name: "Roger Penrose", group: "author", centrality: 0.9, edges: 2, excerpts: [7, 9] },
      { id: "openalex:A2", name: "Stuart Hameroff", group: "author", centrality: 0.4, edges: 1, excerpts: [] },
      { id: "openalex:A3", name: "Stephen Hawking", group: "author", centrality: 0.3, edges: 1, excerpts: [] },
    ],
    edges: [
      { source: "openalex:A1", target: "openalex:A2", weight: 15 },
      { source: "openalex:A1", target: "openalex:A3", weight: 1 },
    ],
  };
  const withGraph = (over: Stub = {}) => populated({ canonGraph: async () => GRAPH, ...over });
  const node = (host: Element, name: string) => Array.from(host.querySelectorAll(".canon-graph .author")).find((g) => g.getAttribute("aria-label")!.startsWith(name))!;

  test("a click opens the drawer on the excerpt the pack ties to that author id", async () => {
    const { GRAPH_ABOUT, PICK_AN_AUTHOR } = await import("./views/CanonGraph");
    let searched = 0;
    const v = await mount({ name: "search" }, withGraph({ canonSearch: async () => (searched++, []) }));
    expect(v.text()).toContain(`${GRAPH_ABOUT} 3 authors, 2 pairs.`);
    expect(v.text()).toContain(PICK_AN_AUTHOR);
    expect(violations(v.host)).toEqual([]);
    expect(node(v.host, "Roger Penrose").getAttribute("aria-label")).toBe("Roger Penrose. Wrote with 2 canon authors.");
    await v.act(async () => node(v.host, "Roger Penrose").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(window.location.hash).toBe("#/search/7");
    expect(searched).toBe(0);
    const side = v.host.querySelector(".graph-side")!;
    expect(side.querySelector("h3")!.textContent).toBe("Roger Penrose");
    expect(Array.from(side.querySelectorAll(".linked .link")).map((b) => b.textContent)).toEqual(["Open excerpt 1 of 2", "Open excerpt 2 of 2", "Stuart Hameroff", "Stephen Hawking"]);
    expect(violations(v.host)).toEqual([]);
    window.location.hash = "";
    await v.unmount();
  });

  test("an author with no excerpt, no graph and a broken graph each read as a sentence", async () => {
    const { NO_GRAPH, noExcerpt } = await import("./views/CanonGraph");
    const none = await mount({ name: "search" }, withGraph());
    window.location.hash = "#/search";
    await none.act(async () => node(none.host, "Stuart Hameroff").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(window.location.hash).toBe("#/search");
    expect(none.text()).toContain(noExcerpt("Stuart Hameroff"));
    expect(violations(none.host)).toEqual([]);
    window.location.hash = "";
    await none.unmount();
    const missing = await mount({ name: "search" }, populated());
    expect(missing.text()).toContain(NO_GRAPH);
    await missing.unmount();
    const broken = await mount({ name: "search" }, withGraph({ canonGraph: () => Promise.reject(new ApiError("data key does not match", 500)) }));
    expect(broken.host.querySelector(".error")!.textContent).toBe(plainError(500));
    expect(violations(broken.host)).toEqual([]);
    await broken.unmount();
  });
});

describe("Research OS views on the local store", () => {
  const realFetch = globalThis.fetch;
  let routes: Record<string, (req: Request, url: URL) => Response | Promise<Response>> = {};

  const savedExports: { name: string; text: string }[] = [];

  async function useLocalStore(opened: string[] = []) {
    const { Store } = await import("../../bkt/src/store");
    const { newDataKey } = await import("../../bkt/src/crypto");
    const { RosGraph, rosLiveRoutes, syncRosGraph } = await import("../../bkt/src/ros");
    const db = new Store(":memory:", newDataKey()).db;
    syncRosGraph(db, "test", ATOMS);
    routes = rosLiveRoutes(new RosGraph(db), () => Date.UTC(2026, 8, 30), { saveExport: (name, text) => (savedExports.push({ name, text }), { name, folder: "Downloads" }) });
    const { siteFetch } = await import("./site-fetch");
    const loop = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://127.0.0.1");
      const route = routes[`${(init?.method ?? "GET").toUpperCase()} ${url.pathname}`];
      return route ? route(new Request(url, { method: init?.method, body: init?.body }), url) : new Response("{}", { status: 404 });
    }) as typeof fetch;
    globalThis.fetch = siteFetch(loop, "http://127.0.0.1", "t".repeat(43));
    for (const id of opened) await globalThis.fetch("http://127.0.0.1/api/research-os/state", { method: "POST", body: JSON.stringify({ nodeId: id, action: "open" }) });
  }

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  for (const route of ROS_COVERED)
    for (const opened of [[], ["02-physics:ph-heat", "02-physics:ph-entropy"]])
      test(`${href(route)}, ${opened.length ? "after opening ideas" : "fresh"}`, async () => {
        await useLocalStore(opened);
        const v = await mount(route, empty());
        await v.act(async () => new Promise((r) => setTimeout(r, 60)));
        expect(v.text().length).toBeGreaterThan(0);
        expect(v.host.querySelector(".error")).toBeNull();
        expect(violations(v.host)).toEqual([]);
        await v.unmount();
      });

  test("an idea page names what it builds on and leads to, and opening it records a first look", async () => {
    await useLocalStore();
    const v = await mount({ name: "node", slug: "02-physics:ph-entropy" }, empty());
    await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    expect(v.host.querySelector("h1")!.textContent).toBe("Entropy");
    expect(v.text()).toContain("Heat");
    expect(v.text()).toContain("Second law");
    expect(v.host.querySelector('a[href="#/node/02-physics%3Aph-heat"]')).not.toBeNull();
    const state = await (await globalThis.fetch("http://127.0.0.1/api/research-os/state?nodeIds=02-physics:ph-entropy")).json();
    expect(state.states[0].stage).toBe("awareness");
    await v.unmount();
  });

  test("an idea missing from this computer says so in one line", async () => {
    await useLocalStore();
    const { NODE_MISSING } = await import("./views/RosNode");
    const v = await mount({ name: "node", slug: "nope" }, empty());
    await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    expect(v.host.querySelector(".workspace-tabs a.on")!.textContent).toBe("Nodes");
    expect(v.text().split("\n").slice(10)).toEqual([NODE_MISSING]);
    await v.unmount();
  });

  test("the profile keeps its form after a failed save and retries", async () => {
    await useLocalStore();
    const localFetch = globalThis.fetch;
    const v = await mount({ name: "profile" }, empty());
    await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    const submit = () => v.act(async () => {
      v.host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));
    });
    await submit();
    expect(v.text()).toContain("Saved.");
    globalThis.fetch = (() => Promise.reject(new TypeError("offline"))) as unknown as typeof fetch;
    await submit();
    expect(v.text()).toContain("That did not save. Try again.");
    expect(v.text()).not.toContain("Saved.");
    expect(v.host.querySelector("form")).not.toBeNull();
    globalThis.fetch = localFetch;
    await submit();
    expect(v.text()).toContain("Saved.");
    expect(v.host.querySelector(".error")).toBeNull();
    await v.unmount();
  });

  test("progress shows level tiles, started decks and saves progress to a file", async () => {
    await useLocalStore(["02-physics:ph-heat"]);
    let saved = 0;
    const v = await mount({ name: "progress" }, { ...empty(), decks: async () => DECKS, exportProgress: async () => (saved++, { name: "bucket-progress-2026-09-30.json", folder: "Downloads" }) } as Stub);
    await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    const tiles = [...v.host.querySelectorAll(".tile")].map((t) => t.textContent);
    expect(tiles[0]).toMatch(/^Level\d+$/);
    expect(tiles[2]).toMatch(/^Streak\d+ days?$/);
    const rows = [...v.host.querySelectorAll(".decks-progress tbody tr")].map((r) => [...r.querySelectorAll("td")].map((c) => c.textContent));
    expect(rows).toEqual([["Physics", "1 of 3", "1", "10"]]);
    const b = [...v.host.querySelectorAll("button")].find((x) => x.textContent === "Save my progress to a file") as HTMLButtonElement;
    await v.act(async () => b.click());
    await v.act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(saved).toBe(1);
    expect(v.host.textContent).toContain("Saved your progress in Downloads as bucket-progress-2026-09-30.");
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("the profile exports to the downloads folder and deletes only after the confirm word", async () => {
    await useLocalStore(["02-physics:ph-heat"]);
    const v = await mount({ name: "profile" }, empty());
    await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    expect(v.host.textContent).toMatch(/Badges: \d+ ideas made your own · \d+ pieces of work/);
    const click = async (label: string) => {
      const b = [...v.host.querySelectorAll("button")].find((x) => x.textContent === label) as HTMLButtonElement;
      await v.act(async () => b.click());
      await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    };
    await click("Export my profile and idea progress");
    expect(v.text()).toContain("Saved your profile and idea progress in Downloads as research-os-export-2026-09-30.");
    expect(violations(v.host)).toEqual([]);
    expect(JSON.parse(savedExports.at(-1)!.text).tables.ros_state).toHaveLength(1);
    await click("Delete my profile and idea progress");
    const del = [...v.host.querySelectorAll("button")].find((x) => x.textContent === "Delete") as HTMLButtonElement;
    expect(del.disabled).toBe(true);
    const input = v.host.querySelector('input[aria-label="type the confirm word"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await v.act(async () => {
      setter.call(input, "DELETE");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click("Delete");
    expect(v.text()).toContain("Your data on this computer is deleted.");
    expect(v.text()).toContain("Open an idea on the knowledge graph to start earning XP.");
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("progress says so in a sentence when the level does not load, and shows no made-up level", async () => {
    await useLocalStore();
    const local = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => (String(input).includes("/profile") ? Promise.reject(new TypeError("offline")) : local(input, init))) as typeof fetch;
    const v = await mount({ name: "progress" }, empty());
    await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    expect(v.host.textContent).toContain("Bucket could not load your level. Close the window and open it again.");
    expect(v.host.querySelectorAll(".tile")).toHaveLength(0);
    await v.unmount();
  });

  test("progress with nothing studied points to Learn, and a failed save says so in a sentence", async () => {
    await useLocalStore();
    const v = await mount({ name: "progress" }, { ...empty(), exportProgress: () => Promise.reject(new ApiError("save_failed", 500)) } as Stub);
    await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    expect(v.host.textContent).toContain("Nothing studied yet. Start a deck in Learn.");
    const b = [...v.host.querySelectorAll("button")].find((x) => x.textContent === "Save my progress to a file") as HTMLButtonElement;
    await v.act(async () => b.click());
    await v.act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(v.host.textContent).toContain("Bucket could not save your progress. Try again.");
    expect(v.host.textContent).not.toContain("save_failed");
    await v.unmount();
  });

  test("the profile saves a role and shows the level earned by opening ideas", async () => {
    await useLocalStore(["02-physics:ph-heat"]);
    const v = await mount({ name: "profile" }, empty());
    await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    expect(v.host.textContent).toMatch(/Level \d+ · \d+ XP/);
    const select = v.host.querySelector("select") as HTMLSelectElement;
    select.value = "student";
    await v.act(async () => select.dispatchEvent(new Event("change", { bubbles: true })));
    await v.act(async () => v.host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await v.act(async () => new Promise((r) => setTimeout(r, 60)));
    expect(v.text()).toContain("Saved.");
    const saved = await (await globalThis.fetch("http://127.0.0.1/api/research-os/profile")).json();
    expect(saved.profile.role).toBe("student");
    await v.unmount();
  });
});
