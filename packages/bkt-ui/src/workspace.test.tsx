import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import type { Api, PackedFile, ResearchDetail, SaveResult, TablePage, WorkspaceItem } from "./api";
import { href, parseHash, type Route } from "./router";
import type { TabStorage } from "./tabs";
import type { WorkspaceApi } from "./views/Workspace";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

const TABLE_PATH = "public/papers/solvability-frontier/data/atlas-problems.csv";
const TEX_PATH = "papers/solvability-frontier/main.tex";
const FIG_PATH = "public/papers/solvability-frontier/fig_frontier.webp";
const SCRIPT_PATH = "papers/solvability-frontier/fig_frontier.py";
const file = (path: string, n: number): PackedFile => ({ path, sha256: String(n).padStart(64, "0"), size: 1200, audience: "public", role: "table" });
const DETAIL: ResearchDetail = {
  slug: "solvability-frontier",
  origin: "shipped",
  staff: false,
  withheld: 0,
  unreadable: null,
  files: [file(TABLE_PATH, 1), file("tools/solvability-atlas/records/riemann.json", 2), { ...file(TEX_PATH, 3), role: "source" }, { ...file(FIG_PATH, 4), role: "asset" }, { ...file(SCRIPT_PATH, 5), role: "asset-source" }],
  manifest: {
    schema: "bucket.report/2",
    slug: "solvability-frontier",
    title: "The Solvability Frontier",
    authors: ["A Named Author"],
    date: "2026-10-08",
    status: "public",
    kind: "paper",
    source_path: "papers/solvability-frontier/main.tex",
    source_hash: "a".repeat(64),
    tables: [
      { id: "atlas-problems", path: TABLE_PATH, format: "csv", label: "Atlas problems", licence: "mixed", audience: "public" },
      { id: "atlas-branches", path: "public/papers/solvability-frontier/data/branches.csv", format: "csv", label: "Atlas branches", licence: "CC0-1.0", audience: "public" },
    ],
    assets: [
      { id: "fig-frontier", path: FIG_PATH, caption: "The frontier on 5,209 rows", licence: "CC-BY-4.0", audience: "public", source: SCRIPT_PATH },
      { id: "atlas-helix", path: "public/atlas/04-helix.webp", caption: "Solvability helix", licence: "MIT code output", audience: "public" },
    ],
    builds: [{ id: "pdf", label: "Paper PDF", runner: "latex", entry: TEX_PATH, audience: "public" }],
    record_sets: [{ id: "problems", dir: "tools/solvability-atlas/records", schema: "bucket.problem/1", label: "Problem records", licence: "CC BY-SA 4.0", audience: "public" }],
  },
};

const output = (id: string, title: string, type: "tables" | "records" | "figures" | "papers", over: Partial<WorkspaceItem> = {}): WorkspaceItem => ({ type, key: `output:solvability-frontier:${id}`, title, from: { kind: "output", id: "solvability-frontier", title: "The Solvability Frontier" }, origin: "shipped", licence: "mixed", changed: false, opens: type === "papers" ? "#/research/solvability-frontier/paper" : `#/research/solvability-frontier/${type === "tables" ? "data" : type}/${id}`, explore: null, ...over });
const ITEMS: WorkspaceItem[] = [
  output("atlas-problems", "Atlas problems", "tables", { changed: true }),
  output("atlas-branches", "Atlas branches", "tables", { licence: "CC0-1.0" }),
  { ...output("counts", "My counts", "tables", { origin: "local", licence: "" }), key: "output:mine:counts", from: { kind: "output", id: "mine", title: "My own output" }, opens: "#/research/mine/data/counts" },
  output("problems", "Problem records", "records", { licence: "CC BY-SA 4.0" }),
  output("fig-frontier", "The frontier on 5,209 rows", "figures", { licence: "CC-BY-4.0" }),
  output("atlas-helix", "Solvability helix", "figures", { licence: "MIT code output" }),
  output("paper", "The Solvability Frontier", "papers", { licence: "CC-BY-4.0", changed: true }),
  { type: "records", key: "dataset:canon:all", title: "The canon", from: { kind: "dataset", id: "canon", title: "The canon" }, origin: "shipped", licence: "CC0-1.0", changed: false, opens: "#/data", explore: null },
];

const TEX = "\\begin{document}\\section{Method}First paragraph.\\end{document}";
const page = (columns: string[], rows: string[][]): TablePage => ({ columns, pinned: [], rows, index: rows.map((_, i) => i), total: rows.length, page: 1, size: 50, truncated: false }) as TablePage;

function fakeApi(over: Partial<WorkspaceApi> = {}) {
  const listed: { type: string; q?: string; page?: number }[] = [];
  const tables: { slug: string; id: string }[] = [];
  const saves: { slug: string; path: string; base: string; text: string }[] = [];
  const texts: string[] = [];
  const images: string[] = [];
  const builds: [string, string][] = [];
  const api = {
    workspaceItems: async (type: string, query: { q?: string; page?: number } = {}) => {
      listed.push({ type, ...query });
      const all = ITEMS.filter((i) => i.type === type && (!query.q || i.title.toLowerCase().includes(query.q.toLowerCase())));
      return { items: all, total: all.length, page: query.page ?? 1, size: 50 };
    },
    researchManifest: async (slug: string) => {
      if (slug !== "solvability-frontier") throw Object.assign(new Error("Bucket could not find that."), { status: 404 });
      return DETAIL;
    },
    researchTable: async (slug: string, id: string) => {
      tables.push({ slug, id });
      return id === "problems" ? page(["title", "path"], [["Riemann hypothesis", "tools/solvability-atlas/records/riemann.json"]]) : page(["id", "title"], [["goldbach", "Goldbach conjecture"]]);
    },
    researchText: async (_slug: string, path: string) => (texts.push(path), '{"id":"riemann","title":"Riemann hypothesis"}'),
    researchSource: async (_slug: string, path: string) => ({ text: path.endsWith(".tex") ? TEX : path.endsWith(".py") ? "print('figure')\n" : "id,title\ngoldbach,Goldbach conjecture\n", rev: "rev-shipped" }),
    image: async (_slug: string, path: string) => (images.push(path), "data:image/webp;base64,AAAA"),
    researchPage: async () => ({ state: "preview", reason: "the page tool is missing, so the paper shows as a preview", install: "" }),
    researchBuild: async (slug: string, build: string) => (builds.push([slug, build]), { state: "refused", reason: "builds are off for this output", install: null, status: 403 }),
    researchBuildState: async () => ({ pending: null, job: null }),
    installedDecks: async () => ({ decks: [] }),
    generations: async () => ({ generations: [], repo: true }),
    generatedImage: async (name: string, run: string, file: string) => (images.push(`${name}/${run}/${file}`), "data:image/svg+xml;base64,AAAA"),
    advisor: async () => ({ review: null, forgotten: 0 }),
    library: async () => ({ built: "1970-01-01", refreshedAt: null, offline: true, from: "bundled", signed: false, decks: [] }),
    researchSave: async (slug: string, path: string, base: string, text: string): Promise<SaveResult> => (saves.push({ slug, path, base, text }), { saved: true, rev: "rev-next", changed: true }),
    ...over,
  } as unknown as WorkspaceApi;
  return { api, listed, tables, saves, texts, images, builds };
}

