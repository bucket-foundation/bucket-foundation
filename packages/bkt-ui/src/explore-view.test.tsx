import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { SAVED_KEY } from "@/lib/explore/saved";
import { siteFetch } from "./site-fetch";

mock.module("@/components/explore/SceneHost", () => ({ default: () => <div>scene</div> }));

beforeAll(() => {
  GlobalRegistrator.register({ url: "http://127.0.0.1:4100/" });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());

const DENY = [/json/i, /\bapi\b/i, /\btokens?\b/i, /\bundefined\b|\bnull\b|\bNaN\b|\[object /, /~\//, /\b[a-z0-9]+_[a-z0-9_]+\b/, /\blocalhost\b|127\.0\.0\.1/, /\blocal\/explore\b/];

const HIT = {
  id: "paper:d/10.1002/j.1538-7305.1948.tb01338.x",
  type: "paper",
  title: "A Mathematical Theory of Communication",
  subtitle: "C. E. Shannon · Primary paper",
  text: "",
  score: 9,
  branch: "Primary paper",
  source: "Primary paper",
  license: "Citation metadata, CC0",
  year: 1948,
  url: "https://doi.org/10.1002/j.1538-7305.1948.tb01338.x",
  links: [],
};

function strings(host: Element): string[] {
  const out: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === 3 && (n.textContent ?? "").trim()) out.push((n.textContent ?? "").trim());
    if (n.nodeType === 1) for (const a of ["title", "placeholder", "aria-label", "alt"]) {
      const v = (n as Element).getAttribute(a);
      if (v) out.push(v);
    }
    n.childNodes.forEach(walk);
  };
  walk(host);
  return out;
}

describe("Explore in the window", () => {
  test("searches the local route, saves to the local store, sends the list to Notes and reads in plain words", async () => {
    const asked: string[] = [];
    const base = (async (input: RequestInfo | URL) => {
      const u = String(input);
      asked.push(u);
      if (u.startsWith("/local/explore/rows")) return new Response(JSON.stringify({ datasets: [] }));
      if (u.startsWith("/local/explore/search")) return new Response(JSON.stringify({ query: "communication", top_k: 60, mode: "lexical", n_results: 1, advisors_sample: false, advisors_source: "none", pinned: null, closest: false, results: [HIT], took_ms: 1 }));
      return new Response("{}", { status: 404 });
    }) as typeof fetch;
    window.fetch = siteFetch(base, window.location.origin, "t".repeat(43));
    const pushed: unknown[] = [];
    const notes: { title: string; body: string; pinned: boolean }[] = [];
    const api = {
      exploreSaved: async () => ({ v: 1, items: [], noticeSeen: false }),
      putExploreSaved: async (s: unknown) => (pushed.push(s), s),
      saveNote: async (n: { title: string; body: string; pinned: boolean }) => (notes.push(n), n),
      openLink: async (url: string) => ({ opened: url }),
    };
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { ExploreView, NOTES_TITLE, WINDOW_PLACEHOLDER } = await import("./views/Explore");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const settle = async () => {
      for (let i = 0; i < 30; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
    };
    await act(async () => root.render(<ExploreView api={api} webgl />));
    await settle();
    const box = host.querySelector<HTMLInputElement>('[data-testid="explore-query"]')!;
    expect(box).not.toBeNull();
    expect(box.placeholder).toBe(WINDOW_PLACEHOLDER);
    expect(host.querySelector('[data-testid="explore-data"]')).toBeNull();
    expect(asked).toContain("/local/explore/rows");
    const shown = [...host.querySelectorAll<HTMLElement>("label")].filter((l) => l.style.display !== "none").map((l) => l.textContent ?? "");
    expect(shown.some((t) => /advisor/i.test(t))).toBe(false);
    expect(host.querySelector<HTMLElement>('[data-testid="advisor-source"]')?.style.display).toBe("none");
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      set.call(box, "communication");
      box.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => box.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await settle();
    expect(asked.some((u) => u.startsWith("/local/explore/search?q=communication"))).toBe(true);
    expect(asked.filter((u) => u.startsWith("/api/"))).toEqual([]);
    expect(host.textContent).toContain(HIT.title);
    const save = host.querySelector<HTMLButtonElement>('[data-testid="save-button"]')!;
    await act(async () => save.click());
    await settle();
    expect(pushed.length).toBeGreaterThan(0);
    expect((pushed.at(-1) as { items: { id: string }[] }).items.map((i) => i.id)).toEqual([HIT.id]);
    expect(window.localStorage.getItem(SAVED_KEY)).toContain(HIT.id);
    const send = [...host.querySelectorAll("button")].find((b) => b.textContent === "Send my saved list to Notes")!;
    await act(async () => send.click());
    await settle();
    expect(notes).toEqual([{ title: NOTES_TITLE, body: expect.stringContaining(HIT.title), pinned: false }]);
    expect(strings(host).flatMap((s) => DENY.filter((d) => d.test(s)).map((d) => `${d}: ${s}`))).toEqual([]);
    await act(async () => root.unmount());
  });

  test("a row set swaps the hits, hides the type chips, limits the views, drills, pages and shows its licence", async () => {
    const { assembleRowSet, pageRows } = await import("../../bkt/src/pack/row-sets/contract");
    const { fixtureContext, fixtureDraft } = await import("../../bkt/src/pack/row-sets/test-fixtures");
    const ctx = fixtureContext();
    const drill = { param: "group" as const, values: ["group-one"] };
    const leaves = Array.from({ length: 700 }, (_, i) => ({ key: `leaf-${String(i).padStart(3, "0")}`, title: i % 2 ? `Algebra ${i}` : `Geometry ${i}`, sub: "", group: "a", source: i % 2 ? "by" : "open", url: "https://example.org/leaf", links: i + 1 < 700 ? [{ to: `leaf-${String(i + 1).padStart(3, "0")}`, stated: i % 3 === 0 }] : [] }));
    const flow = assembleRowSet([fixtureDraft({ id: "flow-set", label: "Flow set", rows: [
      { key: "one", title: "First row", sub: "A-1", group: "a", source: "open", year: 1990, url: "https://example.org/one", verified: true, links: [{ to: "two", weight: 3, stated: true }] },
      { key: "two", title: "Second row", sub: "B-2", group: "b", source: "by", verified: false, links: [] },
    ] })], ctx)[0];
    const deep = assembleRowSet([
      fixtureDraft({ id: "deep-set", label: "Deep set", modes: ["map", "timeline"], drill, rows: [{ key: "group-one", title: "Group one", sub: "700 rows", group: "a", source: "open" }] }),
      fixtureDraft({ id: "deep-set", label: "Deep set", modes: ["map", "timeline"], drill, rows: leaves }),
    ], ctx);
    const far = assembleRowSet([fixtureDraft({ id: "far-set", label: "Far set", modes: ["earth"] , rows: [{ key: "one", title: "Far row", sub: "", group: "a", source: "open" }] })], ctx)[0];
    const asked: string[] = [];
    const base = (async (input: RequestInfo | URL) => {
      const u = String(input);
      asked.push(u);
      if (u.startsWith("/local/explore/search")) return new Response(JSON.stringify({ query: "x", top_k: 60, mode: "lexical", n_results: 1, advisors_sample: false, advisors_source: "none", pinned: null, closest: false, results: [HIT], took_ms: 1 }));
      if (!u.startsWith("/local/explore/rows")) return new Response("{}", { status: 404 });
      const p = new URL(u, "http://window.local").searchParams;
      const id = p.get("id");
      if (id === null) return new Response(JSON.stringify({ datasets: [{ id: "flow-set", label: "Flow set" }, { id: "deep-set", label: "Deep set" }, { id: "far-set", label: "Far set" }, { id: "gone-set", label: "Gone set" }] }));
      if (id === "flow-set") return new Response(JSON.stringify(flow));
      if (id === "far-set") return new Response(JSON.stringify(far));
      if (id === "deep-set") return new Response(JSON.stringify(p.get("group") ? pageRows(deep[1], Number(p.get("page") ?? 0)) : deep[0]));
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    }) as typeof fetch;
    window.fetch = siteFetch(base, window.location.origin, "t".repeat(43));
    const opened: string[] = [];
    const api = { exploreSaved: async () => ({ v: 1, items: [], noticeSeen: false }), putExploreSaved: async (s: unknown) => s, saveNote: async (n: unknown) => n, openLink: async (url: string) => (opened.push(url), { opened: url }) };
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { ExploreView, WINDOW_PLACEHOLDER } = await import("./views/Explore");
    const { MISSING_DATA, EDGE_LINE } = await import("./explore/ExploreClientV2");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const settle = async () => {
      for (let i = 0; i < 30; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
    };
    const one = <T extends Element>(id: string) => host.querySelector<T>(`[data-testid="${id}"]`);
    const choose = async (id: string) => {
      const picker = one<HTMLSelectElement>("explore-data")!;
      await act(async () => {
        picker.value = id;
        picker.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await settle();
    };
    const results = () => [...host.querySelectorAll('[data-testid="explore-result"]')].map((li) => li.textContent ?? "");
    window.location.hash = "#/explore/flow-set/graph/row:flow-set:two";
    await act(async () => root.render(<ExploreView api={api} webgl initial={{ data: "flow-set", mode: "graph", sel: "row:flow-set:two" }} />));
    await settle();

    const picker = one<HTMLSelectElement>("explore-data")!;
    expect([...picker.options].map((o) => o.textContent)).toEqual(["Canon search", "Flow set", "Deep set", "Far set", "Gone set"]);
    expect(picker.value).toBe("flow-set");
    expect(one<HTMLElement>("explore-types")!.style.display).toBe("none");
    expect(one<HTMLInputElement>("explore-query")!.placeholder).toBe("Filter these rows");
    expect(one<HTMLInputElement>("explore-query")!.form!.querySelector("button")!.textContent).toBe("Filter");
    expect(results()).toHaveLength(2);
    expect(results().join(" ")).not.toContain(HIT.title);
    expect(one("explore-panel")!.textContent).toContain("Second row");
    expect(one("row-facts")!.textContent).toBe("Group: Group BLicence: CC-BY-4.0Source: Attributed source");
    expect(one("rows-count")!.textContent).toBe("2 rows.");
    expect(one("rows-edges")!.textContent).toBe(EDGE_LINE);
    expect(one("rows-verified")!.textContent).toBe("1 of 2 rows are checked against their source. The rest are drawn hollow.");
    expect(one("rows-cut")).toBeNull();
    expect(one("rows-attribution")!.textContent).toContain("Licence for this set: CC-BY-4.0.");
    expect(one("rows-attribution")!.textContent).toContain("Attributed source, 1 row, CC-BY-4.0. Used under CC BY 4.0.");
    expect(one("rows-modes-note")!.textContent).toBe("This data draws in Graph. The other views stay off while it is open.");
    const modes = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(modes.filter((b) => !b.disabled).map((b) => b.textContent)).toEqual(["Graph"]);
    expect(modes.find((b) => b.textContent === "Earth")!.title).toBe("Earth cannot draw this data.");
    expect(modes.find((b) => b.getAttribute("aria-selected") === "true")!.textContent).toBe("Graph");
    expect(one("rows-scene-note")).toBeNull();
    expect(window.location.hash).toBe("#/explore/flow-set/graph/row%3Aflow-set%3Atwo");
    expect(new URL(window.location.href).searchParams.get("data")).toBe("flow-set");
    await act(async () => one("rows-attribution")!.querySelector("a")!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
    expect(opened).toEqual(["https://example.org/open"]);

    const box = one<HTMLInputElement>("explore-query")!;
    const type = async (text: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(box, text);
        box.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => box.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
      await settle();
    };
    const searches = asked.filter((u) => u.startsWith("/local/explore/search")).length;
    await type("second");
    expect(results()).toHaveLength(1);
    expect(asked.filter((u) => u.startsWith("/local/explore/search")).length).toBe(searches);
    expect(asked.some((u) => u.includes("q=second"))).toBe(false);
    await type("zebra");
    expect(one("explore-empty")!.textContent).toBe("No row matches that filter.");
    expect(one("rows-scene-note")!.textContent).toBe("No row matches.");

    await choose("deep-set");
    expect(results()).toEqual([expect.stringContaining("Group one")]);
    expect(one("rows-modes-note")!.textContent).toBe("This data draws in Map. The other views stay off while it is open.");
    expect(host.querySelector('[role="tab"][aria-selected="true"]')!.textContent).toBe("Map");
    expect(one("rows-back")).toBeNull();
    await act(async () => host.querySelector<HTMLButtonElement>('[data-testid="explore-result"] button')!.click());
    await settle();
    expect(asked).toContain("/local/explore/rows?id=deep-set&group=group-one");
    expect(results()).toHaveLength(600);
    expect(one("rows-count")!.textContent).toBe("Rows 1 to 600 of 700.More");
    expect(one("rows-cut")!.textContent).toBe("1 link leads to a row on another page, so this page leaves it out.");
    expect(one("rows-attribution")!.textContent).toContain("Open source, 350 rows");
    await act(async () => one<HTMLButtonElement>("rows-more")!.click());
    await settle();
    expect(asked).toContain("/local/explore/rows?id=deep-set&group=group-one&page=1");
    expect(results()).toHaveLength(100);
    expect(one("rows-count")!.textContent).toBe("Rows 601 to 700 of 700.Earlier rows");
    expect(one("rows-cut")).toBeNull();
    await type("algebra");
    expect(asked).toContain("/local/explore/rows?id=deep-set&group=group-one&q=algebra");
    await act(async () => one<HTMLButtonElement>("rows-back")!.click());
    await settle();
    expect(results()).toEqual([expect.stringContaining("Group one")]);

    await choose("far-set");
    expect(one("rows-scene-note")!.textContent).toBe("No view in this copy of Bucket can draw this data.");
    expect(one("rows-modes-note")).toBeNull();
    expect([...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].every((b) => b.disabled)).toBe(true);
    expect(results()).toHaveLength(1);

    await choose("gone-set");
    expect(one("explore-data-note")!.textContent).toBe(MISSING_DATA);
    expect(one<HTMLSelectElement>("explore-data")!.value).toBe("canon");
    expect(one<HTMLElement>("explore-types")!.style.display).toBe("");
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(window.location.hash).toBe("#/explore");

    await choose("flow-set");
    await choose("canon");
    expect(one("rows-notes")).toBeNull();
    expect(one<HTMLInputElement>("explore-query")!.placeholder).toBe(WINDOW_PLACEHOLDER);
    expect([...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].every((b) => !b.disabled)).toBe(true);
    expect(results().join(" ")).toContain(HIT.title);
    expect(asked.filter((u) => u.startsWith("/api/"))).toEqual([]);
    expect(strings(host).flatMap((s) => DENY.filter((d) => d.test(s)).map((d) => `${d}: ${s}`))).toEqual([]);
    await act(async () => root.unmount());
    window.location.hash = "";
  });

  test("a set named in the hash that this build lacks shows one sentence and the canon search", async () => {
    const base = (async (input: RequestInfo | URL) => {
      const u = String(input);
      if (u === "/local/explore/rows") return new Response(JSON.stringify({ datasets: [{ id: "flow-set", label: "Flow set" }] }));
      if (u.startsWith("/local/explore/search")) return new Response(JSON.stringify({ query: "x", top_k: 60, mode: "lexical", n_results: 1, advisors_sample: false, advisors_source: "none", pinned: null, closest: false, results: [HIT], took_ms: 1 }));
      return new Response("{}", { status: 404 });
    }) as typeof fetch;
    window.fetch = siteFetch(base, window.location.origin, "t".repeat(43));
    const api = { exploreSaved: async () => ({ v: 1, items: [], noticeSeen: false }), putExploreSaved: async (s: unknown) => s, saveNote: async (n: unknown) => n, openLink: async (url: string) => ({ opened: url }) };
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { ExploreView } = await import("./views/Explore");
    const { MISSING_DATA } = await import("./explore/ExploreClientV2");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => root.render(<ExploreView api={api} webgl initial={{ data: "occupations-time", mode: "map" }} />));
    for (let i = 0; i < 30; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(host.querySelector('[data-testid="explore-data-note"]')!.textContent).toBe(MISSING_DATA);
    expect(host.querySelector<HTMLSelectElement>('[data-testid="explore-data"]')!.value).toBe("canon");
    expect(host.textContent).toContain(HIT.title);
    await act(async () => root.unmount());
  });

  test("without 3D graphics the screen says so in one sentence", async () => {
    const { act } = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { ExploreView, NO_GRAPHICS } = await import("./views/Explore");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const api = { exploreSaved: async () => ({ v: 1, items: [], noticeSeen: false }), putExploreSaved: async (s: unknown) => s, saveNote: async (n: unknown) => n, openLink: async (url: string) => ({ opened: url }) };
    await act(async () => root.render(<ExploreView api={api} webgl={false} />));
    for (let i = 0; i < 5; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(host.textContent).toContain(NO_GRAPHICS);
    expect(host.querySelector('[data-testid="explore-query"]')).toBeNull();
    await act(async () => root.unmount());
  });
});
