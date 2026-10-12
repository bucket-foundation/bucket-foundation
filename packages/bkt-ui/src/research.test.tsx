import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import type { Change, PackedFile, PaperPage, ResearchDetail, ResearchRow, SaveResult, TablePage } from "./api";
import { href, parseHash } from "./router";
import type { EngineImage } from "./use-engine-image";
import type { ResearchApi } from "./views/Research";

let autoSee = true;
const watchers: { fire: () => void }[] = [];

const paneObservers: ((entries: { isIntersecting: boolean; target: Element }[]) => void)[] = [];

class FakeObserver {
  constructor(private notify: (entries: { isIntersecting: boolean; target?: Element }[]) => void) {
    paneObservers.push(notify as (entries: { isIntersecting: boolean; target: Element }[]) => void);
  }
  observe() {
    const fire = () => this.notify([{ isIntersecting: true }]);
    watchers.push({ fire });
    if (autoSee) fire();
  }
  disconnect() {}
}

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = FakeObserver;
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
  autoSee = true;
  watchers.length = 0;
});

const DATA_URL = "data:image/webp;base64,AAAA";
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_CACHE_BYTES = 48 * 1024 * 1024;
const file = (path: string, role: string, n: number, size = 1200): PackedFile => ({ path, sha256: String(n).padStart(64, "0"), size, audience: "public", role });

const ROWS: ResearchRow[] = [
  { slug: "solvability-frontier", title: "The Solvability Frontier", kind: "paper", status: "public", date: "2026-10-08", origin: "shipped", changed: 0, unreadable: null },
  { slug: "funding-landscape", title: "The structure of public research funding", kind: "paper", status: "public", date: "2026-06-20", origin: "shipped", changed: 0, unreadable: null },
  { slug: "solver-gap-engine", title: "Solver Gap Engine", kind: "memo", status: "private", date: "2026-09-30", origin: "staff", changed: 0, unreadable: "the file does not match its hash" },
];

const V2: ResearchDetail = {
  slug: "solvability-frontier",
  origin: "shipped",
  staff: false,
  withheld: 7,
  unreadable: null,
  files: [file("public/papers/solvability-frontier/fig_frontier.webp", "asset", 1), file("public/atlas/04-helix.webp", "asset", 2), file("public/atlas/big.webp", "asset", 3, IMAGE_MAX_BYTES + 1), file("papers/solvability-frontier/main.tex", "source", 4)],
  manifest: {
    schema: "bucket.report/2",
    slug: "solvability-frontier",
    title: "The Solvability Frontier",
    authors: ["Gianangelo Dichio"],
    date: "2026-10-08",
    status: "public",
    kind: "paper",
    abstract: "Embeds 5,206 problem statements.",
    licence: "CC-BY-4.0",
    source_path: "papers/solvability-frontier/main.tex",
    source_hash: "a".repeat(64),
    pdf_path: "papers/solvability-frontier/main.pdf",
    pdf_hash: "b".repeat(64),
    assets: [
      { id: "fig-frontier", path: "public/papers/solvability-frontier/fig_frontier.webp", caption: "The frontier on 5,209 rows.", licence: "CC-BY-4.0", audience: "public" },
      { id: "atlas-helix", path: "public/atlas/04-helix.webp", caption: "Solvability helix.", licence: "MIT code output", audience: "public" },
      { id: "atlas-big", path: "public/atlas/big.webp", caption: "A large plot.", licence: "MIT code output", audience: "public" },
      { id: "atlas-gone", path: "public/atlas/gone.webp", caption: "A plot this build lacks.", licence: "MIT code output", audience: "public" },
    ],
    attributions: [
      { source: "formal-conjectures, Google DeepMind", url: "https://github.com/google-deepmind/formal-conjectures", licence: "Apache-2.0", rows: 3557, notice: "Statements from the formal-conjectures repository." },
      { source: "Wikipedia, lists of unsolved problems", url: "https://en.wikipedia.org/wiki/Lists_of_unsolved_problems", licence: "CC BY-SA 4.0", rows: 1283, notice: "Text from Wikipedia under CC BY-SA 4.0." },
    ],
  },
};

const V1: ResearchDetail = {
  slug: "funding-landscape",
  origin: "shipped",
  staff: false,
  withheld: 0,
  unreadable: null,
  files: [file("public/papers/01-funding-landscape/paper.pdf", "public-pdf", 5), file("public/papers/01-funding-landscape/fig1.webp", "figure", 6), file("public/papers/01-funding-landscape/fig2.webp", "figure", 7)],
  manifest: {
    schema: "bucket.report/1",
    slug: "funding-landscape",
    title: "The structure of public research funding",
    authors: ["Gianangelo Dichio"],
    date: "2026-06-20",
    status: "public",
    kind: "paper",
    abstract_paragraphs: ["First paragraph.", "Second paragraph."],
    source_path: "public/papers/01-funding-landscape/paper.pdf",
    source_hash: "c".repeat(64),
    figures: [
      { path: "figures/fig1.pdf", caption: "Concentration.", licence: "CC-BY-4.0" },
      { path: "figures/fig2.pdf", caption: "Co-funding.", licence: "CC-BY-4.0" },
    ],
  },
};

const STAFF: ResearchDetail = {
  ...V1,
  slug: "solver-gap-engine",
  origin: "staff",
  staff: true,
  files: [file("reports/2026-09-30-solver-gap-engine.md", "source", 8), file("tools/solvability-atlas/README.md", "tool-readme", 9)],
  manifest: { ...V1.manifest, slug: "solver-gap-engine", title: "Solver Gap Engine", status: "private", kind: "memo", figures: [], source_path: "reports/2026-09-30-solver-gap-engine.md", tool: { path: "tools/solvability-atlas", readme: "tools/solvability-atlas/README.md", audience: "staff" } },
};

const SOURCED_COLUMNS = ["id", "name", "branch", "source", "licence", "statement"];
const SOURCED_ROWS = Array.from({ length: 5138 }, (_, i) => [`row-${i}`, i === 4000 ? "Riemann hypothesis" : `Problem ${String(i).padStart(4, "0")}`, i % 2 ? "physics" : "mathematics", `https://example.org/${i}`, i % 3 ? "Apache-2.0" : "CC BY-SA 4.0", `Statement ${i}`]);
const RECORD_COLUMNS = ["id", "title", "branch", "level", "posed", "resolved", "path"];
const RECORD_ROWS = [
  ["goldbach", "Goldbach conjecture", "mathematics", "4", "1742", "", "tools/solvability-atlas/records/goldbach.json"],
  ["riemann", "Riemann hypothesis", "mathematics", "5", "1859", "", "tools/solvability-atlas/records/riemann.json"],
];
const RIEMANN = {
  schema: "bucket.solvability-atlas.record/v1",
  id: "riemann",
  title: "Riemann hypothesis",
  statement: { text: "Every nontrivial zero of the zeta function has real part one half.", licence: "CC BY-SA 4.0" },
  aliases: [],
  industries: ["cryptography", "number theory"],
  posed: 1859,
  resolved: null,
  key_works: [
    { title: "On the Number of Primes Less Than a Given Magnitude", year: 1859 },
    { title: "The Riemann Hypothesis and Hilbert's Tenth Problem", year: 1965 },
  ],
};

function pageFrom(columns: string[], all: string[][], pinned: string[], query: { page?: number; q?: string; sort?: string }): TablePage {
  let index = all.map((_, i) => i);
  if (query.q) index = index.filter((i) => all[i].some((c) => c.toLowerCase().includes(query.q!.toLowerCase())));
  if (query.sort) {
    const down = query.sort.startsWith("-");
    const at = columns.indexOf(down ? query.sort.slice(1) : query.sort);
    index.sort((a, b) => (all[a][at] < all[b][at] ? -1 : all[a][at] > all[b][at] ? 1 : a - b) * (down ? -1 : 1));
  }
  const page = query.page ?? 1;
  const shown = index.slice((page - 1) * 50, page * 50);
  return { columns, rows: shown.map((i) => all[i]), index: shown, total: index.length, page, size: 50, pinned, truncated: false };
}

