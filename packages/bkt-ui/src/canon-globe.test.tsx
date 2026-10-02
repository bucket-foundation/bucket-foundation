import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OPEN_HOSTS } from "../../bkt/src/canon";
import type { CanonAbout, CanonExcerpt, CanonHit } from "./api";
import { CANON_TROUBLE, OFFLINE_MESSAGE, rememberExcerpt, siteFetch, SITE_ROUTES, windowHref } from "./site-fetch";
import type { CanonSearchApi } from "./views/CanonSearch";

type GlobeProps = { markers: { id: string }[]; projection?: { id: string } };

mock.module("@/components/canon-globe", () => ({
  default: ({ markers, projection }: GlobeProps) => <div data-testid="globe" data-markers={markers.length} data-projection={projection?.id ?? "globe"} />,
}));

beforeAll(() => {
  GlobalRegistrator.register({ url: "http://127.0.0.1:4100/" });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());

const ROOT = resolve(import.meta.dir, "../../..");
const CSS = readFileSync(resolve(import.meta.dir, "ros.css"), "utf8");

const hit = (claim_id: number, concept: string, slug: string, score: number, excerpt: string): CanonHit => ({
  claim_id,
  branch: "02-physics",
  concept,
  slug,
  title: "Claim",
  score,
  url: `https://bucket.foundation/excerpts/${concept}/${slug}`,
  excerpt,
  evidence_count: 1,
});
const HITS = [hit(7, "entropy", "001-a", 2, "Claim. Entropy rises and entropy never falls."), hit(8, "entropy", "002-b", 1, "Claim. Entropy is a count of arrangements."), hit(9, "free-will", "003-c", 0, "Claim. Nothing about the query.")];
const DETAIL: CanonExcerpt = {
  id: 7,
  branch: "02-physics",
  concept: "entropy",
  slug: "001-a",
  title: "Claim",
  text: "Claim. Entropy rises and entropy never falls.",
  source: { title: "A lecture on heat", url: "https://www.youtube.com/watch?v=BBBBBBBBBBB&t=10", timestamp: "00:00:10.000" },
  evidence: [],
};
const ABOUT: CanonAbout = { version: "abc", excerpts: 364, branches: ["02-physics", "07-mind"], licences: [{ kind: "pubmed", name: "PubMed abstracts", terms: "Publisher copyright.", url: "https://pubmed.ncbi.nlm.nih.gov", works: 1 }] };

const ORIGIN = "http://127.0.0.1:4100";
const TOKEN = "t".repeat(43);

function fakeApi(over: Partial<CanonSearchApi> = {}, status = 200) {
  const calls: { search: [string, string | null][]; opened: string[] } = { search: [], opened: [] };
  const base = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.search.push([String(input), new Headers(init?.headers).get("authorization")]);
    return new Response(JSON.stringify(status === 200 ? { query: "x", top_k: 15, mode: "lexical", n_results: HITS.length, results: HITS, took_ms: 1 } : { error: "canon search index not built" }), { status });
  }) as typeof fetch;
  globalThis.fetch = siteFetch(base, ORIGIN, TOKEN);
  const api: CanonSearchApi = {
    canonSearch: async () => HITS,
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

async function mount(api: CanonSearchApi, props: { id?: number; find?: string } = {}) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { CanonSearchView } = await import("./views/CanonSearch");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<CanonSearchView api={api} page={props.id === undefined ? "globe" : "search"} webgl {...props} />));
  const settle = (ms = 320) => act(async () => new Promise((r) => setTimeout(r, ms)));
  await settle(30);
  const type = async (text: string) => {
    const input = host.querySelector('.canon-site input[type="text"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await settle();
  };
  const button = (text: string) => Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes(text)) as HTMLButtonElement | undefined;
  const click = (el: Element) => act(async () => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  return {
    host,
    settle,
    type,
    button,
    click,
    unmount: async () => {
      await act(async () => root.unmount());
      host.remove();
      window.history.replaceState(null, "", "http://127.0.0.1:4100/");
    },
  };
}

const hidden = (host: Element) => {
  const rules = Array.from(CSS.matchAll(/((?:\.canon-site [^{}]+?,\s*)*\.canon-site [^{}]+?)\s*\{\s*display:\s*none;\s*\}/g)).flatMap((m) => m[1].split(/,\n/).map((s) => s.trim()));
  return { rules, of: (sel: string) => Array.from(host.querySelectorAll(sel)) };
};

