import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { render } from "ink";
import type { AgentsBodyV2, TurnEvent, TurnInput } from "../src/agents";
import { AgentsApp } from "../src/cli/agents";
import type { ProviderEntry } from "../src/llm/config";

class FakeOut extends EventEmitter {
  columns = 100;
  rows = 40;
  frames: string[] = [];
  write = (chunk: string) => {
    this.frames.push(chunk);
    return true;
  };
}

class FakeIn extends EventEmitter {
  isTTY = true;
  private pending: string | null = null;
  setEncoding() {}
  setRawMode() {}
  resume() {}
  pause() {}
  ref() {}
  unref() {}
  read = () => {
    const d = this.pending;
    this.pending = null;
    return d;
  };
  send(keys: string) {
    this.pending = keys;
    this.emit("readable");
  }
}

const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;
const settle = () => Bun.sleep(40);
const NOW = 1_800_000_000_000;

const BODY: AgentsBodyV2 = {
  v: 1,
  supported: true,
  installed: true,
  sessions: [
    { v: 2, kind: "cli", tool: "claude", session: "aaaa1111", project: "bucket-foundation", state: "running", since: NOW / 1000 - 125, subagents: 2 },
    { v: 2, kind: "cli", tool: "codex", session: "bbbb2222", project: "tools", state: "waiting", since: NOW / 1000 - 30, subagents: 0 },
  ],
  chats: [{ v: 1, kind: "chat", id: "chat0001", provider: "ollama", model: "qwen3:4b", started: NOW / 1000 - 600, state: "done" }],
};

const OLLAMA: ProviderEntry = { name: "ollama", kind: "openai", baseUrl: "http://127.0.0.1:11434/v1", model: "qwen3:4b", local: true, keyed: false };
const HOSTED: ProviderEntry = { name: "anthropic", kind: "anthropic", baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-5", local: false, keyed: true };

function mount(body: AgentsBodyV2, providers: ProviderEntry[], turn: (i: TurnInput, c: AbortController) => AsyncIterable<TurnEvent> = async function* () {}) {
  const out = new FakeOut();
  const input = new FakeIn();
  const app = render(<AgentsApp load={() => body} providers={providers} turn={turn} now={() => NOW} pollMs={60_000} />, { stdout: out as never, stdin: input as never, debug: true, exitOnCtrlC: false, patchConsole: false });
  const frame = () => (out.frames.at(-1) ?? "").replace(ANSI, "").trimEnd();
  return { app, input, frame };
}

describe("bkt agents", () => {
  test("lists coding agents and Bucket agent chats", async () => {
    const m = mount(BODY, [OLLAMA]);
    await settle();
    expect(m.frame()).toMatchSnapshot();
    m.app.unmount();
  });

  test("shows an empty list and how to add a model", async () => {
    const m = mount({ ...BODY, sessions: [], chats: [] }, []);
    await settle();
    expect(m.frame()).toMatchSnapshot();
    m.input.send("c");
    await settle();
    expect(m.frame()).toContain("Add a model with bkt llm add");
    m.app.unmount();
  });

  test("opens a chat, streams the answer and switches provider with Tab", async () => {
    const seen: TurnInput[] = [];
    const m = mount(BODY, [OLLAMA, HOSTED], async function* (i) {
      seen.push(i);
      yield { type: "start", id: "chat0002", started: NOW / 1000, provider: i.entry.name, model: i.model, local: i.entry.local };
      yield { type: "text", text: "Light is " };
      yield { type: "text", text: "a wave." };
      yield { type: "done", usage: { input: 1, output: 2 } };
    });
    await settle();
    m.input.send("c");
    await settle();
    for (const ch of "what is light") m.input.send(ch);
    await settle();
    m.input.send("\r");
    await settle();
    expect(m.frame()).toMatchSnapshot();
    m.input.send("why");
    await settle();
    m.input.send("\r");
    await settle();
    expect(seen[1].prior).toEqual({ id: "chat0002", started: NOW / 1000 });
    expect(seen[1].messages.map((x) => x.content)).toEqual(["what is light", "Light is a wave.", "why"]);
    m.input.send("\t");
    await settle();
    expect(m.frame()).toMatchSnapshot();
    m.app.unmount();
  });

  test("Esc cancels a running answer", async () => {
    let aborted = false;
    const m = mount(BODY, [OLLAMA], async function* (i, c) {
      yield { type: "start", id: "chat0003", started: NOW / 1000, provider: i.entry.name, model: i.model, local: true };
      yield { type: "text", text: "thinking" };
      await new Promise<void>((r) => c.signal.addEventListener("abort", () => r()));
      aborted = true;
      yield { type: "cancelled" };
    });
    await settle();
    m.input.send("c");
    await settle();
    m.input.send("x");
    await settle();
    m.input.send("\r");
    await settle();
    m.input.send("\u001b");
    await settle();
    expect(aborted).toBe(true);
    expect(m.frame()).toContain("cancelled");
    expect(m.frame()).toContain("Bucket agent");
    m.app.unmount();
  });
});
