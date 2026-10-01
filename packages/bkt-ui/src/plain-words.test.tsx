import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { grade, masteryFor, normalizeState, type Atom, type EngineState } from "@academy/engine";
import { MASTERED_THRESHOLD } from "@academy/mastery";
import { ApiError, requestFailed, type Api, type DeckRow, type JobKind } from "./api";
import type { Route } from "./router";

mock.module("./views/Globe3d", () => ({ default: () => <div>globe</div> }));
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
  return strings(host)
    .filter((s) => !ALLOW.has(s))
    .flatMap((s) => DENY.filter((d) => d.re.test(s)).map((d) => `${d.name}: ${s}`));
}

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

type Stub = { [K in keyof Api]?: unknown };

const days = (fill: (i: number) => number) => Array.from({ length: 60 }, (_, i) => ({ day: new Date(Date.UTC(2026, 7, 1 + i)).toISOString().slice(0, 10), learn: fill(i), work: 0, notes: 0 }));
const progress = (branches: Record<string, { data: unknown }> | null) => ({ pull: async () => branches, load: async () => normalizeState(null), save: () => {}, flush: async () => {} });

const JOB_KINDS: JobKind[] = [{ kind: "analyze", label: "Analyze a data file", inputs: [{ name: "data", label: "Data file", exts: [".csv", ".tsv", ".json", ".jsonl", ".txt"] }] }];

function empty(): Stub {
  return {
    progress: progress({}),
    decks: async () => [],
    atoms: async () => [],
    quiz: async () => [],
    due: async () => [],
    notes: async () => [],
    history: async () => ({ snapshot: null, activity: days(() => 0) }),
    workStatus: async () => ({ beads: 0, prs: 0, repo: null, repoError: null, chat: { claude: false, codex: false }, ready: false, answered: 0, correct: 0 }),
    workNext: () => Promise.reject(new ApiError("no sources: pick a beads file or a repository", 404)),
    jobs: async () => ({ kinds: JOB_KINDS, jobs: [] }),
    advisor: async () => ({ review: null, forgotten: 0 }),
    primeDirections: async () => [],
    ros: async () => null,
  };
}

function populated(over: Stub = {}): Stub {
  return {
    ...empty(),
    decks: async () => DECKS,
    atoms: async (deck: string) => ATOMS[deck] ?? [],
    quiz: async () => [{ itemId: "ph-heat", prompt: "What moves when heat flows?", choices: ["Energy", "Mass"], limitSec: 30 }],
    due: async () => [{ id: "ph-heat", title: "Heat", prompt: "Define heat.", answer: "Energy in transit." }],
    notes: async () => [{ id: "n1", title: "Reading list", body: "Start with Carnot.", pinned: true, createdAt: 1, updatedAt: 2 }],
    history: async () => ({ snapshot: null, activity: days((i) => i % 4) }),
    workStatus: async () => ({ beads: 8, prs: 3, repo: "work/project", repoError: "git log did not run in that folder", chat: { claude: true, codex: false }, ready: true, answered: 2, correct: 1 }),
    workNext: async () => ({ id: "w1", type: "recall", prompt: "Which change merged first?", lines: ["Canon circle", "Notes"], choices: ["Canon circle", "Notes"], limitSec: 30 }),
    ...over,
  };
}

