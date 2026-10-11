import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import type { PackedFile, ResearchDetail, ResearchRow } from "./api";
import { href, parseHash } from "./router";
import type { EngineImage } from "./use-engine-image";
import type { ResearchApi } from "./views/Research";

let autoSee = true;
const watchers: { fire: () => void }[] = [];

class FakeObserver {
  constructor(private notify: (entries: { isIntersecting: boolean }[]) => void) {}
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

function fakeApi(over: Partial<ResearchApi> = {}): ResearchApi & { images: string[] } {
  const images: string[] = [];
  return {
    images,
    researchList: async () => ({ outputs: ROWS }),
    researchManifest: async (slug) => {
      const d = [V2, V1, STAFF].find((x) => x.slug === slug);
      if (!d) throw new Error("no such output");
      return d;
    },
    researchText: async (_slug, path) => (path.endsWith("README.md") ? "## Tool\n\nReads $x^2$ rows." : "## Gap\n\nThe **engine** ranks problems."),
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

async function view(api: ResearchApi, slug?: string, tab: "report" | "figures" = "report") {
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
    expect(parseHash("#/research/solvability-frontier/changes")).toEqual({ name: "research" });
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
    expect(Array.from(v.host.querySelectorAll(".seg button")).map((b) => [b.textContent, b.className])).toEqual([["Report", "on"], ["Figures", ""]]);
    await v.unmount();
    const one = await view(fakeApi(), "funding-landscape");
    expect(one.host.querySelector(".staff-absent")).toBeNull();
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