const NOTICE = "Edits are kept on this computer as plain files, so the tools that build a paper can read them.";
const SHIPPED_TEX = "First paragraph.\n\nSecond paragraph.\n";

function workCopy(shipped: Record<string, string>) {
  const edits = new Map<string, string>();
  const saves: { path: string; base: string; text: string }[] = [];
  const revOf = (text: string) => `rev:${text.length}:${text}`;
  const current = (path: string) => edits.get(path) ?? shipped[path];
  const change = (path: string, state: Change["state"] = "edited"): Change => ({
    path,
    state,
    base: revOf(shipped[path]),
    shipped: revOf(shipped[path]),
    current: revOf(current(path)),
    size: current(path).length,
    shippedSize: shipped[path].length,
    added: 1,
    removed: 1,
    hunks: [{ oldStart: 1, oldLines: 3, newStart: 1, newLines: 3, lines: [{ op: " ", text: "First paragraph.", eol: true }, { op: "-", text: "Second paragraph.", eol: true }, { op: "+", text: current(path).split("\n").at(-2) ?? "", eol: true }] }],
  });
  return {
    edits,
    saves,
    revOf,
    api: {
      researchSource: async (_slug: string, path: string) => ({ text: current(path), rev: revOf(current(path)) }),
      researchSave: async (_slug: string, path: string, base: string, text: string): Promise<SaveResult> => {
        saves.push({ path, base, text });
        if (base !== revOf(current(path))) return { saved: false, current: revOf(current(path)) };
        if (text === shipped[path]) edits.delete(path);
        else edits.set(path, text);
        return { saved: true, rev: revOf(text), changed: text !== shipped[path] };
      },
      researchChanges: async () => ({ notice: NOTICE, changes: [...edits.keys()].sort().map((p) => change(p)) }),
      researchRevert: async (_slug: string, path: string, keep?: boolean) => {
        if (!keep) edits.delete(path);
        return { path, changed: edits.size };
      },
      researchExport: async () => ({ dir: "/srv/bucket/research/exports/solvability-frontier-20261011T123005", files: ["CHANGES.patch", "LICENCES.md", ...[...edits.keys()].sort(), "report.json"] }),
    },
  };
}

const TEX = "\\begin{document}\\section{Method}We embed with $\\frac{a}{b}$ and cite \\href{https://example.org/paper}{the paper}.\n\n\\includegraphics{figures/fig_frontier.pdf}\n\\includegraphics{figures/fig_absent.pdf}\n\\input{tables/branches.tex}\\end{document}";
const PAGE_URL = "data:image/png;base64,AAAA";
const NO_TOOL: PaperPage = { state: "preview", reason: "pdftoppm is missing, so the paper shows as a preview", install: "sudo dnf install poppler-utils, or sudo apt install poppler-utils" };

function fakeApi(over: Partial<ResearchApi> = {}): ResearchApi & { images: string[]; opened: string[]; pagesAsked: number[]; asked: { id: string; page?: number; q?: string; sort?: string }[] } {
  const images: string[] = [];
  const opened: string[] = [];
  const pagesAsked: number[] = [];
  const asked: { id: string; page?: number; q?: string; sort?: string }[] = [];
  return {
    images,
    asked,
    opened,
    pagesAsked,
    ...workCopy({}).api,
    researchNew: async (input) => ({ slug: input.slug }),
    researchUpload: async (slug, _role, name) => ({ slug, path: `reports/${slug}/figures/${name}` }),
    researchSource: async (_slug, path) => ({ text: path.endsWith(".tex") ? TEX : path.endsWith("riemann.json") ? JSON.stringify(RIEMANN, null, 1) : "id,title\n1,One\n", rev: "rev-shipped" }),
    openLink: async (url) => (opened.push(url), { opened: url }),
    researchPage: async (_slug, n) => (pagesAsked.push(n), NO_TOOL),
    researchTable: async (_slug, id, query = {}) => {
      asked.push({ id, ...query });
      if (id === "records") return pageFrom(RECORD_COLUMNS, RECORD_ROWS, [], query);
      if (id === "problems-sourced") return pageFrom(SOURCED_COLUMNS, SOURCED_ROWS, ["licence", "source"], query);
      if (id === "empty") return pageFrom(["id"], [], [], query);
      return pageFrom(["id", "title", "sim_1"], [["goldbach", "Goldbach conjecture", "0.867"], ["twin", "Twin primes", "0.8"]], [], query);
    },
    researchList: async () => ({ outputs: ROWS }),
    researchManifest: async (slug) => {
      const d = [V2, V1, STAFF].find((x) => x.slug === slug);
      if (!d) throw new Error("no such output");
      return d;
    },
    researchText: async (_slug, path) => (path.endsWith(".tex") ? TEX : path.endsWith("riemann.json") ? JSON.stringify(RIEMANN, null, 1) : path.endsWith("goldbach.json") ? "[1, 2]" : path.endsWith("README.md") ? "## Tool\n\nReads $x^2$ rows." : "## Gap\n\nThe **engine** ranks problems."),
    image: async (_slug, path) => (images.push(path), DATA_URL),
    ...over,
  };
}

async function mount(node: React.ReactElement) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(node));
  const settle = () => act(async () => new Promise((r) => setTimeout(r, 0)));
  await settle();
  await settle();
  const click = async (el: Element | null | undefined) => {
    await act(async () => (el as HTMLElement).click());
    await settle();
  };
  return { host, click, settle, unmount: () => act(async () => root.unmount()) };
}

async function view(api: ResearchApi, slug?: string, tab: "report" | "figures" | "data" | "records" | "paper" | "changes" = "report") {
  const { ResearchView } = await import("./views/Research");
  return mount(<ResearchView api={api} slug={slug} tab={tab} />);
}

describe("research routes", () => {
  test("the list, an output and a tab each have an address", async () => {
    const { NAV } = await import("./nav");
    expect(parseHash("#/research")).toEqual({ name: "research" });
    expect(parseHash("#/research/solvability-frontier/figures")).toEqual({ name: "research", slug: "solvability-frontier", tab: "figures" });
    expect(parseHash("#/research/solvability-frontier")).toEqual({ name: "research", slug: "solvability-frontier", tab: "report" });
    expect(parseHash("#/research/Bad_Slug/report")).toEqual({ name: "research" });
    expect(parseHash("#/research/solvability-frontier/changes")).toEqual({ name: "research", slug: "solvability-frontier", tab: "changes" });
    expect(parseHash("#/research/solvability-frontier/consent")).toEqual({ name: "research" });
    expect(parseHash("#/research/solvability-frontier/paper")).toEqual({ name: "research", slug: "solvability-frontier", tab: "paper" });
    expect(parseHash("#/research/solvability-frontier/data")).toEqual({ name: "research", slug: "solvability-frontier", tab: "data" });
    expect(parseHash("#/research/solvability-frontier/records")).toEqual({ name: "research", slug: "solvability-frontier", tab: "records" });
    expect(parseHash("#/research/..%2Fx/report")).toEqual({ name: "research" });
    expect(href({ name: "research" })).toBe("#/research");
    expect(href({ name: "research", slug: "solvability-frontier", tab: "figures" })).toBe("#/research/solvability-frontier/figures");
    const labels = NAV.map((n) => n.label);
    expect(labels[labels.indexOf("Data") + 1]).toBe("Research");
  });
});