function failing(): Stub {
  const fail = () => Promise.reject(new ApiError(requestFailed(500), 500));
  return {
    progress: progress(null),
    decks: fail,
    atoms: fail,
    quiz: fail,
    due: fail,
    notes: fail,
    history: fail,
    workStatus: fail,
    workNext: fail,
    importWeb: fail,
    workBeads: fail,
    workRepo: fail,
    workChat: fail,
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
  await act(async () => new Promise((r) => setTimeout(r, 20)));
  const text = () => strings(host).join("\n");
  const pickFile = async (index: number, file: File) => {
    const input = host.querySelectorAll('input[type="file"]')[index] as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    await act(async () => new Promise((r) => setTimeout(r, 20)));
  };
  return { host, text, pickFile, act, unmount: () => act(async () => root.unmount()) };
}

const COVERED: Route["name"][] = ["learn", "path", "quiz", "review", "work", "canon", "notes", "history", "import"];

const PENDING: { name: Route["name"]; fixedBy: string }[] = [
  { name: "jobs", fixedBy: "slice 2, Analyze data" },
  { name: "primes", fixedBy: "slice 6, Themes" },
  { name: "advisors", fixedBy: "slice 7, Advisors action" },
  { name: "atlases", fixedBy: "bkt-cfcs, staff atlases" },
];

describe("navigation", () => {
  test("reads in plain words and leaves out the screens whose actions are not built", async () => {
    const { NAV } = await import("./nav");
    expect(NAV.map((n) => n.label)).toEqual(["Learn", "Path", "Quiz", "Review", "Work quiz", "Canon", "Notes", "History", "Jobs", "Import"]);
    expect(NAV.flatMap((n) => DENY.filter((d) => d.re.test(n.label)))).toEqual([]);
  });

  test("every screen is covered here or listed as pending with the slice that fixes it", async () => {
    const { NAV } = await import("./nav");
    const pending = PENDING.map((p) => p.name);
    expect(NAV.map((n) => n.route.name).filter((n) => !COVERED.includes(n) && !pending.includes(n))).toEqual([]);
    expect(COVERED.filter((n) => pending.includes(n))).toEqual([]);
    expect(PENDING.length).toBeLessThanOrEqual(4);
    expect(PENDING.every((p) => p.fixedBy.length > 0)).toBe(true);
  });

  test("the removed screens still open from their address", async () => {
    const { parseHash } = await import("./router");
    for (const [name, heading] of [["advisors", "Advisors"], ["primes", "Prime directions"], ["atlases", "Atlases"]] as const) {
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
  for (const name of COVERED) {
    for (const [state, stub] of [["empty", empty], ["populated", populated], ["failing", failing]] as const) {
      test(`${name}, ${state}`, async () => {
        const v = await mount({ name } as Route, stub());
        expect(v.text().length).toBeGreaterThan(0);
        expect(violations(v.host)).toEqual([]);
        await v.unmount();
      });
    }
  }

  test("the denylist catches each format word, path and id", () => {
    const host = document.createElement("div");
    for (const s of ["Open review.json", "Pick .beads/issues.jsonl", "a .csv table", "TSV rows", "notes.md", "log.txt", "open /api/research-os/production", "its Python", "numpy missing", "keyed hashes", "~/code/your-repo", "bkt-398t", "02-physics", "target_node_id", "c85d792ca773"]) {
      host.textContent = s;
      expect({ s, caught: violations(host).length > 0 }).toEqual({ s, caught: true });
    }
    for (const s of ["2026-09-30", "Daily activity for 60 days", "Your last 60 days on this computer.", "Bring your progress over from the website."]) {
      host.textContent = s;
      expect({ s, caught: violations(host) }).toEqual({ s, caught: [] });
    }
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

  test("two topics that need each other", async () => {
    const { TOPIC_CYCLE } = await import("./views/Path");
    const v = await mount({ name: "path", to: "ph-entropy" }, withAtoms([{ id: "ph-entropy", title: "Entropy", requires: ["ph-heat"] }, { id: "ph-heat", title: "Heat", requires: ["ph-entropy"] }]));
    expect(v.host.querySelector(".error")!.textContent).toBe(TOPIC_CYCLE);
    expect(violations(v.host)).toEqual([]);
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

  test("an unreadable file, a file for another screen, a finished import and a repeat each read in plain words", async () => {
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
    expect(status()).toBe("Bucket could not read that file. Choose the one you downloaded from the website.");
    expect(sent).toBe(0);
    await v.pickFile(0, file("{}"));
    expect(status()).toBe("That file is for a different screen.");
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
    const v = await mount({ name: "import" }, populated());
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
    const v = await mount({ name: "import" }, populated({ workBeads: () => Promise.reject(new ApiError("no beads found; pick a .beads/issues.jsonl file", 400)), workRepo: () => Promise.reject(new ApiError("git could not read that folder", 400)) }));
    await v.pickFile(1, new File(["x"], "tasks"));
    expect(v.host.querySelectorAll(".status")[0].textContent).toBe("Bucket could not read that file.");
    await v.act(async () => v.host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(v.host.querySelectorAll(".status")[0].textContent).toBe("Bucket could not read that folder.");
    expect(violations(v.host)).toEqual([]);
    await v.unmount();
  });

  test("the work quiz with nothing to ask points to its setup", async () => {
    const { NO_WORK_QUESTIONS } = await import("./views/WorkQuiz");
    const v = await mount({ name: "work" }, empty());
    expect(v.text()).toContain(NO_WORK_QUESTIONS);
    expect(v.host.querySelector(".error")).toBeNull();
    expect(v.host.querySelector('a[href="#/import"]')).not.toBeNull();
    await v.unmount();
  });
});
