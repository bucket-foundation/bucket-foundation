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

const ALLOW = new Set<string>([]);

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

function empty(): Stub {
  return {
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
    workLanguages: async () => ({ languages: [], available: [] }),
    workSetLanguages: async (languages: string[]) => ({ languages }),
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
    workNext: async () => served("populated", "true_false")!.question,
    dailyQuiz: async () => ({
      day: DAY,
      answered: [],
      questions: [
        { id: "chat-sessions", type: "estimate", prompt: "How many chat sessions did you run in the last two days?", lines: [], choices: null, limitSec: 60 },
        { id: "chat-day-1", type: "recall", prompt: 'On which day did the session that began "Fix the review buttons" start?', lines: [], choices: ["2026-09-29", "2026-09-30"], limitSec: 30 },
      ],
    }),
    ...over,
  };
}

function failing(): Stub {
  const fail = (code: string, status: number) => () => Promise.reject(new ApiError(code, status));
  return {
    progress: progress(null),
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
    workLanguages: fail("data key does not match", 500),
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
const COVERED: Route[] = [{ name: "learn" }, { name: "path" }, { name: "quiz" }, { name: "review" }, { name: "work" }, { name: "daily", day: DAY }, { name: "canon" }, { name: "search" }, { name: "search", id: 7 }, { name: "explore" }, { name: "notes" }, { name: "history" }, { name: "jobs" }, { name: "data" }, { name: "import" }, { name: "add" }, { name: "setup" }];
const COVERED_NAMES = COVERED.map((r) => r.name);

const PENDING: { name: Route["name"]; fixedBy: string }[] = [
  { name: "primes", fixedBy: "slice 6, Themes" },
  { name: "advisors", fixedBy: "slice 7, Advisors action" },
  { name: "atlases", fixedBy: "bkt-cfcs, staff atlases" },
];

describe("navigation", () => {
  test("reads in plain words and leaves out the screens whose actions are not built", async () => {
    const { NAV } = await import("./nav");
    expect(NAV.map((n) => n.label)).toEqual(["Learn", "Path", "Quiz", "Review", "Work quiz", "Canon", "Explore", "Notes", "History", "Analyze data", "Data"]);
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

  test("the work quiz joins the menu only for someone who has set it up", async () => {
    const { navFor } = await import("./nav");
    expect(navFor(false).map((n) => n.label)).toEqual(["Learn", "Path", "Quiz", "Review", "Canon", "Explore", "Notes", "History", "Analyze data", "Data"]);
    expect(navFor(true).map((n) => n.label)).toContain("Work quiz");
  });

  test("no screen in the navigation needs a file or shows a format word", async () => {
    const { navFor, FOOT_LINK } = await import("./nav");
    expect(FOOT_LINK.label).toBe("Add your own");
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

  test("the work quiz links to its own setup page for someone who has it", async () => {
    const work = await mount({ name: "work" }, populated());
    expect(work.host.querySelector('a[href="#/setup"]')!.textContent).toBe("Work quiz setup");
    await work.unmount();
    const setup = await mount({ name: "setup" }, populated());
    expect(setup.host.querySelector("h1")!.textContent).toBe("Work quiz setup");
    expect(setup.text()).toContain("Choose tasks file");
    expect(setup.host.querySelector('a[href="#/work"]')).not.toBeNull();
    await setup.unmount();
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
        const v = await mount(route, { ...failing(), decks: fail, quiz: fail, due: fail, notes: fail, history: fail, workNext: fail, workStatus: fail, dailyQuiz: fail, canonAbout: fail, canonExcerpt: fail });
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
    const v = await mount({ name: "setup" }, populated());
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
    const v = await mount({ name: "setup" }, populated({ workBeads: () => Promise.reject(new ApiError("no beads found; pick a .beads/issues.jsonl file", 400)), workRepo: () => Promise.reject(new ApiError("git could not read that folder", 400)) }));
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
