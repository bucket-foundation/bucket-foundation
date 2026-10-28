import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  document.body.innerHTML = "";
});

const DRAFT = { id: "d1", kind: "production", status: "draft", claim: "Heat flows downhill", target_node_id: "n1", related_node_id: null, sources: ["Fourier 1822"], updated_at: "2026-10-20T00:00:00Z" };

function stub(opts: { deleteOk?: boolean } = {}) {
  const calls: { url: string; body: Record<string, unknown> | null }[] = [];
  let rows = [DRAFT];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ url, body });
    if (url.includes("/search")) return Response.json({ results: [] });
    if (body?.action === "delete") {
      if (opts.deleteOk === false) return new Response("{}", { status: 500 });
      rows = rows.filter((r) => r.id !== body.id);
      return Response.json({ deleted: body.id });
    }
    return Response.json({ productions: rows, nodes: { n1: { slug: "heat", title: "Heat", kind: "concept" } } });
  }) as unknown as typeof fetch;
  window.confirm = () => true;
  return calls;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

async function mount() {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { ProductionsView } = await import("./views/Productions");
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => createRoot(host).render(<ProductionsView />));
  await act(tick);
  return { host, act };
}

const button = (host: HTMLElement, label: string) => [...host.querySelectorAll("button")].find((b) => b.textContent === label) as HTMLButtonElement;

test("lists a draft with its idea link and source count", async () => {
  stub();
  const { host } = await mount();
  expect(host.querySelectorAll("li.production").length).toBe(1);
  expect(host.textContent).toContain("Heat flows downhill");
  expect(host.textContent).toContain("1 source");
  expect(host.querySelector('li.production a[href="#/node/heat"]')).not.toBeNull();
});

test("Edit loads the draft into the form", async () => {
  stub();
  const { host, act } = await mount();
  await act(async () => button(host, "Edit").click());
  expect(host.querySelector("h2")!.textContent).toBe("Edit draft");
  expect((host.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Heat flows downhill");
});

test("Delete removes one draft", async () => {
  const calls = stub();
  const { host, act } = await mount();
  await act(async () => button(host, "Delete").click());
  await act(tick);
  expect(calls.find((c) => c.body?.action === "delete")!.body).toEqual({ action: "delete", id: "d1" });
  expect(host.querySelectorAll("li.production").length).toBe(0);
});

test("a failed delete says so and keeps the draft", async () => {
  stub({ deleteOk: false });
  const { host, act } = await mount();
  await act(async () => button(host, "Delete").click());
  await act(tick);
  const { DELETE_TROUBLE } = await import("./views/Productions");
  expect(host.textContent).toContain(DELETE_TROUBLE);
  expect(host.querySelectorAll("li.production").length).toBe(1);
});

test("saving without an idea asks for one", async () => {
  stub();
  const { host, act } = await mount();
  const { PICK_IDEA } = await import("./views/Productions");
  await act(async () => void host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(host.textContent).toContain(PICK_IDEA);
});

test("search results with a broken shape are dropped", async () => {
  const { hitsFrom } = await import("./views/Productions");
  expect(hitsFrom(null)).toEqual([]);
  expect(hitsFrom({ results: "x" })).toEqual([]);
  expect(hitsFrom({ results: [{ id: "a", slug: "a", title: "A", branch: "b" }, { id: 1 }, null] })).toEqual([{ id: "a", slug: "a", title: "A", branch: "b" }]);
});