describe("canon screen with the globe", () => {
  test("shows the search box, the globe and the circle switch, and searches through the injected api", async () => {
    const { api, calls } = fakeApi();
    const v = await mount(api);
    expect(v.host.querySelector("h1")?.textContent).toBe("Canon");
    expect(v.host.textContent).toContain("364 source excerpts on this computer");
    const globe = v.host.querySelector('[data-testid="globe"]') as HTMLElement;
    expect(Number(globe.dataset.markers)).toBeGreaterThan(50);
    expect(Array.from(v.host.querySelectorAll('[role="radio"]')).map((b) => b.textContent)).toEqual(["globe", "circle"]);
    expect((v.host.querySelector('.canon-site input[type="text"]') as HTMLInputElement).placeholder).toBe("search 364 source excerpts across 2 branches");
    const { canonCounts } = await import("./views/CanonSearch");
    const counts = canonCounts(ABOUT);
    const cells = Array.from(v.host.querySelectorAll<HTMLElement>(".canon-site aside dl > div"));
    expect(cells.filter((row) => row.style.display === "none").map((row) => row.querySelector("dt")!.textContent)).toEqual(["Detected bridges"]);
    const card = Object.fromEntries(cells.filter((row) => row.style.display !== "none").map((row) => [row.querySelector("dt")!.textContent, row.querySelector("dd")!.textContent]));
    expect(card).toEqual({ "Source excerpts": "364", Branches: "2", "Geocoded events": String(Number(globe.dataset.markers)), "Year span": counts.span });
    expect(v.host.innerHTML).not.toContain("599");
    const { rules, of } = hidden(v.host);
    const panel = Array.from(v.host.querySelectorAll(".canon-site aside a")).filter((a) => !rules.some((r) => of(r).includes(a)));
    expect(panel.map((a) => a.getAttribute("href"))).toEqual(["/canon/search"]);
    const go = new MouseEvent("click", { bubbles: true, cancelable: true });
    panel[0].dispatchEvent(go);
    expect(go.defaultPrevented).toBe(true);
    expect(window.location.hash).toBe("#/search");

    await v.type("entropy");
    expect(calls.search).toEqual([["/local/canon/search?q=entropy&top_k=15", `Bucket ${TOKEN}`]]);
    const rows = Array.from(v.host.querySelectorAll(".canon-site .max-h-72 > button"));
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain("Entropy rises");
    expect(v.host.textContent).not.toContain("Nothing about the query");

    await v.click(rows[0]);
    await v.settle();
    expect(calls.search[1]).toEqual(["/local/canon/search?q=Claim&top_k=8", `Bucket ${TOKEN}`]);
    const drawer = v.host.querySelector(".canon-site aside") as HTMLElement;
    expect(drawer.querySelector("blockquote")?.textContent).toContain("Entropy rises and entropy never falls.");
    const full = Array.from(drawer.querySelectorAll("a")).find((a) => a.textContent?.includes("open full claim"));
    expect(full?.getAttribute("href")).toBe("#/search/7");
    const related = Array.from(drawer.querySelectorAll("li a")).map((a) => a.getAttribute("href"));
    expect(related).toEqual(["#/search/8"]);
    const live = hidden(v.host);
    const dead = Array.from(drawer.querySelectorAll("a")).filter((a) => !/^(#\/|https:\/\/)/.test(a.getAttribute("href") ?? ""));
    expect(dead.length).toBeGreaterThan(0);
    expect(dead.filter((a) => !live.of('.canon-site a[href="#"]').includes(a))).toEqual([]);
    await v.unmount();
  });

  test("the circle switch hands the circle projection to the same canvas and lists its points", async () => {
    const v = await mount(fakeApi().api);
    await v.click(v.host.querySelector('[data-view="circle"]')!);
    await v.settle(30);
    expect((v.host.querySelector('[data-testid="globe"]') as HTMLElement).dataset.projection).toBe("circle");
    expect(v.host.querySelector("details summary")?.textContent).toContain("circle as a list");
    expect(window.location.search).toContain("view=circle");
    await v.unmount();
  });

  test("an outside link opens through the local route and never navigates the window", async () => {
    const { api, calls } = fakeApi();
    const v = await mount(api);
    await v.type("entropy");
    await v.click(v.host.querySelector(".canon-site .max-h-72 > button")!);
    await v.settle();
    const drawer = v.host.querySelector(".canon-site aside") as HTMLElement;
    const links = Array.from(drawer.querySelectorAll('a[href^="https://"]')) as HTMLAnchorElement[];
    const wiki = links.find((a) => a.href.startsWith("https://en.wikipedia.org/"))!;
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    const { act } = await import("react");
    await act(async () => wiki.dispatchEvent(click));
    expect(click.defaultPrevented).toBe(true);
    expect(calls.opened).toEqual([wiki.getAttribute("href")!]);

    const { rules, of } = hidden(v.host);
    expect(rules.length).toBe(6);
    const shown = links.filter((a) => !rules.some((r) => of(r).includes(a)));
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.map((a) => new URL(a.href).hostname).filter((h) => !OPEN_HOSTS.includes(h))).toEqual([]);
    expect(links.length).toBeGreaterThan(shown.length);
    await v.unmount();
  });

  test("every hide rule in the window palette still matches a part of the web component", async () => {
    const v = await mount(fakeApi().api);
    const { rules, of } = hidden(v.host);
    const idle = rules.map((r) => of(r).length);
    await v.type("entropy");
    await v.click(v.host.querySelector(".canon-site .max-h-72 > button")!);
    await v.settle();
    const open = rules.map((r) => of(r).length);
    expect(rules.map((r, i) => [r, idle[i] + open[i] > 0])).toEqual(rules.map((r) => [r, true]));
    const meta = of(".canon-site aside section:has(dl)");
    expect(meta.map((el) => el.querySelector("dt")?.textContent)).toEqual(["id"]);
    expect(of(".canon-site button[title^='copies /canon']").length).toBe(1);
    await v.unmount();
  });

  test("a failed search shows the reason above the globe", async () => {
    const v = await mount(fakeApi({}, 503).api);
    await v.type("entropy");
    expect(v.host.querySelector('[role="alert"]')?.textContent).toBe("Bucket ran into a problem. Try again.");
    expect(v.host.textContent).not.toContain("index not built");
    expect(v.host.querySelector('[data-testid="globe"]')).not.toBeNull();
    await v.unmount();
  });

  test("the search page reads an excerpt with a way back to the globe, and a find route fills the search box", async () => {
    const reader = await mount(fakeApi().api, { id: 7 });
    expect(reader.host.querySelector("blockquote")?.textContent).toBe("Entropy rises and entropy never falls.");
    expect(reader.host.querySelector("a.back")?.getAttribute("href")).toBe("#/canon");
    expect(reader.host.querySelector('[data-testid="globe"]')).toBeNull();
    expect(reader.host.querySelector("h1")?.textContent).toBe("Canon search");
    expect(reader.host.textContent).not.toContain("3D graphics");
    await reader.unmount();

    const { api, calls } = fakeApi();
    const found = await mount(api, { find: "speed of light" });
    await found.settle();
    expect(window.location.search).toBe("?q=speed+of+light");
    expect(window.location.hash).toBe("#/canon");
    expect((found.host.querySelector('.canon-site input[type="text"]') as HTMLInputElement).value).toBe("speed of light");
    expect(calls.search).toEqual([["/local/canon/search?q=speed+of+light&top_k=15", `Bucket ${TOKEN}`]]);
    await found.unmount();
  });
});

describe("site requests in the window", () => {
  test("only the listed site paths are rewritten, and the session code goes to this window alone", async () => {
    expect(SITE_ROUTES).toEqual({ "/api/canon/search": "/local/canon/search" });
    const sent: { url: string; auth: string | null; method: string }[] = [];
    const base = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = input instanceof Request ? input : null;
      sent.push({ url: req ? req.url : String(input), auth: new Headers(init?.headers ?? req?.headers).get("authorization"), method: init?.method ?? req?.method ?? "GET" });
      return new Response(JSON.stringify({ results: [HITS[0], HITS[2]] }), { status: 200 });
    }) as typeof fetch;
    const f = siteFetch(base, ORIGIN, TOKEN);

    const r = await f(`${ORIGIN}/api/canon/search?q=entropy&top_k=15`);
    expect(((await r.json()) as { results: CanonHit[]; n_results: number }).results.map((h) => h.claim_id)).toEqual([7]);
    await f("/api/canon/search?q=a+b");
    await f(new URL(`${ORIGIN}/api/canon/search?q=url`));
    expect(sent.map((x) => [x.url, x.auth])).toEqual([
      ["/local/canon/search?q=entropy&top_k=15", `Bucket ${TOKEN}`],
      ["/local/canon/search?q=a+b", `Bucket ${TOKEN}`],
      ["/local/canon/search?q=url", `Bucket ${TOKEN}`],
    ]);

    sent.length = 0;
    const untouched = [
      "https://evil.example/api/canon/search?q=x",
      "http://127.0.0.1:4101/api/canon/search?q=x",
      "http://127.0.0.1:4100.evil.example/api/canon/search?q=x",
      "https://127.0.0.1:4100/api/canon/search?q=x",
      "//evil.example/api/canon/search?q=x",
      `${ORIGIN}/api/canon/search/extra?q=x`,
      `${ORIGIN}/api/canon/searchx`,
      `${ORIGIN}/api/explore/search?q=x`,
      "/local/decks",
      "/session",
      "/textures/earth/landmask-2k.bin",
    ];
    for (const url of untouched) await f(url);
    await f(`${ORIGIN}/api/canon/search?q=x`, { method: "POST" });
    await f(new Request("https://evil.example/api/canon/search?q=x"));
    expect(sent.map((x) => x.url)).toEqual([...untouched, `${ORIGIN}/api/canon/search?q=x`, "https://evil.example/api/canon/search?q=x"]);
    expect(sent.filter((x) => x.auth !== null)).toEqual([]);
  });

  test("a refused search tells the screen and an aborted one stays quiet", async () => {
    const heard: number[] = [];
    const on = (e: Event) => heard.push((e as CustomEvent<{ status: number }>).detail.status);
    window.addEventListener(CANON_TROUBLE, on);
    const refused = siteFetch((async () => new Response("{}", { status: 401 })) as unknown as typeof fetch, ORIGIN, TOKEN);
    expect((await refused("/api/canon/search?q=x")).ok).toBe(false);
    const aborted = siteFetch((async () => {
      throw Object.assign(new Error("gone"), { name: "AbortError" });
    }) as unknown as typeof fetch, ORIGIN, TOKEN);
    await expect(aborted("/api/canon/search?q=x")).rejects.toThrow("gone");
    window.removeEventListener(CANON_TROUBLE, on);
    expect(heard).toEqual([401]);
  });
});