function memory(seed: Record<string, string> = {}): TabStorage & { data: Record<string, string> } {
  const data = { ...seed };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

async function mount(node: React.ReactElement) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(node));
  const settle = async () => {
    for (let i = 0; i < 4; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
  };
  await settle();
  const click = async (el: Element | null | undefined) => {
    await act(async () => (el as HTMLElement).click());
    await settle();
  };
  const wait = (ms: number) => act(async () => new Promise((r) => setTimeout(r, ms)));
  return { host, click, settle, wait, act, unmount: () => act(async () => root.unmount()) };
}

async function workspace(api: WorkspaceApi, type: "tables" | "records" | "figures" | "papers" | "people" | "decks", storage: TabStorage | null = memory()) {
  const { WorkspaceView } = await import("./views/Workspace");
  return mount(<WorkspaceView api={api} type={type} storage={storage} />);
}

const press = (host: Element, label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);
const cells = (host: Element) => Array.from(host.querySelectorAll(".workspace-list tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent!.trim()));

describe("workspace tab bar", () => {
  test("holds nine entries in one order, each with its own address", async () => {
    const { WORKSPACE_TABS, WorkspaceTabs, WORKSPACE_BAR_LABEL } = await import("./views/WorkspaceTabs");
    expect(WORKSPACE_TABS.map((t) => t.label)).toEqual(["Nodes", "Tables", "Figures", "Papers", "Records", "Graphs", "People", "Decks", "Maps"]);
    const v = await mount(<WorkspaceTabs lit="tables" />);
    const links = Array.from(v.host.querySelectorAll(".workspace-tabs a"));
    expect(v.host.querySelector("nav")!.getAttribute("aria-label")).toBe(WORKSPACE_BAR_LABEL);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#/graph", "#/workspace/tables", "#/workspace/figures", "#/workspace/papers", "#/workspace/records", "#/workspace/graphs", "#/workspace/people", "#/workspace/decks", "#/workspace/maps"]);
    for (const a of links) expect(href(parseHash(a.getAttribute("href")!))).toBe(a.getAttribute("href")!);
    expect(links.filter((a) => a.className === "on").map((a) => [a.textContent, a.getAttribute("aria-current")])).toEqual([["Tables", "page"]]);
    await v.unmount();
  });

  test("lights the entry of the route and is absent from every other screen", async () => {
    const { workspaceTabFor } = await import("./views/WorkspaceTabs");
    const lit: [Route, string | null][] = [
      [{ name: "graph" }, "nodes"],
      [{ name: "graph", branch: "07-mind" }, "nodes"],
      [{ name: "node", slug: "02-physics:ph-entropy" }, "nodes"],
      [{ name: "workspace" }, "tables"],
      [{ name: "workspace", type: "records" }, "records"],
      [{ name: "workspace", type: "maps" }, "maps"],
      [{ name: "research" }, null],
      [{ name: "research", slug: "solvability-frontier", tab: "data" }, null],
      [{ name: "data" }, null],
      [{ name: "learn" }, null],
      [{ name: "explore" }, null],
    ];
    expect<(string | null)[]>(lit.map(([route]) => workspaceTabFor(route))).toEqual(lit.map(([, tab]) => tab));
  });

  test("the screen shows the bar on a workspace and leaves it off an output", async () => {
    const { Screen } = await import("./nav");
    const { api } = fakeApi({ researchList: async () => ({ outputs: [] }) } as Partial<WorkspaceApi>);
    const records = await mount(<Screen api={api as unknown as Api} route={{ name: "workspace", type: "records" }} />);
    expect(records.host.querySelector(".workspace-tabs a.on")!.textContent).toBe("Records");
    expect(records.host.querySelector("h1")!.textContent).toBe("Records");
    await records.unmount();
    const output = await mount(<Screen api={api as unknown as Api} route={{ name: "research", slug: "solvability-frontier", tab: "data" }} />);
    expect(output.host.querySelector(".workspace-tabs")).toBeNull();
    await output.unmount();
    const list = await mount(<Screen api={api as unknown as Api} route={{ name: "research" }} />);
    expect(list.host.querySelector(".workspace-tabs")).toBeNull();
    await list.unmount();
  });

  test("the menu holds Workspaces after Research and lights it on every workspace tab", async () => {
    const { NAV } = await import("./nav");
    const labels = NAV.map((n) => n.label);
    expect(labels).toHaveLength(16);
    expect(labels[labels.indexOf("Research") + 1]).toBe("Workspaces");
    expect(NAV.find((n) => n.label === "Workspaces")!.route).toEqual({ name: "workspace" });
    expect(href({ name: "workspace" })).toBe("#/workspace/tables");
  });
});

describe("tables workspace", () => {
  test("every address the index hands out parses in the router", () => {
    for (const item of ITEMS) expect(href(parseHash(item.opens))).toBe(item.opens);
    expect(parseHash("#/research/solvability-frontier/data/atlas-problems")).toEqual({ name: "research", slug: "solvability-frontier", tab: "data", item: "atlas-problems" });
    expect(parseHash("#/research/mine/records/problems")).toEqual({ name: "research", slug: "mine", tab: "records", item: "problems" });
  });

  test("lists tables across outputs, shipped and added by the person", async () => {
    const f = fakeApi();
    const v = await workspace(f.api, "tables");
    expect(v.host.querySelector("h1")!.textContent).toBe("Tables");
    expect(cells(v.host)).toEqual([
      ["Atlas problems", "The Solvability Frontier", "Shipped", "Each row carries its own", "Changed on this computer"],
      ["Atlas branches", "The Solvability Frontier", "Shipped", "CC0-1.0", ""],
      ["My counts", "My own output", "Local", "None stated", ""],
    ]);
    expect(f.listed).toEqual([{ type: "tables", q: undefined, page: 1 }]);
    expect(f.tables).toEqual([]);
    expect(v.host.textContent).not.toContain("A Named Author");
    expect(Array.from(v.host.querySelectorAll(".workspace-list tbody td:nth-child(2) a")).map((a) => a.getAttribute("href"))).toEqual(["#/research/solvability-frontier/data/atlas-problems", "#/research/solvability-frontier/data/atlas-branches", "#/research/mine/data/counts"]);
    await v.unmount();
  });

  test("opening a table mounts the pane of the Data tab and keeps it as a tab", async () => {
    const f = fakeApi();
    const store = memory();
    const v = await workspace(f.api, "tables", store);
    await v.click(press(v.host, "Atlas problems"));
    expect(f.tables).toEqual([{ slug: "solvability-frontier", id: "atlas-problems" }]);
    expect(v.host.querySelector(".research-table")).not.toBeNull();
    expect(v.host.querySelector(".licence-line")!.textContent).toBe("Each row carries its own licence and source.");
    expect(v.host.querySelector(".workspace-item-head h2")!.textContent).toBe("Atlas problems");
    expect(v.host.querySelector(".workspace-item-head a")!.getAttribute("href")).toBe("#/research/solvability-frontier/data");
    expect(Array.from(v.host.querySelectorAll(".research-rows tbody td")).map((td) => td.textContent)).toEqual(["goldbach", "Goldbach conjecture"]);
    expect(Array.from(v.host.querySelectorAll('[role="tab"]')).map((t) => [t.textContent, t.getAttribute("aria-selected")])).toEqual([["All tables", "false"], ["Atlas problems", "true"]]);
    expect(JSON.parse(store.data["bucket.workspace.tables.tabs"])).toEqual({ tabs: [{ id: "output:solvability-frontier:atlas-problems", title: "Atlas problems" }], active: "output:solvability-frontier:atlas-problems" });
    expect(store.data["bucket.data.tabs"]).toBeUndefined();
    await v.click(v.host.querySelector('[role="tab"]'));
    expect(cells(v.host)).toHaveLength(3);
    await v.unmount();
    const again = await workspace(f.api, "tables", store);
    expect(Array.from(again.host.querySelectorAll('[role="tab"]')).map((t) => t.textContent)).toEqual(["All tables", "Atlas problems"]);
    await again.unmount();
  });

  test("an edit saves through the working copy with the version it started from", async () => {
    const f = fakeApi();
    const v = await workspace(f.api, "tables");
    await v.click(press(v.host, "Atlas problems"));
    await v.click(press(v.host, "Edit the text"));
    const area = v.host.querySelector("textarea") as HTMLTextAreaElement;
    expect(area.value).toBe("id,title\ngoldbach,Goldbach conjecture\n");
    await v.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!.call(area, "id,title\ngoldbach,Goldbach, strong form\n");
      area.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await v.wait(800);
    await v.settle();
    expect(f.saves).toEqual([{ slug: "solvability-frontier", path: TABLE_PATH, base: "rev-shipped", text: "id,title\ngoldbach,Goldbach, strong form\n" }]);
    expect(f.tables.length).toBe(2);
    await v.unmount();
  });

  test("an empty list, a filter with no match and a failed list each show a plain line", async () => {
    const none = await workspace(fakeApi({ workspaceItems: async () => ({ items: [], total: 0, page: 1, size: 50 }) }).api, "tables");
    expect(none.host.querySelector(".workspace-list p.muted")!.textContent).toBe("No output lists a table yet.");
    await none.unmount();
    const f = fakeApi();
    const v = await workspace(f.api, "tables");
    const input = v.host.querySelector('input[type="search"]') as HTMLInputElement;
    await v.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, "zzz");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await v.wait(260);
    await v.settle();
    expect(f.listed.at(-1)).toEqual({ type: "tables", q: "zzz", page: 1 });
    expect(v.host.querySelector(".workspace-list p.muted")!.textContent).toBe("No table matches “zzz”.");
    await v.unmount();
    const broken = await workspace(fakeApi({ workspaceItems: () => Promise.reject(new Error("Bucket could not read that.")) }).api, "tables");
    expect(broken.host.querySelector('[role="alert"]')!.textContent).toBe("Bucket could not read that.");
    await broken.unmount();
  });

  test("a stored tab whose item is gone shows the line the Data screen shows", async () => {
    const { NOT_LOADED } = await import("./views/Data");
    const stored = { tabs: [{ id: "output:removed-output:rows", title: "Old rows" }, { id: "output:solvability-frontier:dropped", title: "Dropped" }, { id: "../etc", title: "Bad" }, { id: "dataset:canon:all", title: "Canon" }], active: "output:removed-output:rows" };
    const store = memory({ "bucket.workspace.tables.tabs": JSON.stringify(stored), "bucket.workspace.records.tabs": JSON.stringify({ tabs: [{ id: "output:solvability-frontier:problems", title: "Problem records" }], active: null }) });
    const v = await workspace(fakeApi().api, "tables", store);
    expect(Array.from(v.host.querySelectorAll('[role="tab"]')).map((t) => t.textContent)).toEqual(["All tables", "Old rows", "Dropped"]);
    expect(v.host.querySelector('[role="tabpanel"]')!.textContent).toBe(NOT_LOADED);
    await v.click(v.host.querySelectorAll('[role="tab"]')[2]);
    expect(v.host.querySelector('[role="tabpanel"]')!.textContent).toBe(NOT_LOADED);
    await v.unmount();
  });
});

describe("records workspace", () => {
  test("lists record sets and loaded data, and keeps its own tabs", async () => {
    const f = fakeApi();
    const store = memory({ "bucket.workspace.tables.tabs": JSON.stringify({ tabs: [{ id: "output:solvability-frontier:atlas-problems", title: "Atlas problems" }], active: null }) });
    const v = await workspace(f.api, "records", store);
    expect(cells(v.host)).toEqual([
      ["Problem records", "The Solvability Frontier", "Shipped", "CC BY-SA 4.0", ""],
      ["The canon", "Opens on the Data screen", "Shipped", "CC0-1.0", ""],
    ]);
    expect(Array.from(v.host.querySelectorAll('[role="tab"]')).map((t) => t.textContent)).toEqual(["All records"]);
    const canon = Array.from(v.host.querySelectorAll(".workspace-list a")).find((a) => a.textContent === "The canon")!;
    expect(canon.getAttribute("href")).toBe("#/data");
    expect(press(v.host, "The canon")).toBeUndefined();
    await v.unmount();
  });

  test("opening a set mounts the record list of the Records tab, and a row opens the record view", async () => {
    const f = fakeApi();
    const store = memory();
    const v = await workspace(f.api, "records", store);
    await v.click(press(v.host, "Problem records"));
    expect(f.tables).toEqual([{ slug: "solvability-frontier", id: "problems" }]);
    expect(v.host.querySelector(".licence-line")!.textContent).toBe("Problem records. Licence: CC BY-SA 4.0");
    await v.click(press(v.host, "Riemann hypothesis"));
    expect(f.texts).toEqual(["tools/solvability-atlas/records/riemann.json"]);
    expect(v.host.querySelector(".research-record h2")!.textContent).toBe("Riemann hypothesis");
    expect(Array.from(v.host.querySelectorAll(".research-record dt")).map((d) => d.textContent)).toEqual(["id", "title"]);
    await v.click(press(v.host, "All records"));
    expect(v.host.querySelector(".research-record")).toBeNull();
    expect(Object.keys(store.data)).toEqual(["bucket.workspace.records.tabs"]);
    await v.unmount();
  });
});

describe("leaving a workspace editor inside the save pause", () => {
  const FINAL = "id,title\ngoldbach,Goldbach, the final text\n";

  function fakeHistory(first: string) {
    let entries: { state: unknown; url: string }[] = [{ state: null, url: first }];
    let at = 0;
    return {
      get state() {
        return entries[at].state;
      },
      replaceState(state: unknown, _unused: string, url?: string | URL | null) {
        entries[at] = { state, url: url ? String(url) : entries[at].url };
      },
      pushState(state: unknown, _unused: string, url?: string | URL | null) {
        entries = [...entries.slice(0, at + 1), { state, url: url ? String(url) : entries[at].url }];
        at += 1;
      },
      back() {
        if (at > 0) at -= 1;
      },
      visit(url: string) {
        entries = [...entries.slice(0, at + 1), { state: null, url }];
        at += 1;
      },
      get url() {
        return entries[at].url;
      },
    };
  }

  async function shell() {
    const { useState } = await import("react");
    const { Screen } = await import("./nav");
    const { BackTrail } = await import("./back");
    const f = fakeApi({ researchList: async () => ({ outputs: [] }) } as Partial<WorkspaceApi>);
    const h = fakeHistory("#/research");
    const trail = new BackTrail(h, (run) => run());
    let show: (route: Route) => void = () => {};
    function Shell() {
      const [route, setRoute] = useState<Route>(parseHash(h.url));
      show = setRoute;
      return (
        <main className="main">
          <Screen api={f.api as unknown as Api} route={route} />
        </main>
      );
    }
    const v = await mount(<Shell />);
    const go = async (hash: string) => {
      h.visit(hash);
      trail.moved();
      await v.act(async () => show(parseHash(hash)));
      await v.settle();
    };
    const back = async () => {
      await v.act(async () => void trail.back());
      await v.act(async () => show(parseHash(h.url)));
      await v.settle();
    };
    const type = async (value: string) => {
      const area = v.host.querySelector("textarea") as HTMLTextAreaElement;
      await v.act(async () => {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!.call(area, value);
        area.dispatchEvent(new window.Event("input", { bubbles: true }));
      });
    };
    const openEditor = async () => {
      await go("#/workspace/tables");
      await v.click(press(v.host, "Atlas problems"));
      await v.click(press(v.host, "Edit the text"));
    };
    return { v, f, h, trail, go, back, type, openEditor };
  }

  const saved = [{ slug: "solvability-frontier", path: TABLE_PATH, base: "rev-shipped", text: FINAL }];

  test("a switch to Records in the tab bar sends the final text to the write route", async () => {
    const s = await shell();
    await s.openEditor();
    await s.type("id,title\ngoldbach,An earlier draft\n");
    await s.type(FINAL);
    expect(s.f.saves).toEqual([]);
    await s.go("#/workspace/records");
    expect(s.v.host.querySelector(".workspace-tabs a.on")!.textContent).toBe("Records");
    expect(s.v.host.querySelector("textarea")).toBeNull();
    expect(s.f.saves).toEqual(saved);
    await s.v.wait(800);
    expect(s.f.saves).toEqual(saved);
    await s.v.unmount();
  });

  test("Back sends the final text before the screen changes", async () => {
    const s = await shell();
    await s.openEditor();
    await s.type(FINAL);
    expect(s.f.saves).toEqual([]);
    await s.v.act(async () => void s.trail.back());
    expect(s.f.saves).toEqual(saved);
    expect(s.v.host.querySelector("textarea")).not.toBeNull();
    await s.v.wait(800);
    expect(s.f.saves).toEqual(saved);
    await s.v.unmount();
    expect(s.f.saves).toEqual(saved);
  });

  test("closing the open item and moving to another open item each send the final text", async () => {
    const s = await shell();
    await s.openEditor();
    await s.type(FINAL);
    await s.v.click(s.v.host.querySelector('[role="tab"]'));
    expect(s.f.saves).toEqual(saved);
    expect(cells(s.v.host)).toHaveLength(3);
    await s.v.unmount();
  });

  test("Back from an opened item returns to the list with Tables lit, and Back again leaves the workspace", async () => {
    const { ITEM_STATE } = await import("./views/Workspace");
    const s = await shell();
    const pushed: unknown[] = [];
    const push = window.history.pushState.bind(window.history);
    window.history.pushState = (state: unknown, unused: string, url?: string | URL | null) => {
      pushed.push(state);
      s.h.pushState(state, unused, url);
      push(state, unused, url);
    };
    try {
      await s.go("#/workspace/tables");
      expect(pushed).toEqual([]);
      await s.v.click(press(s.v.host, "Atlas problems"));
      expect(pushed.map((p) => (p as Record<string, unknown>)[ITEM_STATE])).toEqual(["output:solvability-frontier:atlas-problems"]);
      expect(s.h.url).toBe("#/workspace/tables");
      expect(s.v.host.querySelector(".research-table")).not.toBeNull();
      s.h.back();
      window.history.replaceState(s.h.state, "");
      window.location.hash = "#/workspace/tables";
      await s.v.act(async () => void window.dispatchEvent(new window.Event("popstate")));
      await s.v.settle();
      expect(s.h.url).toBe("#/workspace/tables");
      expect(s.v.host.querySelector(".research-table")).toBeNull();
      expect(cells(s.v.host)).toHaveLength(3);
      expect(s.v.host.querySelector(".workspace-tabs a.on")!.textContent).toBe("Tables");
      expect(Array.from(s.v.host.querySelectorAll('[role="tab"]')).map((t) => [t.textContent, t.getAttribute("aria-selected")])).toEqual([["All tables", "true"], ["Atlas problems", "false"]]);
      await s.back();
      expect(s.h.url).toBe("#/research");
      expect(s.v.host.querySelector(".workspace-tabs")).toBeNull();
    } finally {
      window.history.pushState = push;
    }
    await s.v.unmount();
  });
});

describe("workspace addresses and the tabs that are not built", () => {
  test("no link and no source line points at the old desk address", async () => {
    const { WORKSPACE_TABS } = await import("./views/WorkspaceTabs");
    const { Screen } = await import("./nav");
    const { api } = fakeApi();
    const found: string[] = [];
    for (const t of WORKSPACE_TABS.filter((x) => x.id !== "nodes")) {
      const v = await mount(<Screen api={api as unknown as Api} route={t.route} />);
      found.push(...Array.from(v.host.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? ""));
      await v.unmount();
    }
    expect(found.length).toBeGreaterThan(70);
    expect(found.filter((h) => /^#\/desks?\b/.test(h))).toEqual([]);
    expect(found.filter((h) => h.startsWith("#/") && href(parseHash(h)) !== h)).toEqual([]);
    const hits: string[] = [];
    for await (const path of new Bun.Glob("**/*.{ts,tsx,css}").scan(import.meta.dir)) {
      if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) continue;
      if (/#\/desk|DeskType|DESK_TYPES|name: "desk"/.test(await Bun.file(`${import.meta.dir}/${path}`).text())) hits.push(path);
    }
    expect(hits).toEqual([]);
  });
});

describe("records address", () => {
  test("a records address that names a second set opens that set", async () => {
    const { Screen } = await import("./nav");
    const two: ResearchDetail = { ...DETAIL, manifest: { ...DETAIL.manifest, record_sets: [...DETAIL.manifest.record_sets!, { id: "branches", dir: "tools/solvability-atlas/branches", schema: "bucket.branch/1", label: "Branch records", licence: "CC0-1.0", audience: "public" }] } };
    const f = fakeApi({ researchManifest: async () => two });
    const second = await mount(<Screen api={f.api as unknown as Api} route={parseHash("#/research/solvability-frontier/records/branches")} />);
    expect(second.host.querySelector(".research-sets button.on")!.textContent).toBe("Branch records");
    expect(second.host.querySelector(".licence-line")!.textContent).toBe("Branch records. Licence: CC0-1.0");
    expect(f.tables).toEqual([{ slug: "solvability-frontier", id: "branches" }]);
    await second.click(press(second.host, "Problem records"));
    expect(f.tables.at(-1)).toEqual({ slug: "solvability-frontier", id: "problems" });
    await second.unmount();
    const first = await mount(<Screen api={f.api as unknown as Api} route={parseHash("#/research/solvability-frontier/records")} />);
    expect(first.host.querySelector(".research-sets button.on")!.textContent).toBe("Problem records");
    await first.unmount();
    const absent = await mount(<Screen api={f.api as unknown as Api} route={parseHash("#/research/solvability-frontier/records/absent")} />);
    expect(absent.host.querySelector(".research-sets button.on")!.textContent).toBe("Problem records");
    await absent.unmount();
    const one = await mount(<Screen api={fakeApi().api as unknown as Api} route={parseHash("#/research/solvability-frontier/records/problems")} />);
    expect(one.host.querySelector(".research-sets")).toBeNull();
    await one.unmount();
  });
});

describe("figures workspace", () => {
  test("lists every figure across outputs and opens the picture view of the Figures tab", async () => {
    const f = fakeApi();
    const store = memory();
    const v = await workspace(f.api, "figures", store);
    expect(v.host.querySelector("h1")!.textContent).toBe("Figures");
    expect(cells(v.host)).toEqual([
      ["The frontier on 5,209 rows", "The Solvability Frontier", "Shipped", "CC-BY-4.0", ""],
      ["Solvability helix", "The Solvability Frontier", "Shipped", "MIT code output", ""],
    ]);
    expect(f.images).toEqual([]);
    await v.click(press(v.host, "The frontier on 5,209 rows"));
    expect(f.images).toEqual([FIG_PATH]);
    const full = v.host.querySelector(".research-full")!;
    expect(full.querySelector("img")!.getAttribute("alt")).toBe("The frontier on 5,209 rows");
    expect(full.querySelector("figcaption")!.textContent).toBe("The frontier on 5,209 rowsCC-BY-4.0");
    expect(full.querySelector("details.fine summary")!.textContent).toBe("Script that draws it");
    expect(press(v.host, "Close")).toBeUndefined();
    expect(v.host.querySelector(".workspace-item-head a")!.getAttribute("href")).toBe("#/research/solvability-frontier/figures");
    expect(JSON.parse(store.data["bucket.workspace.figures.tabs"]).active).toBe("output:solvability-frontier:fig-frontier");
    await v.unmount();
    const gone = await workspace(f.api, "figures", memory({ "bucket.workspace.figures.tabs": JSON.stringify({ tabs: [{ id: "output:solvability-frontier:dropped", title: "Dropped" }], active: "output:solvability-frontier:dropped" }) }));
    const { NOT_LOADED } = await import("./views/Data");
    expect(gone.host.querySelector('[role="tabpanel"]')!.textContent).toBe(NOT_LOADED);
    await gone.unmount();
  });

  test("renders show with their command, and a drawn image opens from the list", async () => {
    const RUN = "20261019T101500-0a1b2c3d";
    const drawn: WorkspaceItem = { type: "figures", key: `generated:record-glyph:${RUN}:riemann-glyph.svg`, title: "riemann-glyph.svg, riemann", from: { kind: "generation", id: "record-glyph", title: "The record glyph" }, origin: "local", licence: "", changed: false, opens: "#/workspace/figures", explore: null };
    const f = fakeApi({
      workspaceItems: async () => ({ items: [drawn], total: 1, page: 1, size: 50 }),
      generations: async () => ({ repo: true, generations: [
        { name: "record-glyph", about: "The record glyph", inputs: ["problem"], command: "bkt generate record-glyph --problem ...", last: { run: RUN, created: "2026-10-19T10:15:00Z", folder: "x", outputs: ["riemann-glyph.svg"] } },
        { name: "atlas-plots", about: "The nine atlas plots", inputs: [], command: "bkt generate atlas-plots", last: null },
      ] }),
    });
    const store = memory();
    const v = await workspace(f.api, "figures", store);
    const { NEVER_RUN, RENDERS_ABOUT } = await import("./views/Workspace");
    const renders = v.host.querySelector("section.renders")!;
    expect(renders.querySelector("p")!.textContent).toBe(RENDERS_ABOUT);
    expect(Array.from(renders.querySelectorAll("tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent))).toEqual([
      ["The record glyph", "2026-10-19", "bkt generate record-glyph --problem ..."],
      ["The nine atlas plots", NEVER_RUN, "bkt generate atlas-plots"],
    ]);
    await v.click(press(v.host, "riemann-glyph.svg, riemann"));
    expect(f.images).toEqual([`record-glyph/${RUN}/riemann-glyph.svg`]);
    expect(v.host.querySelector("img.generated-figure")!.getAttribute("src")).toBe("data:image/svg+xml;base64,AAAA");
    expect(JSON.parse(store.data["bucket.workspace.figures.tabs"]).active).toBe(drawn.key);
    await v.unmount();
  });

  test("a failed renders list shows its line above the figures", async () => {
    const v = await workspace(fakeApi({ generations: () => Promise.reject(new Error("the list of renders could not be read")) }).api, "figures");
    expect(v.host.querySelector('.workspace-list [role="alert"]')!.textContent).toBe("the list of renders could not be read");
    expect(cells(v.host).length).toBe(2);
    await v.unmount();
  });

  test("a figure opens from its four-part research address, and a table from its own", async () => {
    const { Screen } = await import("./nav");
    const f = fakeApi();
    const figure = await mount(<Screen api={f.api as unknown as Api} route={parseHash("#/research/solvability-frontier/figures/fig-frontier")} />);
    expect(figure.host.querySelector(".workspace-tabs")).toBeNull();
    expect(figure.host.querySelector(".research-full figcaption")!.textContent).toBe("The frontier on 5,209 rowsCC-BY-4.0");
    await figure.click(press(figure.host, "Close"));
    expect(figure.host.querySelector(".research-full")).toBeNull();
    await figure.unmount();
    const helix = await mount(<Screen api={f.api as unknown as Api} route={parseHash("#/research/solvability-frontier/figures/atlas-helix")} />);
    expect(helix.host.querySelector(".research-full figcaption")!.textContent).toBe("Solvability helixMIT code output");
    await helix.unmount();
    const none = await mount(<Screen api={f.api as unknown as Api} route={parseHash("#/research/solvability-frontier/figures/absent")} />);
    expect(none.host.querySelector(".research-full")).toBeNull();
    expect(none.host.querySelectorAll(".research-figure").length).toBe(2);
    await none.unmount();
    const table = await mount(<Screen api={f.api as unknown as Api} route={parseHash("#/research/solvability-frontier/data/atlas-branches")} />);
    expect(table.host.querySelector(".research-tables button.on")!.textContent).toBe("Atlas branches");
    expect(f.tables.at(-1)).toEqual({ slug: "solvability-frontier", id: "atlas-branches" });
    await table.unmount();
  });
});

describe("papers workspace", () => {
  test("lists every paper and opens the Paper tab with its source and editor", async () => {
    const f = fakeApi();
    const v = await workspace(f.api, "papers");
    expect(cells(v.host)).toEqual([["The Solvability Frontier", "The Solvability Frontier", "Shipped", "CC-BY-4.0", "Changed on this computer"]]);
    await v.click(press(v.host, "The Solvability Frontier"));
    expect(v.host.querySelector(".paper-split .paper-source")).not.toBeNull();
    expect((v.host.querySelector(".paper-source textarea") as HTMLTextAreaElement).value).toBe(TEX);
    expect(v.host.querySelector(".paper-source select")!.getAttribute("aria-label")).toBe("Source file");
    expect(v.host.querySelector(".workspace-item-head a")!.getAttribute("href")).toBe("#/research/solvability-frontier/paper");
    await v.unmount();
  });

  test("Compile asks the one build route the Research screen uses, and the workspace holds no other way to build", async () => {
    const f = fakeApi();
    const v = await workspace(f.api, "papers");
    await v.click(press(v.host, "The Solvability Frontier"));
    expect(f.builds).toEqual([]);
    await v.click(press(v.host, "Compile the paper"));
    expect(f.builds).toEqual([["solvability-frontier", "pdf"]]);
    expect(v.host.textContent).toContain("builds are off for this output");
    await v.unmount();
    for (const name of ["views/Workspace.tsx", "views/WorkspaceTabs.tsx"]) {
      const source = await Bun.file(`${import.meta.dir}/${name}`).text();
      expect({ name, hits: source.match(/researchBuild|\/local\/|consent|fetch\(/g) }).toEqual({ name, hits: null });
    }
    const apiSource = await Bun.file(`${import.meta.dir}/api.ts`).text();
    expect(apiSource.match(/\/local\/workspace\/[a-z/]+/g)).toEqual(["/local/workspace/alignment/rows", "/local/workspace/alignment/search", "/local/workspace/items"]);
    expect(apiSource.match(/\/local\/research\/build\b/g)?.length).toBe(1);
  });
});

describe("leaving a paper or a figure script inside the save pause", () => {
  const FINAL = "\\begin{document}The final sentence.\\end{document}";

  async function shell() {
    const { useState } = await import("react");
    const { Screen } = await import("./nav");
    const { BackTrail } = await import("./back");
    const f = fakeApi({ researchList: async () => ({ outputs: [] }) } as Partial<WorkspaceApi>);
    let url = "#/research";
    const stack: string[] = [];
    const hist: { state: unknown; replaceState(state: unknown): void; pushState(state: unknown): void; back(): void } = {
      state: null,
      replaceState(state) {
        hist.state = state;
      },
      pushState(state) {
        hist.state = state;
      },
      back() {
        url = stack.pop() ?? url;
      },
    };
    const trail = new BackTrail(hist, (run) => run());
    let show: (route: Route) => void = () => {};
    function Shell() {
      const [route, setRoute] = useState<Route>(parseHash(url));
      show = setRoute;
      return (
        <main className="main">
          <Screen api={f.api as unknown as Api} route={route} />
        </main>
      );
    }
    const v = await mount(<Shell />);
    const go = async (hash: string) => {
      stack.push(url);
      url = hash;
      hist.state = null;
      trail.moved();
      await v.act(async () => show(parseHash(hash)));
      await v.settle();
    };
    const type = async (value: string) => {
      const area = v.host.querySelector("textarea") as HTMLTextAreaElement;
      await v.act(async () => {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!.set!.call(area, value);
        area.dispatchEvent(new window.Event("input", { bubbles: true }));
      });
    };
    return { v, f, trail, go, type, url: () => url, show: (hash: string) => v.act(async () => show(parseHash(hash))) };
  }

  const saved = [{ slug: "solvability-frontier", path: TEX_PATH, base: "rev-shipped", text: FINAL }];

  test("a switch from Papers to Figures in the tab bar sends the final text", async () => {
    const s = await shell();
    await s.go("#/workspace/papers");
    await s.v.click(press(s.v.host, "The Solvability Frontier"));
    await s.type("An earlier draft.");
    await s.type(FINAL);
    expect(s.f.saves).toEqual([]);
    await s.go("#/workspace/figures");
    expect(s.v.host.querySelector(".workspace-tabs a.on")!.textContent).toBe("Figures");
    expect(s.f.saves).toEqual(saved);
    await s.v.wait(800);
    expect(s.f.saves).toEqual(saved);
    await s.v.unmount();
  });

  test("Back sends the final text of a paper before the screen changes", async () => {
    const s = await shell();
    await s.go("#/workspace/papers");
    await s.v.click(press(s.v.host, "The Solvability Frontier"));
    await s.type(FINAL);
    expect(s.f.saves).toEqual([]);
    await s.v.act(async () => void s.trail.back());
    expect(s.f.saves).toEqual(saved);
    await s.v.wait(800);
    await s.v.unmount();
    expect(s.f.saves).toEqual(saved);
  });

  test("a figure script typed in the Figures workspace is sent when the item closes, and Back from an open figure returns to the list", async () => {
    const s = await shell();
    await s.go("#/workspace/figures");
    await s.v.click(press(s.v.host, "The frontier on 5,209 rows"));
    expect(s.v.host.querySelector(".research-full")).not.toBeNull();
    await s.type("print('redrawn')\n");
    window.history.replaceState({}, "");
    window.location.hash = "#/workspace/figures";
    await s.v.act(async () => void window.dispatchEvent(new window.Event("popstate")));
    await s.v.settle();
    expect(s.f.saves).toEqual([{ slug: "solvability-frontier", path: SCRIPT_PATH, base: "rev-shipped", text: "print('redrawn')\n" }]);
    expect(s.v.host.querySelector(".research-full")).toBeNull();
    expect(cells(s.v.host)).toHaveLength(2);
    expect(s.v.host.querySelector(".workspace-tabs a.on")!.textContent).toBe("Figures");
    await s.v.unmount();
  });
});

describe("decks workspace", () => {
  async function decks(over: Record<string, unknown> = {}, body?: import("./api").LibraryBody) {
    const { LIBRARY } = await import("./fixtures/library");
    const { DECKS_BODY } = await import("./fixtures/decks");
    const shown = body ?? LIBRARY;
    const calls: string[] = [];
    let installed = DECKS_BODY;
    const api = {
      installedDecks: async () => (calls.push("installed"), installed),
      library: async () => (calls.push("library"), shown),
      libraryRefresh: async () => (calls.push("refresh"), shown),
      libraryInstall: async (id: string) => (calls.push(`install ${id}`), { ...shown, decks: shown.decks.map((d) => (d.id === id ? { ...d, state: "installed" as const } : d)) }),
      libraryRemove: async (id: string) => (calls.push(`remove ${id}`), { ...shown, decks: shown.decks.map((d) => (d.id === id ? { ...d, state: "available" as const } : d)) }),
      libraryExport: async () => ({ name: "x.bktdeck", folder: "Downloads" }),
      libraryExportBytes: async () => new Blob(["deck"]),
      libraryImport: async () => ({ ...shown, installed: "Arabic words" }),
      ...over,
    } as unknown as WorkspaceApi;
    const v = await workspace(api, "decks");
    return { v, calls, setInstalled: (next: typeof DECKS_BODY) => (installed = next) };
  }

  test("shows the installed decks and the decks to add in one place, under one heading", async () => {
    const { DECKS_ABOUT } = await import("./views/Workspace");
    const { EMBEDDED_TITLE, LIBRARY_NOTE, BUNDLED_LIST } = await import("./views/Library");
    const { v, calls } = await decks();
    expect(Array.from(v.host.querySelectorAll("h1")).map((h) => h.textContent)).toEqual(["Decks"]);
    expect(v.host.querySelector(".head .muted")!.textContent).toBe(DECKS_ABOUT);
    expect(Array.from(v.host.querySelectorAll("h2")).map((h) => h.textContent)).toEqual(["Installed decks", EMBEDDED_TITLE]);
    expect(v.host.querySelectorAll(".deck-rows li").length).toBe(2);
    expect(Array.from(v.host.querySelectorAll(".library-row b")).map((b) => b.textContent)).toEqual(["Spanish words", "German words", "Japanese words", "Arabic words", "French words", "Kitchen French"]);
    expect(v.host.textContent).toContain(LIBRARY_NOTE);
    expect(v.host.textContent).toContain(BUNDLED_LIST);
    expect(v.host.querySelector('a[href="#/library"]')).toBeNull();
    expect(calls.filter((c) => c === "library").length).toBe(1);
    await v.unmount();
  });

  test("an unsigned deck list still says so and offers none of it", async () => {
    const { EMPTY_LIBRARY } = await import("./fixtures/library");
    const { UNSIGNED_LIST } = await import("./views/Library");
    const { v, calls } = await decks({}, EMPTY_LIBRARY);
    expect(v.host.textContent).toContain(UNSIGNED_LIST);
    expect(v.host.querySelectorAll(".library-row").length).toBe(0);
    expect(v.host.querySelectorAll(".deck-rows li").length).toBe(2);
    expect((press(v.host, "Refresh") as HTMLButtonElement).disabled).toBe(true);
    expect(v.host.querySelector('input[type="file"]')!.getAttribute("accept")).toBe(".bktdeck");
    expect(calls.some((c) => c.startsWith("install "))).toBe(false);
    await v.unmount();
  });

  test("adding a deck goes through the Library's own call and the installed list reads again", async () => {
    const { v, calls } = await decks();
    const row = Array.from(v.host.querySelectorAll(".library-row")).find((r) => r.querySelector("b")!.textContent === "Spanish words")!;
    const before = calls.filter((c) => c === "installed").length;
    await v.click(Array.from(row.querySelectorAll("button")).find((b) => /Download|Add|Install/.test(b.textContent ?? "")));
    expect(calls.filter((c) => c.startsWith("install ")).length).toBe(1);
    expect(calls).toContain("install polingual-es");
    expect(calls.filter((c) => c === "installed").length).toBe(before + 1);
    await v.unmount();
  });

  test("the workspace files name no download address, no host and no call of their own", async () => {
    for (const name of ["views/Workspace.tsx", "views/WorkspaceTabs.tsx"]) {
      const source = await Bun.file(`${import.meta.dir}/${name}`).text();
      expect({ name, hits: source.match(/https?:|fetch\(|\/local\/|bucket\.foundation|libraryInstall|libraryImport|libraryRefresh/g) }).toEqual({ name, hits: null });
    }
    const apiSource = await Bun.file(`${import.meta.dir}/api.ts`).text();
    expect(apiSource.match(/\/local\/workspace\/[a-z/]+/g)).toEqual(["/local/workspace/alignment/rows", "/local/workspace/alignment/search", "/local/workspace/items"]);
  });

  test("the bar lights Decks and Back from Decks leaves the workspace", async () => {
    const { Screen } = await import("./nav");
    const { LIBRARY } = await import("./fixtures/library");
    const { DECKS_BODY } = await import("./fixtures/decks");
    const api = { installedDecks: async () => DECKS_BODY, library: async () => LIBRARY } as unknown as Api;
    const v = await mount(<Screen api={api} route={parseHash("#/workspace/decks")} />);
    expect(v.host.querySelector(".workspace-tabs a.on")!.textContent).toBe("Decks");
    expect(v.host.querySelector("h1")!.textContent).toBe("Decks");
    expect(v.host.querySelector('[role="tablist"]')).toBeNull();
    await v.unmount();
  });
});

describe("people workspace", () => {
  const person = (rank: number, name: string, institution: string) => ({ rank, name, score: 0.9 - rank / 100, percentile: 99 - rank, fields: { institution, field: "Made-up studies" }, links: {}, star_prime: [], star_ours: [], complement: null, complement_directions: [], theta: null, radius: null });
  const REVIEW = { key: "k", prime_axes: [], our_axes: [], star_query_prime: [], star_query_ours: [], summary: "", imported_at: 1, rows: [person(1, "Ada Example", "Invented Institute"), person(2, "Brook Sample", "Placeholder College")] };

  function peopleApi(start: unknown = null) {
    const calls: string[] = [];
    let review = start;
    const base = fakeApi().api as unknown as Record<string, unknown>;
    const guarded = Object.fromEntries(Object.keys(base).map((name) => [name, (...args: unknown[]) => (calls.push(name), (base[name] as (...a: unknown[]) => unknown)(...args))]));
    const api = {
      ...guarded,
      advisor: async () => (calls.push("advisor"), { review, forgotten: 0 }),
      importAdvisor: async (file: unknown) => (calls.push(`import ${JSON.stringify(file).length}`), (review = REVIEW), { imported: 2, forgotten: 0 }),
      forgetAdvisor: async () => (calls.push("forget"), (review = null), { forgotten: 2 }),
    } as unknown as WorkspaceApi;
    return { api, calls };
  }

  test("an untested order shows its label, the coverage summary and the five lists, and hides rank, score and percentile", async () => {
    const { UNTESTED_ORDER, ORDER_WITHHELD, ROW_LISTS } = await import("./views/Advisors");
    const lists = { reasons: ["Shares the topic Made-up Dynamics."], recent_works: ["An invented title"], lineage: ["4 recorded students or trainees, from an invented source."], unknowns: ["Whether this person takes students this year."], coverage: ["Most advisors Bucket can identify in XB are missing from this list."] };
    const row = (rank: number, name: string, order_status: string) => ({ ...person(rank, name, "Invented Institute"), score: 0, percentile: null, fields: { institution: "Invented Institute", order_status, ...lists } });
    const summary = "Bucket holds 1,000 recorded advisors. The order has not been tested.";
    const f = peopleApi({ ...REVIEW, summary, rows: [row(1, "Ada Example", "untested"), row(2, "Brook Sample", "untested")] });
    const v = await workspace(f.api, "people");
    expect(v.host.querySelector(".summary")!.textContent).toBe(summary);
    expect(v.host.textContent).toContain(`${UNTESTED_ORDER}. 2 people.`);
    expect(v.host.querySelector(".people .rank")).toBeNull();
    expect(v.host.querySelector(".people .score")).toBeNull();
    expect(v.host.querySelector(".person .tag")).toBeNull();
    expect(v.host.textContent).not.toMatch(/ranked|rank \d|percentile|\dth\b|0\.00|order status/i);
    for (const [k, label] of Object.entries(ROW_LISTS)) {
      const block = v.host.querySelector(`.person .row-list.${k}`)!;
      expect(block.querySelector("h3")!.textContent).toBe(label);
      expect(Array.from(block.querySelectorAll("li")).map((li) => li.textContent)).toEqual(lists[k as keyof typeof lists]);
    }
    await v.unmount();
    const w = await workspace(peopleApi({ ...REVIEW, summary, rows: [row(1, "Ada Example", "withheld")] }).api, "people");
    expect(w.host.textContent).toContain(`${ORDER_WITHHELD}. 1 people.`);
    expect(w.host.querySelector(".people .rank")).toBeNull();
    expect(w.host.querySelector(".person .tag")).toBeNull();
    await w.unmount();
  });

  test("a tested ranking keeps rank and percentile, and a file with no order status counts as untested", async () => {
    const { UNTESTED_ORDER } = await import("./views/Advisors");
    const tested = { ...person(1, "Ada Example", "Invented Institute"), fields: { institution: "Invented Institute", order_status: "tested" } };
    const v = await workspace(peopleApi({ ...REVIEW, rows: [tested] }).api, "people");
    expect(v.host.querySelector(".people .rank")!.textContent).toBe("1");
    expect(v.host.querySelector(".people .score")!.textContent).toBe("98th");
    expect(v.host.querySelector(".person .tag")!.textContent).toBe("rank 1");
    expect(v.host.textContent).toContain("people ranked against your statement");
    await v.unmount();
    for (const order_status of [undefined, "ranked", 1]) {
      const row = { ...person(1, "Ada Example", "Invented Institute"), fields: { institution: "Invented Institute", ...(order_status === undefined ? {} : { order_status }) } };
      const w = await workspace(peopleApi({ ...REVIEW, rows: [row] }).api, "people");
      expect(w.host.textContent).toContain(`${UNTESTED_ORDER}. 1 people.`);
      expect(w.host.querySelector(".people .rank")).toBeNull();
      expect(w.host.querySelector(".people .score")).toBeNull();
      expect(w.host.querySelector(".person .tag")).toBeNull();
      expect(w.host.textContent).not.toMatch(/ranked against|rank \d|\dth\b/);
      await w.unmount();
    }
  });

  test("reads the person's own imported file alone, and nothing else", async () => {
    const { PEOPLE_ABOUT } = await import("./views/Workspace");
    const { NO_PEOPLE_FILE, OPEN_PEOPLE_FILE } = await import("./views/Advisors");
    const f = peopleApi();
    const v = await workspace(f.api, "people");
    expect(Array.from(v.host.querySelectorAll("h1")).map((h) => h.textContent)).toEqual(["People"]);
    expect(Array.from(v.host.querySelectorAll("p.muted")).map((p) => p.textContent)).toEqual([PEOPLE_ABOUT, NO_PEOPLE_FILE]);
    expect(v.host.querySelector('input[type="file"]')!.getAttribute("aria-label")).toBe(OPEN_PEOPLE_FILE);
    expect(v.host.querySelectorAll(".people li").length).toBe(0);
    expect(f.calls).toEqual(["advisor"]);
    await v.unmount();
  });

  test("a file the person opens is sent whole to the import call and its people show, and Forget clears them", async () => {
    const f = peopleApi();
    const v = await workspace(f.api, "people");
    const input = v.host.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([JSON.stringify({ rows: REVIEW.rows })], "people.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    await v.act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
    await v.settle();
    expect(f.calls.filter((c) => c.startsWith("import ")).length).toBe(1);
    expect(Array.from(v.host.querySelectorAll(".people .who")).map((w) => w.firstChild!.textContent)).toEqual(["Ada Example", "Brook Sample"]);
    expect(v.host.querySelector(".status")!.textContent).toContain("Imported 2 people.");
    const confirm = window.confirm;
    window.confirm = () => true;
    try {
      await v.click(press(v.host, "Forget these people"));
    } finally {
      window.confirm = confirm;
    }
    expect(v.host.querySelectorAll(".people li").length).toBe(0);
    expect(f.calls.filter((c) => c !== "advisor" && !c.startsWith("import ") && c !== "forget")).toEqual([]);
    await v.unmount();
  });

  test("the words name no file format, in the workspace and on the Advisors screen", async () => {
    const { AdvisorsView, NO_PEOPLE_FILE, OPEN_PEOPLE_FILE, OPEN_ANOTHER } = await import("./views/Advisors");
    const { PEOPLE_ABOUT } = await import("./views/Workspace");
    const format = /json|\.csv|\.md\b|review\.|advisor-review|fit-me|\bfile format\b/i;
    for (const words of [NO_PEOPLE_FILE, OPEN_PEOPLE_FILE, OPEN_ANOTHER, PEOPLE_ABOUT]) expect({ words, bad: format.test(words) || /[\u2013\u2014]/.test(words) }).toEqual({ words, bad: false });
    const empty = await mount(<AdvisorsView api={peopleApi().api} />);
    expect(empty.host.querySelector("h1")!.textContent).toBe("Advisors");
    expect(format.test(empty.host.textContent ?? "")).toBe(false);
    await empty.unmount();
    const full = await mount(<AdvisorsView api={peopleApi(REVIEW).api} embedded />);
    expect(full.host.querySelector("h1")).toBeNull();
    expect(full.host.textContent).toContain("Untested order. 2 people.");
    expect(format.test(full.host.textContent ?? "")).toBe(false);
    await full.unmount();
  });

  test("the bar lights People, every tab is built, and the workspace files name no person store", async () => {
    const { Screen } = await import("./nav");
    const { BUILT } = await import("./views/Workspace");
    const { WORKSPACE_TABS } = await import("./views/WorkspaceTabs");
    const v = await mount(<Screen api={peopleApi().api as unknown as Api} route={parseHash("#/workspace/people")} />);
    expect(v.host.querySelector(".workspace-tabs a.on")!.textContent).toBe("People");
    expect(v.host.querySelector("h1")!.textContent).toBe("People");
    await v.unmount();
    expect(WORKSPACE_TABS.map((t) => t.id).filter((id) => id !== "nodes" && id !== "people" && id !== "decks" && !(id in BUILT))).toEqual([]);
    const store = ["researcher", "contacts"].join("-");
    for await (const path of new Bun.Glob("**/*.{ts,tsx,css}").scan(import.meta.dir)) {
      const source = await Bun.file(`${import.meta.dir}/${path}`).text();
      expect({ path, names: source.includes(store) }).toEqual({ path, names: false });
    }
  });
});

describe("decks workspace with an unsigned list", () => {
  test("shows no empty card under the Library card", async () => {
    const v = await workspace(fakeApi().api, "decks");
    expect(v.host.querySelector(".library-rows")).toBeNull();
    expect(Array.from(v.host.querySelectorAll("article.panel")).filter((a) => (a.textContent ?? "").trim() === "")).toEqual([]);
    expect(v.host.querySelectorAll("article.panel").length).toBe(2);
    await v.unmount();
  });
});
