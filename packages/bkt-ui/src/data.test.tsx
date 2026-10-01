import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { ApiError, type DataDetail, type DataPage, type DataQuery, type DataRow, type Dataset } from "./api";
import { href, parseHash } from "./router";
import type { TabStorage } from "./tabs";
import type { DataApi } from "./views/Data";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

const BIG = 11_000;
const ROWS: DataRow[] = Array.from({ length: BIG }, (_, i) => ({
  id: `source/a/${i}`,
  title: `Paper ${String(i).padStart(5, "0")} on ${i % 7 === 0 ? "entropy" : "water"}`,
  creators: i % 3 === 0 ? null : `Writer ${i % 40}`,
  year: i % 5 === 0 ? null : 1900 + (i % 120),
  kind: i % 2 ? "p" : "a",
  kindLabel: i % 2 ? "PubMed" : "arXiv",
  source: i === 1 ? "https://archive.org/details/item" : i === 2 ? null : `https://arxiv.org/abs/${i}`,
  openable: i > 2 || i === 0,
}));

const SETS: Dataset[] = [
  {
    id: "explore",
    name: "Explore sources",
    about: "Titles, authors and years of the papers, books and talks that Explore searches.",
    browsable: true,
    version: "e1",
    builtAt: null,
    checksum: "f".repeat(64),
    counts: [{ kind: "a", label: "arXiv", n: BIG / 2 }, { kind: "p", label: "PubMed", n: BIG / 2 }],
    kinds: [{ id: "a", label: "arXiv" }, { id: "p", label: "PubMed" }],
    parts: [
      { name: "arXiv", count: BIG / 2, unit: "sources", terms: "Titles from arxiv.org.", link: "https://arxiv.org", openable: true },
      { name: "PubMed", count: BIG / 2, unit: "sources", terms: null, link: null, openable: false },
    ],
    leftOut: { count: 40, reason: "Left out because the author has not agreed to sharing." },
  },
  {
    id: "learning",
    name: "Learning decks",
    about: "The lessons and quiz questions that Learn, Quiz and Review draw from.",
    browsable: true,
    version: "v1",
    builtAt: Date.UTC(2026, 8, 30, 12),
    checksum: null,
    counts: [{ kind: "deck", label: "decks", n: 8 }, { kind: "lesson", label: "lessons", n: 487 }],
    kinds: [{ id: "lesson", label: "Lesson" }],
    parts: [],
    leftOut: null,
  },
  {
    id: "yours",
    name: "Your work",
    about: "What you have written and answered in Bucket. It stays on this computer.",
    browsable: false,
    version: null,
    builtAt: null,
    checksum: null,
    counts: [{ kind: "note", label: "notes", n: 2, stored: "encrypted", screen: "notes" }],
    kinds: [],
    parts: [],
    leftOut: null,
  },
];

