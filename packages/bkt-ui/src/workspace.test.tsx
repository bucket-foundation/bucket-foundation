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
const file = (path: string, n: number): PackedFile => ({ path, sha256: String(n).padStart(64, "0"), size: 1200, audience: "public", role: "table" });
const DETAIL: ResearchDetail = {
  slug: "solvability-frontier",
  origin: "shipped",
  staff: false,
  withheld: 0,
  unreadable: null,
  files: [file(TABLE_PATH, 1), file("tools/solvability-atlas/records/riemann.json", 2)],
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
    record_sets: [{ id: "problems", dir: "tools/solvability-atlas/records", schema: "bucket.problem/1", label: "Problem records", licence: "CC BY-SA 4.0", audience: "public" }],
  },
};

const output = (id: string, title: string, type: "tables" | "records", over: Partial<WorkspaceItem> = {}): WorkspaceItem => ({ type, key: `output:solvability-frontier:${id}`, title, from: { kind: "output", id: "solvability-frontier", title: "The Solvability Frontier" }, origin: "shipped", licence: "mixed", changed: false, opens: `#/research/solvability-frontier/${type === "tables" ? "data" : "records"}/${id}`, explore: null, ...over });
const ITEMS: WorkspaceItem[] = [
  output("atlas-problems", "Atlas problems", "tables", { changed: true }),
  output("atlas-branches", "Atlas branches", "tables", { licence: "CC0-1.0" }),
  { ...output("counts", "My counts", "tables", { origin: "local", licence: "" }), key: "output:mine:counts", from: { kind: "output", id: "mine", title: "My own output" }, opens: "#/research/mine/data/counts" },
  output("problems", "Problem records", "records", { licence: "CC BY-SA 4.0" }),
  { type: "records", key: "dataset:canon:all", title: "The canon", from: { kind: "dataset", id: "canon", title: "The canon" }, origin: "shipped", licence: "CC0-1.0", changed: false, opens: "#/data", explore: null },
];

const page = (columns: string[], rows: string[][]): TablePage => ({ columns, pinned: [], rows, index: rows.map((_, i) => i), total: rows.length, page: 1, size: 50, truncated: false }) as TablePage;

function fakeApi(over: Partial<WorkspaceApi> = {}) {
  const listed: { type: string; q?: string; page?: number }[] = [];
  const tables: { slug: string; id: string }[] = [];
  const saves: { slug: string; path: string; base: string; text: string }[] = [];
  const texts: string[] = [];
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
    researchSource: async () => ({ text: "id,title\ngoldbach,Goldbach conjecture\n", rev: "rev-shipped" }),
    researchSave: async (slug: string, path: string, base: string, text: string): Promise<SaveResult> => (saves.push({ slug, path, base, text }), { saved: true, rev: "rev-next", changed: true }),
    ...over,
  } as unknown as WorkspaceApi;
  return { api, listed, tables, saves, texts };
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

async function workspace(api: WorkspaceApi, type: "tables" | "records" | "figures" | "people", storage: TabStorage | null = memory()) {
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

describe("workspaces that are not built", () => {
  test("show one plain line and a link where a screen holds the items today", async () => {
    const figures = await workspace(fakeApi().api, "figures");
    expect(figures.host.querySelector("h1")!.textContent).toBe("Figures");
    expect(figures.host.querySelector("p.muted")!.textContent).toBe("Figures open from each output on the Research screen for now.");
    expect(figures.host.querySelector("a.link")!.getAttribute("href")).toBe("#/research");
    await figures.unmount();
    const f = fakeApi();
    const people = await workspace(f.api, "people");
    expect(people.host.querySelector("p.muted")!.textContent).toBe("This workspace is empty in this version of Bucket.");
    expect(people.host.querySelector("a")).toBeNull();
    expect(f.listed).toEqual([]);
    await people.unmount();
  });
});
