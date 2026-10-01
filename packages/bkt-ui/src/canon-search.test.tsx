import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { CanonAbout, CanonExcerpt, CanonHit } from "./api";
import { href, parseHash } from "./router";
import type { CanonSearchApi } from "./views/CanonSearch";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());

const HITS: CanonHit[] = [
  { claim_id: 7, branch: "02-physics", concept: "entropy", slug: "001-a", title: "Claim", score: 2, url: "https://bucket.foundation/excerpts/entropy/001-a", excerpt: "Claim. Entropy rises and entropy never falls.", evidence_count: 1 },
  { claim_id: 9, branch: "07-mind", concept: "free-will", slug: "002-b", title: "Claim", score: 0, url: "https://bucket.foundation/excerpts/free-will/002-b", excerpt: "Claim. Nothing about the query.", evidence_count: 0 },
];
const DETAIL: CanonExcerpt = {
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
};
const ABOUT: CanonAbout = { version: "abc", excerpts: 364, branches: ["02-physics", "07-mind"], licences: [{ kind: "pubmed", name: "PubMed abstracts", terms: "Publisher copyright.", url: "https://pubmed.ncbi.nlm.nih.gov", works: 1 }] };

function fakeApi(over: Partial<CanonSearchApi> = {}) {
  const calls: { search: [string, string | undefined][]; opened: string[] } = { search: [], opened: [] };
  const api: CanonSearchApi = {
    canonSearch: async (q, branch) => {
      calls.search.push([q, branch]);
      return HITS;
    },
    canonExcerpt: async () => DETAIL,
    canonAbout: async () => ABOUT,
    openLink: async (url) => {
      calls.opened.push(url);
      return { opened: url };
    },
    ...over,
  };
  return { api, calls };
}

async function mount(api: CanonSearchApi, id?: number) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { CanonSearchView } = await import("./views/CanonSearch");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<CanonSearchView api={api} id={id} webgl={false} />));
  const search = async (text: string) => {
    const input = host.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  };
  const button = (text: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes(text)) as HTMLButtonElement | undefined;
  return { host, act, search, button, unmount: () => act(async () => root.unmount()) };
}

describe("canon search route", () => {
  test("parses the list and one excerpt, and refuses a bad id", () => {
    expect(parseHash("#/search")).toEqual({ name: "search" });
    expect(parseHash("#/search/42")).toEqual({ name: "search", id: 42 });
    expect(href({ name: "search", id: 42 })).toBe("#/search/42");
    expect(href({ name: "search" })).toBe("#/search");
    for (const bad of ["#/search/x", "#/search/-1", "#/search/1/2", "#/search/1e3", "#/search/%3Cscript%3E"]) expect(parseHash(bad)).toEqual({ name: "search" });
    expect(parseHash("#/canon")).toEqual({ name: "canon" });
    expect(parseHash("#/canon/find/speed%20of%20light")).toEqual({ name: "canon", find: "speed of light" });
    expect(href({ name: "canon", find: "speed of light" })).toBe("#/canon/find/speed%20of%20light");
    expect(parseHash(`#/canon/find/${"a".repeat(201)}`)).toEqual({ name: "canon" });
    expect(parseHash("#/canon/find/a/b")).toEqual({ name: "canon" });
  });
});

describe("canon keyword view, shown when the computer cannot draw the globe", () => {
  test("searches through the injected api and lists only rows that match", async () => {
    const { api, calls } = fakeApi();
    const v = await mount(api);
    expect(v.host.textContent).toContain("364 source excerpts");
    expect(v.host.textContent).toContain("the globe and the circle are hidden");
    expect(v.host.querySelector("canvas, [data-testid='globe']")).toBeNull();
    expect(v.host.querySelectorAll(".hit").length).toBe(0);
    await v.search("  entropy ");
    expect(calls.search).toEqual([["entropy", ""]]);
    const hits = v.host.querySelectorAll(".hit");
    expect(hits.length).toBe(1);
    expect(hits[0].getAttribute("href")).toBe("#/search/7");
    expect(hits[0].textContent).toContain("2 matches");
    expect(hits[0].querySelector(".hit-text")?.textContent).toBe("Entropy rises and entropy never falls.");
    expect(v.host.querySelectorAll("select option").length).toBe(3);
    await v.unmount();
  });

  test("says so when nothing matches and shows an api error", async () => {
    const none = await mount(fakeApi({ canonSearch: async () => [HITS[1]] }).api);
    await none.search("zzqxv");
    expect(none.host.textContent).toContain("No excerpt holds");
    await none.unmount();
    const broken = await mount(
      fakeApi({
        canonSearch: async () => {
          throw new Error("canon search index not built");
        },
      }).api,
    );
    await broken.search("entropy");
    expect(broken.host.querySelector('[role="alert"]')?.textContent).toContain("canon search index not built");
    await broken.unmount();
  });

  test("shows an excerpt with its evidence and opens sources through the local route", async () => {
    const { api, calls } = fakeApi();
    const v = await mount(api, 7);
    expect(v.host.querySelector("blockquote")?.textContent).toBe("Entropy rises and entropy never falls.");
    expect(v.host.textContent).toContain("A lecture on heat, at 00:00:10");
    const rows = v.host.querySelectorAll(".evidence li");
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector(".cite")?.textContent).toBe("On heat, A. Writer");
    expect(rows[1].querySelector(".cite")?.textContent).toBe("Old book, https://archive.org/details/item");
    expect(rows[1].querySelector("button")).toBeNull();
    expect(v.host.querySelectorAll("a[href^='http']").length).toBe(0);
    await v.act(async () => v.button("Open the source in your browser")!.click());
    await v.act(async () => (v.host.querySelector(".evidence button") as HTMLButtonElement).click());
    expect(calls.opened).toEqual([DETAIL.source.url!, DETAIL.evidence[0].url!]);
    expect(v.host.querySelector(".licences")?.textContent).toContain("PubMed abstracts");
    await v.unmount();
  });

  test("a refused link shows the reason", async () => {
    const v = await mount(
      fakeApi({
        openLink: async () => {
          throw new Error("that link is outside the allowed sites");
        },
      }).api,
      7,
    );
    await v.act(async () => v.button("Open the source in your browser")!.click());
    expect(v.host.querySelector('[role="alert"]')?.textContent).toContain("outside the allowed sites");
    await v.unmount();
  });
});