function stubServer(over: Partial<DataApi> = {}) {
  const calls: { records: [string, DataQuery][]; record: [string, string][]; opened: string[] } = { records: [], record: [], opened: [] };
  const api: DataApi = {
    data: async () => SETS,
    dataRecords: async (set, q = {}) => {
      calls.records.push([set, q]);
      if (set !== "explore") return { total: 0, offset: 0, limit: q.limit ?? 50, records: [] };
      const terms = (q.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
      let rows = ROWS.filter((r) => (!q.kind || r.kind === q.kind) && terms.every((t) => `${r.title} ${r.creators ?? ""}`.toLowerCase().includes(t)));
      if (q.sort === "title") rows = [...rows].sort((a, b) => a.title.localeCompare(b.title) * (q.dir === "desc" ? -1 : 1));
      const offset = q.offset ?? 0;
      const limit = q.limit ?? 50;
      return { total: rows.length, offset, limit, records: rows.slice(offset, offset + limit) } satisfies DataPage;
    },
    dataRecord: async (set, id) => {
      calls.record.push([set, id]);
      const record = ROWS.find((r) => r.id === id);
      if (!record) throw new ApiError("no such record", 404);
      return { record, fields: [{ label: "Found in", value: record.kindLabel }, { label: "Text", value: "Heat flows from hot to cold." }] } satisfies DataDetail;
    },
    openLink: async (url) => {
      calls.opened.push(url);
      return { opened: url };
    },
    ...over,
  };
  return { api, calls };
}

function memory(initial: Record<string, string> = {}): TabStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

async function mount(api: DataApi, storage: TabStorage | null = memory()) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { DataView, FILTER_WAIT_MS } = await import("./views/Data");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const settle = (ms = 20) => act(async () => new Promise((r) => setTimeout(r, ms)));
  await act(async () => root.render(<DataView api={api} storage={storage} />));
  await settle();
  const button = (label: string, within: Element = host) => Array.from(within.querySelectorAll("button")).find((b) => b.textContent?.trim().startsWith(label)) as HTMLButtonElement;
  const click = async (el: Element) => {
    await act(async () => (el as HTMLElement).click());
    await settle();
  };
  const card = (name: string) => Array.from(host.querySelectorAll("article.dataset")).find((a) => a.querySelector("h2")!.textContent === name)!;
  const tabs = () => Array.from(host.querySelectorAll('[role="tab"]')).map((t) => `${t.getAttribute("aria-selected") === "true" ? "*" : ""}${t.textContent}`);
  const tab = (title: string) => Array.from(host.querySelectorAll('[role="tab"]')).find((t) => t.textContent === title) as HTMLButtonElement;
  const key = async (k: string, shiftKey = false) => {
    await act(async () => host.querySelector('[role="tablist"]')!.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, shiftKey, bubbles: true, cancelable: true }) as unknown as Event));
    await settle();
  };
  const type = async (value: string) => {
    const input = host.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await settle(FILTER_WAIT_MS + 60);
  };
  const rows = () => Array.from(host.querySelectorAll(".rows tbody tr"));
  const status = () => host.querySelector('[role="status"]')?.textContent ?? null;
  const alerts = () => Array.from(host.querySelectorAll('[role="alert"]')).map((a) => a.textContent);
  return { host, act, settle, button, click, card, tabs, tab, key, type, rows, status, alerts, unmount: () => act(async () => root.unmount()) };
}

describe("data route", () => {
  test("opens from its address", () => {
    expect(parseHash("#/data")).toEqual({ name: "data" });
    expect(href({ name: "data" })).toBe("#/data");
  });
});

describe("data screen: the list", () => {
  test("with nothing loaded it says so in one sentence", async () => {
    const { NO_DATA } = await import("./views/Data");
    const v = await mount(stubServer({ data: async () => [] }).api);
    expect(v.host.querySelector('[role="tabpanel"]')!.textContent).toBe(NO_DATA);
    expect(v.host.querySelector("article")).toBeNull();
    expect(v.alerts()).toEqual([]);
    await v.unmount();
  });

  test("when the list cannot be read it shows the plain error and no card", async () => {
    const v = await mount(stubServer({ data: () => Promise.reject(new ApiError("data key does not match", 500)) }).api);
    expect(v.alerts()).toEqual(["Bucket ran into a problem. Try again."]);
    expect(v.host.querySelector("article")).toBeNull();
    expect(v.host.textContent).not.toContain("data key");
    await v.unmount();
  });

  test("shows each dataset as a card with counts, what was left out, licences and details", async () => {
    const { NOT_RECORDED } = await import("./views/Data");
    const v = await mount(stubServer().api);
    expect(Array.from(v.host.querySelectorAll("article.dataset h2")).map((h) => h.textContent)).toEqual(["Explore sources", "Learning decks", "Your work"]);
    const explore = v.card("Explore sources");
    expect(Array.from(explore.querySelectorAll(".counts li")).map((li) => li.textContent)).toEqual(["5,500 arXiv", "5,500 PubMed"]);
    expect(explore.querySelector(".left-out")!.textContent).toBe("40 records left out. Left out because the author has not agreed to sharing.");
    const parts = Array.from(explore.querySelectorAll(".licences tr")).map((tr) => tr.textContent);
    expect(parts[0]).toContain("Titles from arxiv.org.");
    expect(parts[1]).toContain("Licence not recorded.");
    expect(parts[1]).toContain("Source not recorded.");
    expect(v.button("Browse", explore).textContent).toBe("Browse 11,000 records");
    const fine = Array.from(explore.querySelectorAll(".fine dd")).map((d) => d.textContent);
    expect(fine).toEqual(["e1", NOT_RECORDED, "f".repeat(64)]);
    expect(Array.from(v.card("Learning decks").querySelectorAll(".fine dd")).map((d) => d.textContent)).toEqual(["v1", "September 30, 2026", NOT_RECORDED]);
    expect(v.button("Browse", v.card("Learning decks")).textContent).toBe("Browse 487 records");
    expect(v.card("Learning decks").querySelector(".left-out")).toBeNull();
    expect(v.card("Your work").querySelector("button")).toBeNull();
    expect(v.card("Your work").querySelector("details")).toBeNull();
    await v.unmount();
  });

  test("a licence link opens through the app's link rule and a refusal shows in plain words", async () => {
    const ok = stubServer();
    const v = await mount(ok.api);
    await v.click(v.button("Open the source", v.card("Explore sources")));
    expect(ok.calls.opened).toEqual(["https://arxiv.org"]);
    await v.unmount();
    const w = await mount(stubServer({ openLink: () => Promise.reject(new ApiError("that link is outside the allowed sites", 400)) }).api);
    await w.click(w.button("Open the source", w.card("Explore sources")));
    expect(w.alerts()).toEqual(["Bucket could not use that. Check it and try again."]);
    await w.unmount();
  });
});