describe("canon link mapper", () => {
  test("maps an excerpt the window has seen, the search links, and nothing else", async () => {
    const { webglAvailable } = await import("./views/CanonSearch");
    rememberExcerpt("entropy", "001-a", 7);
    const to = windowHref;
    expect(to("/excerpts/entropy/001-a")).toBe("#/search/7");
    expect(to("/excerpts/entropy/999-z")).toBeNull();
    expect(to("/canon/search")).toBe("#/search");
    expect(to("/canon/search?q=speed%20of%20light")).toBe("#/canon/find/speed%20of%20light");
    expect(to("/canon/search?q=%E0%A4%A")).toBeNull();
    for (const path of ["/canon/physics", "/canon/bridges", "/canon/graph", "/canon/physics/figures/einstein", "/research-os/workspace?q=x", "https://evil.example/", "//evil.example/excerpts/a/b", ""]) expect(to(path)).toBeNull();
    expect(webglAvailable()).toBe(false);
  });

  test("the link shim keeps a window route and blanks any other internal path", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { default: Link } = await import("./shims/next-link");
    expect(renderToStaticMarkup(<Link href="#/search/7">x</Link>)).toBe('<a href="#/search/7">x</a>');
    expect(renderToStaticMarkup(<Link href="/canon/physics">x</Link>)).toBe('<a href="#">x</a>');
  });
});

