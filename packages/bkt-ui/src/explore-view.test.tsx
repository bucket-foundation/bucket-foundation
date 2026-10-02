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
