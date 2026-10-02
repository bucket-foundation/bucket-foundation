import { describe, expect, test } from "bun:test";
import { activateTab, closeTab, MAX_TABS, moveTab, noTabs, openTab, patchTab, readTabs, stepTab, writeTabs, type Tab, type Tabs, type TabStorage } from "./tabs";

type T = Tab & { q?: string };
const tab = (id: string): T => ({ id, title: id.toUpperCase() });
const three = () => ["a", "b", "c"].reduce((s, id) => openTab(s, tab(id)), noTabs<T>());
const ids = (s: Tabs<T>) => s.tabs.map((t) => t.id);
const valid = (raw: unknown): T | null => {
  const r = raw as Partial<T> | null;
  return r && typeof r.id === "string" && typeof r.title === "string" ? { id: r.id, title: r.title } : null;
};

function memory(initial: Record<string, string> = {}): TabStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

describe("tab model", () => {
  test("opening adds a tab and makes it the open one", () => {
    const s = three();
    expect(ids(s)).toEqual(["a", "b", "c"]);
    expect(s.active).toBe("c");
  });

  test("opening a tab that is already there switches to it and keeps its place and state", () => {
    const s = openTab(patchTab(three(), "a", { q: "heat" }), tab("a"));
    expect(ids(s)).toEqual(["a", "b", "c"]);
    expect(s.active).toBe("a");
    expect(s.tabs[0].q).toBe("heat");
  });

  test("the list holds at most the cap and drops the oldest", () => {
    let s = noTabs<T>();
    for (let i = 0; i < MAX_TABS + 3; i++) s = openTab(s, tab(`t${i}`));
    expect(s.tabs.length).toBe(MAX_TABS);
    expect(s.tabs[0].id).toBe("t3");
    expect(s.active).toBe(`t${MAX_TABS + 2}`);
  });

  test("closing the open tab opens its right neighbour, then its left, then the home view", () => {
    let s = activateTab(three(), "b");
    s = closeTab(s, "b");
    expect([ids(s), s.active]).toEqual([["a", "c"], "c"]);
    s = closeTab(s, "c");
    expect([ids(s), s.active]).toEqual([["a"], "a"]);
    s = closeTab(s, "a");
    expect([ids(s), s.active]).toEqual([[], null]);
  });

  test("closing another tab leaves the open one alone, and closing an unknown tab changes nothing", () => {
    const s = three();
    expect(closeTab(s, "a").active).toBe("c");
    expect(closeTab(s, "zz")).toBe(s);
  });

  test("switching to the home view or a known tab works, an unknown tab is ignored", () => {
    const s = three();
    expect(activateTab(s, null).active).toBeNull();
    expect(activateTab(s, "a").active).toBe("a");
    expect(activateTab(s, "zz")).toBe(s);
  });

  test("moving reorders, clamps at both ends and keeps the open tab", () => {
    const s = three();
    expect(ids(moveTab(s, "c", 0))).toEqual(["c", "a", "b"]);
    expect(ids(moveTab(s, "a", 1))).toEqual(["b", "a", "c"]);
    expect(ids(moveTab(s, "a", 99))).toEqual(["b", "c", "a"]);
    expect(ids(moveTab(s, "b", -4))).toEqual(["b", "a", "c"]);
    expect(moveTab(s, "c", 2)).toBe(s);
    expect(moveTab(s, "zz", 0)).toBe(s);
    expect(moveTab(s, "c", 0).active).toBe("c");
  });

  test("stepping walks home and every tab in a ring", () => {
    let s = activateTab(three(), null);
    const walk: (string | null)[] = [];
    for (let i = 0; i < 5; i++) walk.push((s = stepTab(s, 1)).active);
    expect(walk).toEqual(["a", "b", "c", null, "a"]);
    expect(stepTab(activateTab(s, null), -1).active).toBe("c");
  });

  test("patching changes one tab and never its id", () => {
    const s = patchTab(three(), "b", { title: "Bee", q: "x" });
    expect(s.tabs[1]).toEqual({ id: "b", title: "Bee", q: "x" });
    expect(patchTab(s, "zz", { title: "no" })).toBe(s);
  });
});

describe("tab storage", () => {
  test("a saved list comes back after a reload", () => {
    const store = memory();
    const s = activateTab(three(), "b");
    expect(writeTabs(store, "k", s)).toBe(true);
    expect(readTabs(store, "k", valid)).toEqual(s);
  });

  test("broken, foreign or oversized saved data falls back to no tabs or drops the bad rows", () => {
    expect(readTabs(memory({ k: "{not json" }), "k", valid)).toEqual(noTabs());
    expect(readTabs(memory({ k: "null" }), "k", valid)).toEqual(noTabs());
    expect(readTabs(memory({ k: '{"tabs":"x"}' }), "k", valid)).toEqual(noTabs());
    expect(readTabs(memory(), "k", valid)).toEqual(noTabs());
    const mixed = JSON.stringify({ tabs: [tab("a"), { id: 4 }, null, tab("a"), tab("b")], active: "gone" });
    expect(readTabs(memory({ k: mixed }), "k", valid)).toEqual({ tabs: [tab("a"), tab("b")], active: null });
    const many = JSON.stringify({ tabs: Array.from({ length: 50 }, (_, i) => tab(`t${i}`)), active: "t49" });
    const got = readTabs(memory({ k: many }), "k", valid);
    expect(got.tabs.length).toBe(MAX_TABS);
    expect(got.active).toBeNull();
  });

  test("storage that is missing or throws never breaks the screen", () => {
    const broken: TabStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(readTabs(broken, "k", valid)).toEqual(noTabs());
    expect(writeTabs(broken, "k", three())).toBe(false);
    expect(readTabs(null, "k", valid)).toEqual(noTabs());
    expect(writeTabs(null, "k", three())).toBe(false);
  });
});