describe("canon styling", () => {
  test("tailwind scans every file the screen pulls in", () => {
    const { content } = require("../tailwind.config.cjs") as { content: string[] };
    const base = resolve(import.meta.dir, "..");
    for (const f of ["./src/views/CanonSearch.tsx", "../../src/app/canon/CanonGlobeMount.tsx", "../../src/components/CanonGlobe.tsx", "../../src/components/canon-globe/**/*.tsx"]) expect(content).toContain(f);
    for (const f of content.filter((c) => !c.includes("*"))) expect([f, existsSync(resolve(base, f))]).toEqual([f, true]);
  });

  test("the window palette defines every colour the web component reads", () => {
    const files = ["src/app/canon/CanonGlobeMount.tsx", "src/components/CanonGlobe.tsx", "src/components/canon-globe/CanonGlobe.tsx", "src/components/canon-globe/CanonMarkers.tsx"];
    const used = new Set(files.flatMap((f) => Array.from(readFileSync(resolve(ROOT, f), "utf8").matchAll(/var\((--[a-z0-9-]+)/g)).map((m) => m[1])));
    const site = readFileSync(resolve(ROOT, "src/app/globals.css"), "utf8");
    const block = /\.canon-site \{([^}]+)\}/.exec(CSS)![1];
    const colours = [...used].filter((v) => new RegExp(`${v}:`).test(site));
    expect(colours.length).toBeGreaterThan(6);
    expect(colours.filter((v) => !block.includes(`${v}:`))).toEqual([]);
    for (const v of ["--bone", "--basalt", "--gold", "--parchment-dim"]) {
      const value = (css: string) => new RegExp(`${v}:\\s*([^;]+);`).exec(css)![1].trim().toLowerCase();
      expect([v, value(block)]).toEqual([v, value(site)]);
    }
  });
});

test("an offline window refuses a request off its own origin", async () => {
  const calls: string[] = [];
  const base = (async (input: RequestInfo | URL) => (calls.push(String(input)), new Response("{}"))) as typeof fetch;
  const f = siteFetch(base, ORIGIN, TOKEN, true);
  const refused = await f("https://example.org/data.json").then(() => null, (e: Error) => e.message);
  expect(refused).toBe(OFFLINE_MESSAGE);
  expect(refused).not.toContain("example.org");
  expect(calls).toEqual([]);
  await f(`${ORIGIN}/local/ping`);
  expect(calls).toEqual([`${ORIGIN}/local/ping`]);
});
