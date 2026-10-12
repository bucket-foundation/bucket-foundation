import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import type { WorkspaceItem } from "./api";
import { parseHash } from "./router";
import { SELECTION_KEY } from "./selection";
import { siteFetch } from "./site-fetch";
import type { TabStorage } from "./tabs";
import type { WorkspaceApi } from "./views/Workspace";

mock.module("@/components/explore/SceneHost", () => ({ default: () => <div>scene</div> }));

beforeAll(() => {
  GlobalRegistrator.register({ url: "http://127.0.0.1:4100/" });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

const set = (id: string, label: string, type: "graphs" | "maps", modes: string[]): WorkspaceItem => ({ type, key: `rowset:${id}:all`, title: label, from: { kind: "rowset", id, title: label }, origin: "shipped", licence: "CC-BY-4.0", changed: false, opens: `#/workspace/${type}/${id}`, explore: { data: id, modes } });
const ITEMS = [set("flow-set", "Flow set", "graphs", ["graph"]), set("time-set", "Time set", "maps", ["timeline", "map"])];

async function world() {
  const { assembleRowSet } = await import("../../bkt/src/pack/row-sets/contract");
  const { fixtureContext, fixtureDraft } = await import("../../bkt/src/pack/row-sets/test-fixtures");
  const flow = assembleRowSet([fixtureDraft({ id: "flow-set", label: "Flow set" })], fixtureContext())[0];
  const time = assembleRowSet([fixtureDraft({ id: "time-set", label: "Time set", modes: ["timeline", "map"] })], fixtureContext())[0];
  const asked: string[] = [];
  const base = (async (input: RequestInfo | URL) => {
    const u = String(input);
    asked.push(u);
    if (u === "/local/explore/rows") return new Response(JSON.stringify({ datasets: [{ id: "flow-set", label: "Flow set" }, { id: "time-set", label: "Time set" }] }));
    if (u.startsWith("/local/explore/rows?id=flow-set")) return new Response(JSON.stringify(flow));
    if (u.startsWith("/local/explore/rows?id=time-set")) return new Response(JSON.stringify(time));
    if (u.startsWith("/local/explore/search")) return new Response(JSON.stringify({ query: "x", top_k: 60, mode: "lexical", n_results: 0, advisors_sample: false, advisors_source: "none", pinned: null, closest: false, results: [], took_ms: 1 }));
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  window.fetch = siteFetch(base, window.location.origin, "t".repeat(43));
  const listed: string[] = [];
  const api = {
    exploreSaved: async () => ({ v: 1, items: [], noticeSeen: false }),
    putExploreSaved: async (s: unknown) => s,
    saveNote: async (n: unknown) => n,
    openLink: async (url: string) => ({ opened: url }),
    workspaceItems: async (type: string) => {
      listed.push(type);
      const items = ITEMS.filter((i) => i.type === type);
      return { items, total: items.length, page: 1, size: 50 };
    },
  } as unknown as WorkspaceApi;
  return { api, asked, listed };
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
    for (let i = 0; i < 30; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
  };
  await settle();
  const click = async (el: Element | null | undefined) => {
    await act(async () => (el as HTMLElement).click());
    await settle();
  };
  const one = <T extends Element>(id: string) => host.querySelector<T>(`[data-testid="${id}"]`);
  const result = (title: string) => Array.from(host.querySelectorAll('[data-testid="explore-result"] button')).find((b) => b.textContent?.includes(title));
  const marked = () => Array.from(host.querySelectorAll('[data-testid="explore-result"][data-marked="yes"]')).map((li) => li.querySelector("span.block")!.textContent);
  const mark = async (title: string) => {
    await click(result(title));
    await click(one("row-mark"));
  };
  return { host, act, settle, click, one, result, marked, mark, unmount: () => act(async () => root.unmount()) };
}

const press = (host: Element, label: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === label);
const stored = () => JSON.parse(window.sessionStorage.getItem(SELECTION_KEY) ?? "null") as { set: string; ids: string[] } | null;

async function graphs(api: WorkspaceApi, storage: TabStorage, item?: string) {
  const { WorkspaceView } = await import("./views/Workspace");
  return mount(<WorkspaceView api={api} type="graphs" item={item} webgl storage={storage} />);
}

describe("graphs and maps workspaces", () => {
  test("Graphs lists the sets a graph draws and opens the drawing Explore uses, with its attribution and the other views off", async () => {
    const w = await world();
    const store = memory();
    const v = await graphs(w.api, store);
    expect(v.host.querySelector("h1")!.textContent).toBe("Graphs");
    expect(Array.from(v.host.querySelectorAll(".workspace-list tbody tr")).map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.textContent!.trim()))).toEqual([["Flow set", "Open in Explore", "Shipped", "CC-BY-4.0", ""]]);
    expect(v.host.querySelector(".workspace-list tbody a")!.getAttribute("href")).toBe("#/explore/flow-set/graph");
    expect(w.asked.filter((u) => u.includes("/explore/"))).toEqual([]);
    await v.click(press(v.host, "Flow set"));
    expect(w.asked).toContain("/local/explore/rows?id=flow-set");
    expect(Array.from(v.host.querySelectorAll("h1")).map((h) => h.textContent)).toEqual(["Graphs"]);
    expect(v.host.querySelector(".workspace-item-head h2")!.textContent).toBe("Flow set");
    expect(v.host.querySelector(".workspace-item-head a")!.getAttribute("href")).toBe("#/explore/flow-set/graph");
    expect(v.one("rows-attribution")!.textContent).toContain("Licence for this set:");
    expect(v.one("rows-attribution")!.textContent).toContain("Attributed source, 1 row, CC-BY-4.0. Used under CC BY 4.0.");
    expect(v.one("rows-modes-note")!.textContent).toBe("This data draws in Graph. The other views stay off while it is open.");
    expect(v.one<HTMLButtonElement>("mode-graph")!.disabled).toBe(false);
    expect([v.one<HTMLButtonElement>("mode-timeline")!.disabled, v.one("mode-timeline")!.getAttribute("title")]).toEqual([true, "Timeline cannot draw this data."]);
    expect([v.one<HTMLButtonElement>("mode-map")!.disabled, v.one("mode-map")!.getAttribute("title")]).toEqual([true, "Map cannot draw this data."]);
    expect(v.host.querySelectorAll('[data-testid="explore-result"]').length).toBe(3);
    expect(v.host.textContent).not.toContain("Open in workspace");
    expect(JSON.parse(store.data["bucket.workspace.graphs.tabs"])).toEqual({ tabs: [{ id: "rowset:flow-set:all", title: "Flow set", modes: ["graph"] }], active: "rowset:flow-set:all" });
    expect(window.location.hash.startsWith("#/explore")).toBe(false);
    await v.unmount();
  });

  test("Maps lists the sets a timeline or a map draws and opens on the first view the set draws", async () => {
    const w = await world();
    const { WorkspaceView } = await import("./views/Workspace");
    const v = await mount(<WorkspaceView api={w.api} type="maps" webgl storage={memory()} />);
    expect(v.host.querySelector("h1")!.textContent).toBe("Maps");
    expect(v.host.querySelector(".workspace-list tbody a")!.getAttribute("href")).toBe("#/explore/time-set/timeline");
    await v.click(press(v.host, "Time set"));
    expect(v.one("mode-timeline")!.getAttribute("aria-selected")).toBe("true");
    expect([v.one<HTMLButtonElement>("mode-graph")!.disabled, v.one("mode-graph")!.getAttribute("title")]).toEqual([true, "Graph cannot draw this data."]);
    expect(v.one<HTMLButtonElement>("mode-map")!.disabled).toBe(false);
    expect(v.one("rows-attribution")!.textContent).toContain("Licence for this set:");
    expect(v.host.querySelector(".workspace-item-head a")!.getAttribute("href")).toBe("#/explore/time-set/timeline");
    await v.click(v.one("mode-map"));
    expect(v.host.querySelector(".workspace-item-head a")!.getAttribute("href")).toBe("#/explore/time-set/map");
    await v.unmount();
  });

  test("a set this copy lacks, and a stored tab of another kind, each show one plain line", async () => {
    const w = await world();
    const { NOT_LOADED } = await import("./views/Data");
    const { MISSING_DATA } = await import("./explore/ExploreClientV2");
    const gone = await graphs(w.api, memory(), "gone-set");
    expect(gone.host.textContent).toContain(MISSING_DATA);
    await gone.unmount();
    const odd = await graphs(w.api, memory({ "bucket.workspace.graphs.tabs": JSON.stringify({ tabs: [{ id: "output:demo:rows", title: "A table" }], active: "output:demo:rows" }) }));
    expect(odd.host.querySelector('[role="tabpanel"]')!.textContent).toBe(NOT_LOADED);
    await odd.unmount();
  });
});

describe("rows marked in a workspace and carried to Explore and back", () => {
  test("rows marked in Graphs arrive marked in Explore, and Open in workspace returns to the same item with the same rows marked", async () => {
    const w = await world();
    const { ExploreView, TO_WORKSPACE } = await import("./views/Explore");
    const store = memory();
    const v = await graphs(w.api, store);
    await v.click(press(v.host, "Flow set"));
    expect(v.one("rows-marked")).toBeNull();
    await v.mark("First row");
    expect(v.one("row-mark")!.textContent).toBe("Unmark this row");
    expect(v.one("rows-marked")!.textContent).toBe("1 row is marked.Clear the marks");
    expect(stored()).toEqual({ set: "flow-set", ids: ["row:flow-set:one"] });
    await v.mark("Third row");
    expect(v.marked()).toEqual(["First row", "Third row"]);
    expect(stored()).toEqual({ set: "flow-set", ids: ["row:flow-set:one", "row:flow-set:three"] });
    const toExplore = v.host.querySelector(".workspace-item-head a")!.getAttribute("href")!;
    expect(toExplore).toBe("#/explore/flow-set/graph/row%3Aflow-set%3Athree");
    expect(window.sessionStorage.getItem(SELECTION_KEY)).not.toMatch(/\/|\\|\.csv|\.json/);
    await v.unmount();

    const route = parseHash(toExplore);
    if (route.name !== "explore") throw new Error("the hand-off address is no Explore address");
    window.location.hash = toExplore;
    const e = await mount(<ExploreView api={w.api} webgl initial={{ data: route.data, mode: route.mode, sel: route.sel }} />);
    expect(e.marked()).toEqual(["First row", "Third row"]);
    expect(e.one("rows-marked")!.textContent).toBe("2 rows are marked.Clear the marks");
    expect(e.one("row-mark")!.textContent).toBe("Unmark this row");
    const back = Array.from(e.host.querySelectorAll("a")).find((a) => a.textContent === TO_WORKSPACE)!;
    expect(back.getAttribute("href")).toBe("#/workspace/graphs/flow-set");
    await e.mark("Second row");
    await e.mark("First row");
    expect(e.marked()).toEqual(["Second row", "Third row"]);
    await e.unmount();

    const address = parseHash(back.getAttribute("href")!);
    if (address.name !== "workspace") throw new Error("the way back is no workspace address");
    expect(address).toEqual({ name: "workspace", type: "graphs", item: "flow-set" });
    const again = await graphs(w.api, store, address.item);
    expect(again.host.querySelector(".workspace-item-head h2")!.textContent).toBe("Flow set");
    expect(Array.from(again.host.querySelectorAll('.tabs [role="tab"]')).map((t) => [t.textContent, t.getAttribute("aria-selected")])).toEqual([["All graphs", "false"], ["Flow set", "true"]]);
    expect(again.marked()).toEqual(["Second row", "Third row"]);
    expect(stored()!.ids.sort()).toEqual(["row:flow-set:three", "row:flow-set:two"]);
    await again.unmount();
  });

  test("the marks survive Back in both directions", async () => {
    const w = await world();
    const { ExploreView } = await import("./views/Explore");
    const store = memory();
    const v = await graphs(w.api, store);
    await v.click(press(v.host, "Flow set"));
    await v.mark("Second row");
    await v.unmount();
    window.location.hash = "#/explore/flow-set/graph";
    const e = await mount(<ExploreView api={w.api} webgl initial={{ data: "flow-set", mode: "graph" }} />);
    expect(e.marked()).toEqual(["Second row"]);
    await e.mark("Third row");
    await e.unmount();
    window.location.hash = "#/workspace/graphs";
    const backInWorkspace = await graphs(w.api, store);
    expect(backInWorkspace.host.querySelector(".workspace-item-head h2")!.textContent).toBe("Flow set");
    expect(backInWorkspace.marked()).toEqual(["Second row", "Third row"]);
    window.location.hash = "#/explore/flow-set/graph";
    window.history.replaceState({}, "");
    await backInWorkspace.act(async () => void window.dispatchEvent(new window.Event("popstate")));
    await backInWorkspace.settle();
    expect(backInWorkspace.host.querySelector(".workspace-item-head h2")!.textContent).toBe("Flow set");
    expect(JSON.parse(store.data["bucket.workspace.graphs.tabs"]).active).toBe("rowset:flow-set:all");
    window.location.hash = "#/workspace/graphs";
    window.history.replaceState({}, "");
    await backInWorkspace.act(async () => void window.dispatchEvent(new window.Event("popstate")));
    await backInWorkspace.settle();
    expect(backInWorkspace.host.querySelector(".workspace-list")).not.toBeNull();
    expect(stored()!.ids).toEqual(["row:flow-set:two", "row:flow-set:three"]);
    await backInWorkspace.click(press(backInWorkspace.host, "Flow set"));
    expect(backInWorkspace.marked()).toEqual(["Second row", "Third row"]);
    await backInWorkspace.unmount();
    window.location.hash = "#/explore/flow-set/graph";
    const forwardInExplore = await mount(<ExploreView api={w.api} webgl initial={{ data: "flow-set", mode: "graph" }} />);
    expect(forwardInExplore.marked()).toEqual(["Second row", "Third row"]);
    await forwardInExplore.unmount();
  });

  test("a mark is stored the moment it is made, so leaving at once loses nothing, and marks of one set never show on another", async () => {
    const w = await world();
    const { WorkspaceView } = await import("./views/Workspace");
    const v = await graphs(w.api, memory());
    await v.click(press(v.host, "Flow set"));
    await v.click(v.result("First row"));
    await v.act(async () => (v.one("row-mark") as HTMLElement).click());
    expect(stored()).toEqual({ set: "flow-set", ids: ["row:flow-set:one"] });
    await v.unmount();
    const maps = await mount(<WorkspaceView api={w.api} type="maps" item="time-set" webgl storage={memory()} />);
    expect(maps.host.querySelectorAll('[data-testid="explore-result"]').length).toBe(3);
    expect(maps.marked()).toEqual([]);
    expect(maps.one("rows-marked")).toBeNull();
    expect(stored()).toEqual({ set: "flow-set", ids: ["row:flow-set:one"] });
    await maps.mark("First row");
    expect(stored()).toEqual({ set: "time-set", ids: ["row:time-set:one"] });
    await maps.click(maps.one("rows-unmark"));
    expect([maps.marked(), stored()]).toEqual([[], null]);
    await maps.unmount();
  });

  test("Explore on the canon search offers no way to a workspace, and a timeline set points at Maps", async () => {
    const { workspaceFor } = await import("./views/Explore");
    expect(workspaceFor({})).toBeNull();
    expect(workspaceFor({ mode: "globe" })).toBeNull();
    expect(workspaceFor({ data: "flow-set", mode: "graph" })).toBe("#/workspace/graphs/flow-set");
    expect(workspaceFor({ data: "time-set", mode: "timeline" })).toBe("#/workspace/maps/time-set");
    expect(workspaceFor({ data: "time-set", mode: "map", sel: "row:time-set:one" })).toBe("#/workspace/maps/time-set");
  });
});
