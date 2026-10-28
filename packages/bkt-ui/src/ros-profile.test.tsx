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

type Call = { url: string; body: Record<string, unknown> | null };

const GAME = { level: 3, xp: 240, into: 40, span: 100, streakDays: 5, badges: [{ kind: "internalized" }, { kind: "internalized" }, { kind: "produced" }] };

function stubFetch(opts: { game?: typeof GAME | null; privacyOk?: boolean } = {}) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ url, body });
    if (url.endsWith("/privacy")) {
      if (opts.privacyOk === false) return new Response("{}", { status: 500 });
      return Response.json(body?.action === "export" ? { saved: { name: "research-os-export-2026-10-21.json", folder: "Downloads" } } : { deleted: true });
    }
    return Response.json({ profile: { role: "student", birthYearBucket: "18plus" }, game: opts.game === undefined ? GAME : opts.game });
  }) as unknown as typeof fetch;
  return calls;
}

const tick = () => new Promise((r) => setTimeout(r, 0));

async function mount() {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { RosProfileView } = await import("./views/RosProfile");
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => createRoot(host).render(<RosProfileView />));
  await act(tick);
  return { host, act };
}

type Act = (f: () => Promise<unknown>) => Promise<void>;

const button = (host: HTMLElement, text: string) => [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === text) as HTMLButtonElement;
const confirmInput = (host: HTMLElement) => host.querySelector("input[aria-label='type the confirm word']") as HTMLInputElement | null;
const status = (host: HTMLElement) => host.querySelector("[role=status]")?.textContent;

async function click(act: Act, el: HTMLElement) {
  await act(async () => el.click());
  await act(tick);
}

async function type(act: Act, input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

test("the game section shows level, XP, streak, next level and badge counts", async () => {
  stubFetch();
  const { host } = await mount();
  const text = host.textContent ?? "";
  expect(text).toContain("Level 3 · 240 XP · 5 day streak");
  expect(text).toContain("60 XP to the next level.");
  expect(text).toContain("2 ideas made your own · 1 pieces of work");
});

test("a learner with no game yet sees how to start earning XP", async () => {
  stubFetch({ game: null });
  const { host } = await mount();
  expect(host.textContent).toContain("Open an idea on the knowledge graph to start earning XP.");
});

test("export posts to the privacy route and names where the file went", async () => {
  const calls = stubFetch();
  const { host, act } = await mount();
  await click(act, button(host, "Export my profile and idea progress"));
  expect(calls.find((c) => c.url.endsWith("/privacy"))?.body).toEqual({ action: "export", save: true });
  expect(status(host)).toBe("Saved your profile and idea progress in Downloads as research-os-export-2026-10-21.");
});

test("a failed export says so", async () => {
  stubFetch({ privacyOk: false });
  const { EXPORT_TROUBLE } = await import("./views/RosProfile");
  const { host, act } = await mount();
  await click(act, button(host, "Export my profile and idea progress"));
  expect(status(host)).toBe(EXPORT_TROUBLE);
});

test("delete stays locked until the confirm word is typed, then posts the web confirm token", async () => {
  const calls = stubFetch();
  const { DELETE_CONFIRM_TOKEN } = await import("@ros/types");
  const { host, act } = await mount();
  await click(act, button(host, "Delete my profile and idea progress"));
  const input = confirmInput(host)!;
  expect(button(host, "Delete").disabled).toBe(true);
  await type(act, input, "delete");
  expect(button(host, "Delete").disabled).toBe(true);
  await type(act, input, ` ${DELETE_CONFIRM_TOKEN} `);
  expect(button(host, "Delete").disabled).toBe(false);
  await click(act, button(host, "Delete"));
  expect(calls.find((c) => c.body?.action === "delete")?.body).toEqual({ action: "delete", confirm: DELETE_CONFIRM_TOKEN });
  expect(status(host)).toBe("Your data on this computer is deleted.");
  expect(calls.filter((c) => c.url.endsWith("/profile")).length).toBe(2);
});

test("cancel closes the confirm step without posting", async () => {
  const calls = stubFetch();
  const { host, act } = await mount();
  await click(act, button(host, "Delete my profile and idea progress"));
  await click(act, button(host, "Cancel"));
  expect(confirmInput(host)).toBeNull();
  expect(calls.some((c) => c.url.endsWith("/privacy"))).toBe(false);
});

test("a failed delete says so and keeps the confirm step open", async () => {
  stubFetch({ privacyOk: false });
  const { DELETE_TROUBLE } = await import("./views/RosProfile");
  const { host, act } = await mount();
  await click(act, button(host, "Delete my profile and idea progress"));
  await type(act, confirmInput(host)!, "DELETE");
  await click(act, button(host, "Delete"));
  expect(status(host)).toBe(DELETE_TROUBLE);
  expect(confirmInput(host)).not.toBeNull();
});
