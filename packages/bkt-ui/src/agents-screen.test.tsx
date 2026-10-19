import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { AgentsBodyV2, ChatRequest, TurnEvent } from "./api";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterAll(() => GlobalRegistrator.unregister());

const NOW = 1_800_000_000_000;
const BODY: AgentsBodyV2 = {
  v: 1,
  supported: true,
  installed: true,
  sessions: [{ v: 2, kind: "cli", tool: "claude", session: "aaaa1111", project: "bucket-foundation", state: "running", since: NOW / 1000 - 125, subagents: 0 }],
  chats: [{ v: 1, kind: "chat", id: "chat0001", provider: "ollama", model: "qwen3:4b", started: NOW / 1000 - 60, state: "done" }],
};

function fakeApi(stream: (req: ChatRequest, signal?: AbortSignal) => AsyncGenerator<TurnEvent>, folders = ["/work/bucket"]) {
  const requests: ChatRequest[] = [];
  const cancels: string[] = [];
  return {
    requests,
    cancels,
    agentsV2: async () => BODY,
    agentTools: async () => ["claude", "gemini"],
    agentFolders: async () => folders,
    agentProviders: async () => [
      { name: "ollama", model: "qwen3:4b", local: true },
      { name: "anthropic", model: "claude-sonnet-4-5", local: false },
    ],
    cancelChat: async (id: string) => (cancels.push(id), { cancelled: true }),
    chat: (req: ChatRequest, signal?: AbortSignal) => (requests.push(req), stream(req, signal)),
  };
}

async function mount(api: ReturnType<typeof fakeApi>, invoke: ((cmd: string, args: Record<string, unknown>) => Promise<unknown>) | null) {
  const { act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { AgentsScreen } = await import("./views/AgentsScreen");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const flush = async () => {
    for (let i = 0; i < 6; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
  };
  await act(async () => root.render(<AgentsScreen api={api as never} invoke={invoke} now={() => NOW} />));
  await flush();
  const button = (label: string) => {
    const b = [...host.querySelectorAll("button")].find((x) => x.textContent === label);
    if (!b) throw new Error(`no button ${label} in ${host.textContent}`);
    return b;
  };
  const click = async (label: string) => {
    await act(async () => button(label).click());
    await flush();
  };
  const type = async (label: string, value: string) => {
    const el = host.querySelector(`[aria-label="${label}"]`) as HTMLTextAreaElement | HTMLSelectElement;
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
      el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
    });
    await flush();
  };
  return { host, click, type, flush, button, unmount: () => act(async () => root.unmount()) };
}

describe("agents screen", () => {
  test("lists coding agents and past Bucket agent chats", async () => {
    const m = await mount(fakeApi(async function* () {}), null);
    const rows = [...m.host.querySelectorAll(".agent")].map((li) => li.textContent);
    expect(rows).toEqual(["bucket-foundationClaude Coderunning2m", "ollamaqwen3:4bdone1m"]);
    expect(m.host.textContent).not.toContain("Open Claude Code");
    await m.unmount();
  });

  test("launch buttons call launch_agent with the tool and the chosen approved folder", async () => {
    const calls: [string, Record<string, unknown>][] = [];
    const m = await mount(fakeApi(async function* () {}), async (cmd, args) => void calls.push([cmd, args]));
    await m.click("Open Gemini CLI");
    expect(calls).toEqual([["launch_agent", { tool: "gemini", folder: "/work/bucket" }]]);
    expect(m.host.textContent).toContain("Opened Gemini CLI in /work/bucket.");
    await m.unmount();
  });

  test("a refused launch shows the shell's reason", async () => {
    const m = await mount(fakeApi(async function* () {}), async () => {
      throw new Error("that folder is not on the approved list");
    });
    await m.click("Open Claude Code");
    expect(m.host.textContent).toContain("Bucket could not open Claude Code: that folder is not on the approved list");
    await m.unmount();
  });

  test("with no approved folder the screen points to the shell menu and offers no launch", async () => {
    const m = await mount(fakeApi(async function* () {}, []), async () => undefined);
    expect(m.host.textContent).toContain("Approve a folder from the Bucket menu");
    expect([...m.host.querySelectorAll("button")].map((b) => b.textContent)).not.toContain("Open Claude Code");
    await m.unmount();
  });

  test("the chat streams an answer and the next turn carries the chat id, provider and model", async () => {
    const api = fakeApi(async function* (req) {
      yield { type: "start", id: "chat0002", started: NOW / 1000, provider: req.provider, model: req.model ?? "", local: true };
      yield { type: "text", text: "Light is " };
      yield { type: "text", text: "a wave." };
      yield { type: "done", usage: { input: 1, output: 2 } };
    });
    const m = await mount(api, null);
    await m.type("Model", "llama3.2:3b");
    await m.type("Message", "what is light");
    await m.click("Send");
    expect([...m.host.querySelectorAll(".chat-log li")].map((l) => l.textContent)).toEqual(["what is light", "Light is a wave."]);
    await m.type("Message", "why");
    await m.click("Send");
    expect(api.requests[0]).toEqual({ id: undefined, provider: "ollama", model: "llama3.2:3b", messages: [{ role: "user", content: "what is light" }] });
    expect(api.requests[1]).toMatchObject({ id: "chat0002", messages: [{ content: "what is light" }, { content: "Light is a wave." }, { content: "why" }] });
    await m.type("Provider", "anthropic");
    expect(m.host.textContent).toContain("Hosted model.");
    expect((m.host.querySelector('[aria-label="Model"]') as HTMLInputElement).value).toBe("claude-sonnet-4-5");
    expect(m.host.querySelectorAll(".chat-log li")).toHaveLength(0);
    await m.unmount();
  });

  test("Stop cancels the running chat on the sidecar and aborts the stream", async () => {
    let signal: AbortSignal | undefined;
    const api = fakeApi(async function* (_req, s) {
      signal = s;
      yield { type: "start", id: "chat0003", started: NOW / 1000, provider: "ollama", model: "qwen3:4b", local: true };
      yield { type: "text", text: "thinking" };
      await new Promise<void>((r) => s!.addEventListener("abort", () => r()));
      yield { type: "cancelled" };
    });
    const m = await mount(api, null);
    await m.type("Message", "long one");
    await m.click("Send");
    expect(m.host.textContent).toContain("thinking");
    await m.click("Stop");
    expect(api.cancels).toEqual(["chat0003"]);
    expect(signal!.aborted).toBe(true);
    expect(m.host.textContent).toContain("Stopped.");
    m.button("Send");
    await m.unmount();
  });
});