describe("data screen: one dataset", () => {
  test("opens as a tab with one page of 11,000 rows and walks the pages", async () => {
    const s = stubServer();
    const v = await mount(s.api);
    await v.click(v.button("Browse", v.card("Explore sources")));
    expect(v.tabs()).toEqual(["All data", "*Explore sources"]);
    expect(v.rows().length).toBe(50);
    expect(v.host.querySelectorAll("tr").length).toBe(51);
    expect(v.status()).toBe("1 to 50 of 11,000 records");
    expect(v.button("Previous").disabled).toBe(true);
    await v.click(v.button("Next"));
    expect(v.status()).toBe("51 to 100 of 11,000 records");
    expect(v.rows()[0].querySelector("td")!.textContent).toBe(ROWS[50].title);
    expect(v.host.querySelector(".pager span")!.textContent).toBe("Page 2 of 220");
    await v.click(v.button("Previous"));
    expect(v.status()).toBe("1 to 50 of 11,000 records");
    expect(s.calls.records.every(([, q]) => q.limit === 50)).toBe(true);
    await v.unmount();
  });

  test("filters by text after a short wait and by kind, and goes back to the first page", async () => {
    const s = stubServer();
    const v = await mount(s.api);
    await v.click(v.button("Browse", v.card("Explore sources")));
    await v.click(v.button("Next"));
    await v.type("entropy");
    expect(v.status()).toBe(`1 to 50 of ${Math.ceil(BIG / 7).toLocaleString("en-US")} records`);
    expect(s.calls.records.at(-1)![1]).toMatchObject({ q: "entropy", offset: 0 });
    const select = v.host.querySelector("select") as HTMLSelectElement;
    await v.act(async () => {
      select.value = "p";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await v.settle();
    expect(s.calls.records.at(-1)![1]).toMatchObject({ q: "entropy", kind: "p", offset: 0 });
    expect(v.rows().every((r) => r.querySelectorAll("td")[3].textContent === "PubMed")).toBe(true);
    await v.type("no such thing");
    expect(v.rows().length).toBe(0);
    expect(v.host.querySelector(".data-table")!.textContent).toContain("No record matches “no such thing”.");
    await v.unmount();
  });

  test("sorts by a column, flips on a second press and marks the column", async () => {
    const s = stubServer();
    const v = await mount(s.api);
    await v.click(v.button("Browse", v.card("Explore sources")));
    await v.click(v.button("Title"));
    expect(s.calls.records.at(-1)![1]).toMatchObject({ sort: "title", dir: "asc", offset: 0 });
    expect(v.host.querySelector("th")!.getAttribute("aria-sort")).toBe("ascending");
    await v.click(v.button("Title"));
    expect(s.calls.records.at(-1)![1]).toMatchObject({ sort: "title", dir: "desc" });
    expect(v.host.querySelector("th")!.getAttribute("aria-sort")).toBe("descending");
    expect(v.rows()[0].querySelector("td")!.textContent).toBe(ROWS[BIG - 1].title);
    await v.click(v.button("Year"));
    expect(s.calls.records.at(-1)![1]).toMatchObject({ sort: "year", dir: "asc" });
    await v.unmount();
  });

  test("an empty dataset and a failing one each read as one sentence", async () => {
    const { NO_RECORDS } = await import("./views/Data");
    const v = await mount(stubServer().api);
    await v.click(v.button("Browse", v.card("Learning decks")));
    expect(v.host.querySelector(".data-table p")!.textContent).toBe(NO_RECORDS);
    await v.unmount();
    const w = await mount(stubServer({ dataRecords: () => Promise.reject(new ApiError("no such dataset", 404)) }).api);
    await w.click(w.button("Browse", w.card("Explore sources")));
    expect(w.alerts()).toEqual(["Bucket could not find that."]);
    expect(w.rows().length).toBe(0);
    await w.unmount();
  });
});

describe("data screen: one record", () => {
  test("opens as a second tab with its fields and opens its source through the app's link rule", async () => {
    const s = stubServer();
    const v = await mount(s.api);
    await v.click(v.button("Browse", v.card("Explore sources")));
    await v.click(v.button(ROWS[0].title));
    expect(v.tabs()).toEqual(["All data", "Explore sources", `*${ROWS[0].title}`]);
    expect(s.calls.record).toEqual([["explore", ROWS[0].id]]);
    const pane = v.host.querySelector("article.record")!;
    expect(pane.querySelector("h2")!.textContent).toBe(ROWS[0].title);
    expect(Array.from(pane.querySelectorAll("dt")).map((d) => d.textContent)).toEqual(["By", "Year", "Found in", "Text", "Source"]);
    expect(Array.from(pane.querySelectorAll("dd")).map((d) => d.textContent)).toEqual(["Not recorded", "Not recorded", "arXiv", "Heat flows from hot to cold.", "Open the source in your browser"]);
    await v.click(v.button("Open the source in your browser"));
    expect(s.calls.opened).toEqual(["https://arxiv.org/abs/0"]);
    await v.unmount();
  });

  test("a source outside the allowed sites shows as text, and a missing one says so", async () => {
    const v = await mount(stubServer().api);
    await v.click(v.button("Browse", v.card("Explore sources")));
    expect(v.rows()[1].querySelector("td:last-child button")).toBeNull();
    await v.click(v.button(ROWS[1].title));
    expect(v.host.querySelector("article.record > dl > dd:last-child")!.textContent).toBe("https://archive.org/details/item");
    expect(v.host.querySelector("article.record button")).toBeNull();
    await v.click(v.tab("Explore sources"));
    await v.click(v.button(ROWS[2].title));
    expect(v.host.querySelector("article.record > dl > dd:last-child")!.textContent).toBe("No source link recorded.");
    await v.unmount();
  });

  test("a record that is gone reads as one plain sentence", async () => {
    const storage = memory({ "bucket.data.tabs": JSON.stringify({ tabs: [{ id: "rec:explore:gone", title: "Gone", dataset: "explore", record: "gone" }], active: "rec:explore:gone" }) });
    const v = await mount(stubServer().api, storage);
    expect(v.alerts()).toEqual(["Bucket could not find that."]);
    expect(v.host.querySelector("article.record")).toBeNull();
    await v.unmount();
  });
});

describe("data screen: tabs", () => {
  const two = async (storage: TabStorage | null = memory()) => {
    const s = stubServer();
    const v = await mount(s.api, storage);
    await v.click(v.button("Browse", v.card("Explore sources")));
    await v.click(v.button(ROWS[3].title));
    return { v, s };
  };

  test("switch by pointer and close with the close button", async () => {
    const { v } = await two();
    await v.click(v.tab("Explore sources"));
    expect(v.tabs()).toEqual(["All data", "*Explore sources", ROWS[3].title]);
    expect(v.rows().length).toBe(50);
    await v.click(v.tab("All data"));
    expect(v.host.querySelectorAll("article.dataset").length).toBe(3);
    await v.click(v.host.querySelector('[aria-label="Close Explore sources"]')!);
    expect(v.tabs()).toEqual(["*All data", ROWS[3].title]);
    expect(v.host.querySelector('[aria-label="Close All data"]')).toBeNull();
    await v.unmount();
  });

  test("switch, move and close by keyboard, with focus following the open tab", async () => {
    const { v } = await two();
    const title = ROWS[3].title;
    await v.key("ArrowLeft");
    expect(v.tabs()).toEqual(["All data", "*Explore sources", title]);
    expect(document.activeElement).toBe(v.tab("Explore sources"));
    await v.key("ArrowRight", true);
    expect(v.tabs()).toEqual(["All data", title, "*Explore sources"]);
    await v.key("ArrowLeft", true);
    expect(v.tabs()).toEqual(["All data", "*Explore sources", title]);
    await v.key("Home");
    expect(v.tabs()[0]).toBe("*All data");
    await v.key("ArrowRight", true);
    expect(v.tabs()).toEqual(["*All data", "Explore sources", title]);
    await v.key("ArrowLeft");
    expect(v.tabs()).toEqual(["All data", "Explore sources", `*${title}`]);
    await v.key("End");
    await v.key("Delete");
    expect(v.tabs()).toEqual(["All data", "*Explore sources"]);
    await v.key("Delete");
    expect(v.tabs()).toEqual(["*All data"]);
    await v.key("Delete");
    expect(v.tabs()).toEqual(["*All data"]);
    expect(Array.from(v.host.querySelectorAll('[role="tab"]')).map((t) => t.getAttribute("tabindex"))).toEqual(["0"]);
    await v.unmount();
  });

  test("reorder by dragging one tab onto another", async () => {
    const { v } = await two();
    const title = ROWS[3].title;
    const wrap = (t: string) => v.tab(t).parentElement!;
    await v.act(async () => {
      wrap(title).dispatchEvent(new Event("dragstart", { bubbles: true }));
      wrap("Explore sources").dispatchEvent(new Event("dragover", { bubbles: true, cancelable: true }));
      wrap("Explore sources").dispatchEvent(new Event("drop", { bubbles: true, cancelable: true }));
    });
    expect(v.tabs()).toEqual(["All data", `*${title}`, "Explore sources"]);
    expect(wrap("All data").getAttribute("draggable")).toBeNull();
    await v.unmount();
  });

  test("the open tabs, the open one and a table's filter and page come back after a reload", async () => {
    const storage = memory();
    const { v } = await two(storage);
    await v.click(v.tab("Explore sources"));
    await v.type("entropy");
    await v.click(v.button("Next"));
    const before = v.tabs();
    await v.unmount();
    document.body.innerHTML = "";
    const s = stubServer();
    const w = await mount(s.api, storage);
    expect(w.tabs()).toEqual(before);
    expect((w.host.querySelector('input[type="search"]') as HTMLInputElement).value).toBe("entropy");
    expect(s.calls.records).toEqual([["explore", { q: "entropy", kind: "", sort: undefined, dir: undefined, offset: 50, limit: 50 }]]);
    expect(w.status()).toBe(`51 to 100 of ${Math.ceil(BIG / 7).toLocaleString("en-US")} records`);
    await w.unmount();
  });

  test("opening the same dataset or record twice keeps one tab", async () => {
    const { v } = await two();
    await v.click(v.tab("All data"));
    await v.click(v.button("Browse", v.card("Explore sources")));
    await v.click(v.button(ROWS[3].title));
    expect(v.tabs()).toEqual(["All data", "Explore sources", `*${ROWS[3].title}`]);
    await v.unmount();
  });

  test("saved tabs that are broken or name data that is gone do not break the screen", async () => {
    const { NOT_LOADED } = await import("./views/Data");
    const v = await mount(stubServer().api, memory({ "bucket.data.tabs": "{broken" }));
    expect(v.tabs()).toEqual(["*All data"]);
    await v.unmount();
    const saved = JSON.stringify({ tabs: [{ id: "set:old", title: "Old pack", dataset: "old" }, { id: 3 }, { id: "set:yours", title: "Your work", dataset: "yours" }], active: "set:old" });
    const w = await mount(stubServer().api, memory({ "bucket.data.tabs": saved }));
    expect(w.tabs()).toEqual(["All data", "*Old pack", "Your work"]);
    expect(w.host.querySelector('[role="tabpanel"]')!.textContent).toBe(NOT_LOADED);
    await w.click(w.tab("Your work"));
    expect(w.host.querySelector('[role="tabpanel"]')!.textContent).toBe(NOT_LOADED);
    await w.unmount();
  });

  test("storage that throws or is missing leaves the screen working", async () => {
    const broken: TabStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    };
    for (const storage of [broken, null]) {
      const { v } = await two(storage);
      expect(v.tabs().length).toBe(3);
      await v.unmount();
      document.body.innerHTML = "";
    }
  });
});