describe("research screen", () => {
  test("the list shows one row per output with kind, status, date, origin and changed files", async () => {
    const v = await view(fakeApi());
    const rows = Array.from(v.host.querySelectorAll("tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent?.trim()));
    expect(rows[0]).toEqual(["The Solvability Frontier", "paper", "public", "2026-10-08", "Shipped", "0"]);
    expect(rows[2].slice(1)).toEqual(["memo", "private", "2026-09-30", "Staff", "0"]);
    expect(rows[2][0]).toContain("Bucket could not verify the files of this output, so it stays closed.");
    const fold = v.host.querySelector("tbody details.fine") as HTMLDetailsElement;
    expect([fold.open, fold.querySelector("p")!.textContent]).toEqual([false, "the file does not match its hash"]);
    expect(v.host.querySelector("tbody a")!.getAttribute("href")).toBe("#/research/solvability-frontier/report");
    await v.unmount();
    const empty = await view(fakeApi({ researchList: async () => ({ outputs: [] }) }));
    expect(empty.host.textContent).toContain("This build holds no research outputs.");
    await empty.unmount();
    const broken = await view(fakeApi({ researchList: async () => Promise.reject(new Error("Bucket could not read the list.")) }));
    expect(broken.host.querySelector(".error")!.textContent).toBe("Bucket could not read the list.");
    await broken.unmount();
  });

  test("the Report tab shows the abstract, hashes and the Attribution table, and says when staff data is absent", async () => {
    const v = await view(fakeApi(), "solvability-frontier");
    expect(v.host.querySelector("h1")!.textContent).toBe("The Solvability Frontier");
    expect(v.host.textContent).toContain("Embeds 5,206 problem statements.");
    const fine = v.host.querySelector(".research-report > details.fine") as HTMLDetailsElement;
    expect(fine.open).toBe(false);
    expect(fine.querySelector("summary")!.textContent).toBe("Details");
    expect(Array.from(fine.querySelectorAll("dd")).map((dd) => dd.textContent)).toEqual(["a".repeat(64), "b".repeat(64)]);
    const rows = Array.from(v.host.querySelectorAll(".research-attributions tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent));
    expect(rows[0]).toEqual(["formal-conjectures, Google DeepMind", "github.com", "Apache-2.0", "3,557", "Statements from the formal-conjectures repository."]);
    expect(rows.length).toBe(2);
    expect(v.host.querySelector(".staff-absent")!.textContent).toBe("Staff data is absent from this build.");
    expect(v.host.querySelectorAll(".research-attributions a").length).toBe(0);
    expect(Array.from(v.host.querySelectorAll(".seg button")).map((b) => [b.textContent, b.className])).toEqual([["Report", "on"], ["Data", ""], ["Figures", ""], ["Paper", ""], ["Records", ""], ["Changes", ""]]);
    await v.unmount();
    const one = await view(fakeApi(), "funding-landscape");
    expect(one.host.querySelector(".staff-absent")).toBeNull();
    expect(Array.from(one.host.querySelectorAll(".seg button")).map((b) => b.textContent)).toEqual(["Report", "Figures", "Paper"]);
    expect(one.host.querySelector(".research-attributions")).toBeNull();
    expect(one.host.textContent).toContain("Second paragraph.");
    expect(one.host.textContent).toContain("Not stated");
    await one.unmount();
  });

  test("a markdown source and the tool notes render with math on a staff build", async () => {
    const v = await view(fakeApi(), "solver-gap-engine");
    expect(Array.from(v.host.querySelectorAll(".research-report h2")).map((h) => h.textContent)).toEqual(["Report text", "Tool notes"]);
    expect(v.host.querySelector(".lesson strong")!.textContent).toBe("engine");
    expect(v.host.querySelector(".lesson .katex")).not.toBeNull();
    expect(v.host.querySelector(".lesson .math")).toBeNull();
    await v.unmount();
  });

  test("useEngineImage sets a data URL and never a /local URL", async () => {
    const api = fakeApi();
    const v = await view(api, "solvability-frontier", "figures");
    const imgs = Array.from(v.host.querySelectorAll("img"));
    expect(imgs.map((i) => i.getAttribute("src"))).toEqual([DATA_URL, DATA_URL]);
    expect(imgs[0].getAttribute("alt")).toBe("The frontier on 5,209 rows.");
    expect(api.images).toEqual(["public/papers/solvability-frontier/fig_frontier.webp", "public/atlas/04-helix.webp"]);
    for (const el of Array.from(v.host.querySelectorAll("*"))) for (const attr of ["src", "href", "srcset", "data"]) expect(el.getAttribute(attr) ?? "").not.toContain("/local");
    expect(v.host.innerHTML).not.toContain("blob:");
    expect(v.host.textContent).toContain("This image is over 8 MB and stays out of the window.");
    expect(v.host.textContent).toContain("This build holds no copy of this image.");
    expect(Array.from(v.host.querySelectorAll(".research-figure .licence")).map((l) => l.textContent)).toEqual(["CC-BY-4.0", "MIT code output", "MIT code output", "MIT code output"]);
    await v.click(v.host.querySelector(".research-figure button"));
    expect(v.host.querySelector(".research-full img")!.getAttribute("src")).toBe(DATA_URL);
    expect(api.images.length).toBe(2);
    await v.click(Array.from(v.host.querySelectorAll(".research-full button")).find((b) => b.textContent?.trim() === "Close"));
    expect(v.host.querySelector(".research-full")).toBeNull();
    await v.unmount();

    const refused = await view(fakeApi({ image: async () => "/local/research/file?slug=x&path=y" }), "funding-landscape", "figures");
    expect(refused.host.querySelectorAll("img").length).toBe(0);
    expect(refused.host.querySelector(".error")!.textContent).toBe("The image did not arrive as image data.");
    await refused.unmount();
  });

  test("an image loads when its tile nears the viewport and stays unloaded before that", async () => {
    autoSee = false;
    const api = fakeApi();
    const v = await view(api, "funding-landscape", "figures");
    expect(api.images).toEqual([]);
    expect(v.host.querySelectorAll("img").length).toBe(0);
    const { act } = await import("react");
    await act(async () => watchers[1].fire());
    await v.settle();
    expect(api.images).toEqual(["public/papers/01-funding-landscape/fig2.webp"]);
    expect(v.host.querySelectorAll("img").length).toBe(1);
    await v.unmount();
  });

  test("a v1 output shows its public figure copies, and one with none says so", async () => {
    const v = await view(fakeApi(), "funding-landscape", "figures");
    expect(Array.from(v.host.querySelectorAll("figcaption")).map((c) => c.firstChild?.textContent)).toEqual(["Concentration.", "Co-funding."]);
    expect(v.host.querySelectorAll("img").length).toBe(2);
    await v.unmount();
    const none = await view(fakeApi(), "solver-gap-engine", "figures");
    expect(none.host.textContent).toContain("This output lists no figures.");
    await none.unmount();
    const bad = await view(fakeApi({ researchManifest: async () => ({ ...V2, unreadable: "main.tex does not match the source hash in its record" }) }), "solvability-frontier", "figures");
    expect(bad.host.querySelector(".error")!.textContent).toBe("Bucket could not verify the files of this output, so it stays closed.");
    expect(bad.host.querySelector("details.fine p")!.textContent).toBe("main.tex does not match the source hash in its record");
    expect(bad.host.querySelectorAll("img").length).toBe(0);
    await bad.unmount();
  });

  test("the hook reads a cached image without a second request and refuses one over 8 MB", async () => {
    const { ImageCache, useEngineImage } = await import("./use-engine-image");
    const cache = new ImageCache();
    const seen: EngineImage[] = [];
    let calls = 0;
    const api = { image: async () => (calls++, DATA_URL) };
    function Probe({ f, show }: { f: PackedFile | null; show: boolean }) {
      seen.push(useEngineImage(api, "demo", f, show, cache));
      return null;
    }
    const a = await mount(<Probe f={V2.files[0]} show={false} />);
    expect(seen.at(-1)).toEqual({ status: "idle" });
    expect(calls).toBe(0);
    await a.unmount();
    const b = await mount(<Probe f={V2.files[0]} show />);
    expect(seen.at(-1)).toEqual({ status: "ready", src: DATA_URL });
    await b.unmount();
    const c = await mount(<Probe f={V2.files[0]} show />);
    expect(seen.at(-1)).toEqual({ status: "ready", src: DATA_URL });
    expect(calls).toBe(1);
    await c.unmount();
    const d = await mount(<Probe f={V2.files[2]} show />);
    expect(seen.at(-1)).toEqual({ status: "too-large" });
    expect(calls).toBe(1);
    await d.unmount();
  });
});

const FULL: ResearchDetail = {
  ...V2,
  staff: true,
  withheld: 0,
  manifest: {
    ...V2.manifest,
    tables: [
      { id: "predictions", path: "public/papers/solvability-frontier/data/predictions.csv", format: "csv", label: "Predictions", licence: "CC BY-SA 4.0", audience: "public" },
      { id: "problems-sourced", path: "tools/solvability-atlas/problems-sourced.tsv", format: "tsv", label: "Sourced problems", licence: "mixed", licence_column: "licence", source_column: "source", audience: "staff" },
      { id: "empty", path: "tools/solvability-atlas/empty.tsv", format: "tsv", label: "Empty", licence: "MIT", audience: "staff" },
    ],
    record_sets: [{ id: "records", dir: "tools/solvability-atlas/records", schema: "bucket.solvability-atlas.record/v1", label: "Problem records", licence: "CC BY-SA 4.0", audience: "staff" }],
  },
};
const PUBLIC: ResearchDetail = { ...FULL, staff: false, withheld: 7, manifest: { ...FULL.manifest, tables: [FULL.manifest.tables![0]], record_sets: [] } };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("research data and records", () => {
  const cells = (host: Element) => Array.from(host.querySelectorAll(".research-rows tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent));
  const heads = (host: Element) => Array.from(host.querySelectorAll(".research-rows thead th")).map((th) => th.textContent?.trim());
  const press = (host: Element, label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);

  test("the Data tab has one sub-tab per table and pages 50 rows at a time", async () => {
    const api = fakeApi({ researchManifest: async () => FULL });
    const v = await view(api, "solvability-frontier", "data");
    expect(Array.from(v.host.querySelectorAll(".research-tables button")).map((b) => [b.textContent, b.className])).toEqual([["Predictions", "on"], ["Sourced problems", ""], ["Empty", ""]]);
    expect(heads(v.host)).toEqual(["id", "title", "sim 1"]);
    expect(v.host.querySelector(".licence-line")!.textContent).toBe("Licence: CC BY-SA 4.0");
    await v.click(press(v.host, "Sourced problems"));
    expect(v.host.querySelector(".licence-line")!.textContent).toBe("Each row carries its own licence and source.");
    expect(cells(v.host).length).toBe(50);
    expect(v.host.querySelector('[role="status"]')!.textContent).toBe("1 to 50 of 5,138 rows");
    expect(v.host.querySelector(".pager .muted")!.textContent).toBe("Page 1 of 103");
    expect((press(v.host, "Previous") as HTMLButtonElement).disabled).toBe(true);
    await v.click(press(v.host, "Next"));
    expect(v.host.querySelector('[role="status"]')!.textContent).toBe("51 to 100 of 5,138 rows");
    expect(cells(v.host)[0][2]).toBe("row-50");
    expect(api.asked.at(-1)).toEqual({ id: "problems-sourced", page: 2, q: undefined, sort: undefined });
    expect(v.host.querySelectorAll(".research-rows tbody tr").length).toBe(50);
    await v.click(press(v.host, "Empty"));
    expect(v.host.textContent).toContain("This table holds no rows.");
    await v.unmount();
  });

  test("licence and source columns stay pinned", async () => {
    const v = await view(fakeApi({ researchManifest: async () => FULL }), "solvability-frontier", "data");
    await v.click(press(v.host, "Sourced problems"));
    expect(heads(v.host)).toEqual(["licence", "source", "id", "name", "branch", "statement"]);
    const first = Array.from(v.host.querySelectorAll(".research-rows tbody tr")[0].querySelectorAll("td"));
    expect(first.map((td) => td.className)).toEqual(["pinned", "pinned", "", "", "", ""]);
    expect(first.slice(0, 3).map((td) => td.textContent)).toEqual(["CC BY-SA 4.0", "https://example.org/0", "row-0"]);
    await v.click(press(v.host, "name"));
    expect(heads(v.host).slice(0, 2)).toEqual(["licence", "source"]);
    await v.unmount();
  });

  test("a filter waits a moment, goes back to page one, and a sort flips on a second press", async () => {
    const api = fakeApi({ researchManifest: async () => FULL });
    const v = await view(api, "solvability-frontier", "data");
    await v.click(press(v.host, "Sourced problems"));
    await v.click(press(v.host, "Next"));
    const { act } = await import("react");
    const input = v.host.querySelector("input.search") as HTMLInputElement;
    expect(input.getAttribute("aria-label")).toBe("Filter Sourced problems");
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      set.call(input, "riemann");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    const before = api.asked.length;
    await act(async () => wait(260));
    await v.settle();
    expect(api.asked.length).toBe(before + 1);
    expect(api.asked.at(-1)).toEqual({ id: "problems-sourced", page: 1, q: "riemann", sort: undefined });
    expect(cells(v.host).map((r) => r[3])).toEqual(["Riemann hypothesis"]);
    expect(v.host.querySelector('[role="status"]')!.textContent).toBe("1 to 1 of 1 rows");
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, "zzzz");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await act(async () => wait(260));
    await v.settle();
    expect(v.host.textContent).toContain("No row matches “zzzz”.");
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, "");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await act(async () => wait(260));
    await v.settle();
    await v.click(press(v.host, "name"));
    expect(api.asked.at(-1)).toMatchObject({ sort: "name", page: 1 });
    expect(v.host.querySelector('th[aria-sort="ascending"]')!.textContent).toContain("name");
    await v.click(Array.from(v.host.querySelectorAll("th button")).find((b) => b.textContent?.includes("name")));
    expect(api.asked.at(-1)).toMatchObject({ sort: "-name", page: 1 });
    expect(v.host.querySelector('th[aria-sort="descending"]')!.textContent).toContain("name");
    expect(cells(v.host)[0][3]).toBe("Riemann hypothesis");
    await v.unmount();
  });

  test("record list and field view", async () => {
    const api = fakeApi({ researchManifest: async () => FULL });
    const v = await view(api, "solvability-frontier", "records");
    expect(v.host.querySelector(".licence-line")!.textContent).toBe("Problem records. Licence: CC BY-SA 4.0");
    expect(cells(v.host).map((r) => r[1])).toEqual(["Goldbach conjecture", "Riemann hypothesis"]);
    expect((v.host.querySelector("input.search") as HTMLInputElement).getAttribute("aria-label")).toBe("Filter Problem records");
    await v.click(Array.from(v.host.querySelectorAll("td button.link")).find((b) => b.textContent === "Riemann hypothesis"));
    expect(v.host.querySelector(".research-record h2")!.textContent).toBe("Riemann hypothesis");
    const fields = Array.from(v.host.querySelectorAll(".research-record > .record-fields > div")).map((div) => div.querySelector("dt")!.textContent);
    expect(fields).toEqual(["schema", "id", "title", "statement", "aliases", "industries", "posed", "resolved", "key works"]);
    expect(v.host.querySelectorAll(".record-items > li").length).toBe(2);
    expect(v.host.textContent).toContain("On the Number of Primes Less Than a Given Magnitude");
    expect(v.host.textContent).toContain("cryptography, number theory");
    expect(v.host.querySelector(".record-raw")).toBeNull();
    await v.click(press(v.host, "Show the stored text"));
    expect(v.host.querySelector(".record-raw")!.textContent).toBe(JSON.stringify(RIEMANN, null, 1));
    expect(v.host.querySelector(".research-record > .record-fields")).toBeNull();
    await v.click(press(v.host, "Show the fields"));
    expect(v.host.querySelector(".record-raw")).toBeNull();
    await v.click(press(v.host, "All records"));
    expect(cells(v.host).length).toBe(2);
    await v.click(Array.from(v.host.querySelectorAll("td button.link")).find((b) => b.textContent === "Goldbach conjecture"));
    expect(v.host.querySelector(".research-record .error")!.textContent).toBe("Bucket could not read this record.");
    expect(press(v.host, "Show the stored text")).toBeUndefined();
    await v.unmount();
  });

  test("a public build shows the staff notice", async () => {
    const api = fakeApi({ researchManifest: async () => PUBLIC });
    const data = await view(api, "solvability-frontier", "data");
    expect(data.host.querySelector(".staff-absent")!.textContent).toBe("Staff data is absent from this build.");
    expect(Array.from(data.host.querySelectorAll(".research-tables button")).map((b) => b.textContent)).toEqual(["Predictions"]);
    expect(cells(data.host).length).toBe(2);
    await data.unmount();
    const records = await view(api, "solvability-frontier", "records");
    expect(records.host.querySelector(".staff-absent")!.textContent).toBe("Staff data is absent from this build.");
    expect(records.host.querySelector(".research-rows")).toBeNull();
    expect(api.asked.filter((a) => a.id === "records")).toEqual([]);
    await records.unmount();
    const bare = { ...PUBLIC, withheld: 0, manifest: { ...PUBLIC.manifest, tables: [], record_sets: [] } };
    const none = await view(fakeApi({ researchManifest: async () => bare }), "solvability-frontier", "data");
    expect(none.host.textContent).toContain("This output lists no tables.");
    await none.unmount();
    const empty = await view(fakeApi({ researchManifest: async () => bare }), "solvability-frontier", "records");
    expect(empty.host.textContent).toContain("This output lists no records.");
    await empty.unmount();
    const old = await view(fakeApi(), "funding-landscape", "data");
    expect(old.host.querySelector(".research-rows")).toBeNull();
    expect(old.host.textContent).toContain("Second paragraph.");
    await old.unmount();
    const failing = await view(fakeApi({ researchManifest: async () => FULL, researchTable: async () => Promise.reject(new Error("Bucket could not read that table.")) }), "solvability-frontier", "data");
    expect(failing.host.querySelector('[role="alert"]')!.textContent).toBe("Bucket could not read that table.");
    await failing.unmount();
  });
});

describe("research paper tab", () => {
  const press = (host: Element, label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);

  test("a missing tool yields the Preview tier with an install line", async () => {
    const api = fakeApi();
    const v = await view(api, "solvability-frontier", "paper");
    expect(v.host.querySelector(".preview-label")!.textContent).toBe("Preview");
    expect(v.host.querySelector(".paper-view")!.textContent).toContain("This computer lacks the tool that draws the pages");
    const fold = v.host.querySelector(".paper-view details.fine") as HTMLDetailsElement;
    expect([fold.open, fold.querySelector("summary")!.textContent, fold.querySelector("pre")!.textContent]).toEqual([false, "How to get the pages", "sudo dnf install poppler-utils, or sudo apt install poppler-utils"]);
    expect(v.host.querySelector(".tex-preview h3")!.textContent).toBe("Method");
    expect(v.host.querySelector(".tex-preview .katex")).not.toBeNull();
    expect(v.host.querySelector(".tex-preview .katex-html .mfrac")).not.toBeNull();
    expect((v.host.querySelector(".paper-source textarea") as HTMLTextAreaElement).value).toBe(TEX);
    expect(v.host.querySelector(".paper-source .plain-store")!.textContent).toBe(NOTICE);
    expect(Array.from(v.host.querySelectorAll(".paper-source option")).map((o) => o.textContent)).toEqual(["solvability-frontier/main.tex"]);
    expect(v.host.querySelector(".pdf-pane")).toBeNull();
    expect(api.pagesAsked).toEqual([1]);
    await v.unmount();
  });

  test("href renders as text plus an Open button", async () => {
    const api = fakeApi();
    const v = await view(api, "solvability-frontier", "paper");
    const link = v.host.querySelector(".tex-link")!;
    expect(link.textContent).toBe("the paper Open");
    expect(v.host.querySelectorAll('.tex-preview a[href^="http"]').length).toBe(0);
    expect(v.host.innerHTML).not.toContain('href="https://example.org/paper"');
    await v.click(link.querySelector("button"));
    expect(api.opened).toEqual(["https://example.org/paper"]);
    await v.unmount();
    const refusing = fakeApi({ openLink: async () => Promise.reject(new Error("Bucket does not open that site.")) });
    const w = await view(refusing, "solvability-frontier", "paper");
    await w.click(w.host.querySelector(".tex-link button"));
    expect(w.host.querySelector(".tex-link .error")!.textContent).toBe(" Bucket does not open that site.");
    await w.unmount();
  });

  test("includegraphics outside assets shows a placeholder", async () => {
    const api = fakeApi();
    const v = await view(api, "solvability-frontier", "paper");
    expect(Array.from(v.host.querySelectorAll(".tex-missing")).map((p) => p.textContent)).toEqual(["A figure sits here in the paper. This build holds no copy of it."]);
    const shown = Array.from(v.host.querySelectorAll(".tex-preview img"));
    expect(shown.map((i) => i.getAttribute("src"))).toEqual([DATA_URL]);
    expect(v.host.querySelector(".tex-table a")!.getAttribute("href")).toBe("#/research/solvability-frontier/data");
    for (const el of Array.from(v.host.querySelectorAll("*"))) for (const attr of ["src", "href"]) expect(el.getAttribute(attr) ?? "").not.toContain("/local");
    await v.unmount();
  });

  test("PDF pane mounts at most 6 pages", async () => {
    autoSee = false;
    const api = fakeApi({ researchPage: async (_slug, n) => (api.pagesAsked.push(n), { state: "ready", pages: 20, pdf: "f".repeat(64), src: PAGE_URL }) });
    const v = await view(api, "solvability-frontier", "paper");
    expect(v.host.querySelectorAll(".pdf-page").length).toBe(20);
    const mounted = () => Array.from(v.host.querySelectorAll(".pdf-page img")).map((i) => Number(i.parentElement!.getAttribute("data-page")));
    expect(mounted()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(v.host.querySelector(".pdf-page img")!.getAttribute("src")).toBe(PAGE_URL);
    const { act } = await import("react");
    const { PdfPane } = await import("./views/Research");
    const pane = await mount(<PdfPane api={api} slug="solvability-frontier" pdf={"e".repeat(64)} pages={20} />);
    const observed: { isIntersecting: boolean; target: Element }[] = Array.from(pane.host.querySelectorAll(".pdf-page")).map((target, i) => ({ isIntersecting: i === 11 || i === 12, target }));
    await act(async () => paneObservers.at(-1)!(observed));
    await pane.settle();
    const now = Array.from(pane.host.querySelectorAll(".pdf-page img")).map((i) => Number(i.parentElement!.getAttribute("data-page")));
    expect(now).toEqual([10, 11, 12, 13, 14, 15]);
    await act(async () => paneObservers.at(-1)!(observed.map((o, i) => ({ ...o, isIntersecting: i === 19 }))));
    await pane.settle();
    expect(Array.from(pane.host.querySelectorAll(".pdf-page img")).length).toBe(6);
    expect(Number(pane.host.querySelectorAll(".pdf-page img")[5].parentElement!.getAttribute("data-page"))).toBe(20);
    expect(pane.host.innerHTML).not.toContain("/local");
    await pane.unmount();
    await v.unmount();
  });

  test("a v1 output shows the pages with no source pane, and waits while they render", async () => {
    let calls = 0;
    const api = fakeApi({ researchPage: async (): Promise<PaperPage> => (calls++ === 0 ? { state: "rendering" } : { state: "ready", pages: 2, pdf: "d".repeat(64), src: PAGE_URL }) });
    const v = await view(api, "funding-landscape", "paper");
    expect(v.host.querySelector(".paper-source")).toBeNull();
    expect(v.host.querySelector(".paper-single")).not.toBeNull();
    expect(v.host.textContent).toContain("Drawing the pages…");
    const { act } = await import("react");
    await act(async () => wait(1100));
    await v.settle();
    expect(v.host.querySelectorAll(".pdf-page img").length).toBe(2);
    await v.unmount();
    const none = await view(fakeApi(), "funding-landscape", "paper");
    expect(none.host.querySelector(".preview-label")!.textContent).toBe("Preview");
    expect(none.host.textContent).toContain("This output ships its paper without the source, so there is no preview.");
    await none.unmount();
    const broken = await view(fakeApi({ researchPage: async () => Promise.reject(new Error("Bucket could not read the pages.")) }), "solvability-frontier", "paper");
    expect(broken.host.querySelector(".paper-view .error")!.textContent).toBe("Bucket could not read the pages.");
    expect(broken.host.querySelector(".tex-preview h3")!.textContent).toBe("Method");
    await broken.unmount();
  });
});

describe("research changes tab", () => {
  const MAIN = "papers/solvability-frontier/main.tex";
  const DETAIL: ResearchDetail = {
    ...V2,
    files: [...V2.files, file("public/papers/solvability-frontier/data/predictions.csv", "table", 20), file("reports/solvability-frontier/report.json", "record", 21), file("papers/solvability-frontier/huge.tex", "paper-include", 22, 5 * 1024 * 1024)],
  };
  const press = (host: Element, label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);

  async function type(v: Awaited<ReturnType<typeof mount>>, value: string, waitMs = 800) {
    const { act } = await import("react");
    const area = v.host.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!.call(area, value);
      area.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await act(async () => wait(waitMs));
    await v.settle();
  }

  test("an edit in the Paper tab saves after a pause, then shows in Changes with its diff, and reverts", async () => {
    const copy = workCopy({ [MAIN]: SHIPPED_TEX });
    const api = fakeApi({ ...copy.api, researchManifest: async () => DETAIL });
    const v = await view(api, "solvability-frontier", "paper");
    expect((v.host.querySelector(".paper-source textarea") as HTMLTextAreaElement).value).toBe(SHIPPED_TEX);
    expect(v.host.querySelector(".save-state")!.textContent).toBe("Saved");
    expect(v.host.querySelector(".paper-source .plain-store")!.textContent).toBe(NOTICE);
    const edited = SHIPPED_TEX.replace("Second paragraph.", "Second paragraph, rewritten.");
    await type(v, edited, 100);
    expect(v.host.querySelector(".save-state")!.textContent).toBe("Not saved yet");
    expect(copy.saves).toEqual([]);
    const { act } = await import("react");
    await act(async () => wait(750));
    await v.settle();
    expect(copy.saves).toEqual([{ path: MAIN, base: copy.revOf(SHIPPED_TEX), text: edited }]);
    expect(v.host.querySelector(".save-state")!.textContent).toBe("Saved");
    await type(v, `${edited}More.\n`);
    expect(copy.saves.at(-1)).toEqual({ path: MAIN, base: copy.revOf(edited), text: `${edited}More.\n` });
    await v.unmount();

    const c = await view(api, "solvability-frontier", "changes");
    expect(c.host.querySelector(".plain-store")!.textContent).toBe(NOTICE);
    expect(c.host.querySelector("textarea")).toBeNull();
    expect(c.host.textContent).toContain("Edit a file in its own tab");
    const row = c.host.querySelector(".change-list li")!;
    expect(row.querySelector(".change-path")!.textContent).toBe(MAIN);
    expect(row.querySelector(".tag")!.textContent).toBe("Edited here");
    expect(row.textContent).toContain("1 added, 1 removed");
    expect(press(c.host, "Keep mine")).toBeUndefined();
    await c.click(press(c.host, "Show the changes"));
    expect(Array.from(c.host.querySelectorAll(".research-diff span")).map((sp) => [sp.className, sp.textContent])).toEqual([["", " First paragraph.\n"], ["del", "-Second paragraph.\n"], ["add", "+More.\n"]]);
    await c.click(press(c.host, "Hide the changes"));
    expect(c.host.querySelector(".research-diff")).toBeNull();
    await c.click(press(c.host, "Take the shipped version"));
    expect(copy.edits.size).toBe(0);
    expect(c.host.textContent).toContain("Nothing is changed. The files match the shipped version.");
    await c.unmount();
  });

  test("a save from a stale window offers the other version or mine", async () => {
    const copy = workCopy({ [MAIN]: SHIPPED_TEX });
    const v = await view(fakeApi({ ...copy.api, researchManifest: async () => DETAIL }), "solvability-frontier", "paper");
    copy.edits.set(MAIN, `${SHIPPED_TEX}From the other window.\n`);
    await type(v, `${SHIPPED_TEX}Mine.\n`);
    expect(v.host.querySelector('[role="alert"]')!.textContent).toContain("This file changed in another window.");
    expect(copy.edits.get(MAIN)).toBe(`${SHIPPED_TEX}From the other window.\n`);
    await v.click(press(v.host, "Keep mine"));
    expect(copy.edits.get(MAIN)).toBe(`${SHIPPED_TEX}Mine.\n`);
    expect(v.host.querySelector('[role="alert"]')).toBeNull();
    copy.edits.set(MAIN, `${SHIPPED_TEX}Theirs again.\n`);
    await type(v, `${SHIPPED_TEX}Mine twice.\n`);
    await v.click(press(v.host, "Load that version"));
    expect((v.host.querySelector("textarea") as HTMLTextAreaElement).value).toBe(`${SHIPPED_TEX}Theirs again.\n`);
    expect(v.host.querySelector('[role="alert"]')).toBeNull();
    await v.unmount();
  });

  test("a table is edited as text in the Data tab and a record as text in the Records tab, where broken text is held back", async () => {
    const TABLE = "public/papers/solvability-frontier/data/predictions.csv";
    const RECORD = "tools/solvability-atlas/records/riemann.json";
    const shippedRecord = JSON.stringify(RIEMANN, null, 1);
    const copy = workCopy({ [TABLE]: "id,title\n1,One\n", [RECORD]: shippedRecord });
    const detail: ResearchDetail = { ...FULL, files: [...FULL.files, file(TABLE, "table", 30), file(RECORD, "record-set", 31), file("tools/solvability-atlas/problems-sourced.tsv", "table", 32, 5 * 1024 * 1024)] };
    const api = fakeApi({ ...copy.api, researchManifest: async () => detail, researchText: async (_s, path) => copy.edits.get(path) ?? shippedRecord });
    const v = await view(api, "solvability-frontier", "data");
    expect(v.host.querySelector("textarea")).toBeNull();
    const before = api.asked.length;
    await v.click(press(v.host, "Edit the text"));
    expect((v.host.querySelector("textarea") as HTMLTextAreaElement).value).toBe("id,title\n1,One\n");
    await type(v, "id,title\n1,One\n2,Two\n");
    expect(copy.edits.get(TABLE)).toBe("id,title\n1,One\n2,Two\n");
    expect(api.asked.length).toBeGreaterThan(before);
    await v.click(press(v.host, "Close the editor"));
    expect(v.host.querySelector("textarea")).toBeNull();
    await v.click(press(v.host, "Sourced problems"));
    expect(press(v.host, "Edit the text")).toBeUndefined();
    await v.unmount();

    const r = await view(api, "solvability-frontier", "records");
    await r.click(Array.from(r.host.querySelectorAll("td button.link")).find((b) => b.textContent === "Riemann hypothesis"));
    await r.click(press(r.host, "Show the stored text"));
    expect((r.host.querySelector("textarea") as HTMLTextAreaElement).value).toBe(shippedRecord);
    const saved = copy.saves.length;
    await type(r, `${shippedRecord.slice(0, -1)}`);
    expect(r.host.querySelector(".save-state")!.textContent).toBe("This text does not parse yet, so it is not saved.");
    expect(copy.saves.length).toBe(saved);
    const next = JSON.stringify({ ...RIEMANN, posed: 1860 }, null, 1);
    await type(r, next);
    expect(copy.saves.at(-1)).toMatchObject({ path: RECORD, text: next });
    await r.unmount();
  });

  test("a file whose shipped version changed offers keep mine, and a large file shows sizes", async () => {
    const copy = workCopy({ [MAIN]: SHIPPED_TEX });
    copy.edits.set(MAIN, `${SHIPPED_TEX}Mine.\n`);
    const kept: [string, boolean | undefined][] = [];
    const drifted: Change = { ...(await copy.api.researchChanges()).changes[0], state: "shipped-changed" };
    const large: Change = { ...drifted, path: "public/papers/solvability-frontier/data/predictions.csv", state: "base-unknown", hunks: null, size: 3_000_000, shippedSize: 2_900_000, added: 0, removed: 0 };
    const v = await view(fakeApi({ ...copy.api, researchManifest: async () => DETAIL, researchChanges: async () => ({ notice: NOTICE, changes: [drifted, large] }), researchRevert: async (_s, path, keep) => (kept.push([path, keep]), { path, changed: 1 }) }), "solvability-frontier", "changes");
    expect(Array.from(v.host.querySelectorAll(".change-list .tag")).map((t) => t.textContent)).toEqual(["The shipped version changed", "Edited before Bucket tracked it"]);
    await v.click(press(v.host, "Keep mine"));
    expect(kept).toEqual([[MAIN, true]]);
    await v.click(Array.from(v.host.querySelectorAll(".change-list li")[1].querySelectorAll("button")).find((b) => b.textContent?.trim() === "Show the changes"));
    expect(v.host.textContent).toContain("2,900,000 bytes shipped, 3,000,000 bytes now.");
    await v.unmount();
  });

  test("export lists the folder and its files, and a refusal shows in plain words", async () => {
    const copy = workCopy({ [MAIN]: SHIPPED_TEX });
    copy.edits.set(MAIN, `${SHIPPED_TEX}Mine.\n`);
    const v = await view(fakeApi({ ...copy.api, researchManifest: async () => DETAIL }), "solvability-frontier", "changes");
    expect(v.host.querySelector(".research-export")).toBeNull();
    await v.click(press(v.host, "Export the changes"));
    expect(v.host.querySelector(".research-export .hash")!.textContent).toBe("/srv/bucket/research/exports/solvability-frontier-20261011T123005");
    expect(Array.from(v.host.querySelectorAll(".research-export li")).map((li) => li.textContent)).toEqual(["CHANGES.patch", "LICENCES.md", MAIN, "report.json"]);
    await v.unmount();
    const refusing = await view(fakeApi({ ...copy.api, researchManifest: async () => DETAIL, researchExport: async () => Promise.reject(new Error("Bucket could not write the export.")) }), "solvability-frontier", "changes");
    await refusing.click(press(refusing.host, "Export the changes"));
    expect(refusing.host.querySelector('[role="alert"]')!.textContent).toBe("Bucket could not write the export.");
    await refusing.unmount();
  });

  test("a v1 output has no Changes tab, and only text files under 4 MB can be edited", async () => {
    const { editable } = await import("./views/Research");
    expect(editable(DETAIL).map((f) => f.path)).toEqual([MAIN, "public/papers/solvability-frontier/data/predictions.csv"]);
    expect(editable(V1)).toEqual([]);
    const old = await view(fakeApi(), "funding-landscape", "changes");
    expect(old.host.querySelector(".research-changes")).toBeNull();
    expect(old.host.textContent).toContain("Second paragraph.");
    await old.unmount();
    const bare = await view(fakeApi({ researchManifest: async () => ({ ...V2, files: V2.files.filter((f) => !f.path.endsWith(".tex")) }) }), "solvability-frontier", "changes");
    expect(bare.host.textContent).toContain("Edit a file in its own tab");
    expect(bare.host.querySelector("textarea")).toBeNull();
    await bare.unmount();
    const down = await view(fakeApi({ researchChanges: async () => Promise.reject(new Error("Bucket could not read the changes.")) }), "solvability-frontier", "changes");
    expect(down.host.querySelector(".error")!.textContent).toBe("Bucket could not read the changes.");
    await down.unmount();
  });
});

describe("own outputs in the window", () => {
  const press = (host: Element, label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);
  const OWN: ResearchDetail = {
    slug: "renders",
    origin: "local",
    staff: false,
    withheld: 0,
    unreadable: null,
    files: [file("reports/renders/REPORT.md", "source", 40), file("reports/renders/01-helix.png", "asset", 41), file("reports/renders/02-sphere.png", "asset", 42), file("reports/renders/03-network.png", "asset", 43), file("reports/renders/01-helix.pdf", "file", 44)],
    manifest: {
      schema: "bucket.report/2",
      slug: "renders",
      title: "Twelve renders",
      authors: ["Ada Lovelace"],
      date: "2026-10-12",
      status: "draft",
      kind: "memo",
      source_path: "reports/renders/REPORT.md",
      source_hash: "d".repeat(64),
      assets: [
        { id: "01-helix", path: "reports/renders/01-helix.png", caption: "01 helix", licence: "CC-BY-4.0", audience: "staff", source: "reports/renders/01-helix.pdf" },
        { id: "02-sphere", path: "reports/renders/02-sphere.png", caption: "02 sphere", licence: "CC-BY-4.0", audience: "staff" },
        { id: "03-network", path: "reports/renders/03-network.png", caption: "03 network", licence: "CC-BY-4.0", audience: "staff" },
      ],
      tables: [],
    },
  };

  async function fill(v: Awaited<ReturnType<typeof mount>>, label: string, value: string) {
    const { act } = await import("react");
    const input = Array.from(v.host.querySelectorAll(".research-new label")).find((l) => l.textContent?.startsWith(label))!.querySelector("input, select") as HTMLInputElement;
    const proto = input.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(input, value);
      input.dispatchEvent(new window.Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    });
    await v.settle();
    return input;
  }

  test("New output takes a title, a short name and a kind, and opens the new draft", async () => {
    const { shortName } = await import("./views/Research");
    expect(shortName("  My First Output: Notes & Figures!  ")).toBe("my-first-output-notes-figures");
    expect(shortName("Größe ∑ 12")).toBe("gr-e-12");
    expect(shortName("x".repeat(80)).length).toBe(64);
    expect(shortName("???")).toBe("");
    const made: { title: string; slug: string; kind: string }[] = [];
    const v = await view(fakeApi({ researchNew: async (input) => (made.push(input), { slug: input.slug }) }));
    expect(v.host.querySelector(".research-new h2")!.textContent).toBe("New output");
    expect((press(v.host, "Create the output") as HTMLButtonElement).disabled).toBe(true);
    await fill(v, "Title", "Twelve Renders");
    expect((Array.from(v.host.querySelectorAll(".research-new input"))[1] as HTMLInputElement).value).toBe("twelve-renders");
    expect(Array.from(v.host.querySelectorAll(".research-new option")).map((o) => o.textContent)).toEqual(["Memo", "Brief", "Paper", "Dataset report"]);
    await fill(v, "Kind", "dataset-report");
    await v.click(press(v.host, "Create the output"));
    expect(made).toEqual([{ title: "Twelve Renders", slug: "twelve-renders", kind: "dataset-report" }]);
    expect(window.location.hash).toBe("#/research/twelve-renders/report");
    await fill(v, "Short name", "renders");
    await v.click(press(v.host, "Create the output"));
    expect(made.at(-1)!.slug).toBe("renders");
    expect(v.host.querySelectorAll('.research-new input[type="file"]').length).toBe(0);
    await v.unmount();
    const refusing = await view(fakeApi({ researchNew: async () => Promise.reject(new Error("An output already has that short name.")) }));
    await fill(refusing, "Title", "Taken");
    await refusing.click(press(refusing.host, "Create the output"));
    expect(refusing.host.querySelector('.research-new [role="alert"]')!.textContent).toBe("An output already has that short name.");
    await refusing.unmount();
    const empty = await view(fakeApi({ researchList: async () => ({ outputs: [] }) }));
    expect(empty.host.querySelector(".research-new")).not.toBeNull();
    await empty.unmount();
  });

  test("an own output shows the same tabs, its three figures, and an export with nothing changed", async () => {
    const api = fakeApi({ researchManifest: async () => OWN });
    const report = await view(api, "renders");
    expect(Array.from(report.host.querySelectorAll(".seg button")).map((b) => b.textContent)).toEqual(["Report", "Data", "Figures", "Records", "Changes"]);
    expect(Array.from(report.host.querySelectorAll(".research-meta .tag")).map((t) => t.textContent)).toEqual(["memo", "draft", "2026-10-12", "Local"]);
    expect(report.host.querySelector(".research-add h2")!.textContent).toBe("Add a file");
    await report.unmount();
    const figures = await view(api, "renders", "figures");
    expect(Array.from(figures.host.querySelectorAll(".research-figure img")).map((i) => [i.getAttribute("src"), i.getAttribute("alt")])).toEqual([[DATA_URL, "01 helix"], [DATA_URL, "02 sphere"], [DATA_URL, "03 network"]]);
    expect(api.images).toEqual(["reports/renders/01-helix.png", "reports/renders/02-sphere.png", "reports/renders/03-network.png"]);
    await figures.unmount();
    const changes = await view(api, "renders", "changes");
    await changes.click(press(changes.host, "Export this output"));
    expect(changes.host.querySelector(".research-export .hash")!.textContent).toContain("/research/exports/");
    await changes.unmount();
    const shipped = await view(fakeApi(), "solvability-frontier");
    expect(shipped.host.querySelector(".research-add")).toBeNull();
    await shipped.unmount();
    const shippedChanges = await view(fakeApi(), "solvability-frontier", "changes");
    expect(press(shippedChanges.host, "Export this output")).toBeUndefined();
    await shippedChanges.unmount();
  });

  test("Add a file sends the file with its role and reloads the output; a file over 16 MB stays out", async () => {
    const sent: [string, string, string, number][] = [];
    let loads = 0;
    const api = fakeApi({ researchManifest: async () => (loads++, OWN), researchUpload: async (slug, role, name, blob) => (sent.push([slug, role, name, blob.size]), { slug, path: `reports/${slug}/data/${name}` }) });
    const v = await view(api, "renders");
    const { act } = await import("react");
    expect(Array.from(v.host.querySelectorAll(".research-add option")).map((o) => o.textContent)).toEqual(["Report text", "Figure", "Data table", "Paper"]);
    const pick = async (f: File) => {
      const input = v.host.querySelector('.research-add input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, "files", { configurable: true, value: [f] });
      await act(async () => input.dispatchEvent(new window.Event("change", { bubbles: true })));
      await v.settle();
    };
    const before = loads;
    await pick(new window.File(["id,title\n1,One\n"], "rows.csv") as unknown as File);
    expect(sent).toEqual([["renders", "figure", "rows.csv", 15]]);
    expect(v.host.querySelector('.research-add [role="status"]')!.textContent).toBe("Added rows.csv.");
    expect(loads).toBeGreaterThan(before);
    const select = v.host.querySelector(".research-add select") as HTMLSelectElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set!.call(select, "data");
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    await pick(new window.File(["x"], "more.csv") as unknown as File);
    expect(sent.at(-1)!.slice(0, 3)).toEqual(["renders", "data", "more.csv"]);
    const big = new window.File(["x"], "big.png") as unknown as File;
    Object.defineProperty(big, "size", { value: 16 * 1024 * 1024 + 1 });
    await pick(big);
    expect(sent.length).toBe(2);
    expect(v.host.querySelector('.research-add [role="alert"]')!.textContent).toBe("That file is over 16 MB.");
    await v.unmount();
    const refusing = await view(fakeApi({ researchManifest: async () => OWN, researchUpload: async () => Promise.reject(new Error("Bucket does not take that kind of file.")) }), "renders");
    const input = refusing.host.querySelector('.research-add input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, "files", { configurable: true, value: [new window.File(["x"], "a.gif")] });
    await act(async () => input.dispatchEvent(new window.Event("change", { bubbles: true })));
    await refusing.settle();
    expect(refusing.host.querySelector('.research-add [role="alert"]')!.textContent).toBe("Bucket does not take that kind of file.");
    await refusing.unmount();
  });
});

describe("math under the page CSP", () => {
  test("KaTeX never writes a style attribute as markup, for tall delimiters and for errors", async () => {
    const { Tex } = await import("@/components/math/InlineMath");
    const real = window.Element.prototype.setAttribute;
    const css = Object.getOwnPropertyDescriptor(window.CSSStyleDeclaration.prototype, "cssText")!;
    let viaCssom = 0;
    let depth = 0;
    const asMarkup: string[] = [];
    Object.defineProperty(window.CSSStyleDeclaration.prototype, "cssText", {
      configurable: true,
      get: css.get,
      set(value: string) {
        viaCssom += 1;
        depth += 1;
        try {
          css.set!.call(this, value);
        } finally {
          depth -= 1;
        }
      },
    });
    window.Element.prototype.setAttribute = function (name: string, value: string) {
      if (name === "style" && depth === 0) asMarkup.push(value);
      real.call(this, name, value);
    };
    try {
      const v = await mount(
        <div>
          <Tex tex={"f(x) = \\begin{cases} \\dfrac{a}{b} & x > 0 \\\\ \\sqrt{\\dfrac{c}{d}} & x \\le 0 \\end{cases}"} display />
          <Tex tex={"\\notacommand{x} + \\pmb{y} + \\fcolorbox{red}{white}{z}"} display={false} />
        </div>,
      );
      expect(v.host.querySelectorAll(".katex").length).toBe(2);
      expect(asMarkup).toEqual([]);
      expect(viaCssom).toBeGreaterThan(0);
      await v.unmount();
    } finally {
      window.Element.prototype.setAttribute = real;
      Object.defineProperty(window.CSSStyleDeclaration.prototype, "cssText", css);
    }
    const probe = document.createElement("span");
    probe.setAttribute("style", "color: red");
    expect(probe.getAttribute("style")).toContain("red");
  });
});

describe("image cache", () => {
  test("image cache evicts past 48 MB", async () => {
    const held = await import("./use-engine-image");
    expect(held.IMAGE_CACHE_BYTES).toBe(IMAGE_CACHE_BYTES);
    expect((await import("./api")).IMAGE_MAX_BYTES).toBe(IMAGE_MAX_BYTES);
    const cache = new held.ImageCache();
    const mb = (n: number) => "x".repeat(n * 1024 * 1024);
    for (let i = 0; i < 6; i++) cache.set(`k${i}`, mb(8));
    expect(cache.bytes).toBe(IMAGE_CACHE_BYTES);
    expect(cache.size).toBe(6);
    expect(cache.get("k0")).toBeDefined();
    cache.set("k6", mb(8));
    expect(cache.bytes).toBe(IMAGE_CACHE_BYTES);
    expect(cache.has("k1")).toBe(false);
    expect(cache.has("k0")).toBe(true);
    expect(cache.has("k6")).toBe(true);
    cache.set("k7", mb(20));
    expect(cache.bytes).toBeLessThanOrEqual(IMAGE_CACHE_BYTES);
    expect(cache.has("k7")).toBe(true);
    cache.set("k7", mb(1));
    expect(cache.get("k7")!.length).toBe(1024 * 1024);
    cache.set("huge", mb(49));
    expect(cache.has("huge")).toBe(false);
    expect(cache.bytes).toBeLessThanOrEqual(IMAGE_CACHE_BYTES);
  });
});

describe("image loading", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  async function connected(reply: (url: string, init?: RequestInit) => Response) {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    (window as unknown as { __BKT__: unknown }).__BKT__ = { nonce: "n".repeat(43) };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/session") return new Response(JSON.stringify({ token: "t".repeat(43) }), { headers: { "content-type": "application/json" } });
      calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      return reply(url, init);
    }) as typeof fetch;
    const { Api, researchFileUrl } = await import("./api");
    return { api: await Api.connect(() => {}), calls, researchFileUrl };
  }

  test("an image is fetched with the session header and comes back as a data URL", async () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const { api, calls, researchFileUrl } = await connected(() => new Response(png, { headers: { "content-type": "image/png" } }));
    const src = await api.image("solvability-frontier", "public/atlas/04-helix.webp");
    expect(src.startsWith("data:image/png;base64,")).toBe(true);
    const asked = calls.find((c) => c.url.startsWith("/local/research/file"))!;
    expect(asked.url).toBe(researchFileUrl("solvability-frontier", "public/atlas/04-helix.webp"));
    expect(asked.url).toBe("/local/research/file?slug=solvability-frontier&path=public%2Fatlas%2F04-helix.webp");
    expect(asked.headers.authorization).toBe(`Bucket ${"t".repeat(43)}`);
    expect(asked.url).not.toContain("t".repeat(43));
  });

  test("a reply that is no image, one over 8 MB and a refusal each fail", async () => {
    const html = await connected(() => new Response("<html></html>", { headers: { "content-type": "text/html" } }));
    await expect(html.api.image("a", "b.png")).rejects.toThrow("That file is not an image this window shows.");
    const big = await connected(() => new Response(new Uint8Array(IMAGE_MAX_BYTES + 1), { headers: { "content-type": "image/png" } }));
    await expect(big.api.image("a", "b.png")).rejects.toThrow("That image is over 8 MB.");
    const denied = await connected(() => new Response(JSON.stringify({ error: "the output does not list that file" }), { status: 404, headers: { "content-type": "application/json" } }));
    await expect(denied.api.image("a", "b.png")).rejects.toMatchObject({ status: 404, code: "the output does not list that file" });
  });
});
