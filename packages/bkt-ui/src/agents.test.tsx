import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { AgentsBody } from "./api";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());

const NOW = 1_800_000_000_000;
const RUNNING: AgentsBody = {
  v: 1,
  supported: true,
  installed: true,
  sessions: [
    { tool: "claude", session: "aaaa1111", project: "bucket-foundation", state: "running", since: NOW / 1000 - 125, subagents: 2 },
    { tool: "codex", session: "bbbb2222", project: "tools", state: "done", since: NOW / 1000 - 30, subagents: 0 },
    { tool: "gemini", session: "cccc3333", project: "notes", state: "waiting", since: NOW / 1000 - 5, subagents: 1 },
  ],
};

function fakeApi(body: AgentsBody) {
  const focus: [boolean, boolean][] = [];
  let polls = 0;
  let installs = 0;
  return {
    focus,
    polls: () => polls,
    installs: () => installs,
    agents: async () => (polls++, body),
    reportFocus: async (f: boolean, v: boolean) => (focus.push([f, v]), { ok: true }),
    setWait: async () => (installs++, { ...body, installed: true, ok: true, lines: [] }),
  };
}

async function mount(api: ReturnType<typeof fakeApi>) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { AgentsStrip } = await import("./views/Agents");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<AgentsStrip api={api} now={() => NOW} />));
  for (let i = 0; i < 5; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
  const click = async (label: string) => {
    const b = [...host.querySelectorAll("button")].find((x) => x.textContent === label);
    if (!b) throw new Error(`no button ${label} in ${host.textContent}`);
    await act(async () => b.click());
    for (let i = 0; i < 5; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
  };
  return { host, click, unmount: () => act(async () => root.unmount()) };
}

describe("agents strip", () => {
  test("lists sessions with tool, state, elapsed time and subagents", async () => {
    const api = fakeApi(RUNNING);
    const m = await mount(api);
    const rows = [...m.host.querySelectorAll(".agent")].map((li) => li.textContent);
    expect(rows).toEqual(["bucket-foundationClauderunning2m2 subagents", "toolsCodexdone30s", "notesGeminiwaiting on you5s1 subagent"]);
    expect(m.host.querySelector("h2")!.textContent).toBe("Your agents");
    await m.unmount();
  });

  test("offers Turn on with the consent text before installing", async () => {
    const api = fakeApi({ ...RUNNING, installed: false, sessions: [] });
    const m = await mount(api);
    await m.click("Turn on");
    expect(m.host.textContent).toContain("No prompt text, transcript or full path leaves the hook.");
    expect(api.installs()).toBe(0);
    await m.click("Turn on");
    expect(api.installs()).toBe(1);
    expect(m.host.textContent).toContain("Turned on.");
    await m.unmount();
  });

  test("renders nothing where the feature is unsupported", async () => {
    const m = await mount(fakeApi({ v: 1, supported: false, installed: false, sessions: [] }));
    expect(m.host.textContent).toBe("");
    await m.unmount();
  });

  test("reports focus on mount, on blur and focus, and on unmount", async () => {
    const api = fakeApi(RUNNING);
    const m = await mount(api);
    const before = api.focus.length;
    expect(before).toBeGreaterThan(0);
    window.dispatchEvent(new Event("blur"));
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(api.focus.length).toBe(before + 3);
    await m.unmount();
    expect(api.focus.at(-1)![0]).toBe(false);
  });

  test("formats elapsed time", async () => {
    const { elapsed } = await import("./views/Agents");
    expect(elapsed(100, 159_000)).toBe("59s");
    expect(elapsed(0, 3_599_000)).toBe("59m");
    expect(elapsed(0, 3_660_000)).toBe("1h 1m");
  });
});
